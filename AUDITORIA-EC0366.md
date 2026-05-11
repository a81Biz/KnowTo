# AUDITORÍA TÉCNICO-PEDAGÓGICA — PRODUCTOS EC0366 SEP-CONOCER
**KnowTo / DCFL — Fase 4 (F4)**
**Fecha:** 2026-05-10
**Modalidad:** Auditoría de diseño de sistema generativo (prompts + assemblers + lógica de validación)

> **Nota metodológica:** Esta auditoría evalúa el sistema de generación de los 8 productos (P1-P8) mediante análisis de sus plantillas de prompts, ensambladores TypeScript y reglas de validación. Los productos son generados por IA multi-agente (A/B + juez) a partir de datos del usuario confirmados en F0-F3. No se audita contenido generado específico porque varía por proyecto; se audita el **diseño del sistema** que determina qué produce y con qué calidad.

---

## RESUMEN EJECUTIVO

El sistema KnowTo DCFL implementa un pipeline de generación automática de 8 productos EC0366 mediante arquitectura multi-agente (especialista A + especialista B → juez → ensamblador TypeScript). La arquitectura es técnicamente sofisticada y tiene controles de calidad reales. Sin embargo, presenta **brechas estructurales graves** que comprometen la certificabilidad bajo EC0366, particularmente en la definición de qué es cada producto, su correspondencia con el estándar, y la coherencia pedagógica entre entregables.

**Veredicto ejecutivo:** Los productos P1, P4 y P5 tienen diseño funcional y EC0366-compatible con correcciones menores. P2 y P3 tienen problemas de alineación pedagógica importantes. P6, P7 y P8 presentan brechas conceptuales serias respecto a lo que EC0366 realmente exige. El sistema en su estado actual **no aprobaría una revisión formal de CONOCER** sin correcciones en al menos 5 de los 8 productos.

---

## SCORE GLOBAL

| Dimensión | Score | Justificación |
|---|---|---|
| Cumplimiento EC0366 | **52/100** | P1/P4/P5 aceptables; P6/P7/P8 con desviaciones conceptuales graves |
| Calidad pedagógica | **61/100** | Buena en P4/P5; débil en P7/P8; P3 fuera de alcance EC0366 |
| Calidad documental | **68/100** | Validaciones formales sólidas; sin verificación de contenido real |
| Instrumentos de evaluación | **58/100** | P1 bien diseñado; sin firma garantizada; CLAVE no verificada en código |
| Coherencia metodológica | **44/100** | Brechas críticas de trazabilidad P1→P6; P4 estructura ≠ form schema |
| Aplicabilidad real | **55/100** | P4/P5 aplicables; P8 es cronograma de desarrollo, no de impartición |
| Profesionalismo | **65/100** | Arquitectura robusta; contenido LLM sin validación de dominio |

**SCORE PROMEDIO: 57.6/100 — No certificable en estado actual**

---

## HALLAZGOS CRÍTICOS (priorizados)

| Prioridad | Hallazgo | Producto(s) | Gravedad |
|---|---|---|---|
| 1 | P8 genera cronograma de **desarrollo de materiales**, no de **impartición del curso** | P8 | BLOQUEANTE |
| 2 | P7 "Información General" no es un entregable requerido por EC0366 | P7 | ALTO |
| 3 | P3 genera scripts de producción audiovisual, no un entregable EC0366 — el estándar no requiere video | P3 | ALTO |
| 4 | P6 genera distribución horaria por sesión, no un **calendario con fechas** como exige EC0366 | P6 | ALTO |
| 5 | P1 no garantiza espacios de firma (Agente A los omite; si A gana, el instrumento es incompleto) | P1 | ALTO |
| 6 | P5 extractor leía `secciones_json.materiales` (no existe en parseSecciones) → MODE A nunca activaba | P5 | ALTO (corregido hoy) |
| 7 | P4 form schema y chapter generator tienen estructuras de secciones incompatibles | P4 | MEDIO |
| 8 | CLAVE DE RESPUESTAS no verificada programáticamente — dependencia total del LLM | P1 | MEDIO |
| 9 | Normas en P7 (NOM/ISO/EC) generadas por LLM sin validación de existencia | P7 | MEDIO |
| 10 | P2 actividades obtienen materiales de texto libre `p4_secciones.ejercicio_practico` (sin parseo estructurado) | P2 | MEDIO |

---

## HALLAZGOS POR PRODUCTO

---

### P1 — Instrumentos de Evaluación

**Descripción del sistema:** Agente A (auditor normativo) + Agente B (diseñador práctico) → Juez → Ensamblador TypeScript con validaciones.

#### Problemas y gravedad

| # | Problema | Gravedad | Impacto | Solución |
|---|---|---|---|---|
| 1.1 | Agente A no incluye "Datos del Evaluador", espacios de firma ni "Lugar y fecha". Agente B sí los incluye en "Reglas de Decisión y Firmas". Si el juez selecciona A, el instrumento no tiene firma. | ALTO | Instrumento no válido formalmente sin espacios de firma | Mover firma y datos de evaluador al ensamblador TypeScript como sección invariante |
| 1.2 | La CLAVE DE RESPUESTAS no se verifica en código. La instrucción es explícita ("contar filas"), pero si el LLM produce 3 reactivos y 2 filas en CLAVE, el ensamblador no lo detecta | MEDIO | Cuestionarios con clave incompleta pasan validación | Añadir parser de tabla en assembler: extraer filas de reactivos y filas de CLAVE, comparar conteos |
| 1.3 | La regex de palabras prohibidas (`/adecuado\|correctamente\|correcto\|bien\|efectivo\|notable\|mejorado/i`) no cubre formas contextuales como "de manera adecuada", "realizado de forma correcta", "de modo efectivo" | MEDIO | Subjetividad infiltrada en locuciones adverbiales | Ampliar regex a `/\b(adecuad[ao]s?)\|correctamente\|de (forma\|manera\|modo) (correct[ao]\|adecuad[ao]\|efectiv[ao])\|bien\b/i` |
| 1.4 | El form schema genera **2 reactivos** por unidad en `suggested_value`, pero el GENERATE_DOCUMENT exige **mínimo 3**. El usuario ve la sugerencia del formulario y puede considerar que con 2 es suficiente | MEDIO | Desconexión entre lo que el sistema sugiere y lo que valida | Corregir form schema para generar mínimo 3 reactivos en `suggested_value` |
| 1.5 | La "Instrucción al Evaluador" en Agente A dice "Describe el momento físico exacto de observación" pero no exige una condición de inicio (e.g., "ANTES de que el candidato...", "Una vez que el candidato haya...") | BAJO | Evaluaciones sin punto de inicio definido | Añadir campo "Condición de inicio" en la plantilla |
| 1.6 | La ponderación se extrae con regex de texto markdown. Si el LLM escribe "Ponderación: treinta por ciento" en lugar de "30%", el check matemático falla silenciosamente (sin detectar el error) | BAJO | Weights incorrectos sin alerta | Añadir fallback que detecte porcentajes escritos como texto |

**Lo que sí cumple EC0366:**
- Observable action enforcement es riguroso y explícito
- Un instrumento por unidad (single instrument rule) está bien implementado
- Ponderación 100% verificada en código
- Mínimo 3 reactivos exigido en prompt y verificado por juez
- La lógica de fallback a Agente B evita productos completamente deficientes

---

### P2 — Presentación Electrónica del Facilitador

**Descripción del sistema:** Extractor → Agente presentación A+B (juez) → Agente actividades A+B (juez) → Agente cierre A+B (juez) → Ensamblador TypeScript.

#### Problemas y gravedad

| # | Problema | Gravedad | Impacto | Solución |
|---|---|---|---|---|
| 2.1 | La ZERO LOSS RULE genera "TANTAS diapositivas como sean necesarias" para cubrir P4. Si P4 tiene 10 secciones, P2 puede generar 10-15 diapositivas por módulo. No hay MÁXIMO de diapositivas. Con 4 módulos, la presentación podría tener 60 diapositivas, lo cual es inviable para impartición presencial | ALTO | Presentaciones irreales en extensión | Añadir límite máximo configurable (ej. 12 diapositivas por módulo, 45 min máximo) |
| 2.2 | Las "actividades" de P2 extraen materiales de `p4_secciones.ejercicio_practico` que es una cadena de texto libre. El LLM debe parsear este texto para extraer materiales. Si el ejercicio práctico del P4 no los lista explícitamente, el LLM los infiere, rompiendo el Domain Lock | MEDIO | Materiales no autorizados en actividades de la presentación | Usar `inventario_p4` (ahora disponible) en los agentes de actividades; ya se añadió la instrucción en esta sesión |
| 2.3 | La sincronización con P3 (p3_guion.escaleta y p3_guion.literario) es solo una instrucción en el prompt. No hay validación de que las diapositivas coincidan con las escenas del guion. Si P3 tiene escena "Concepto_2" y P2 no tiene esa diapositiva, nadie lo detecta | MEDIO | Desincronización entre video y presentación | Añadir al juez criterio de SCENE COVERAGE: verificar que cada escena de p3_guion.escaleta tiene una diapositiva correspondiente |
| 2.4 | El módulo de Actividades no verifica que la suma de tiempos sea ≤ 90 min en código. El juez lo comprueba como criterio de selección, pero si ambos agentes superan 90 min, el juez elige el que tenga menos (no el que cumpla) | BAJO | Actividades que exceden el tiempo disponible | Añadir validación en assembler: si suma > 90 min, generar warning en consola |
| 2.5 | El "Cierre y Próximos Pasos" no tiene verificación de que el `puente.facilitador_dice` mencione el nombre real del siguiente módulo (extrae de contexto que puede no estar disponible) | BAJO | Transiciones genéricas o con nombre de módulo incorrecto | El assembler podría enriquecer el cierre con el nombre del módulo siguiente desde `partesAcumuladas` |

**Lo que sí cumple EC0366:**
- Estructura instructor-céntrica (nota del facilitador, qué decir/preguntar/hacer)
- Actividades didácticas con materiales, instrucciones y resultado esperado
- Cierre con puntos clave y transición al siguiente módulo
- Adaptaciones de actividad (individual, grupos, virtual)

---

### P3 — Paquete de Producción Audiovisual (Guiones)

**Descripción del sistema:** Extractor → Ficha técnica A+B → Escaleta A+B → Guion literario A+B → Guion técnico A+B → Storyboard A+B → Ensamblador TypeScript con 5 secciones independientes.

#### Problemas y gravedad

| # | Problema | Gravedad | Impacto | Solución |
|---|---|---|---|---|
| 3.1 | **EC0366 no exige la producción de videos ni guiones audiovisuales.** El estándar requiere materiales didácticos (manuales, presentaciones, guías) pero no scripts de video. P3 genera artefactos de producción de cine/video que están fuera del alcance del estándar. Si un auditor CONOCER revisa P3, no encontrará su equivalente en el estándar | CRÍTICO para certificación | P3 no es un entregable EC0366 clasificable. No puede presentarse como "Material Didáctico" sin acompañarse de la evidencia de que el video existe y fue producido | Reclasificar P3 como "Guión Instruccional" (parte de la estrategia didáctica) y explicar que apoya la preparación del facilitador o la producción de e-learning, no como entregable EC0366 principal |
| 3.2 | La ficha técnica de P3 incluye "perfil_talento" (narrador/actor), "recursos" (Animación 2D, Close-up), "equipamiento". Estos son elementos de producción audiovisual, no de diseño instruccional | ALTO | Contenido irrelevante para un evaluador EC0366 | Separar en dos documentos: Guión Instruccional (para EC0366) y Ficha de Producción Audiovisual (para producción) |
| 3.3 | Con la nueva regla Domain Lock en P3 (inventario_p4 para equipamiento), el "equipamiento" de filmación (cámara, micrófono, iluminación) puede ser rechazado porque no está en el inventario del curso. Esta confusión entre "equipamiento del video" y "materiales del curso" es un error conceptual | ALTO | Domain Lock mal aplicado en P3 | Separar `inventario_p4` (materiales del curso) de `equipamiento_filmacion` (equipos de producción). El Domain Lock aplica al CONTENIDO del video (qué materiales demuestra), no al equipamiento de filmación |
| 3.4 | El storyboard es un artefacto de diseño visual. Generarlo mediante LLM sin referencia visual real lo hace descriptivo pero no funcional para producción real | MEDIO | Storyboards genéricos inutilizables para un equipo de producción real | Documentar que el storyboard es referencial, no un storyboard de producción |
| 3.5 | La VIDEO DURATION CAP (máx. 15 min) reduce cualquier módulo mayor a 15 min a 10 min. Si el módulo tiene 60 minutos de contenido, un video de 10 min no puede cubrirlo. La lógica de reducción es mecánica y puede producir videos conceptualmente incompletos | MEDIO | Videos que no cubren el contenido del módulo | El cap debería sugerir múltiples videos cortos (serie) en lugar de truncar uno solo |

**Lo que sí funciona bien técnicamente:**
- Elastic Mapping + Positional Fallback en el assembler (marcadores de escena)
- Validación de suma de tiempos de escaleta (±30 segundos)
- Escaleta de 9 escenas con estructura fija (Apertura-Gancho → Cierre)
- ZERO LOSS rule para técnicas del P4

---

### P4 — Manual del Participante

**Descripción del sistema:** Extractor del form → Por cada sección: Agente A (profundidad técnica) + Agente B (accesibilidad) + Juez → Ensamblador TypeScript con Tavily, glosario deduplicado y bibliografía.

#### Problemas y gravedad

| # | Problema | Gravedad | Impacto | Solución |
|---|---|---|---|---|
| 4.1 | **Estructura de secciones incompatible entre form schema y chapter generator.** El form schema A genera "Introducción, Conceptos clave, Desarrollo, Ejercicio práctico, Puntos a recordar". El form schema B genera "Objetivo de aprendizaje, Marco teórico, Pasos del procedimiento, Autoevaluación, Lecturas complementarias". El chapter generator espera "Introducción, Marco Teórico, Conceptos Clave, Desarrollo, Ejemplo Práctico, Ejercicio Práctico, Puntos a Recordar". El LLM tiene que hacer una adaptación estructural al generar el capítulo, lo cual puede producir secciones vacías o fusionadas | ALTO | Capítulos con secciones faltantes o malformadas | Unificar la estructura del form schema con la del chapter generator. Usar una única estructura canónica de 7 secciones en ambos |
| 4.2 | La bibliografía se extrae de URLs en el markdown generado. El LLM puede intercalar URLs reales de Tavily con URLs hallucinated. El assembler incluye ambas sin distinción | ALTO | Bibliografía con URLs falsas que no resuelven a ninguna fuente | En el assembler, verificar que las URLs corresponden a dominios de los resultados reales de Tavily (guardar dominios autorizados junto con los resultados de búsqueda) |
| 4.3 | El glosario se extrae con regex de TODAS las tablas del markdown: `/\|\s*([^|\n]+?)\s*\|\s*([^|\n]+?)\s*(?:\||$)/gm`. Esto captura filas de cualquier tabla (incluidas tablas de horarios, ponderaciones, etc.), no solo de "Conceptos Clave" | MEDIO | Glosario contaminado con contenido de otras tablas | Delimitar la extracción de términos al bloque `### Conceptos Clave` y `### Conceptos que Debes Conocer` solamente |
| 4.4 | El Tavily Domain Lock en los capítulos de P4 es una instrucción de 3 pasos al LLM, pero no hay verificación programática de que los materiales citados en el capítulo están en el formulario del usuario. Si el LLM falla en el self-check, introduce materiales no declarados | MEDIO | Manual que introduce herramientas o técnicas no enseñadas en el curso | El juez penaliza esto, pero no hay fallback a código; se acepta con `aprobado_con_errores` |
| 4.5 | La regla "No Fake Theory" depende del criterio del juez pero no tiene verificación automatizada. El juez elige el mejor de A vs B, no garantiza que ninguno sea correcto | BAJO | Teorías incorrectas o inventadas en el Marco Teórico | El logging de Tavily responses por capítulo permitiría auditoría posterior |

**Lo que sí cumple EC0366:**
- Estructura completa de manual de participante (teoría + práctica + ejercicios + referencias)
- STRICT VERB POLICY en el Desarrollo (pasos con herramienta específica, cantidad, acción observable, resultado verificable)
- Domain Lock implementado en prompt Y juez (RECHAZADO si ambos violan)
- Investigación externa (Tavily) por capítulo para teoría fundamentada
- Glosario deduplicado y bibliografía

---

### P5 — Guías de Actividades

**Descripción del sistema:** Extractor → Ficha A+B → Materiales A+B (con INVENTORY PROTOCOL) → Procedimiento A+B (con MATERIAL-ACTION MATRIX) → Evaluación A+B → Ensamblador TypeScript.

#### Problemas y gravedad

| # | Problema | Gravedad | Impacto | Solución |
|---|---|---|---|---|
| 5.1 | El extractor del F4_P5_FORM_SCHEMA leía `capitulos[N].secciones_json.materiales` y `secciones_json.herramientas` — campos que `parseSecciones()` no genera (siempre `[]`). Todos los P5 generados ANTES de la corrección de hoy usaban MODE B (inventado). Los documentos ya en BD pueden tener materiales fabricados | CRÍTICO (histórico) | Actividades existentes con materiales no declarados en el curso | Forzar regeneración de P5 después de regenerar P4 con `inventario_materiales` |
| 5.2 | El `F4_P5_GENERATE_DOCUMENT` también tenía este mismo bug en su extractor (leía `secciones_json.materiales/herramientas`). Ahora corregido para usar `P4.inventario_materiales`. Pero los documentos ya generados siguen siendo producto del bug | ALTO (histórico) | Misma consecuencia que 5.1 | Regenerar P5 |
| 5.3 | La rúbrica de evaluación (evaluacion.rubrica) se genera por el LLM pero no se verifica que los criterios correspondan a los reactivos de P1. La instrucción "P1 ALIGNMENT" existe en el prompt, pero no en código | MEDIO | Rúbricas de actividad desalineadas con los instrumentos de evaluación | Añadir en assembler: si `instrumentos_p1` tiene datos, verificar que al menos 1 criterio de la rúbrica menciona contenido del instrumento correspondiente |
| 5.4 | La sección "procedimiento" tiene estructura: Preparación, Ejecución, Cierre y Limpieza. No hay mínimo de pasos de ejecución verificado en código (solo instrucción al LLM) | BAJO | Procedimientos con un solo paso de ejecución | Añadir validación: si ejecucion.length < 2, warning en assembler |

**Lo que sí cumple EC0366:**
- INVENTORY PROTOCOL MODE A/B (líquido/sólido/digital/textil/equipo) — Diseño sofisticado
- MATERIAL-ACTION FEASIBILITY MATRIX explícita en prompt de especialista y juez
- EC0366 objective validation: verbo físico observable, SMART
- normalizarPasos(), normalizarRubrica(), normalizarStringArray() — sanitización robusta
- Cuatro secciones independientes con jueces independientes (ficha, materiales, procedimiento, evaluación)
- Fallback defensivo para logística vacía

---

### P6 — Calendario General del Curso

**Descripción del sistema:** Extractor → Horario A+B (juez) → Plan de sesión A+B (juez) → Entregables A+B (juez) → Ensamblador con acumulación y tabla resumen.

#### Problemas y gravedad

| # | Problema | Gravedad | Impacto | Solución |
|---|---|---|---|---|
| 6.1 | **P6 genera una "Distribución Horaria por Sesión", no un Calendario.** EC0366 requiere un calendario con fechas específicas (día, mes, hora de inicio, hora de fin, lugar). P6 genera tablas de "09:00 — Apertura" sin ninguna fecha real. Un auditor CONOCER no puede verificar programación con este documento | CRÍTICO para certificación | El "Calendario" no cumple con la función de un calendario EC0366 | Añadir a P6 una sección de Programación con campo de fecha de inicio, días de impartición (Lunes-Viernes/Fines de semana), y generación de fechas reales. El form schema debe capturar "Fecha de inicio del curso" |
| 6.2 | La verificación matemática `horas_teoricas + horas_practicas = total_horas` es solo un criterio del juez. El veto solo aplica "RECHAZADO si AMBOS fallan Y total_horas ≤ 0 o > 16". Una sesión de 16 horas pasa sin rechazo | MEDIO | Calendarios con sesiones físicamente imposibles | Cambiar veto: rechazar si total_horas > 10 (jornada máxima razonable) |
| 6.3 | El nombre del instrumento de evaluación en la sección "Entregables" lo genera el LLM desde `instrumentos_p1` (que solo tiene `{unidad, tipo}`), no desde el documento real de P1. Pequeñas parafrasias del LLM crean inconsistencia entre P1 y P6 | MEDIO | "Guía de Observación" vs "Guía de Observación Directa" — diferente texto en el mismo documento | El assembler de P6 podría inyectar directamente el tipo de instrumento desde `instrumentos_p1` como campo fijo, sin dejar al LLM parafrasearlo |
| 6.4 | La F3 alignment rule ("Total hours across all sessions must match F3's duracion_total_horas_aprox") solo existe en el prompt del agente, no se verifica en el ensamblador. El calendario puede tener un total de horas distinto al plan del curso | MEDIO | Inconsistencia entre horas del plan de estudios y del calendario | El assembler de P6 debería comparar `totalG` (horas acumuladas) con `productos_previos.F3.duracion_total_horas` y generar warning si diverge >10% |
| 6.5 | La actividad más específica (agenda de sesión: 09:00, 10:30, etc.) tiene horas fijadas por el LLM sin punto de partida real. El LLM asume que la sesión empieza a las 09:00, lo cual puede ser incorrecto | BAJO | Agenda de sesión irrelevante si el horario real es diferente | Capturar hora de inicio en el formulario |

**Lo que sí funciona:**
- Tres secciones con jueces independientes (horario, plan, entregables)
- Tabla resumen con totalización de horas teóricas + prácticas + total
- Acumulación por sesión con persistencia en BD
- Recursos y entregables por sesión
- normalizarActividades() y normalizarStringArray() para estructuración robusta

---

### P7 — Información General del Curso

**Descripción del sistema:** Extractor → Descripción A+B (juez) → Conceptos y normativa A+B (juez) → Ensamblador con glosario consolidado.

#### Problemas y gravedad

| # | Problema | Gravedad | Impacto | Solución |
|---|---|---|---|---|
| 7.1 | **P7 no tiene equivalente directo en EC0366.** El estándar describe los entregables como: Instrumentos (P1), Materiales didácticos (P2/P3/P4/P5), Programa de capacitación (P6/P8). "Información General" es un documento administrativo, no un entregable del estándar | ALTO | P7 puede ser rechazado como "documento adicional no requerido" en auditoría | Redefinir P7 como "Programa de Formación" o "Ficha Técnica del Curso" — documentos que sí tienen lugar en EC0366 (descripción del programa, perfil de ingreso/egreso, competencias que desarrolla, requisitos de certificación) |
| 7.2 | Las normas en "normativa" (NOM/ISO/EC codes) son generadas por el LLM sin acceso a bases de datos de normas vigentes. Para un curso de pintura de miniaturas, el LLM puede generar `NOM-025-STPS (iluminación)` pero también puede inventar `NOM-087-CONOCER (diseño de cursos)` que no existe | ALTO | Normativa inventada en un documento oficial. Fraude documental involuntario | Añadir advertencia explícita en el documento: "Las normas citadas son referenciadas como punto de partida y deben validarse con el SME antes de uso oficial" O usar solo EC0366 CONOCER como normativa base y dejar campo para completar por el cliente |
| 7.3 | El glosario consolidado de P7 agrega TODOS los `conceptos[N].termino` de todos los temas. Si hay 4 módulos y cada uno genera 5 conceptos, el glosario puede tener 20 términos. No hay deduplicación semántica (sinónimos no se fusionan) | MEDIO | Glosario redundante con el glosario del Manual P4, diferente terminología para el mismo concepto | Comparar términos de P7 con términos del glosario de P4 y marcar duplicados |
| 7.4 | La descripción `relacion_puesto` (cómo impacta en el trabajo del participante) tiene un veto mínimo de 20 caracteres. Esto permite respuestas como "Mejora el trabajo (22 chars)" que pasarían el veto sin ser útiles | BAJO | Descripciones de valor laboral superficiales | Subir el mínimo a 80 caracteres para esta sección |

**Lo que funciona bien:**
- Glosario consolidado y ordenado alfabéticamente
- `indicador_dominio` (cómo saber si dominas el tema) — útil pedagógicamente
- Estructura bifásica (descripción práctica + fundamento técnico)
- Mandatory key names (termino/definicion/ejemplo) — previene parsing failures

---

### P8 — Cronograma de Desarrollo

**Descripción del sistema:** Extractor → Hitos A+B (juez) → Riesgos y compuertas de calidad A+B (juez) → Ensamblador con ruta crítica y acumulación.

#### Problemas y gravedad

| # | Problema | Gravedad | Impacto | Solución |
|---|---|---|---|---|
| 8.1 | **P8 genera un cronograma de PRODUCCIÓN DE MATERIALES (hitos de desarrollo), no de IMPARTICIÓN DEL CURSO.** EC0366 requiere un "Programa de Formación" que muestre cuándo y cómo se imparte el curso a los candidatos, no cuándo se producen los materiales. P8 mezcla ambos conceptos o asume que son lo mismo | CRÍTICO para certificación | El auditor CONOCER busca un programa de impartición. P8 entrega un plan de proyecto de producción | Separar en dos artefactos: (A) Cronograma de Producción (P8 actual, para gestión interna) y (B) Programa de Formación (nuevo entregable, con fechas reales de impartición por grupo) |
| 8.2 | Las fechas son relativas: "Day 1", "Day 5", "Semana 2". No hay fecha de inicio anclada a un calendario real. El cronograma no sirve para planificación operativa real | ALTO | Hitos no accionables. El equipo no sabe cuándo hacer qué | El form schema de P8 debe capturar "Fecha de inicio del proyecto" y usar aritmética de días hábiles para generar fechas reales |
| 8.3 | Los riesgos son generados por el LLM sin análisis real del dominio del curso. Para un curso de pintura artesanal, el LLM generará riesgos genéricos de proyecto (retrasos en aprobaciones, cambios de alcance) en lugar de riesgos específicos (disponibilidad de materiales especializados, modelo de IA no conoce terminología del dominio) | MEDIO | Gestión de riesgos decorativa, no operacional | Los riesgos deberían derivarse del contexto real del curso (tipo de proyecto, dominio, tamaño del equipo) — el extractor debería inyectar estos datos |
| 8.4 | Las "compuertas de calidad" son strings generados por el LLM ("Guiones aprobados por facilitador"). No tienen responsable nombrado, fecha, ni criterio de aprobación | MEDIO | Quality gates no accionables | Añadir structure: `{compuerta, responsable, criterio, fecha_limite}` |
| 8.5 | La "Ruta Crítica y Dependencias Generales" está hardcoded en el ensamblador como "P3→P4" y "P1→P5". Si el proyecto tiene otras dependencias o el orden cambia, la ruta crítica es incorrecta | BAJO | Ruta crítica incorrecta para proyectos atípicos | Derivar dependencias del estado real de `productos_previos` en lugar de hardcodear |

**Lo que funciona técnicamente:**
- Acumulación por módulo con estructura consistente
- Two-section judge (milestones + riesgos/compuertas)
- Agent B añade impacto y probabilidad a los riesgos
- normalizarStringArray() para compuertas de calidad
- Documentación de dependencias P3→P4 y P1→P5

---

## ERRORES METODOLÓGICOS

1. **Clasificación errónea de P8**: Un cronograma de desarrollo de materiales no es un entregable EC0366. Confunde el proceso de producción del curso con el programa de formación.

2. **P3 fuera de alcance del estándar**: EC0366 diseña cursos, no produce medios audiovisuales. Los guiones de video son artefactos de producción, no de diseño instruccional. Su presencia infla el alcance del sistema sin valor certificatorio.

3. **P7 sin anclaje normativo**: No existe un entregable llamado "Información General" en la taxonomía EC0366. El sistema lo genera como si fuera requerido por el estándar.

4. **Forma y función del P6**: El Calendario debe tener fechas. Una distribución horaria es una pieza del calendario, no el calendario completo. El producto no puede llamarse "Calendario" si no tiene fechas.

5. **Domain Lock mal aplicado en P3**: El inventario de materiales del curso (herramientas de pintura, por ejemplo) no debe restringir el equipamiento audiovisual del video (cámara, micrófono). Son dominios independientes que el sistema confunde.

6. **Form schema y chapter generator de P4 divergentes**: El usuario valida el form schema con una estructura de secciones, pero el chapter generator usa una estructura diferente. La adaptación la hace el LLM "en vuelo", sin garantías de fidelidad.

---

## ERRORES PEDAGÓGICOS

1. **Actividades de P2 sin validación de tiempo real**: Se puede generar una presentación con 15 actividades que sumen 300 minutos para un módulo de 60 minutos. No hay guardarraíl pedagógico de tiempo.

2. **P7 conceptos sin progresión pedagógica**: Los conceptos se generan por tema en orden de aparición, no por complejidad creciente. No hay análisis de prerequisitos entre términos.

3. **Rúbricas de P5 sin niveles de desempeño**: La rúbrica de P5 tiene criterios con puntos (0-100) pero sin descriptores de desempeño por nivel (Excelente/Satisfactorio/Insuficiente). EC0366 requiere criterios con niveles de logro observables.

4. **P4 no garantiza alineación con P1**: El manual puede cubrir contenido teórico que no será evaluado en los instrumentos de P1. Un participante que estudia P4 puede encontrarse evaluado en cosas que el manual no cubre a profundidad.

5. **Objetivos de P5 no verificados contra P1**: La instrucción "P1 ALIGNMENT" en el form schema de P5 es aspiracional. No hay cruce programático entre el objetivo de la actividad y los reactivos del instrumento correspondiente.

6. **P6 no incluye diagnóstico de conocimientos previos**: El calendario de EC0366 debe incluir evaluación diagnóstica al inicio. P6 solo planifica desarrollo y cierre, no apertura diagnóstica.

---

## ERRORES DOCUMENTALES

1. **Inconsistencia terminológica entre productos**: P1 usa "Ponderación Global", P6 usa "Peso en la Calificación Final". Son el mismo concepto con nombres distintos. En un portafolio EC0366 deben ser consistentes.

2. **"instrumento" en P6 puede diferir de "Tipo de Instrumento" en P1**: LLM parafrasea → "Lista de Cotejo" (P1) puede aparecer como "Lista de Verificación" (P6). No hay normalización entre productos.

3. **Bibliografía de P4 potencialmente con URLs inválidas**: El assembler extrae URLs del markdown con regex y las incluye sin verificación HTTP. URLs hallucinated por el LLM pasan como referencias legítimas.

4. **Glosarios duplicados**: P4 genera un glosario del Manual del Participante. P7 genera un Glosario Consolidado del Curso. Pueden tener definiciones diferentes del mismo término — sin mecanismo de sincronización.

5. **Formatos de fecha inconsistentes**: P8 usa "Day X" / "Semana Y". P6 usa horas ("09:00"). Ninguno tiene formato de fecha ISO o dd/mm/aaaa. En un portafolio real esto es inaceptable.

---

## INCONSISTENCIAS ENTRE ENTREGABLES

| Inconsistencia | Productos | Gravedad |
|---|---|---|
| P4 form schema tiene estructura A ≠ estructura B ≠ estructura del chapter generator | P4 | ALTO |
| P1 instrumento type (Guía, Lista, Cuestionario) puede aparecer parafraseado en P6 entregables | P1 → P6 | MEDIO |
| P3 escenas (Apertura-Gancho, Concepto_1) no coinciden con las diapositivas de P2 (Título, Marco Teórico) | P2 → P3 | MEDIO |
| Glosario P4 y Glosario P7 pueden definir el mismo término de forma diferente | P4 → P7 | MEDIO |
| P5 actividad puede usar materiales no cubiertos en P4 si el extractor de P5 falla (bug histórico) | P4 → P5 | ALTO (histórico) |
| P8 hitos de "aprobación de guiones" asume que P3 existe y está disponible, pero P3 no es requerido por EC0366 | P3 → P8 | MEDIO |
| Horas totales del Calendario P6 pueden diferir de horas del programa F3 (sin verificación en código) | F3 → P6 | MEDIO |
| P7 normas (NOM/ISO) son LLM-generated; P1 no referencia ninguna norma — incoherencia institucional | P1 → P7 | BAJO |

---

## ELEMENTOS FALTANTES

Los siguientes elementos son requeridos o esperados por EC0366 y no están presentes en ningún producto:

1. **Perfil de ingreso del participante** (conocimientos previos, requisitos): No existe en ningún producto F4. Debería ser parte de P6 o P7.

2. **Perfil de egreso** (competencias que el participante demostrará al terminar): No existe explícitamente. El P1 define qué se evalúa pero no el perfil de egreso como documento.

3. **Evaluación diagnóstica**: EC0366 requiere un instrumento diagnóstico al inicio. No existe en ningún producto F4.

4. **Programa de Formación con fechas reales**: P6 tiene distribución horaria; P8 tiene hitos sin fechas. Ninguno genera un calendario de impartición con fechas concretas (mm/dd/aaaa).

5. **Firma de validación por SME (Subject Matter Expert)**: Los instrumentos de P1 son generados por IA. Para ser válidos bajo EC0366, deben tener validación de un experto en el tema. No existe campo ni proceso para capturar esta firma.

6. **Validación del Diseñador Instruccional**: EC0366 requiere que el diseño sea validado por un DI certificado. El sistema automatiza el diseño pero no captura la firma de validación.

7. **Evidencias de contexto laboral** para los reactivos de P1: EC0366 requiere que los reactivos se anclen en situaciones reales del puesto de trabajo. El sistema los genera pero no verifica que correspondan a situaciones laborales reales del sector.

8. **Bibliografía verificada**: Los materiales didácticos EC0366 requieren bibliografía con fuentes reales. El sistema extrae URLs de Tavily pero no verifica su resolución.

---

## CONTENIDO REDUNDANTE O INÚTIL

| Elemento | Producto | Problema |
|---|---|---|
| Storyboard generado por LLM | P3 | Texto descriptivo sin valor para producción real; requiere diseñador gráfico para ser útil |
| "errores_evitar" en P7 Agent B | P7 | Duplica el "Errores Comunes" del P4. Dos lugares con el mismo contenido |
| "vista_previa" y "recursos_adicionales" en P2 cierre Agent B | P2 | Solo aparece si Agent B gana; si no, el Cierre no tiene estos campos. Condicional no garantizado |
| Glosario de P7 + Glosario de P4 | P4+P7 | Dos glosarios del mismo curso sin sincronización |
| "Lecturas Complementarias" en P4 y "Fuentes de Consulta" en P7 | P4+P7 | Dos secciones de referencias del mismo curso. Pueden contradecirse |
| `distribucion_minutos` en P6 horario Agent B | P6 | Solo presente si Agent B gana. Dato útil pero no garantizado |
| `indicador_dominio` en P7 conceptos Agent B | P7 | Solo presente si Agent B gana. No garantizado |

---

## RIESGOS DE NO APROBACIÓN EN REVISIÓN FORMAL CONOCER

| Riesgo | Probabilidad | Impacto |
|---|---|---|
| P8 presentado como "Calendario de Impartición" cuando es cronograma de desarrollo | MUY ALTA | RECHAZO |
| P6 sin fechas concretas presentado como "Calendario General" | ALTA | OBSERVACIÓN GRAVE |
| P3 scripts de video sin los videos producidos — evidencia incompleta | ALTA | OBSERVACIÓN GRAVE |
| P7 "Información General" no reconocible como entregable EC0366 | ALTA | OBSERVACIÓN |
| P1 sin espacios de firma (si Agent A gana consistentemente) | MEDIA | OBSERVACIÓN GRAVE |
| Normas inventadas por LLM en P7 | MEDIA | OBSERVACIÓN |
| Materiales en P5 provenientes de MODE B (antes de fix de hoy) | MEDIA (retroactiva) | OBSERVACIÓN |
| URL de bibliografía en P4 que no resuelven | MEDIA | OBSERVACIÓN |
| Inconsistencia terminológica entre P1 y P6 | BAJA | OBSERVACIÓN |

---

## PLAN DE CORRECCIÓN

### FASE 1 — Correcciones bloqueantes (antes de cualquier presentación a CONOCER)

1. **[P6] Añadir campo "Fecha de inicio" al form schema de P6** y generar fechas reales en el calendario (dd/mm/aaaa). Sin esto, P6 no es un Calendario.

2. **[P8] Redefinir P8** como "Cronograma de Desarrollo" (interno) y crear un nuevo entregable "Programa de Formación" con fechas de impartición, grupos, lugar, modalidad.

3. **[P1] Mover firma del evaluador y candidato al ensamblador TypeScript** como sección invariante, independientemente del agente ganador.

4. **[P5] Regenerar todos los P5 existentes** después de regenerar P4 con `inventario_materiales`. Los P5 previos al fix de hoy tienen materiales fabricados.

### FASE 2 — Mejoras de calidad crítica

5. **[P4] Unificar estructura del form schema** con la del chapter generator. Mismas 7 secciones en ambos.

6. **[P4] Delimitar extracción del glosario** al bloque `### Conceptos Clave` solamente.

7. **[P6] Añadir validación en assembler** de `totalG` vs horas F3 con warning si diverge >10%.

8. **[P1] Añadir verificación programática de CLAVE** en el ensamblador: contar filas de reactivos y comparar con filas de CLAVE.

9. **[P3] Separar Domain Lock**: `inventario_p4` aplica al CONTENIDO del video (qué herramientas se demuestran), no al equipamiento audiovisual de filmación.

### FASE 3 — Mejoras de alineación EC0366

10. **[P7] Redefinir P7** como "Ficha Técnica del Programa / Programa de Formación": perfil de ingreso, perfil de egreso, competencias a desarrollar, requisitos de certificación.

11. **Añadir evaluación diagnóstica** como producto adicional o como sección en P6.

12. **Añadir campos de validación institucional** en P1 y P4: firma de SME, firma de DI, fecha de validación.

13. **[P7] Restringir normas** al catálogo real de CONOCER/NOM/ISO relevante por sector, o añadir advertencia de "sujeto a validación por experto".

### FASE 4 — Refinamiento

14. **[P4] Implementar verificación de URLs de Tavily** antes de incluirlas en bibliografía.

15. **[P2] Añadir límite máximo de diapositivas** por módulo para evitar presentaciones de 60+ slides.

16. **Sincronizar glosarios** de P4 y P7: detectar términos duplicados y unificar definiciones.

---

## QUICK WINS (alto impacto, bajo esfuerzo)

| Win | Esfuerzo | Impacto |
|---|---|---|
| Mover firma a ensamblador de P1 (invariante) | 30 min | Elimina riesgo crítico de P1 |
| Añadir conteo de filas CLAVE en assembler P1 | 45 min | Garantiza corrección formal de cuestionarios |
| Cambiar texto de P8 de "cronograma de desarrollo" a "cronograma de producción" y añadir nota de que es interno | 15 min | Reduce riesgo de confusión con auditor |
| Añadir campo `fecha_inicio` al form schema de P6 y generarlo en assembler | 2h | Convierte P6 en un calendario real |
| Ampliar regex de palabras prohibidas en P1 para locuciones adverbiales | 30 min | Cierra brecha de subjetividad infiltrada |
| Añadir mínimo 3 reactivos en `suggested_value` del form schema de P1 | 30 min | Elimina desconexión entre sugerencia y requisito |

---

## CONCLUSIÓN FINAL

### ¿Los productos parecen profesionales?

**Parcialmente.** P1, P4 y P5 tienen un diseño de validación maduro con controles reales. P2 y P3 están bien construidos técnicamente pero con brechas pedagógicas. P6, P7 y P8 tienen problemas conceptuales de fondo.

### ¿Parecen improvisados?

No en el sentido técnico — la arquitectura multi-agente con jueces y validadores es sofisticada. Sin embargo, la definición de **qué es cada producto** parece haber evolucionado ad-hoc sin una revisión contra EC0366 real. P8 como "cronograma de desarrollo" y P3 como "producción audiovisual" sugieren que el sistema creció orgánicamente en funcionalidad antes de que se verificara la correspondencia normativa.

### ¿Parecen automatizados?

Sí, y esto es un riesgo. Los documentos carecen de señales de revisión humana. No hay campos de "Validado por:" ni fechas de aprobación en los metadatos de los documentos. Un auditor CONOCER con experiencia detectará el patrón de contenido LLM (estructura predecible, ausencia de anécdotas reales del dominio, bibliografía genérica).

### ¿Son auditables?

Moderadamente. El pipeline guarda en BD los outputs de cada agente y el resultado del juez, lo que permite trazar por qué se eligió A vs B. Pero no hay trazabilidad de **validación humana**, que es lo que EC0366 exige.

### ¿Son certificables bajo EC0366?

**No en su estado actual.** Con las correcciones de las Fases 1 y 2 (estimadas en 2-3 semanas de trabajo), P1, P4, P5 y P6 podrían ser certificables. P3, P7 y P8 requieren redefinición conceptual (Fase 3). La certificación real también requiere que un evaluador externo CONOCER valide físicamente los materiales con un grupo real de candidatos.

### Probabilidad de aprobación en revisión formal CONOCER: **30%** (estado actual) / **75%** (con fases 1-3 implementadas)

---

*Documento generado por auditoría técnico-pedagógica automatizada. Sujeto a validación por Evaluador Certificado CONOCER.*


sí, dame la instrucción. También hay que eliminarlo, el anteriór se eliminó así: docker compose exec -T supabase-db psql -U postgres -d postgres -c "


docker compose exec -T supabase-db psql -U postgres -d postgres -c "
-- Eliminar TODOS los esquemas del proyecto para forzar regeneración limpia con v2.0.0
DELETE FROM producto_form_schemas 
WHERE project_id = '4e8dfda7-494a-40e4-83dd-a12ede7eed46';

-- Cancelar cualquier job activo
UPDATE pipeline_jobs
SET status = 'failed', error = 'Invalidado: regeneración forzada v2.0.0'
WHERE project_id = '4e8dfda7-494a-40e4-83dd-a12ede7eed46'
 AND prompt_id = 'F4_GENERATE_FORM_SCHEMA'
 AND status IN ('pending', 'running');

-- Confirmar
SELECT 'producto_form_schemas' AS tabla, count(*) AS filas_restantes
FROM producto_form_schemas WHERE project_id = '4e8dfda7-494a-40e4-83dd-a12ede7eed46';
" 2>&1



docker compose exec -T supabase-db psql -U postgres -c "
DELETE FROM producto_form_schemas WHERE project_id = '4e8dfda7-494a-40e4-83dd-a12ede7eed46';
DELETE FROM fase4_productos WHERE project_id = '4e8dfda7-494a-40e4-83dd-a12ede7eed46';
DELETE FROM pipeline_jobs WHERE project_id = '4e8dfda7-494a-40e4-83dd-a12ede7eed46' AND phase_id = 'F4';
UPDATE wizard_steps SET status = 'pending', updated_at = NOW() WHERE project_id = '4e8dfda7-494a-40e4-83dd-a12ede7eed46' AND step_number = 5;
"

$ docker compose exec -T supabase-db psql -U postgres -c "
DELETE FROM producto_form_schemas WHERE project_id = '4e8dfda7-494a-40e4-83dd-a12ede7eed46';
DELETE FROM fase4_productos WHERE project_id = '4e8dfda7-494a-40e4-83dd-a12ede7eed46';
DELETE FROM pipeline_jobs WHERE project_id = '4e8dfda7-494a-40e4-83dd-a12ede7eed46' AND phase_id = 'F4';
UPDATE wizard_steps SET status = 'pending', updated_at = NOW() WHERE project_id = '4e8dfda7-494a-40e4-83dd-a12ede7eed46' AND step_number = 5;    
"

docker exec knowto-supabase-db psql -U postgres -d postgres -c "
SELECT COUNT(*) AS fase4_productos FROM fase4_productos WHERE project_id = '4e8dfda7-494a-40e4-83dd-a12ede7eed46';
SELECT COUNT(*) AS form_schemas FROM producto_form_schemas WHERE project_id = '4e8dfda7-494a-40e4-83dd-a12ede7eed46';
SELECT COUNT(*) AS pipeline_jobs FROM pipeline_jobs WHERE project_id = '4e8dfda7-494a-40e4-83dd-a12ede7eed46' AND prompt_id LIKE 'F4_%';
"

docker exec knowto-supabase-db psql -U postgres -d postgres -c "
BEGIN;

-- 1. pipeline_agent_outputs (FK a pipeline_jobs)
DELETE FROM pipeline_agent_outputs
WHERE job_id IN (
  SELECT id FROM pipeline_jobs
  WHERE project_id = '4e8dfda7-494a-40e4-83dd-a12ede7eed46'
    AND prompt_id LIKE 'F4_%'
);

-- 2. pipeline_jobs
DELETE FROM pipeline_jobs
WHERE project_id = '4e8dfda7-494a-40e4-83dd-a12ede7eed46'
  AND prompt_id LIKE 'F4_%';

-- 3. fase4_productos
DELETE FROM fase4_productos
WHERE project_id = '4e8dfda7-494a-40e4-83dd-a12ede7eed46';

-- 4. producto_form_schemas
DELETE FROM producto_form_schemas
WHERE project_id = '4e8dfda7-494a-40e4-83dd-a12ede7eed46';

COMMIT;
"

docker exec knowto-supabase-db psql -U postgres -d postgres -c "
SELECT id, prompt_id, status, created_at
FROM pipeline_jobs
WHERE project_id = '4e8dfda7-494a-40e4-83dd-a12ede7eed46'
  AND prompt_id LIKE 'F4_%'
ORDER BY created_at;
"

docker exec knowto-supabase-db psql -U postgres -d postgres -c "
-- 1. Ver qué hay en cada tabla
SELECT producto, validacion_estado, LEFT(documento_final, 60) AS doc_preview, created_at
FROM fase4_productos
WHERE project_id = '4e8dfda7-494a-40e4-83dd-a12ede7eed46'
ORDER BY producto;
"

docker exec knowto-supabase-db psql -U postgres -d postgres -c "
SELECT producto, updated_at
FROM producto_form_schemas
WHERE project_id = '4e8dfda7-494a-40e4-83dd-a12ede7eed46'
ORDER BY producto;
"

docker exec knowto-supabase-db psql -U postgres -d postgres -c "
DELETE FROM fase4_productos
WHERE project_id = '4e8dfda7-494a-40e4-83dd-a12ede7eed46'
AND producto in ('P2', 'P3');
"
docker exec knowto-supabase-db psql -U postgres -d postgres -c "
DELETE FROM fase4_productos WHERE project_id = '4e8dfda7-494a-40e4-83dd-a12ede7eed46' AND producto = 'P3';"

docker exec knowto-supabase-db psql -U postgres -d postgres -c "
-- Borrar outputs primero (FK hacia pipeline_jobs)
DELETE FROM pipeline_agent_outputs
WHERE job_id IN (SELECT id FROM pipeline_jobs WHERE prompt_id LIKE 'F4_%');

-- Borrar jobs F4
DELETE FROM pipeline_jobs WHERE prompt_id LIKE 'F4_%';

-- Borrar productos generados
DELETE FROM fase4_productos;

-- Borrar form schemas
DELETE FROM producto_form_schemas;
" 2>&1

Continuación del refinamiento del pipeline EC0366 Fase 4. Estábamos trabajando en P3 (Guiones Multimedia). El último estado: se aplicaron los 5 cambios de P3, P4 está cerrado con 11 correcciones, P1 está funcional. El flujo maestro actual es P1 → P4 → P3 → P2 → P5 → P6 → P7 → P8. Queda pendiente probar P3 y luego seguir con P2, P5, P6, P7, P8

https://chat.deepseek.com/share/t1fok9swl6ut0qored