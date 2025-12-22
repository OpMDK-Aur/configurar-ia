import { z } from 'zod';


export interface AirtableResponse<T> {
	success: boolean;
	data?: T;
	error?: string;
}

export interface MessageFromAirtable {
	MsgId: number;
	ConvId: string[];
	Autor: string;
	Contenido: string;
	RoleOpenAI: 'user' | 'assistant';
	FechaHora: string;
	id?: string;
}


export interface Message {
	id?: string;
	role: 'user' | 'assistant';
	content: string;
	hora?: string;
}

export enum Tono {
	Profesional = 'Profesional',
	Informal = 'Informal',
	Tecnico = 'Técnico',
	Cercano = 'Cercano',
	Empatico = 'Empático'
}

export enum Objetivo {
	Asesorar = 'Asesorar',
	Precalificar = 'Precalificar',
	AsesoraryPrecalificar = 'Asesorar y Precalificar',
	Recolectarinformacionyderivar = 'Recolectar información y derivar',
	Recolectarinformacionasesoraryderivar = 'Recolectar información, asesorar y derivar'
}

export const FormularioConfiguracionSchema = z.object({
	fields: z.object({
		NombreAsistente: z.string().min(1, 'El nombre del asistente es requerido'),
		NombreEmpresa: z.string().min(1, 'El nombre de la empresa es requerido'),
		Tono: z.nativeEnum(Tono),
		DescripcionEmpresa: z.string().optional(),
		Sector: z.string().optional(),
		ClientesObjetivos: z.string().optional(),
		Personalidad: z.string().optional(),
		PreguntasCalificacion: z.string().optional(),
		PreguntasFrecuentes: z.string().optional(),
		EjemplosConversaciones: z.string().optional(),
		ManejoObjeciones: z.string().optional(),
		ProductosNoDisponibles: z.string().optional(),
		InfoAdicional: z.string().optional(),
		SitiosWeb: z.string().optional(),
		NoResponder: z.string().optional(),
    MensajeRecontacto: z.string().optional(),
		ComandosPropios: z.string().optional(),
		openAiAssistantId: z.string().optional()
	})
});

export const ConfiguracionAvanzadaSchema = z.object({
	fields: z.object({
		TiempoRespuesta: z.number().min(1, 'El tiempo de respuesta es requerido'),
		Recontactos: z.number().min(0, 'El número de recontactos es requerido'),
		TiempoRecontacto: z.number().min(1, 'El tiempo de recontacto es requerido'),
		UnidadRecontactos: z.enum(["minutes", "hours", "days"])
	})
});

export type FormularioConfiguracion = z.infer<typeof FormularioConfiguracionSchema>['fields'];
export type ConfiguracionAvanzada = z.infer<typeof ConfiguracionAvanzadaSchema>['fields'];
