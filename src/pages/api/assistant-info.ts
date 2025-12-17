import type { APIRoute } from 'astro';
import { getAsistente } from '../../services';

export const GET: APIRoute = async () => {
  try {
    const { success, data } = await getAsistente();
    
    if (!success || !data) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No se pudo obtener la información del asistente'
        }),
        { status: 500 }
      );
    }

    const assistantConfig = data.fields;
    const assistantId = (assistantConfig as any).openAiAssistantId;
    const assistantName = (assistantConfig as any).NombreAsistente;
    const companyName = (assistantConfig as any).NombreEmpresa;
    const hasAssistant = typeof assistantId === 'string' && !!assistantId;
    
    return new Response(
      JSON.stringify({
        success: true,
        assistantId,
        assistantName,
        companyName,
        hasAssistant
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al obtener información del asistente:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Error al obtener información del asistente'
      }),
      { status: 500 }
    );
  }
};
