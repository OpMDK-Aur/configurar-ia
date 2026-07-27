import { defineAction } from 'astro:actions';
import { FormularioConfiguracionSchema, type FormularioConfiguracion, ConfiguracionAvanzada, ConfiguracionAvanzadaSchema } from '../types';
import { getAsistente, updateRecord, getConfiguracionAvanzada, createOpenAIAssistant, updateOpenAIAssistant } from '../services/index';
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
    guardarCambiosConfiguracion: defineAction({
        accept: 'json',
        input: FormularioConfiguracionSchema,
        handler: async (input: { fields: FormularioConfiguracion }) => {
            try {
                //console.log('Action received input:', input);
                const existingData = await getAsistente();

                if (!existingData.success || !existingData.data) {
                    //console.log('No existing configuration found');
                    return {
                        success: false,
                        error: 'No existe configuración para actualizar'
                    };
                }

                const sheetRecord = existingData.data as SheetRecord;
                if (!sheetRecord.id) {
                    console.error('No se encontró el ID del registro');
                    return {
                        success: false,
                        error: 'No se encontró el ID del registro'
                    };
                }

                // Check if we have an existing OpenAI assistant ID
                // const existingAssistantId = (sheetRecord.fields as FormularioConfiguracion).openAiAssistantId;
                // let assistantResult;

                // if (existingAssistantId) {
                //     // Update existing assistant
                //     //console.log('Updating existing OpenAI assistant:', existingAssistantId);
                //     assistantResult = await updateOpenAIAssistant(existingAssistantId, input.fields);
                // } else {
                //     // Create new assistant
                //     //console.log('Creating new OpenAI assistant');
                //     assistantResult = await createOpenAIAssistant(input.fields);
                // }

                // if (!assistantResult.success) {
                //     console.error('Error al manejar el asistente de OpenAI:', assistantResult.error);
                //     return {
                //         success: false,
                //         error: assistantResult.error || 'Error al manejar el asistente de OpenAI'
                //     };
                // }

                // Procesar los datos para eliminar campos undefined y mantener solo los campos necesarios
                const processedData: FormularioConfiguracion & { openAiAssistantId?: string } = {
                    NombreAsistente: input.fields.NombreAsistente,
                    NombreEmpresa: input.fields.NombreEmpresa,
                    Tono: input.fields.Tono,
                    DescripcionEmpresa: input.fields.DescripcionEmpresa || '',
                    Sector: input.fields.Sector || '',
                    ClientesObjetivos: input.fields.ClientesObjetivos,
                    Personalidad: input.fields.Personalidad || '',
                    PreguntasCalificacion: input.fields.PreguntasCalificacion || '',
                    PreguntasFrecuentes: input.fields.PreguntasFrecuentes || '',
                    EjemplosConversaciones: input.fields.EjemplosConversaciones || '',
                    ManejoObjeciones: input.fields.ManejoObjeciones || '',
                    Objetivo: input.fields.Objetivo || '',
                    ProductosNoDisponibles: input.fields.ProductosNoDisponibles || '',
                    InfoAdicional: input.fields.InfoAdicional || '',
                    SitiosWeb: input.fields.SitiosWeb || '',
                    //openAiAssistantId: assistantResult.assistantId,
                };

                const result = await updateRecord(
                    'Asistente',
                    sheetRecord.id,
                    processedData,
                    'asistenteId'
                );

                //console.log('Update result:', result);

                if (result.success) {
                    return {
                        ...result,
                        message: 'Configuración actualizada correctamente',
                    };
                }
                return {
                    ...result,
                    message: 'Error al actualizar configuración',
                };
            } catch (error) {
                console.error('Error al actualizar configuración:', error);
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Error al actualizar configuración'
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

