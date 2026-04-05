# Proceso de certificación EC0366 — DCFL

Descripción del flujo de negocio del microsite `dcfl.localhost` / `dcfl.[dominio]`.

Este documento describe el **qué y el por qué** del proceso. Para la implementación
técnica del microsite ver [../../README.md](../../README.md) y el código en
`frontend/dcfl/` y `backend/src/dcfl/`.

---

## ¿Qué es EC0366?

Estándar de competencia CONOCER para **Diseñadores de Cursos de Formación para el
Trabajo**. El proceso genera los 16 documentos oficiales del expediente de certificación
mediante un wizard asistido por IA de 12 pasos.

---

## Fases del proceso

| Paso | ID | Documento | Entradas del usuario | Generado por IA |
|---|---|---|---|---|
| 0 | F0 | Marco de referencia del cliente | Datos básicos del proyecto | Análisis de sector, competencia, gaps y preguntas para el cliente |
| 1 | F1 | Informe de necesidades | Respuestas a las preguntas de F0 + confirma/edita brechas propuestas | Declara problema, objetivos SMART+Bloom, perfil del participante, resultados esperados |
| 2 | F2 | Especificaciones de análisis y diseño | Notas adicionales opcionales | Modalidad, SCORM, estructura temática, perfil de ingreso EC0366 |
| 3 | F2.5 | Recomendaciones pedagógicas | — | Actividades, frecuencia de reportes, cantidad y duración de videos con justificación bibliográfica (Mayer, Bloom, Guo et al.) |
| 4 | F3 | Especificaciones técnicas | LMS, SCORM, fecha inicio | Sección 1a: datos del usuario verbatim · Sección 1b: análisis técnico del LMS indicado |
| 5 | F4 | Producción de contenidos (8 productos) | Aprobación secuencial de cada producto | Sub-wizard: 8 documentos EC0366 generados uno a uno (cronograma, info general, guías, calendario, textos, presentación, guión, evaluación) |
| 6 | F5 | Verificación y evaluación (E1221) | Participantes, observaciones | Checklist técnico, checklist pedagógico, reporte de pruebas |
| 7 | F5.2 | Anexo de evidencias | URLs del LMS y reportes | Plantillas vacías con instrucciones para llenar — sin datos inventados |
| 8 | F6 | Ajustes post-evaluación | Formulario dinámico generado por IA | Clasificación de ajustes, plan de ajustes, control de versiones |
| 9 | F6.2a | Inventario del expediente y firmas | CURP, revisor, coordinador | Inventario de los 16 documentos del expediente EC0366 con espacios de firma |
| 10 | F6.2b | Resumen ejecutivo y declaración final | — | Resumen ejecutivo del curso completo y declaración bajo protesta de decir verdad |
| 11 | CLOSE | Finalización | — | — |

---

## Flujos especiales

### F0 → F1: preguntas dinámicas

Las preguntas que genera F0 en la sección "Preguntas para el cliente" se presentan
automáticamente como campos de entrada en F1. El sistema también extrae los gaps
iniciales de F0 y pre-rellena las brechas para que el usuario solo confirme o edite.

### Extracción de contexto (F2 en adelante)

A partir del paso 2 el contexto acumulado supera la ventana del modelo (~4096 tokens).
El sistema llama automáticamente a `/dcfl/wizard/extract` al montar cada paso: extrae
solo las secciones relevantes mediante parser markdown (regex) con fallback a IA a
temperatura 0. El extracto (~800 tokens) se inyecta al prompt en lugar del contexto
completo.

Existen nodos extractores dedicados para: F2, F2.5, F3, F4, F5, F5.2, F6, F6.2a y F6.2b.

### Formulario dinámico (F6)

En el paso 8, antes de generar el documento de ajustes, el sistema llama a
`/dcfl/wizard/generate-form` con el prompt `F6_FORM`. La IA devuelve un JSON con el
esquema del formulario (campos, tipos, etiquetas) adaptado a las observaciones del
checklist F5. El usuario llena el formulario y luego genera el documento.

### Sub-wizard F4 (8 productos)

El paso 5 es un sub-wizard independiente. Genera los 8 productos EC0366 de forma
secuencial — el usuario aprueba cada uno antes de pasar al siguiente. Los promptIds
van de `F4_P0` a `F4_P7`:

| Producto | PromptId | Elemento EC |
|---|---|---|
| Cronograma de Desarrollo | F4_P0 | E1219 — Producto #1 |
| Documento de Información General | F4_P1 | E1219 — Producto #2 |
| Guías de Actividades por Módulo | F4_P2 | E1220 — Producto #1 |
| Calendario General de Actividades | F4_P3 | E1220 — Producto #2 |
| Documentos de Texto | F4_P4 | E1220 — Producto #3 |
| Presentación Electrónica | F4_P5 | E1220 — Producto #4 |
| Guiones de Material Multimedia | F4_P6 | E1220 — Producto #5 |
| Instrumentos de Evaluación | F4_P7 | E1220 — Producto #6 |

---

## Plantillas y prompts

Las plantillas Markdown de cada fase están en `backend/src/dcfl/prompts/templates/`.
El mapa de flujo completo (fases, extractores, patrones regex) está en
`backend/src/dcfl/prompts/flow-map.json`.
