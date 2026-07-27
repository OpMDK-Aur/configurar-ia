import type { APIRoute } from 'astro';
import { getAsistente, updateRecord, findRecord, createOpenAIAssistant, updateOpenAIAssistant } from '../../services/index';
import { FormularioConfiguracionSchema } from '../../types';
import type { FormularioConfiguracion } from '../../types';
import { logger, generateRequestId } from '../../lib/logger';
import { SheetRecord } from '../../types/sheet';

export const POST: APIRoute = async ({ request }) => {
	const startTime = Date.now();
	const requestId = generateRequestId();
	logger.setRequestContext(requestId);

	try {
		logger.apiCall('guardar-config', {
			url: request.url,
			method: request.method
		});

		const body = await request.json();
		const parseResult = FormularioConfiguracionSchema.safeParse(body);

		if (!parseResult.success) {
			logger.validationError('guardar-config', parseResult.error.issues, {
				requestId
			});

			return new Response(JSON.stringify({ success: false, error: 'Datos inválidos', issues: parseResult.error.issues }), { status: 400 });
		}

		const input = parseResult.data;

		logger.info('Validación exitosa', {
			fields: Object.keys(input.fields),
			requestId
		});

		const existingData = await getAsistente();

		if (!existingData.success || !existingData.data) {
			logger.error('No existe configuración para actualizar', {
				requestId,
				locationId: import.meta.env.LOCATION_ID
			});

			return new Response(JSON.stringify({ success: false, error: 'No existe configuración para actualizar' }), { status: 404 });
		}

		const sheetRecord = existingData.data as SheetRecord;

		if (!sheetRecord.id) {
			logger.error('No se encontró el ID del registro', {
				requestId,
				recordId: sheetRecord.id
			});

			return new Response(JSON.stringify({ success: false, error: 'No se encontró el ID del registro' }), { status: 404 });
		}

		const asistenteConfig = sheetRecord.fields as FormularioConfiguracion;
		const existingAssistantId = asistenteConfig.openAiAssistantId;

		// Obtener locationId del entorno para actualizar AsistentePorCliente
		const locationId = import.meta.env.LOCATION_ID;

		let assistantResult;

		if (existingAssistantId) {
			logger.info('Actualizando asistente existente', {
				assistantId: existingAssistantId,
				requestId
			});

			let fields = input.fields as FormularioConfiguracion;

			fields.ComandosPropios = asistenteConfig.ComandosPropios;
			assistantResult = await updateOpenAIAssistant(existingAssistantId, fields);
		} else {
			logger.info('Creando nuevo asistente', { requestId });
			assistantResult = await createOpenAIAssistant(input.fields);
		}

		// if (!assistantResult.success) {
		// 	logger.error('Error al manejar el asistente de OpenAI', {
		// 		error: assistantResult.error,
		// 		requestId
		// 	});

		// 	return new Response(JSON.stringify({ success: false, error: assistantResult.error || 'Error al manejar el asistente de OpenAI' }), { status: 500 });
		// }

		const processedData: FormularioConfiguracion & { openAiAssistantId?: string } = {
			...asistenteConfig,
			...input.fields,
			// openAiAssistantId: assistantResult.assistantId
		};

		logger.info('Actualizando datos en Sheets', {
			recordId: sheetRecord.id,
			requestId
		});

		const result = await updateRecord('Asistente', sheetRecord.id, processedData, 'asistenteId');

		if (processedData.NombreAsistente) {
			const link = await findRecord('AsistentePorCliente', 'locationId', locationId);

			if (link) {
				// @ts-ignore
				await updateRecord('AsistentePorCliente', locationId, { ...link, Asistente: processedData.NombreAsistente }, 'locationId');
			}
		}

		if (result.success) {
			const duration = Date.now() - startTime;

			logger.apiSuccess('guardar-config', {
				duration,
				assistantId: assistantResult.assistantId,
				requestId
			});

			return new Response(JSON.stringify({
				success: true,
				message: 'Configuración actualizada correctamente',
				assistantId: assistantResult.assistantId
			}), { status: 200 });
		}

		logger.error('Error al actualizar configuración en Sheets', {
			error: result.error,
			requestId
		});

		return new Response(JSON.stringify({ success: false, error: 'Error al actualizar configuración' }), { status: 500 });
	} catch (error) {
		const duration = Date.now() - startTime;

		logger.apiError('guardar-config', error instanceof Error ? error : new Error(String(error)), {
			duration,
			requestId
		});

		return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Error desconocido' }), { status: 500 });
	}
};