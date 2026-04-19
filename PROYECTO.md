# KnowTo — Descripción del Proyecto

## ¿Qué es esto?

KnowTo es una **plataforma de micrositios de certificación asistidos por inteligencia artificial**. Cada micrositio guía a un cliente a través de un wizard conversacional que, fase por fase, genera los documentos técnicos requeridos por un estándar de certificación mexicano (CONOCER). La IA no es un chatbot: es un pipeline multi-agente que extrae datos del cliente, genera borradores paralelos, los evalúa con un juez y entrega un documento final limpio. Todo corre en contenedores Docker con un stack completamente self-hosted.

---

## Stack técnico

| Capa | Tecnología |
|:---|:---|
| Frontend | Vanilla TypeScript + Vite + Tailwind CSS (sin framework) |
| Backend | Node.js 20 + Hono + `@hono/zod-openapi` (Cloudflare Workers-compatible) |
| Base de datos | PostgreSQL 15 vía Supabase self-hosted (Auth, REST, Realtime) |
| IA | Cloudflare Workers AI (modelos llama-3.1-8b, llama-3.3-70b, mistral-7b, qwen2.5-7b) |
| Infra local | Docker Compose: nginx reverse proxy + Supabase stack + Ollama (dev) |
| Routing | nginx enruta subdominios: `dcfl.localhost` → frontend DCFL, `api.localhost` → backend |

---

## Arquitectura multi-microsite

```
localhost           → Portal raíz (index.html, selección de microsite)
dcfl.localhost      → Microsite DCFL (diseño de cursos EC0366)
cce.localhost       → Microsite CCE (consultoría empresarial)
api.localhost/dcfl  → API del microsite DCFL
api.localhost/cce   → API del microsite CCE
```

Cada microsite es un frontend Vite independiente con su propio bundle, sus propias rutas de API y sus propias tablas en la misma BD PostgreSQL. El backend es un único servidor Hono que enruta por prefijo (`/dcfl/...`, `/cce/...`).

---

## Microsite activo: DCFL — Diseño de Cursos para la Certificación

### ¿Qué hace?

Genera los documentos técnicos necesarios para que un instructor pueda certificarse ante el CONOCER bajo el estándar **EC0366** ("Diseño de cursos de capacitación"). Un cliente contrata el servicio y la IA produce todos los entregables: desde el diagnóstico de necesidades hasta los instrumentos de evaluación.

### Estándar EC0366 — Elementos certificables

| Elemento | Qué cubre |
|:---|:---|
| E1219 | Diseño instruccional (F0–F3) |
| E1220 | Producción del curso (F4, 8 productos) |
| E1221 | Verificación y ajustes (F5–F6) |

### Wizard — 12 pasos (Fases F0 a F6)

| Paso | Fase | Documento generado | Estado |
|:---:|:---:|:---|:---:|
| 0 | F0 | Marco de Referencia del Cliente | ✅ |
| 1 | F1 | Informe de Necesidades de Capacitación (EC0249) | ✅ |
| 2 | F2 | Especificaciones de Análisis y Diseño | ✅ |
| 2b | F2b | Confrontación de discrepancias F1 vs F2 | ✅ |
| 3 | F2.5 | Recomendaciones de producción multimedia | ✅ |
| 3 | F3 | Especificaciones Técnicas del Curso | ✅ |
| 4 | F4 | Sub-wizard de 8 productos de producción | ✅ |
| 5 | F5 | Verificación y checklist | ⚠️ parcial |
| 6 | F6 | Ajustes, evidencias e inventario de firmas | ⚠️ parcial |
| 10 | — | Resumen y entrega | ✅ |

### Los 8 productos de F4 (sub-wizard de producción)

Cada producto tiene su propio pipeline multi-agente (extractor → agente A → agente B → juez → validador → sintetizador) y se persiste en la tabla `fase4_productos`.

| # | Producto | Documento |
|:---:|:---|:---|
| P0 | Cronograma de producción | Tabla de fases con fechas |
| P1 | Información general del curso | Ficha técnica EC0366 |
| P2 | Guías de actividades de aprendizaje | Actividades por módulo con ponderaciones |
| P3 | Calendario de actividades | Distribución semanal |
| P4 | Documentos de texto del contenido | Contenido temático por módulo |
| P5 | Presentación electrónica | Estructura de diapositivas por módulo |
| P6 | Guiones de material multimedia | Guiones de video con timecodes |
| P7 | Instrumentos de evaluación | Cuestionario diagnóstico + rúbrica + lista de cotejo |

### Pipeline multi-agente (patrón por fase)

```
extractor (código JSON)
    ↓
agente_A (llama-3.1-8b) ─┐
                           ├→ juez (llama-3.1-8b) → validador (código) → sintetizador_final
agente_B (llama-3.3-70b) ─┘
```

Los **validadores** y el **sintetizador_final** son handlers de código puro (sin IA): garantizan invariantes específicos del estándar (número mínimo de preguntas, ponderaciones que sumen 100%, etc.) sin depender del LLM.

---

## Tablas en PostgreSQL

| Tabla | Qué guarda |
|:---|:---|
| `wizard_projects` | Proyecto por cliente (nombre, industria, tema del curso) |
| `wizard_steps` | Inputs del usuario por paso |
| `pipeline_jobs` | Estado y resultado de cada ejecución del pipeline |
| `pipeline_job_agents` | Output por agente dentro de cada job (checkpointing) |
| `preguntas_fase` | Preguntas IA generadas para la siguiente fase |
| `fase1_informe_necesidades` | Q&A parseado, brechas, objetivos, perfil del participante |
| `fase2_analisis` | Módulos, modalidad, plataforma, perfil ajustado |
| `fase2_resolucion` | Resolución de discrepancias F1 vs F2 |
| `fase2_5_recomendaciones` | Recomendaciones multimedia y parámetros de producción |
| `fase3_especificaciones` | Plataforma LMS, SCORM, tiempos, criterios de aceptación |
| `fase4_productos` | Cada uno de los 8 productos EC0366 con borradores y validación |

---

## Flujo de datos clave: F1 → F2

El Informe de Necesidades (F1) genera datos estructurados que pre-rellenan el formulario del Paso 2:

1. F1 pipeline termina → `onAgentOutput('sintetizador_final')` en wizard.route.ts
2. Se carga el JSON del `extractor` desde BD (fuente autoritativa)
3. Se guardan en `fase1_informe_necesidades`: Q&A completo + perfil_participante (6 campos)
4. Step 2 frontend llama `GET /wizard/project/{id}/fase1/informe`
5. Pre-rellena: perfil_profesional, nivel_educativo_minimo, experiencia_previa, conocimientos_previos_requeridos, rango_de_edad_estimado, motivacion_principal

---

## Estado actual del desarrollo

### Completado
- Pipeline multi-agente completo para F0, F1, F2, F2.5, F3
- Sub-wizard F4 con 8 productos, doble-agente + juez + validador de código + sintetizador_final_f4
- Persistencia de F4 en `fase4_productos` con estado de validación (`aprobado` / `revision_humana`)
- Reanudación de sesión: el wizard recarga productos ya aprobados al volver al paso
- Badge de validación: aviso visual si un producto requiere revisión humana
- Fix de Q&A en F1: `qa_tabla_builder` (código puro) garantiza que el documento incluya TODOS los pares pregunta-respuesta que el cliente contestó
- Fix de prefill F2: `perfil_participante` se extrae del JSON del extractor (no del parsing del documento LLM)
- TypeScript compila sin errores (`tsc --noEmit`)

### Pendiente / parcial
- F5 (Verificación) y F6 (Ajustes/firmas) — prompts y controllers existen, flujo no revisado
- Tests automatizados actualizados para F4
- Deploy a producción (actualmente 100% local con Docker)

---

## Cómo correr el proyecto

```bash
# Levantar todo (PostgreSQL, Supabase, backend, frontends, nginx)
docker compose up -d

# URLs locales
# Portal raíz:    http://localhost
# Microsite DCFL: http://dcfl.localhost
# Microsite CCE:  http://cce.localhost
# API:            http://api.localhost/dcfl
# Supabase Studio: http://localhost:8000
```

Los puertos expuestos en el host están definidos en `docker-compose.yml`. El backend usa `wrangler` en dev y es compatible con Cloudflare Workers para deploy futuro.

---

## Archivos clave

| Archivo | Rol |
|:---|:---|
| `backend/src/core/services/ai.service.ts` | Motor del pipeline multi-agente, todos los handlers de código |
| `backend/src/dcfl/routes/wizard.route.ts` | Todos los endpoints DCFL, lógica post-job (parsing + guardado BD) |
| `backend/src/core/services/supabase.service.ts` | Métodos de acceso a BD por entidad |
| `backend/src/dcfl/prompts/templates/F*.md` | Prompts con frontmatter YAML que define el pipeline |
| `backend/src/core/types/pipeline.types.ts` | Tipos TypeScript del sistema de pipelines |
| `frontend/dcfl/src/controllers/step*.ts` | Controladores por paso del wizard |
| `frontend/dcfl/src/shared/endpoints.ts` | SSOT de todas las URLs de la API |
| `backend/supabase/migrations/` | Migraciones SQL numeradas (010–017) |
