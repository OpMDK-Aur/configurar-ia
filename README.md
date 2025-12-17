# Aurelia Bot Configuration

Sistema de configuración y gestión de asistentes virtuales de IA para empresas, construido con Astro, React y TypeScript.

## 📊 Logging y Monitoreo

Este proyecto incluye un sistema de logging estructurado optimizado para Vercel que proporciona:

- **Logs estructurados en JSON** para fácil análisis en la consola de Vercel
- **Request IDs únicos** para rastrear requests completas
- **Métricas de rendimiento** para operaciones críticas
- **Contexto detallado** para debugging y monitoreo
- **Logs específicos** para operaciones de Airtable y OpenAI

### Niveles de Log

- **INFO**: Operaciones normales, métricas de rendimiento
- **WARN**: Validaciones fallidas, configuraciones faltantes
- **ERROR**: Errores de API, excepciones no manejadas
- **DEBUG**: Información detallada (solo en desarrollo)

### Logs en Vercel

Los logs aparecen en la consola de Vercel con el siguiente formato:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "message": "API Success: guardar-config",
  "context": {
    "duration": 1250,
    "assistantId": "asst_abc123",
    "requestId": "req_1705312200000_abc123def"
  },
  "requestId": "req_1705312200000_abc123def"
}
```

## 🚀 Características

- **Configuración de Asistentes**: Interfaz intuitiva para configurar asistentes de OpenAI
- **Integración con Airtable**: Base de datos para almacenar configuraciones
- **Chat en Tiempo Real**: Playground para probar asistentes configurados
- **Sistema de Alertas**: Notificaciones centralizadas y logging estructurado
- **Validación Robusta**: Verificación exhaustiva de configuraciones

## 🏗️ Arquitectura

```text
/
├── src/
│   ├── components/          # Componentes React y Astro
│   │   ├── Form.astro      # Formulario principal de configuración
│   │   ├── Chat.tsx        # Componente de chat
│   │   ├── AlertSystem.tsx # Sistema de alertas
│   │   └── ...
│   ├── pages/              # Páginas de la aplicación
│   │   ├── index.astro     # Página principal
│   │   ├── playground.astro # Playground de chat
│   │   └── api/            # Endpoints de API
│   ├── services/           # Lógica de negocio
│   │   └── index.ts        # Servicios de Airtable y OpenAI
│   ├── hooks/              # Hooks de React
│   ├── types/              # Definiciones de TypeScript
│   └── lib/                # Utilidades y configuraciones
├── public/                 # Archivos estáticos
└── docs/                   # Documentación técnica
```

## 🔧 Configuración

### Variables de Entorno Requeridas

```env
# Airtable
AIRTABLE_API_KEY=your_airtable_api_key
AIRTABLE_BASE_ID=your_airtable_base_id

# Cliente
LOCATION_ID=your_location_id

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Entorno (requerido para logging)
NODE_ENV=production
```

### Configuración en Vercel

1. **Variables de Entorno**: Configurar todas las variables de entorno en el dashboard de Vercel
2. **Logging**: Los logs aparecen automáticamente en la consola de Vercel
3. **Monitoreo**: Usar los filtros de la consola para rastrear requests específicas

### Estructura de Airtable

El sistema utiliza las siguientes tablas en Airtable:

- **AsistentePorCliente**: Relaciona `locationId` con `asistenteId`
- **Asistente**: Almacena la configuración del asistente
- **ConfiguracionAvanzada**: Configuración adicional
- **Conversaciones**: Historial de conversaciones
- **Mensajes**: Mensajes individuales de las conversaciones

## 🚀 Comandos

| Comando                   | Acción                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Instalar dependencias                            |
| `npm run dev`             | Iniciar servidor de desarrollo                   |
| `npm run build`           | Construir para producción                        |
| `npm run preview`         | Previsualizar build local                        |

## 🔄 Flujo de Datos

1. **Configuración**: Usuario completa formulario → Validación → Guardado en Airtable → Creación/actualización en OpenAI
2. **Chat**: Usuario envía mensaje → Validación de asistente → Procesamiento con OpenAI → Respuesta
3. **Validación**: Sistema verifica `openAiAssistantId` y campos requeridos en tiempo real

## 📚 Documentación

- [Flujo de Datos del Formulario](FLUJO_DATOS_FORMULARIO.md)
- [Oportunidades de Mejora](OPORTUNIDADES_MEJORA.md)
- [Sistema de Logging para Vercel](LOGGING_VERCEL.md)

## 🛠️ Tecnologías

- **Frontend**: Astro, React, TypeScript, Tailwind CSS
- **Backend**: Astro API Routes
- **Base de Datos**: Airtable
- **IA**: OpenAI API
- **Despliegue**: Vercel
- **Logging**: Sistema estructurado personalizado para Vercel

## 📝 Notas Importantes

- **LOCATION_ID**: Es la única variable de entorno necesaria para identificar al cliente
- **Validación**: El sistema valida exhaustivamente que `openAiAssistantId` exista y no esté vacío
- **Relaciones**: Todas las relaciones se resuelven automáticamente a partir de `LOCATION_ID`
- **Logging**: Todos los logs incluyen request IDs únicos para facilitar el debugging en Vercel
- **Performance**: Se registran métricas de rendimiento para operaciones críticas (Airtable, OpenAI)
