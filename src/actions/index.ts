import { defineAction } from 'astro:actions';
import { ConfiguracionAvanzada, ConfiguracionAvanzadaSchema } from '../types';
import { getAsistente, updateRecord, getConfiguracionAvanzada } from '../services/index';
import type { SheetRecord } from '../types/sheet';

export const server = {
    obtenerDatosConfiguracion: defineAction({
        handler: async () => {
            try {
                const result = await getAsistente();

                if (!result.success || !result.data) {
                    return {
                        success: false,
                        error: 'No se pudo obtener la configuración'
                    };
                }

                const sheetRecord = result.data as SheetRecord;
                return {
                    success: true,
                    data: sheetRecord
                };
            } catch (error) {
                console.error('Error al obtener configuración:', error);
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Error al obtener configuración'
                };
            }
        }
    }),
    obtenerConfiguracionAvanzada: defineAction({
        handler: async () => {
            try {
                const result = await getConfiguracionAvanzada();

                if (!result.success || !result.data) {
                    return {
                        success: false,
                        error: 'No se pudo obtener la configuración avanzada'
                    };
                }

                const sheetRecord = result.data as SheetRecord;
                return {
                    success: true,
                    data: sheetRecord
                };
            } catch (error) {
                console.error('Error al obtener configuración avanzada:', error);
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Error al obtener configuración avanzada'
                };
            }
        }
    }),
    guardarConfiguracionAvanzada: defineAction({
        accept: 'json',
        input: ConfiguracionAvanzadaSchema,
        handler: async (input: { fields: ConfiguracionAvanzada }) => {
            try {
                // Intentar obtener el registro existente
                const existingData = await getConfiguracionAvanzada();

                if (existingData.success && existingData.data) {
                    // Si existe, actualizar
                    const sheetRecord = existingData.data as SheetRecord;

                    const result = await updateRecord(
                        'ConfiguracionAvanzada',
                        sheetRecord.id,
                        { ...sheetRecord.fields, ...input.fields },
                        'asistenteId'
                    );
                    return result;
                }
            } catch (error) {
                console.error('Error al guardar configuración avanzada:', error);
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Error al guardar configuración avanzada'
                };
            }
        }
    })
}

export async function getAsistenteConfig() {
    try {
        const response = await getAsistente();
        if (!response.success || !response.data) {
            throw new Error(response.error || 'Error al obtener configuración del asistente');
        }
        return response;
    } catch (error) {
        console.error('Error en getAsistenteConfig:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al obtener configuración del asistente'
        };
    }
}

