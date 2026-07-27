import { FormularioConfiguracion } from "../types";
import { openai } from '../lib/openai';
import { logger } from '../lib/logger';

export { getAsistente, getConfiguracionAvanzada, updateRecord, createRecord, findRecord } from './sheets-service';
export { updateRecord as updateAirtableData } from './sheets-service';

// Utilidad para construir el prompt del assistant
export function buildAssistantPrompt(config: FormularioConfiguracion): string {
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
