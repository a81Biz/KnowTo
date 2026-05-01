# LEYES DE ARQUITECTURA DEL PIPELINE (KNOWTO)
**TODA IA DEBE LEER ESTE DOCUMENTO ANTES DE SUGERIR CAMBIOS O CREAR CÓDIGO.**

## 1. Patrón Phase Gateway (Enrutamiento)
- **Prohibido modificar `pipeline-router.helper.ts`** para agregar lógica de negocio. Este archivo solo delega por `promptId` (F0, F1, etc.).
- Toda la lógica específica de una fase (parseo, extracción, inyección en DB, ensamblaje de Markdown) DEBE vivir en su propio controlador en `src/dcfl/handlers/phases/fX.phase.ts`.

## 2. Los Retornos de los Ensambladores
- Dentro de los `fX.phase.ts`, cuando un agente es un ensamblador (`ensamblador_fX`), el handler DEBE retornar explícitamente el documento final (`return finalDoc;`). Esto permite que el Gateway intercepte el string y sobrescriba el output crudo de la IA en la base de datos (`pipeline_agent_outputs`).

## 3. Estandarización de Prompts
- **FORMATO ÚNICO:** Todos los pipelines se escriben en archivos `.md` en `src/dcfl/prompts/templates/`. NUNCA usar `.yaml` nativo.
- La estructura es una configuración YAML dentro del `.md` que define `id`, `name`, y el array de `pipeline_steps`.

## 4. Patrón de "Batalla" (Doble Agente + Juez)
- Las tareas cognitivas complejas se dividen en:
  - Agente A (Especialista)
  - Agente B (Especialista Perspectiva Alterna)
  - Juez (Gemma/Modelo Mayor) que evalúa y devuelve `{"seleccion": "A" o "B", "razon": "..."}`.
- Un "Ensamblador" (TypeScript puro) recupera el ganador y arma el documento final.

## 5. Cuidado del Código Existente (Anti-Rogue)
- Antes de modificar funciones en `supabase.service.ts` o parsers, la IA debe auditar su uso actual en el proyecto para no romper implementaciones previas.
