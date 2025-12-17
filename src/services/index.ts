import Airtable from 'airtable';
import { ConfiguracionAvanzada, FormularioConfiguracion } from "../types";
import { AirtableResponse, AirtableRecord } from "../types/airtable";
import { openai } from '../lib/openai';
import { logger } from '../lib/logger';
// esta linea es para poder hacer un commit con los cambios de Axel.
// Configuración global de Airtable
Airtable.configure({
    apiKey: import.meta.env.AIRTABLE_API_KEY
});

const base = Airtable.base(import.meta.env.AIRTABLE_BASE_ID);

// Variable para almacenar el thread ID
let currentThreadId: string | null = null;

interface ConversacionFields extends Record<string, unknown> {
    asistenteId: string[];
    fechaInicio: string;
    estado: string;
}

export async function getAsistente(): Promise<AirtableResponse> {
    const startTime = Date.now();
    try {
        logger.airtableOperation('query', 'AsistentePorCliente', {
            locationId: import.meta.env.LOCATION_ID
        });
        // Primero obtenemos el asistente asociado al locationId
        const asistentePorClienteRecords = await base('AsistentePorCliente').select({
            filterByFormula: `{locationId} = '${import.meta.env.LOCATION_ID}'`,
            maxRecords: 1
        }).firstPage();

        if (!asistentePorClienteRecords || asistentePorClienteRecords.length === 0) {
            logger.warn('No se encontró asistente asociado al cliente', {
                locationId: import.meta.env.LOCATION_ID
            });
            return {
                success: false,
                error: 'No se encontró asistente asociado al cliente'
            };
        }

        // Obtenemos el asistenteId de la relación
        const asistenteId = asistentePorClienteRecords[0].fields.asistenteId;
        if (!asistenteId) {
            logger.error('No se encontró ID del asistente en la relación', {
                asistentePorClienteId: asistentePorClienteRecords[0].id
            });
            return {
                success: false,
                error: 'No se encontró ID del asistente'
            };
        }

        // Ahora obtenemos los datos del asistente
        logger.airtableOperation('query', 'Asistente', {
            asistenteId
        });
        
        const asistenteRecords = await base('Asistente').select({
            filterByFormula: `{asistenteId} = '${asistenteId}'`,
            maxRecords: 1
        }).firstPage();

        if (!asistenteRecords || asistenteRecords.length === 0) {
            logger.error('No se encontró el asistente en la tabla Asistente', {
                asistenteId
            });
            return {
                success: false,
                error: 'No se encontró el asistente en la tabla Asistente'
            };
        }

        const fields = asistenteRecords[0].fields as FormularioConfiguracion;
        
        const record: AirtableRecord = {
            id: asistenteRecords[0].id,
            fields: fields
        };
        
        const duration = Date.now() - startTime;
        logger.performance('getAsistente', duration, {
            asistenteId: asistenteId,
            nombreAsistente: fields.NombreAsistente
        });
        
        return {
            success: true,
            data: record
        };
    } catch (error) {
        const duration = Date.now() - startTime;
        logger.error('Error al obtener asistente', {
            duration,
            locationId: import.meta.env.LOCATION_ID
        }, error instanceof Error ? error : undefined);
        
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al obtener datos'
        };
    }
}

export async function getConfiguracionAvanzada(): Promise<AirtableResponse> {
    try {
        // Primero obtenemos el asistente asociado al locationId
        const asistentePorClienteRecords = await base('AsistentePorCliente').select({
            filterByFormula: `{locationId} = '${import.meta.env.LOCATION_ID}'`,
            maxRecords: 1
        }).firstPage();
    console.info({asistentePorClienteRecords});

        if (!asistentePorClienteRecords || asistentePorClienteRecords.length === 0) {
            return {
                success: false,
                error: 'No se encontró asistente asociado al cliente'
            };
        }

        // Obtenemos el asistenteId de la relación
        const asistenteId = asistentePorClienteRecords[0].fields.asistenteId;
        if (!asistenteId) {
            return {
                success: false,
                error: 'No se encontró ID del asistente'
            };
        }

        // Ahora obtenemos los datos del asistente
        const configuracionAvanzada = await base('ConfiguracionAvanzada')
            .select({
                filterByFormula: `{asistenteId (from asistenteId)} = '${asistenteId}'`,
                maxRecords: 1
            })
            .firstPage();
    console.info({configuracionAvanzada});

        if (!configuracionAvanzada || configuracionAvanzada.length === 0) {
            return {
                success: false,
                error: 'No se encontró el asistente'
            };
        }
    console.info({fields: configuracionAvanzada[0].fields});

        const record: AirtableRecord = {
            id: configuracionAvanzada[0].id,
            fields: configuracionAvanzada[0].fields as ConfiguracionAvanzada
        };

        return {
            success: true,
            data: record
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al obtener datos'
        };
    }
}

export async function updateAirtableData(table: string, recordId: string, data: FormularioConfiguracion | ConfiguracionAvanzada): Promise<AirtableResponse> {
    try {
        // Filtrar campos undefined y null
        const fields = Object.fromEntries(
            Object.entries(data).filter(([_, value]) => value !== undefined && value !== null)
        );

        // Actualizamos el registro
        const record = await base(table).update(recordId, fields);

        const airtableRecord: AirtableRecord = {
            id: record.id,
            fields: record.fields as FormularioConfiguracion | ConfiguracionAvanzada
        };

        return {
            success: true,
            data: airtableRecord
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al actualizar datos'
        };
    }
}

// Utilidad para construir el prompt del assistant
export function buildAssistantPrompt(config: FormularioConfiguracion): string {
  console.info(config)
    let msg = `${config.DescripcionEmpresa}`;

    if (config.ComandosPropios != null && config.ComandosPropios !== "") {
        msg += `
---
${config.ComandosPropios}`;
    }

    return msg;
}

export async function createOpenAIAssistant(config: FormularioConfiguracion): Promise<{ success: boolean; assistantId?: string; error?: string }> {
    const startTime = Date.now();
    try {
        logger.openaiOperation('create_assistant', {
            nombreAsistente: config.NombreAsistente,
            nombreEmpresa: config.NombreEmpresa
        });
        
        // Usar la utilidad para construir el prompt
        const systemPrompt = buildAssistantPrompt(config);
        // Create the assistant
        const assistant = await openai.beta.assistants.create({
            name: config.NombreAsistente,
            instructions: systemPrompt,
            model: "gpt-4o-mini"
        });

        const duration = Date.now() - startTime;
        logger.performance('createOpenAIAssistant', duration, {
            assistantId: assistant.id,
            nombreAsistente: config.NombreAsistente
        });

        return {
            success: true,
            assistantId: assistant.id
        };
    } catch (error) {
        const duration = Date.now() - startTime;
        logger.error('Error al crear asistente de OpenAI', {
            duration,
            nombreAsistente: config.NombreAsistente
        }, error instanceof Error ? error : undefined);
        
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al crear el asistente de OpenAI'
        };
    }
}

export async function updateOpenAIAssistant(assistantId: string, config: FormularioConfiguracion): Promise<{ success: boolean; assistantId?: string; error?: string }> {
    const startTime = Date.now();
    try {
        logger.openaiOperation('update_assistant', {
            assistantId,
            nombreAsistente: config.NombreAsistente,
            nombreEmpresa: config.NombreEmpresa
        });

        // Usar la utilidad para construir el prompt
        const systemPrompt = buildAssistantPrompt(config);

        // Update the assistant
        const assistant = await openai.beta.assistants.update(assistantId, {
            name: config.NombreAsistente,
            instructions: systemPrompt,
            model: "gpt-4o-mini"
        });

        const duration = Date.now() - startTime;
        logger.performance('updateOpenAIAssistant', duration, {
            assistantId: assistant.id,
            nombreAsistente: config.NombreAsistente
        });

        return {
            success: true,
            assistantId: assistant.id
        };
    } catch (error) {
        const duration = Date.now() - startTime;
        logger.error('Error al actualizar asistente de OpenAI', {
            duration,
            assistantId,
            nombreAsistente: config.NombreAsistente
        }, error instanceof Error ? error : undefined);
        
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al actualizar el asistente de OpenAI'
        };
    }
}



