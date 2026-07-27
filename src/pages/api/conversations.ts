import type { APIRoute } from 'astro';
import { MessageFromSheet } from '../../types';
import { logger, generateRequestId } from '../../lib/logger';
import { openai } from '../../lib/openai';
import { getAsistente, findRecord, createRecord } from '../../services/index';
import { getSheetData } from '../../lib/sheets';

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

		// Get the latest conversation for this location
		const allConversations = await getSheetData('Conversaciones');
		const conversations = allConversations
			.filter(c => c.locationId === locationId)
			.sort((a, b) => (b.FechaInicio || '').localeCompare(a.FechaInicio || ''))
			.slice(0, 1);

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
			conversationId: conversation.ConvId,
			convId: conversation.ConvId,
			requestId
		});

		// Get all messages for this conversation
		const allMessages = await getSheetData('Mensajes');
		const messages = allMessages
			.filter(m => m.ConvId === conversation.ConvId)
			.sort((a, b) => (a.MsgId || '').localeCompare(b.MsgId || ''));

		const duration = Date.now() - startTime;
		logger.apiSuccess('conversations-get', {
			duration,
			conversationId: conversation.ConvId,
			messageCount: messages.length,
			requestId
		});

		return new Response(
			JSON.stringify({
				success: true,
				conversation: {
					id: conversation.ConvId,
					...conversation
				},
				messages: messages.map(msg => ({
					id: msg.MsgId,
					...msg as unknown as MessageFromSheet,
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

		// Buscar el registro del cliente usando locationId
		const cliente = await findRecord('Clientes', 'locationId', clienteId, );

		if (!cliente) {
			return new Response(
				JSON.stringify({
					success: false,
					error: 'No se encontró el cliente con el locationId proporcionado'
				}),
				{ status: 404 }
			);
		}

		// Buscar el asistente relacionado usando clienteId
		const asistenteResult = await getAsistente();

		if (!asistenteResult.success || !asistenteResult.data) {
			return new Response(JSON.stringify({ success: false, error: 'No se encontró asistente para este cliente' }), { status: 404 });
		}

		const asistenteConfig = asistenteResult.data.fields as any;

		// Create OpenAI thread
		const thread = await openai.beta.threads.create();

		// Buscar el último ConvId existente para generar el siguiente
		const allConversations = await getSheetData('Conversaciones');
		const maxConvId = allConversations.reduce((max, c) => {
			const num = parseInt(c.ConvId, 10);
			return !isNaN(num) && num > max ? num : max;
		}, 0);
		const newConvId = maxConvId + 1;

		// Create new conversation with thread ID
		const conv = await createRecord('Conversaciones', {
			ConvId: String(newConvId),
			locationId: locationId,
			NombreCliente: cliente.Nombre || '',
			Asistente: asistenteResult.data.id,
			NombreAsistente: asistenteConfig.NombreAsistente || '',
			Canal: 'Playground',
			Estado: 'Nuevo',
			FechaInicio: new Date().toISOString(),
			ThreadId: thread.id,
		});

		return new Response(
			JSON.stringify({
				success: true,
				conversationId: newConvId,
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
