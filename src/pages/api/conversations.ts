import type { APIRoute } from 'astro';
import Airtable from 'airtable';
import { MessageFromAirtable } from '../../types';
import { logger, generateRequestId } from '../../lib/logger';
import { openai } from '../../lib/openai';
import { getAsistente } from '../../services';

// Usar la configuración global de Airtable como en services/index.ts
Airtable.configure({
    apiKey: import.meta.env.AIRTABLE_API_KEY
});

const base = Airtable.base(import.meta.env.AIRTABLE_BASE_ID);
const locationId = import.meta.env.LOCATION_ID;

export const GET: APIRoute = async ({ request }) => {
  const startTime = Date.now();
  const requestId = generateRequestId();
  logger.setRequestContext(requestId);
  
  try {
    logger.apiCall('conversations-get', {
      url: request.url,
      method: request.method
    });
    
    // Probar acceso de lectura a las tablas
    try {
      const clienteTest = await base('Clientes').select({ maxRecords: 1 }).firstPage();
    } catch (error) {
      logger.error('Error accediendo a tabla Clientes', {
        requestId,
        error: (error as any).message
      });
    }

    try {
      const asistenteTest = await base('Asistente').select({ maxRecords: 1 }).firstPage();
    } catch (error) {
      logger.error('Error accediendo a tabla Asistente', {
        requestId,
        error: (error as any).message
      });
    }

    try {
      const conversacionesTest = await base('Conversaciones').select({ maxRecords: 1 }).firstPage();
    } catch (error) {
      logger.error('Error accediendo a tabla Conversaciones', {
        requestId,
        error: (error as any).message
      });
    }

    // Get the latest conversation for this location
    logger.airtableOperation('query', 'Conversaciones', {
      locationId,
      requestId
    });
    
    const conversations = await base('Conversaciones')
      .select({
        filterByFormula: `{locationId} = '${locationId}'`,
        sort: [{ field: 'FechaInicio', direction: 'desc' }],
        maxRecords: 1
      })
      .firstPage();

    if (conversations.length === 0) {
      logger.info('No se encontraron conversaciones existentes', {
        locationId,
        requestId
      });
      return new Response(
        JSON.stringify({
          success: true,
          conversation: null,
          messages: []
        }),
        { status: 200 }
      );
    }

    const conversation = conversations[0];
    
    logger.info('Conversación encontrada', {
      conversationId: conversation.id,
      convId: conversation.fields.ConvId,
      requestId
    });
    
    // Get all messages for this conversation
    logger.airtableOperation('query', 'Mensajes', {
      convId: conversation.fields.ConvId,
      requestId
    });
    
    const messages = await base('Mensajes')
      .select({
        filterByFormula: `{ConvId} = '${conversation.fields.ConvId}'`,
        sort: [{ field: 'MsgId', direction: 'asc' }]
      })
      .all();
    
    const duration = Date.now() - startTime;
    logger.apiSuccess('conversations-get', {
      duration,
      conversationId: conversation.id,
      messageCount: messages.length,
      requestId
    });
    
    return new Response(
      JSON.stringify({
        success: true,
        conversation: {
          id: conversation.id,
          ...conversation.fields
        },
        messages: messages.map(msg => ({
          id: msg.id,
          ...msg.fields as unknown as MessageFromAirtable,
        }))
      }),
      { status: 200 }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.apiError('conversations-get', error instanceof Error ? error : new Error(String(error)), {
      duration,
      requestId
    });
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Error al obtener la conversación'
      }),
      { status: 500 }
    );
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const { clienteId } = await request.json();
    
    
    // Primero buscar el registro del cliente usando locationId
    const clienteRecords = await base('Clientes')
      .select({
        filterByFormula: `{locationId} = '${clienteId}'`,
        maxRecords: 1
      })
      .firstPage();

    

    if (clienteRecords.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No se encontró el cliente con el locationId proporcionado'
        }),
        { status: 404 }
      );
    }

    // Buscar el asistente relacionado usando clienteId
    const asistenteResult = await getAsistente(); // ya usa LOCATION_ID internamente
    if (!asistenteResult.success || !asistenteResult.data) {
      return new Response(JSON.stringify({ success: false, error: 'No se encontró asistente para este cliente' }), { status: 404 });
    }

    // Create OpenAI thread
    const thread = await openai.beta.threads.create();

    // Create new conversation with thread ID using the actual record IDs
    const conversation = await base('Conversaciones').create({
      Canal: 'Playground',
      locationId: [clienteRecords[0].id], // Usar el ID real del registro del cliente
      Asistente: [asistenteResult.data.id], // Usar el ID real del registro del asistente
      Estado: 'Nuevo',
      ThreadId: thread.id
    });

    

    return new Response(
      JSON.stringify({
        success: true,
        conversationId: conversation.id,
        threadId: thread.id
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al crear la conversación:', error);
    console.error('Detalles del error:', {
      name: (error as any).name,
      message: (error as any).message,
      statusCode: (error as any).statusCode,
      error: (error as any).error
    });
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Error al crear la conversación',
        details: (error as Error).message
      }),
      { status: 500 }
    );
  }
}; 