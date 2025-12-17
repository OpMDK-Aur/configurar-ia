import { FormularioConfiguracion, ConfiguracionAvanzada } from './index';

export interface AirtableRecord {
    id: string;
    fields: FormularioConfiguracion | ConfiguracionAvanzada;
}

export interface AirtableResponse {
    success: boolean;
    data?: AirtableRecord;
    error?: string;
} 