import type { APIRoute } from 'astro';
import { getAsistente } from '../../services';

export const GET: APIRoute = async () => {
  try {
    const { success, data } = await getAsistente();
    
    if (!success || !data) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No se pudo obtener la configuración',
          needsSetup: true
        }),
        { status: 200 }
      );
    }

    const assistantConfig = data.fields;
    
    // Validación más robusta
    const hasAssistantId = typeof (assistantConfig as any).openAiAssistantId === 'string' && (assistantConfig as any).openAiAssistantId.trim().length > 0;
    const hasRequiredFields = (assistantConfig as any).NombreAsistente && (assistantConfig as any).NombreEmpresa;
    const hasAssistant = hasAssistantId && hasRequiredFields;
    const assistantId = (assistantConfig as any).openAiAssistantId;
    
    return new Response(
      JSON.stringify({
        success: true,
        hasAssistant,
        assistantId,
        isConfigured: hasAssistant,
        message: hasAssistant 
          ? 'Asistente configurado correctamente' 
          : 'Necesitas guardar la configuración para crear el asistente'
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al validar configuración:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Error al validar configuración',
        needsSetup: true
      }),
      { status: 500 }
    );
  }
};
