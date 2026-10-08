import { findFirst, appendRow, updateRowByColumn, generateId } from '../lib/sheets';
import type { FormularioConfiguracion, ConfiguracionAvanzada } from '../types';
import { logger } from '../lib/logger';
import { DataResponse, SheetRecord } from '../types/sheet';

// ─── Asistente | IA ───────────────────────────────────────────────
export async function getAsistente(): Promise<DataResponse> {

	// identificador del cliente
	const locationId = import.meta.env.LOCATION_ID;

	try {
		// Buscar en AsistentePorCliente por locationId
		const link = await findFirst('AsistentePorCliente', 'locationId', locationId);

		if (!link) {
			return {
				success: false,
				error: 'No se encontró asistente asociado al cliente'
			};
		}

		// Buscar el asistente por su ID
		const asistant = await findFirst('Asistente', 'asistenteId', link.asistenteId);

		if (!asistant) {
			return {
				success: false,
				error: 'No se encontró el asistente en la tabla Asistente'
			};
		}

		const record: SheetRecord = {
			id: asistant.asistenteId,
			fields: asistant as unknown as FormularioConfiguracion,
		};

		return {
			success: true,
			data: record
		};
	} catch (error) {
		// logger.error('Error al obtener asistente', {}, error instanceof Error ? error : undefined);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Error al obtener datos',
		};
	}
}

// ─── Configuración Avanzada ──────────────────────────────────
export async function getConfiguracionAvanzada(): Promise<DataResponse> {
	const locationId = import.meta.env.LOCATION_ID;

	try {

		// Buscar en AsistentePorCliente por locationId
		const link = await findFirst('AsistentePorCliente', 'locationId', locationId);

		if (!link) {
			return {
				success: false,
				error: 'No se encontró asistente asociado al cliente'
			};
		}

		const config = await findFirst(
			'ConfiguracionAvanzada',
			'asistenteId',
			link.asistenteId
		);

		if (!config) {
			return {
				success: false,
				error: 'No se encontró configuración avanzada'
			};
		}

		const record: SheetRecord = {
			id: config.asistenteId,
			fields: config as unknown as ConfiguracionAvanzada,
		};

		return {
			success: true,
			data: record
		};

	} catch (error) {
		// logger.error('Error al obtener configuración avanzada', {}, error instanceof Error ? error : undefined);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Error al obtener datos',
		};
	}
}

// ─── CRUD genérico ───────────────────────────────────────────
export async function createRecord(
	sheetName: string,
	data: Record<string, string>
): Promise<DataResponse> {
	try {
		// Si el data ya trae un campo único (ej: asistenteId, ConvId), usarlo como ID del registro
		// Si no, generar un UUID
		const row = data.id ? data : { id: generateId(), ...data };

		await appendRow(sheetName, row);

		return {
			success: true,
			data: {
				id: row.id,
				fields: data as FormularioConfiguracion
			}
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Error al crear registro',
		};
	}
}

export async function findRecord(
	sheetName: string,
	column: string,
	value: string
): Promise<Record<string, string> | null> {
	return findFirst(sheetName, column, value);
}

export async function updateRecord(
	sheetName: string,
	recordId: string,
	data: FormularioConfiguracion | ConfiguracionAvanzada,
	idColumn: string = 'id'
): Promise<DataResponse> {
	try {
		const fields = Object.fromEntries(
			Object.entries(data).filter(([_, v]) => v !== undefined && v !== null)
		);

		// Convertir valores a string para Sheets
		const stringFields: Record<string, string> = {};

		for (const [key, value] of Object.entries(fields)) {
			stringFields[key] = String(value);
		}

		await updateRowByColumn(sheetName, idColumn, recordId, stringFields);

		const record: SheetRecord = {
			id: recordId,
			fields: data,
		};

		return {
			success: true,
			data: record
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Error al actualizar datos',
		};
	}
}