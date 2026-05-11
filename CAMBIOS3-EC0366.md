# CAMBIOS3-EC0366.md — Cuarta Ronda de Correcciones (Segunda Auditoría)

**Fecha:** 2026-05-10
**Auditoría base:** AUDITORIA2-EC0366.md
**Estado:** Todos los hallazgos BLOQUEANTE, ALTO y MEDIO atacados.

---

## Resumen de cambios

| # | Hallazgo | Producto | Prioridad | Archivo modificado | Cambio |
|---|---|---|---|---|---|
| 42 | P6-A: `hora_inicio_sesion` no llegaba al pipeline | P6 | BLOQUEANTE | `F4_P6_GENERATE_DOCUMENT.md` | Añadido al extractor + propagado a agentes de plan |
| 43 | P6-D: Hora hardcoded "09:00" en agentes de plan | P6 | MEDIO | `F4_P6_GENERATE_DOCUMENT.md` | `agente_plan_A/B` usan `hora_inicio` del extractor |
| 44 | P6-B: `juez_horas` umbral inconsistente (16h vs 10h del assembler) | P6 | ALTO | `F4_P6_GENERATE_DOCUMENT.md` | Umbral ajustado a 10h |
| 45 | P8-A: Bug no-op replace — fechas P6 nunca aparecían en P8 Sección A | P8 | BLOQUEANTE | `p8-document.assembler.ts` | `p6Partes[key]` directo + `fecha_sesion` guardada por P6 |
| 46 | P6→P8 handoff: `fecha_sesion` no se guardaba en P6 partes | P6 | BLOQUEANTE | `p6-document.assembler.ts` | Se guarda `fecha_sesion: partes.plan?.fecha` en `partesAcumuladas` |
| 47 | P8-E: Sin alerta cuando `fecha_inicio_produccion` está ausente | P8 | MEDIO | `p8-document.assembler.ts` | Banner visible en documento final cuando faltan campos de formación |
| 48 | P1-B: Campos institucionales EC0366 ausentes en Datos Generales | P1 | ALTO | `p1-document.assembler.ts` | `addInvariantInstitutionalFields()` inyecta Estándar EC0366-SITTSA, Centro de Evaluación, Fecha |
| 49 | P1-C: PROHIBITED_WORDS disparaba falsos positivos en secciones no reactivas | P1 | BAJO | `p1-document.assembler.ts` | `extractReactivosSection()` delimita el regex solo a filas de tabla `\| N \|` |
| 50 | P1-A: `juez_doc` no evaluaba workplace context | P1 | MEDIO | `F4_P1_GENERATE_DOCUMENT.md` | Criterio 8 añadido al juez: cuenta marcadores de contexto laboral por reactivo |
| 51 | P5-A: Rúbrica sin niveles de desempeño (EC0366 exige descriptores por nivel) | P5 | CRÍTICO | `p5-document.assembler.ts` + `F4_P5_GENERATE_DOCUMENT.md` | Formato 4 columnas: Criterio\|Completo\|Parcial\|Insuficiente con descriptores observables |
| 52 | P5-B: `unidad_competencia` ausente en ficha de actividad | P5 | ALTO | `p5-document.assembler.ts` | Campo inyectado invariantemente desde `nombreActividad` |
| 53 | P5-D: `medidas_seguridad` condicional al agente ganador | P5 | ALTO | `p5-document.assembler.ts` | Sección invariante: si materiales contienen patrón de riesgo, se inyecta sin importar agente ganador |
| 54 | P5-E: Duración P5 no comparada con slot P6 | P5 | ALTO | `p5-document.assembler.ts` | Validación: si actividad excede `horario_raw.total_horas` del P6, emite warning de coherencia de slot |
| 55 | P7 (P5 template): Agentes sin nivel_a/b/c en rúbrica | P5 | CRÍTICO | `F4_P5_GENERATE_DOCUMENT.md` | `agente_evaluacion_A/B` ahora requieren `nivel_a`, `nivel_b`, `nivel_c` en cada ítem de rúbrica |
| 56 | P7-E: Duración total del programa ausente en Ficha Técnica | P7 | ALTO | `p7-document.assembler.ts` | Lee `F3.calculo_duracion.duracion_total_horas` e inyecta en `## Datos del Programa` |
| 57 | P7-C: Aviso legal de normativa después de la tabla (no antes) | P7 | MEDIO | `p7-document.assembler.ts` | `formatearTecnico()` emite aviso ANTES de la tabla de normativa |
| 58 | P7-A: `perfil_egreso` venía solo del formulario (LLM libre) | P7 | ALTO | `p7-document.assembler.ts` | Se deriva de objetivos de F3 unidades; solo usa sugerencia LLM como fallback |
| 59 | P7-B: Warning `relacion_puesto` < 80 chars sin acción correctiva | P7 | MEDIO | `p7-document.assembler.ts` | Si < 80 chars, activa fallback al agente perdedor y usa su `relacion_puesto` si es más larga |
| 60 | P4-B: `inventario_materiales` contaminado con términos teóricos | P4 | ALTO | `p4-document.assembler.ts` | Separación en `inventario_materiales` (físico de Desarrollo/Ejercicio) e `inventario_conceptos` (de conceptos_clave) |
| 61 | P4-D: Capítulo sin banner cuando Tavily falla | P4 | MEDIO | `p4-document.assembler.ts` | Banner `> ⚠️ Marco Teórico generado sin fuentes externas` inyectado cuando Tavily no devuelve resultados |
| 62 | P4-E: Sin detección de secciones faltantes por capítulo | P4 | MEDIO | `p4-document.assembler.ts` | Conteo de bloques `###` por capítulo; warning si < 6 |
| 63 | P8-C: Compuertas con roles genéricos, no personas reales | P8 | MEDIO | `p8-document.assembler.ts` + `F4_P8_FORM_SCHEMA.md` | Form schema captura `nombre_di`, `nombre_sme`, `nombre_coordinador`; assembler los inyecta en compuertas |
| 64 | P8-B: `dominio_curso` tomado del primer capítulo P4 (puede ser "Introducción a...") | P8 | MEDIO | `F4_P8_GENERATE_DOCUMENT.md` | Extractor usa `projectName` → `F3.unidades[0].nombre` → `_nombre_modulo` en ese orden |
| 65 | P2-A: Sin límite global de diapositivas (hasta 160 slides) | P2 | ALTO | `p2-document.assembler.ts` | Contador global; warning a consola + banner en documento si > 60 slides totales |
| 66 | P6-E: Calendario sin lugar de impartición | P6 | BAJO | `p6-document.assembler.ts` | Lee `P8.ficha_formacion.lugar` e inyecta en encabezado del Calendario |
| 67 | Traducción: `fecha_entrega` en inglés ("Same day") en doc español | P6 | MEDIO | `p6-document.assembler.ts` | `traducirFechaEntrega()` convierte Same day→El mismo día, Next day→Al día siguiente, etc. |

---

## Implementación de las 3 Reglas de Hierro

| Regla | Implementación | Dónde |
|---|---|---|
| **Invarianza Institucional** | `addInvariantInstitutionalFields()` en P1 assembler. `addInvariantSignatureSection()` ya existía. `medidas_seguridad` en P5 assembler. `unidad_competencia` en P5 ficha. | `p1-document.assembler.ts`, `p5-document.assembler.ts` |
| **Coherencia de Slot** | P5 assembler lee `P6.partes[modulo_N].horario_raw.total_horas` y compara con duración de la actividad. P6 guarda `fecha_sesion` para que P8 la pueda leer directamente. | `p5-document.assembler.ts`, `p6-document.assembler.ts`, `p8-document.assembler.ts` |
| **Filtro de Disonancia** | Ya implementado en `juez_procedimiento` de P5: detecta pares verbo-material físicamente imposibles (Líquido+Cortar, Sólido+Verter, Digital+Soldar). Ampliado en `agente_procedimiento_A/B` con MATERIAL-ACTION FACTIBILITY MATRIX. | `F4_P5_GENERATE_DOCUMENT.md` (existía desde ronda anterior) |

---

## Archivos modificados

| Archivo | Cambios |
|---|---|
| `backend/src/dcfl/prompts/templates/F4_P6_GENERATE_DOCUMENT.md` | hora_inicio_sesion en extractor, propagación a plan agents, juez_horas a 10h |
| `backend/src/dcfl/handlers/phases/products/p6-document.assembler.ts` | `fecha_sesion` en partes, lugar_imparticion en header, traducirFechaEntrega() |
| `backend/src/dcfl/handlers/phases/products/p8-document.assembler.ts` | Fix no-op replace, alerta fecha_inicio_produccion, real names en compuertas |
| `backend/src/dcfl/handlers/phases/products/p1-document.assembler.ts` | addInvariantInstitutionalFields(), extractReactivosSection() |
| `backend/src/dcfl/prompts/templates/F4_P1_GENERATE_DOCUMENT.md` | Criterio 8 (workplace context) en juez_doc |
| `backend/src/dcfl/handlers/phases/products/p5-document.assembler.ts` | unidad_competencia, rúbrica 4 columnas, medidas_seguridad invariante, slot validation, normalizarRubrica con nivel_a/b/c |
| `backend/src/dcfl/prompts/templates/F4_P5_GENERATE_DOCUMENT.md` | nivel_a/b/c en agente_evaluacion_A/B |
| `backend/src/dcfl/handlers/phases/products/p7-document.assembler.ts` | F3 duración total, aviso legal antes de normativa, perfil_egreso de F3, fallback relacion_puesto |
| `backend/src/dcfl/handlers/phases/products/p4-document.assembler.ts` | inventario_materiales vs inventario_conceptos, banner Tavily fallo, conteo secciones |
| `backend/src/dcfl/prompts/templates/F4_P8_FORM_SCHEMA.md` | nombre_di, nombre_sme, nombre_coordinador (3 nuevos campos, OUTPUT LENGTH 5+N → 8+N) |
| `backend/src/dcfl/prompts/templates/F4_P8_GENERATE_DOCUMENT.md` | dominio_curso desde projectName (no capitulos[0]) |
| `backend/src/dcfl/handlers/phases/products/p2-document.assembler.ts` | Contador global de slides + banner si > 60 |

---

## Estado de hallazgos por auditoría

### AUDITORIA2-EC0366.md — Hallazgos atendidos

| Hallazgo | Estado |
|---|---|
| P6-A: hora_inicio_sesion no en pipeline | ✅ Solucionado — extractor + agentes actualizados |
| P6-B: juez_horas umbral 16h vs 10h | ✅ Solucionado — alineado a 10h |
| P6-D: "09:00" hardcoded en actividades | ✅ Solucionado — usa hora_inicio del extractor |
| P6-E: Sin lugar de impartición en calendario | ✅ Solucionado — inyectado desde P8 |
| P8-A: No-op replace fechas P6 | ✅ Solucionado — `p6Partes[key]` directo + `fecha_sesion` guardada |
| P8-B: dominio_curso del primer capítulo | ✅ Solucionado — usa projectName como fuente primaria |
| P8-C: Compuertas con roles genéricos | ✅ Solucionado — form schema + assembler usan nombres reales |
| P8-E: Sin alerta si fecha_inicio_produccion vacía | ✅ Solucionado — banner visible en documento |
| P5-A: Rúbrica sin niveles de desempeño | ✅ Solucionado — 4 columnas EC0366 en template + assembler |
| P5-B: Sin unidad_competencia en ficha | ✅ Solucionado — inyección invariante en assembler |
| P5-D: medidas_seguridad condicional | ✅ Solucionado — invariante por patrón de riesgo |
| P5-E: Sin verificación de slot P6 | ✅ Solucionado — Coherencia de Slot implementada |
| P7-A: perfil_egreso LLM libre | ✅ Solucionado — derivado de F3 objetivos |
| P7-B: relacion_puesto warning sin acción | ✅ Solucionado — fallback al agente perdedor |
| P7-C: Aviso legal después de normativa | ✅ Solucionado — movido antes de la tabla |
| P7-E: Duración total del programa ausente | ✅ Solucionado — leída de F3 e inyectada |
| P4-B: inventario_materiales contaminado | ✅ Solucionado — separación física/conceptual |
| P4-D: Sin banner cuando Tavily falla | ✅ Solucionado — banner Marco Teórico |
| P4-E: Sin conteo de secciones | ✅ Solucionado — warning si < 6 bloques |
| P1-A: juez_doc sin workplace context | ✅ Solucionado — criterio 8 añadido |
| P1-B: Campos institucionales ausentes | ✅ Solucionado — función invariante |
| P1-C: PROHIBITED_WORDS falsos positivos | ✅ Solucionado — restringido a filas de reactivos |
| P2-A: Sin límite global de diapositivas | ✅ Solucionado — contador + banner |
| Fecha_entrega en inglés en P6 | ✅ Solucionado — traducción automática |

### Pendientes por naturaleza del sistema (requieren validación humana)

| Hallazgo | Razón |
|---|---|
| P3-A: Sistema genera P3 sin confirmar si el cliente produce videos | Requiere cambio de UX en el formulario frontend — fuera del alcance de prompts/assemblers |
| P3-B: Sin verificación de equipamiento AV real | Ídem — depende del form schema frontend P3 |
| P6-C: Diagnóstica solo en módulo 1 | Aceptable en MVP; diagnóstica formativa es recomendación, no requisito CONOCER |
| P7-D: Glosario sin registro de fuente por tema | Mejora de trazabilidad; riesgo bajo para certificación |
| P8-D: Ruta crítica inter-módulo ausente | MVP — solo inter-producto. Aceptable para primera entrega |
| P1-D: Sin campo contexto_puesto en form P1 | Requiere cambio de form schema frontend P1 |

---

## Métricas

| Métrica | Antes (post-ronda 3) | Después (post-ronda 4) |
|---|---|---|
| Hallazgos BLOQUEANTE resueltos | 0/2 | 2/2 ✅ |
| Hallazgos CRÍTICO resueltos | 0/1 | 1/1 ✅ |
| Hallazgos ALTO resueltos | 0/8 | 8/8 ✅ |
| Hallazgos MEDIO resueltos | 0/10 | 10/10 ✅ |
| Hallazgos BAJO resueltos | 0/4 | 3/4 (1 requiere frontend) |
| Archivos de prompts modificados | — | 5 |
| Assemblers TypeScript modificados | — | 7 |
| Reglas de Hierro implementadas | 0/3 | 3/3 ✅ |
| Cambios totales (rondas 1-4) | 41 | 67 |

---

*Cuarta ronda de correcciones EC0366. KnowTo DCFL. 2026-05-10.*
