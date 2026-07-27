# Plan: Reemplazar Airtable por Google Sheets

## Contexto Actual

El proyecto **configurar-ia** (aurelia-bot-configuration) usa Astro SSR + React + OpenAI. Actualmente depende del SDK `airtable@0.12.2` para persistir datos en **6 tablas de Airtable**:

- `AsistentePorCliente` — vincula un `locationId` con un `asistenteId`
- `Asistente` — configuración del asistente (nombre, empresa, descripción, comandos, etc.)
- `ConfiguracionAvanzada` — configuración avanzada (tiempo de respuesta, recontactos)
- `Conversaciones` — conversaciones del chatbot (canal, estado, thread de OpenAI)
- `Mensajes` — mensajes individuales de cada conversación
- `Clientes` — datos del cliente
- `Feedback` — feedback positivo/negativo sobre mensajes

La consulta y escritura está dispersa en:

| Archivo | Operación |
|---|---|
| `src/services/index.ts` | `getAsistente()`, `getConfiguracionAvanzada()`, `updateAirtableData()` |
| `src/pages/api/chat.ts` | Escribe mensajes en `Mensajes` (líneas 184-197) |
| `src/pages/api/feedback.ts` | Escribe en `Feedback` (líneas 39-43) |
| `src/pages/api/conversations.ts` | Lee/escribe `Conversaciones`, `Clientes`, `Mensajes` (GET + POST) |
| `src/pages/api/guardar-config.ts` | Actualiza configuración via `updateAirtableData()` |
| `src/actions/index.ts` | Llama a `updateAirtableData()` para guardar config |

---

## Mapeo de Tablas → Hojas

| Tabla Airtable | Hoja Google Sheets | Columnas clave |
|---|---|---|
| `AsistentePorCliente` | `AsistentePorCliente` | `id`, `locationId`, `asistenteId` |
| `Asistente` | `Asistente` | `id`, `asistenteId`, `NombreAsistente`, `NombreEmpresa`, `DescripcionEmpresa`, `openAiAssistantId`, `Sector`, `ClientesObjetivos`, `Personalidad`, `PreguntasCalificacion`, `PreguntasFrecuentes`, `EjemplosConversaciones`, `ManejoObjeciones`, `ProductosNoDisponibles`, `InfoAdicional`, `SitiosWeb`, `NoResponder`, `MensajeRecontacto`, `ComandosPropios` |
| `ConfiguracionAvanzada` | `ConfiguracionAvanzada` | `id`, `asistenteId`, `TiempoRespuesta`, `Recontactos`, `TiempoRecontacto`, `UnidadRecontactos` |
| `Conversaciones` | `Conversaciones` | `id`, `ConvId`, `locationId`, `Asistente`, `Estado`, `ThreadId`, `FechaInicio` |
| `Mensajes` | `Mensajes` | `id`, `MsgId`, `ConvId`, `Autor`, `Contenido`, `RoleOpenAI`, `FechaHora` |
| `Clientes` | `Clientes` | `id`, `locationId`, ... |
| `Feedback` | `Feedback` | `id`, `MsgId`, `mensaje`, `Tipo` |

> **Nota importante**: Se agrega columna `id` (UUID) en cada hoja porque Google Sheets no tiene record IDs estables como Airtable. Las foreign keys se manejan por valor de texto, no por IDs de registro.

---

## Decisiones de Arquitectura

| Decisión | Elección | Justificación |
|---|---|---|
| Estructura de datos | Un spreadsheet, varias hojas | Simple, un solo recurso de Google, relaciones por IDs de texto |
| Library | `googleapis` (oficial de Google) | Más completa, soporta service accounts, ampliamente soportada |
| Autenticación | Service Account (ya existe) | Acceso server-side sin OAuth, permisos por spreadsheet |
| Integración Astro | Módulo standalone en `src/lib/` | Simple, portable, sin overhead de integration |

---

## Pasos de Implementación

### Paso 1: Crear cliente de Google Sheets

**Archivo nuevo: `src/lib/sheets.ts`**

Módulo de configuración y helpers genéricos para interactuar con Google Sheets.

Responsabilidades:
- Configurar autenticación con Service Account (JSON key via env var)
- Proveer helpers genéricos:
  - `getSheetData(spreadsheetId, range)` → lee filas de una hoja
  - `appendRow(spreadsheetId, range, values)` → agrega una fila
  - `updateRow(spreadsheetId, range, values)` → actualiza fila(s) por rango
  - `findRows(spreadsheetId, range, predicate)` → filtro client-side sobre filas leídas
  - `generateId()` → genera UUID para la columna `id`

Variables de entorno requeridas:
- `GOOGLE_SHEETS_SPREADSHEET_ID` — ID del spreadsheet
- `GOOGLE_SERVICE_ACCOUNT_JSON` — JSON string del service account (o path al archivo)

---

### Paso 2: Crear servicio de datos

**Archivo nuevo: `src/services/sheets-service.ts`**

Capa de servicio que reemplaza las funciones de Airtable con Google Sheets.

Funciones a implementar:

| Función actual (Airtable) | Nueva función (Sheets) | Dónde se usa |
|---|---|---|
| `getAsistente()` | `getAsistente()` | `guardar-config.ts`, `chat.ts`, `conversations.ts` |
| `getConfiguracionAvanzada()` | `getConfiguracionAvanzada()` | `FormAdvancedConfig.astro` |
| `updateAirtableData(table, id, data)` | `updateRecord(sheetName, id, data)` | `guardar-config.ts`, `actions/index.ts` |

**Nuevos helpers** (no existían en Airtable):
- `createRecord(sheetName, data)` → crea un registro (conversaciones, mensajes, feedback)
- `findFirst(sheetName, columnName, value)` → busca el primer registro que coincida

Patrón de filtrado (reemplaza `filterByFormula`):
```ts
// Airtable (server-side):
base('Asistente').select({
  filterByFormula: `{locationId} = '${locationId}'`
}).firstPage();

// Google Sheets (client-side):
const rows = await getSheetData(SPREADSHEET_ID, 'AsistentePorCliente!A:Z');
const match = rows.find(row => row.locationId === locationId);
```

---

### Paso 3: Refactorizar `src/services/index.ts`

Cambios:
- Eliminar `import Airtable from 'airtable'` y toda la config de Airtable (líneas 1, 7-12)
- Re-exportar funciones desde `sheets-service.ts`
- **Mantener intactas** las funciones que NO son de Airtable:
  - `buildAssistantPrompt()` (línea 195)
  - `createOpenAIAssistant()` (línea 208)
  - `updateOpenAIAssistant()` (línea 249)

---

### Paso 4: Actualizar API Routes

Cada route que usa `base(...)` directamente:

| Archivo | Líneas | Cambio |
|---|---|---|
| `src/pages/api/chat.ts` | 3, 9-13, 184-197 | Eliminar import Airtable, reemplazar `base("Mensajes").create(...)` → `createRecord('Mensajes', data)` |
| `src/pages/api/feedback.ts` | 2, 5-9, 24-27, 39-43 | Eliminar import Airtable, reemplazar queries y creates |
| `src/pages/api/conversations.ts` | 2, 9-13, 29-67, 98-103, 149-184 | Eliminar import Airtable, reemplazar todas las queries y creates de `Clientes`, `Conversaciones`, `Mensajes` |
| `src/pages/api/guardar-config.ts` | 88 | Ya usa `updateAirtableData()` del servicio, solo cambia el nombre de la función |

En todos: eliminar `import Airtable from 'airtable'` y la config `Airtable.configure({...})`.

---

### Paso 5: Actualizar tipos

- Renombrar `src/types/airtable.ts` → `src/types/sheets.ts`
- Renombrar interfaces:
  - `AirtableRecord` → `SheetRecord`
  - `AirtableResponse` → `DataResponse`
- Actualizar `src/types/index.ts`:
  - `MessageFromAirtable` → `MessageFromSheet`
  - `AirtableResponse<T>` → `DataResponse<T>`
- Actualizar imports en todos los archivos afectados

---

### Paso 6: Variables de entorno

**Eliminar:**
```
AIRTABLE_API_KEY
AIRTABLE_BASE_ID
```

**Agregar:**
```
GOOGLE_SHEETS_SPREADSHEET_ID=xxx
GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'
```

**Mantener:**
```
LOCATION_ID
OPENAI_API_KEY
```

---

### Paso 7: Limpiar dependencias

```bash
npm uninstall airtable
npm install googleapis
```

---

## Orden de Ejecución

```
 1. src/lib/sheets.ts              (nuevo — cliente base)
 2. src/services/sheets-service.ts  (nuevo — capa de servicio)
 3. src/types/sheets.ts             (renombrar desde airtable.ts)
 4. src/types/index.ts              (actualizar tipos)
 5. src/services/index.ts           (refactorizar)
 6. src/pages/api/chat.ts           (actualizar)
 7. src/pages/api/feedback.ts       (actualizar)
 8. src/pages/api/conversations.ts  (actualizar)
 9. src/pages/api/guardar-config.ts (actualizar)
10. src/actions/index.ts            (actualizar)
11. src/hooks/useConversation.tsx    (actualizar import de tipos)
12. src/components/*.astro           (actualizar imports de tipos)
13. src/pages/*.astro                (actualizar imports de tipos)
14. package.json                     (swap airtable → googleapis)
15. .env / .env.example              (actualizar env vars)
```

---

## Archivos Afectados

| Archivo | Tipo de cambio |
|---|---|
| `src/lib/sheets.ts` | **NUEVO** — cliente de Google Sheets |
| `src/services/sheets-service.ts` | **NUEVO** — servicio de datos |
| `src/types/sheets.ts` | **RENOMBRADO** desde `airtable.ts` |
| `src/types/index.ts` | Modificado — renombrar interfaces |
| `src/services/index.ts` | Modificado — eliminar Airtable, re-exportar |
| `src/pages/api/chat.ts` | Modificado — eliminar Airtable directo |
| `src/pages/api/feedback.ts` | Modificado — eliminar Airtable directo |
| `src/pages/api/conversations.ts` | Modificado — eliminar Airtable directo |
| `src/pages/api/guardar-config.ts` | Modificado — actualizar nombre función |
| `src/actions/index.ts` | Modificado — actualizar imports |
| `src/hooks/useConversation.tsx` | Modificado — actualizar import de tipos |
| `src/components/Chat.tsx` | Modificado — actualizar import de tipos |
| `src/components/Form.astro` | Modificado — actualizar import de tipos |
| `src/components/FormAdvancedConfig.astro` | Modificado — actualizar import de tipos |
| `src/components/verPrompt.astro` | Modificado — actualizar import de tipos |
| `src/pages/VerPrompt.astro` | Modificado — actualizar import de tipos |
| `package.json` | Modificado — swap dependencia |
| `.env` / `.env.example` | Modificado — actualizar env vars |

---

## Riesgos y Consideraciones

### Performance
Google Sheets API es más lento que Airtable para queries grandes. Para este caso de uso (pocos registros, configuración de asistente) **no debería ser problema**.

### Filtrado
Airtable hace `filterByFormula` server-side. Google Sheets requiere traer todas las filas y filtrar en código. Con volúmenes bajos (decenas/hundreds de registros) es aceptable.

### Relaciones
Las foreign keys (ej: `locationId` como referencia) se manejan por valor de texto, no por IDs de registro como en Airtable. Esto es más simple pero requiere consistencia en los valores.

### Concurrencia
Google Sheets puede tener issues con escrituras simultáneas (HTTP 409 Conflict). Para este proyecto (un solo usuario configurando a la vez) no debería ser problema. Se puede manejar con retry si es necesario.

### Límites
- 10M celdas por spreadsheet — más que suficiente
- 300requests/min por project — suficiente para este uso
- 10MB por celda de contenido — suficiente para todos los campos

### Auth
El Service Account necesita tener acceso al spreadsheet (compartir el spreadsheet con el email del Service Account: `xxx@xxx.iam.gserviceaccount.com` con permiso de Editor).

---

## Env Vars Requeridas

```env
# Google Sheets (NUEVAS)
GOOGLE_SHEETS_SPREADSHEET_ID=tu_spreadsheet_id
GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'

# OpenAI (se mantiene)
OPENAI_API_KEY=sk-...

# Ubicación (se mantiene)
LOCATION_ID=tu_location_id

# Astro (se mantiene)
ASTRO_OUTPUT=server
```
