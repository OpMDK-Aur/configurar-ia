import type { APIRoute } from "astro";
import { openai } from "../../lib/openai";
import Airtable from "airtable";
import { getAsistente } from "../../services";
import type { FormularioConfiguracion } from "../../types";
import { logger, generateRequestId } from "../../lib/logger";

// Usar la configuración global de Airtable
Airtable.configure({
  apiKey: import.meta.env.AIRTABLE_API_KEY,
});

const base = Airtable.base(import.meta.env.AIRTABLE_BASE_ID);

export const POST: APIRoute = async ({ request }) => {
  const startTime = Date.now();
  const requestId = generateRequestId();
  logger.setRequestContext(requestId);
  
  try {
    logger.apiCall('chat', {
      url: request.url,
      method: request.method
    });
    
    const { message, conversationId, threadId } = await request.json();
    if (!message || !threadId) {
      logger.validationError('chat', [], {
        requestId,
        hasMessage: !!message,
        hasThreadId: !!threadId
      });
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "No se proporcionó un mensaje o threadId en el cuerpo de la solicitud",
        }),
        { status: 400 }
      );
    }

    // Get assistant configuration
    const { success, data } = await getAsistente();

    if (
      !success ||
      !data ||
      !("fields" in data) ||
      !("NombreAsistente" in data.fields)
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No se pudo obtener la configuración del asistente",
        }),
        { status: 500 }
      );
    }

    const assistantConfig = data.fields as FormularioConfiguracion;
    const assistantId = assistantConfig.openAiAssistantId;

    if (!assistantId) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "No se encontró el ID del asistente configurado. Por favor, guarda la configuración primero.",
        }),
        { status: 500 }
      );
    }

    // Add the user message to the thread
    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: message,
    });

    // Create a run with the assistant
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
    });

    // Validación defensiva antes de consultar el run
    if (!threadId || !run?.id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "threadId o run.id no definidos",
          details: { threadId, runId: run?.id },
        }),
        { status: 500 }
      );
    }

    // Wait for the run to complete
    let runStatus = await openai.beta.threads.runs.retrieve(run.id, {
      thread_id: threadId,
    });
    let attempts = 0;
    const maxAttempts = 30; // 30 segundos máximo

    while (
      (runStatus.status === "in_progress" || 
       runStatus.status === "queued" || 
       runStatus.status === "requires_action") &&
      attempts < maxAttempts
    ) {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
      runStatus = await openai.beta.threads.runs.retrieve(run.id, {
        thread_id: threadId,
      });
      attempts++;
      
      // Handle requires_action status
      if (runStatus.status === "requires_action") {
        
        // The assistant is trying to use tools to access Airtable data
        // We need to submit tool outputs to continue
        if (runStatus.required_action?.type === "submit_tool_outputs") {
          const toolOutputs = runStatus.required_action.submit_tool_outputs.tool_calls.map((toolCall: any) => ({
            tool_call_id: toolCall.id,
            output: "[]" // For now, return empty output to continue
          }));
          
          await openai.beta.threads.runs.submitToolOutputs(
            run.id,
            { 
              thread_id: threadId,
              tool_outputs: toolOutputs 
            }
          );
          
        }
      }
    }

    if (runStatus.status === "failed") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Error en el procesamiento del asistente",
          details: runStatus.last_error,
        }),
        { status: 500 }
      );
    }

    if (runStatus.status !== "completed") {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "El asistente no pudo completar el procesamiento en el tiempo esperado",
        }),
        { status: 500 }
      );
    }

    // Get the assistant's response
    const messages = await openai.beta.threads.messages.list(threadId);
    const lastMessage = messages.data[0]; // The most recent message

    if (!lastMessage || lastMessage.role !== "assistant") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No se recibió respuesta del asistente",
        }),
        { status: 500 }
      );
    }

    // Acceso seguro al bloque de texto
    const textBlock = lastMessage.content.find(
      (block: any) => block.type === "text"
    );
    const response =
      textBlock && textBlock.type === "text" ? textBlock.text.value : "";

    // Store user message in Airtable
    const userMessage = await base("Mensajes").create({
      ConvId: [conversationId],
      Autor: "user",
      Contenido: message,
      RoleOpenAI: "user",
    });

    // Store assistant message in Airtable
    const assistantMessageRecord = await base("Mensajes").create({
      ConvId: [conversationId],
      Autor: "assistant",
      Contenido: response,
      RoleOpenAI: "assistant",
    });

    return new Response(
      JSON.stringify({
        success: true,
        response: response,
        MsgId: assistantMessageRecord.id,
      }),
      { status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Error al procesar el mensaje",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500 }
    );
  }
};
