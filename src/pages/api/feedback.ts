import type { APIRoute } from 'astro';
import { findRecord, createRecord } from '../../services/index';

export const POST: APIRoute = async ({ request }) => {
	try {
		const { id, content, isPositive } = await request.json();

		if (!id || !content) {
			return new Response(JSON.stringify({ success: false, error: 'Por favor, escribe tu feedback antes de enviarlo.' }), { status: 400 });
		}

		// Buscar el mensaje por MsgId para obtener su ID interno
		const mensaje = await findRecord('Mensajes', 'MsgId', String(id));

		if (!mensaje) {
			return new Response(JSON.stringify({
				success: false,
				error: 'No se encontró el mensaje para asociar el feedback. Intenta nuevamente o contacta soporte.'
			}), { status: 404 });
		}

		await createRecord('Feedback', {
			MsgId: mensaje.MsgId,
			mensaje: content,
			Tipo: isPositive ? 'Positivo' : 'Negativo',
		});

		return new Response(JSON.stringify({ success: true }), { status: 200 });
	} catch (error) {

		const isDev = import.meta.env.NODE_ENV === 'development';

		return new Response(JSON.stringify({
			success: false,
			error: 'Ocurrió un error al guardar tu feedback. Por favor, intenta nuevamente.',
			details: isDev ? (error instanceof Error ? error.message : String(error)) : undefined
		}), { status: 500 });
	}
}