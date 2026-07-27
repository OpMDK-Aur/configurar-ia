import { FormularioConfiguracion, ConfiguracionAvanzada } from './index';

export interface SheetRecord {
    id: string;
    fields: FormularioConfiguracion | ConfiguracionAvanzada;
}

export interface DataResponse {
    success: boolean;
    data?: SheetRecord;
    error?: string;
}