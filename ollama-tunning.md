# Reporte de Arquitectura de Flujo: Fase 4 (EC0366)

## 1. Diagrama de Flujo y Componentes

| Etapa | Componente (Fichero) | Método/Función | Descripción |
| :--- | :--- | :--- | :--- |
| **Inicio (FE)** | `frontend/src/controllers/step4.production.ts` | `_loadFormSchema(producto)` | Dispara la petición GET al backend. Maneja la suscripción Realtime si el status es `generating`. |
| **API Entry (BE)** | `backend/src/dcfl/api/routes/form-schema.routes.ts` | `router.get('/:projectId/:producto')` | Punto de entrada. Verifica esquemas existentes o jobs activos. Si no hay, invoca el pipeline. |
| **Orquestador** | `backend/src/dcfl/handlers/document.handlers.ts` | `runPipelineAsync(...)` | Crea el contexto enriquecido (inyecta Fase 2 y 3) y gestiona la ejecución asíncrona de los agentes. |
| **Generación (AI)** | `backend/src/dcfl/prompts/templates/F4_GENERATE_FORM_SCHEMA.md` | `agente_form_A`, `agente_form_B`, `juez_form` | Tres agentes en cascada. A y B proponen; el Juez elige el mejor borrador técnico. |
| **Ensamblaje** | `backend/src/dcfl/handlers/phases/products/form-schema.assembler.ts` | `handleFormSchemaAssembler` | **Sintetizador Programático**. Mapea módulos de la BD a campos JSON y persiste el resultado final. |

## 2. Diagrama de Clases y Métodos

### Jerarquía de Llamadas (Backend)
1. `runPipelineAsync`: Punto central de ejecución.
2. `ai.generate()`: Invoca el pipeline de agentes definido en el `.md`.
3. `handleFormSchemaAssembler`: Invocado automáticamente al final del pipeline como `assembler`.
   - Llama a `parseJsonSafely` (`helpers/json-cleaner.ts`) para sanitizar outputs de IA.
   - Interactúa con `SupabaseService` para persistir en `producto_form_schemas`.

### Análisis de Redundancia
- **Lógica Duplicada**: Se detectó que `judge-resolver.helper.ts` (`resolveJudge`) realizaba una selección que el Assembler también intentaba procesar. 
- **Estado Actual**: El Assembler ahora tiene la **Autoridad Máxima**. Ignora la selección del Juez si el JSON es inválido y reconstruye el esquema mediante código TypeScript basado en el temario de la Fase 3.

## 3. Mapa de Persistencia (Tablas y Relaciones)

| Tabla | Función en Fase 4 | Clave de Relación |
| :--- | :--- | :--- |
| `pipeline_jobs` | Registro de estado del proceso (pending, running, completed). | `project_id`, `prompt_id`, `user_inputs->producto` |
| `producto_form_schemas` | **Source of Truth**. Almacena el JSON final del formulario. | `project_id`, `producto` (Unique Index) |
| `fase2_analisis_alcance` | Fuente del temario (`estructura_tematica`) y perfil de ingreso. | `project_id` |
| `fase3_especificaciones` | Fuente de duraciones y especificaciones técnicas. | `project_id` |

**Nota sobre Jobs Zombis**: El sistema 'cree' que un Job es válido si su `status` es `pending` o `running`. Se implementó un filtro en `form-schema.routes.ts` que invalida automáticamente cualquier Job con más de 2 minutos de antigüedad (Timeout Zombi).

## 4. Estructura de Carpetas (Ruta del Dato)

```text
frontend/src/controllers/step4.production.ts
 └── backend/src/dcfl/api/routes/form-schema.routes.ts (API Gateway)
      └── backend/src/dcfl/handlers/document.handlers.ts (Orquestador)
           └── backend/src/dcfl/prompts/templates/F4_GENERATE_FORM_SCHEMA.md (Prompt Engine)
                └── backend/src/dcfl/handlers/phases/products/form-schema.assembler.ts (Sintetizador)
                     └── Supabase (Tabla: producto_form_schemas)
```

## 5. Plan de Tapizado de Logs (Propuesta)

### Frontend (Consola Navegador)
- `[F4-FLOW] Iniciando handshake para producto: [P1]`
- `[REALTIME-DEBUG] Suscrito al Job ID: [ID] | Escuchando cambios...`
- `[F4-FLOW] Schema recibido: [N] campos detectados. Iniciando renderizado.`
- `[F4-ERROR] Fallo en renderizado de campo [Name]: [Error]`

### Backend (Terminal Server)
- `[DEBUG-F4-DATA] Cargando contexto Fase 3 para proyecto [ID]`
- `[AI-INPUT] Enviando contexto enriquecido a Ollama (Tokens: ~[T])`
- `[RAW-AI-OUTPUT] Respuesta bruta recibida de Agente [A/B/Juez]`
- `[ASSEMBLER-LOG] Iniciando síntesis programática para [M] módulos.`
- `[ASSEMBLER-PERSIST] Guardando esquema final en producto_form_schemas. Éxito: [T/F]`
