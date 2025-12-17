import type { APIRoute } from 'astro';
import Airtable from 'airtable';

// Usar la configuración global de Airtable
Airtable.configure({
    apiKey: import.meta.env.AIRTABLE_API_KEY
});

const base = Airtable.base(import.meta.env.AIRTABLE_BASE_ID);

export const POST: APIRoute = async ({ request }) => {
  try {
    const { id, content, isPositive } = await request.json();

    if (!id || !content) {
      return new Response(JSON.stringify({ success: false, error: 'Por favor, escribe tu feedback antes de enviarlo.' }), { status: 400 });
    }

    let recordId = String(id);

    if (!recordId.startsWith('rec')) {
      const formula = `{MsgId} = '${id}'`;

      const records = await base('Mensajes').select({
        filterByFormula: formula,
        maxRecords: 1
      }).firstPage();

      if (!records || records.length === 0) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'No se encontró el mensaje para asociar el feedback. Intenta nuevamente o contacta soporte.'
        }), { status: 404 });
      }

      recordId = records[0].id;
    }

    await base('Feedback').create({
      MsgId: [recordId],
      mensaje: content,
      Tipo: [`${isPositive ? 'Positivo' : 'Negativo'}`]
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    // Eliminados logs y comentarios de debugging para producción
    const isDev = process.env.NODE_ENV === 'development';
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Ocurrió un error al guardar tu feedback. Por favor, intenta nuevamente.',
      details: isDev ? (error instanceof Error ? error.message : String(error)) : undefined
    }), { status: 500 });
  }
}