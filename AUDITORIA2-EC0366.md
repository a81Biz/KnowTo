# AUDITORÍA TÉCNICO-PEDAGÓGICA ESPECIALIZADA — SEGUNDA RONDA
## Productos EC0366 SEP-CONOCER / KnowTo DCFL — Fase 4 (F4)
**Fecha:** 2026-05-10
**Modalidad:** Auditoría de sistema generativo (prompts + assemblers + lógica de validación)
**Comparativa:** Segunda auditoría, más estricta que AUDITORIA-EC0366.md
**Comité evaluador:** Evaluador CONOCER · Diseñador Instruccional Senior · Auditor de Calidad Educativa · Experto en Competencias Laborales · Especialista en Instrumentos de Evaluación · Experto en Alineación Pedagógica · Corrector Técnico-Normativo · Revisor Documental · Experto en Redacción Académica · Auditor SEP-CONOCER · Especialista en Capacitación Presencial/Virtual

> **Nota metodológica:** Esta segunda auditoría evalúa el sistema DESPUÉS de las tres rondas de correcciones (41 cambios documentados en CAMBIOS-EC0366.md). Se audita el estado actual del diseño del sistema, no productos específicos generados. El estándar de exigencia es equivalente al de una revisión formal CONOCER.

---

## RESUMEN EJECUTIVO

La primera auditoría identificó brechas conceptuales graves en la definición de qué es cada producto y su correspondencia con EC0366. Las tres rondas de correcciones atendieron todos los hallazgos formalmente. Sin embargo, una revisión rigurosa del estado **posterior a los cambios** revela que **varias correcciones resuelven el síntoma pero no la causa raíz**, que persisten inconsistencias sistémicas entre productos, y que la arquitectura multi-agente genera nuevas categorías de riesgo que la primera auditoría no contempló.

**Veredicto ejecutivo:** La probabilidad de aprobación en revisión formal CONOCER sube de 30% a **55–60%** con los cambios aplicados. Los productos P1, P4 y P5 ahora tienen controles robustos. P6 tiene fechas reales pero el generator template no lee `hora_inicio_sesion`. P7 y P8 mejoraron conceptualmente. P2 y P3 siguen siendo los más débiles desde la perspectiva EC0366. El sistema es técnicamente sofisticado pero **aún no es certificable sin intervención humana en cada producto**.

---

## SCORE GLOBAL

| Dimensión | Score anterior | Score actual | Justificación |
|---|---|---|---|
| Cumplimiento EC0366 | 52/100 | **64/100** | P6 con fechas reales, P8 separado de impartición, P7 con ficha técnica. Brechas subsisten en P2/P3 |
| Calidad pedagógica | 61/100 | **67/100** | Mejoras en P5 (materialización), P6 (diagnóstica). Rúbricas P5 sin niveles de desempeño |
| Calidad documental | 68/100 | **74/100** | Firmas P1 y P4 invariantes, URL warning, normativa con aviso. Terminología aún inconsistente |
| Instrumentos de evaluación | 58/100 | **72/100** | CLAVE verificada, reactivos mínimo 3, workplace context añadido. No verifica alineación P1→P6 en juez |
| Coherencia metodológica | 44/100 | **58/100** | P4→P5→P6 trazabilidad mejorada. Aún sin verificación de que P5 duración cabe en slot P6 |
| Aplicabilidad real | 55/100 | **62/100** | P4 calibrado por perfil F2, P8 con sección de impartición. P3 sigue sin producción real |
| Profesionalismo | 65/100 | **70/100** | Secciones de validación SME, avisos legales. LLM-generated sin señales de revisión humana visible |

**SCORE PROMEDIO: 66.7/100 — Condicional. Requiere correcciones en P2, P3, y verificaciones cruzadas.**

---

## HALLAZGOS CRÍTICOS (priorizados)

| Prioridad | Hallazgo | Producto(s) | Gravedad |
|---|---|---|---|
| 1 | P6 generator NO lee `hora_inicio_sesion` del formulario — el campo existe en el form schema pero el template de generación no lo extrae ni lo usa | P6 | BLOQUEANTE |
| 2 | La rúbrica de P5 tiene criterios con puntos enteros (0-100) pero sin niveles de desempeño (Excelente/Satisfactorio/Insuficiente) — EC0366 exige descriptores por nivel observable | P5 | ALTO |
| 3 | El `juez_horas` de P6 veta si `total_horas > 16` pero ya existe warning en assembler para `> 10h`. Hay doble umbral inconsistente: 10h en código, 16h en el juez | P6 | ALTO |
| 4 | P2 genera hasta 20 diapositivas por módulo × hasta 8 módulos = hasta 160 diapositivas totales. No hay límite global de presentación. Con 4 módulos ya son 80 diapositivas — inviable para impartición real | P2 | ALTO |
| 5 | El assembler de P6 inyecta el instrumento desde P1 (`productos_previos.P1.instrumentos`) pero el template extractor de P6 ya lee `instrumentos_p1` desde P1 y se lo pasa a los agentes LLM. Se producen dos fuentes del instrumento — la del assembler sobreescribe, pero los agentes del pipeline ya procesaron una versión potencialmente distinta | P6 | MEDIO |
| 6 | La función `esSospechosa()` en P4 filtra URLs ANTES de deduplicar por dominio. Si una URL legítima de Tavily comparte hostname con una sospechosa, la URL legítima puede ser omitida incorrectamente | P4 | MEDIO |
| 7 | El workplace context en P1 (EF-7) es una instrucción en el prompt de los agentes, pero el `juez_doc` de P1 NO tiene este criterio en su lista de selección — puede seleccionar el agente que generó reactivos sin contexto laboral | P1 | MEDIO |
| 8 | P3 genera `guion_tecnico` con instrucciones de producción audiovisual (encuadre, ángulo de cámara, iluminación). Si el cliente no tiene equipo de producción de video, todo P3 es papel decorativo | P3 | MEDIO |
| 9 | La validación de porcentajes en P1 (`validateDocumentoP1`) usa PROHIBITED_WORDS regex sobre el documento final, pero el assembler de P1 usa el ganador del juez sin re-aplicar este filtro sobre la rúbrica específica de cada unidad | P1 | MEDIO |
| 10 | La sección `fichaPrograma.perfil_ingreso` en P7 es sobreescrita por F2 — correcto. Pero `fichaPrograma.perfil_egreso` viene SOLO del formulario (LLM suggestion), sin fuente autoritativa en F2 o F3 | P7 | MEDIO |

---

## HALLAZGOS POR PRODUCTO

---

### P1 — Instrumentos de Evaluación

| # | Problema | Gravedad | Impacto | Solución |
|---|---|---|---|---|
| P1-A | El `juez_doc` no evalúa workplace context (EF-7). La regla existe en Agente A y B pero el juez puede seleccionar al que no la cumple si tiene mejores ponderaciones o matemáticas | MEDIO | Workplace context garantizado en prompt pero no en selección | Añadir criterio 8 al `juez_doc`: preferir el agente cuyos reactivos incluyen más marcadores de contexto laboral ("en su área de trabajo", "ante el material real") |
| P1-B | La sección "Datos Generales" de Agente A no incluye "Centro de Evaluación CONOCER", "Número de estándar EC0366", ni "Fecha de evaluación" — campos institucionales obligatorios | ALTO | Instrumento rechazable formalmente por omisión de campos institucionales | El assembler invariante de firmas debería también inyectar estos campos en la sección de Datos Generales |
| P1-C | El `validateDocumentoP1` aplica PROHIBITED_WORDS sobre el documento completo. Las secciones "Datos Generales" e "Instrucciones Generales" usan verbos que pueden disparar falsos positivos (ej. "correctamente" en instrucciones al evaluador es contexto legítimo) | BAJO | Falsos positivos activan fallback innecesariamente | Delimitar el regex de PROHIBITED_WORDS solo a las filas de la tabla de reactivos, no al documento completo |
| P1-D | El form schema `F4_P1_FORM_SCHEMA` no captura el **contexto del puesto de trabajo** del candidato. Los agentes generan reactivos sin saber si el candidato trabaja en taller, campo, oficina o plataforma digital | MEDIO | Reactivos genéricos aunque workplace context esté en la instrucción | Añadir campo `contexto_puesto` al form schema P1: dónde y cómo realiza el candidato las actividades del curso |
| P1-E | La CLAVE DE RESPUESTAS solo aplica a unidades de tipo Cuestionario. No hay verificación de que las Guías de Observación tengan criterios de desempeño SMART (Specific, Measurable, Achievable, Relevant, Time-bound) | BAJO | Guías de observación sin criterio de suficiencia observable | Añadir al juez criterio: para Guía de Observación, verificar que cada reactivo tenga un indicador de resultado medible |

---

### P2 — Presentación Electrónica

| # | Problema | Gravedad | Impacto | Solución |
|---|---|---|---|---|
| P2-A | **Sin límite global de diapositivas.** El cap de 20 slides es por módulo. Un curso de 4-8 módulos produce 80-160 diapositivas. En un proceso de impartición presencial de 2-3 días, esto es estructuralmente inviable | ALTO | Presentaciones inutilizables en contexto real | Añadir al assembler de P2 un contador global de diapositivas y emitir advertencia si supera 60 slides totales en el documento final |
| P2-B | El tiempo total de la presentación se extrae de `{contenido_form}` buscando patrón `"X min"`. Si el usuario no escribe "min" explícitamente o usa "horas", el TIME SCALE RULE falla silenciosamente sin ajuste | MEDIO | Distribución de tiempos incorrecta sin detección | Normalizar la extracción de duración en el extractor con soporte para "horas", "hr", "h", "minutos" |
| P2-C | `nota_facilitador.diga` puede citar teoría del P4 que viene de datos Tavily de otra unidad. El ANTI-LOOP RULE previene diapositivas duplicadas pero no previene que el facilitador diga contenido que el manual P4 no cubrió en esa unidad | MEDIO | Facilitador dice cosas que el manual no dice — incoherencia instruccional | El extractor P2 ya lee `p4_secciones` — el agente debería citar solo lo que está en `p4_secciones` de ESTA unidad |
| P2-D | La sección de Actividades tiene Domain Lock verificado. Sin embargo, el juez de actividades **no verifica si los materiales existen físicamente en el espacio de impartición**. Un curso en línea puede generar actividades con materiales físicos imposibles de usar virtualmente | MEDIO | Actividades inviables en modalidad virtual | El extractor P2 debería pasar la `modalidad_imparticion` de P8 a los agentes de actividades para filtrar materiales físicos cuando la modalidad es virtual |
| P2-E | `recursos_adicionales` y `vista_previa` del Agente B solo aparecen si el Agente B gana. No están garantizados en el documento final — son beneficios condicionales que el auditor puede esperar y no encontrar | BAJO | Secciones de enriquecimiento inconsistentes entre módulos | El assembler podría generar estos campos como vacíos explícitos cuando Agent A gana, en lugar de omitirlos |

---

### P3 — Paquete de Producción Audiovisual

| # | Problema | Gravedad | Impacto | Solución |
|---|---|---|---|---|
| P3-A | **P3 sigue siendo completamente opcional como entregable EC0366.** El EC0366 SCOPE NOTE añadido al prompt advierte que P3 no es obligatorio, pero el sistema genera P3 para TODAS las unidades por defecto — sin preguntar al cliente si piensa producir videos | ALTO | Cliente recibe P3 completo creyendo que debe producirlo para CONOCER | Añadir al form schema P3 un campo de confirmación: "¿Planea producir materiales audiovisuales?" Si No → P3 no se genera |
| P3-B | El `equipamiento` del campo `PRODUCCIÓN` usa equipos estándar de filmación (cámara, micrófono, trípode), pero no verifica que el cliente tenga acceso real a ese equipamiento. Para un curso presencial de taller sin presupuesto AV, esto es irreal | ALTO | P3 inútil si el cliente no tiene equipo de video | El form schema debería capturar disponibilidad de equipo AV; si ausente, P3 debería generar solo guión instruccional sin ficha de producción |
| P3-C | La escaleta tiene 9 escenas fijas: Apertura-Gancho, Contexto, Concepto_1, Concepto_2, Demostración, Error-Común, Cierre-Acción, Call-to-Action. Esta estructura es óptima para e-learning corporativo, **no para una evaluación de competencia laboral EC0366** donde el video debería demostrar el proceso real del puesto | MEDIO | Estructura de video orientada a marketing educativo, no a evidencia de competencia | Añadir tipo de video EC0366: "Video de demostración de competencia" con estructura: Contexto Laboral → Proceso Real → Verificación de Resultado |
| P3-D | El guion técnico incluye "encuadre" (Close-up, Medium Shot, Wide Shot) — terminología de producción audiovisual profesional. Si lo produce el propio instructor con un teléfono, estos términos son inaplicables y confunden | BAJO | Terminología de producción fuera de contexto del cliente | Añadir nota: "Si la producción es casera (smartphone/tablet), simplificar a: Plano de mano, Plano general, Primer plano" |
| P3-E | El storyboard generado por el LLM describe escenas en texto. El assembler convierte esto a markdown. No hay ninguna verificación de que las escenas del storyboard correspondan a las de la escaleta — pueden ser completamente distintas | MEDIO | Incoherencia interna entre storyboard y escaleta | El assembler P3 debería cruzar los títulos del storyboard contra los marcadores de la escaleta y alertar si hay discordancias |

---

### P4 — Manual del Participante

| # | Problema | Gravedad | Impacto | Solución |
|---|---|---|---|---|
| P4-A | `buildJudgePrompt` trunca a 3200 chars cada agente antes de enviar al juez. Un capítulo P4 puede tener 8000-15000 chars. El juez evalúa solo la primera mitad — puede no ver la sección de Ejercicio Práctico ni las Lecturas Complementarias | ALTO | Juez no evalúa el capítulo completo — DOMAIN LOCK check es incompleto | Enviar al juez solo las secciones críticas: `### Conceptos Clave` y `### Desarrollo` completos + primeras 500 chars de Ejercicio Práctico |
| P4-B | `inventario_materiales` se construye desde `conceptos_clave[].termino` de todos los capítulos. Los conceptos clave son TÉRMINOS TÉCNICOS, no necesariamente MATERIALES FÍSICOS. Para un curso de pintura de miniaturas, "Zenithal Highlight" es un concepto clave pero no un material del inventario | ALTO | El inventario que usan P2/P3/P5 como Domain Lock está contaminado con conceptos teóricos, no solo materiales | Separar: `inventario_conceptos` (términos del glosario) e `inventario_materiales` (solo items físicos del `### Ejercicio Práctico` y `### Desarrollo`) |
| P4-C | La función `esSospechosa()` filtra URLs usando patrones regex ANTES de la deduplicación por dominio. El orden de operaciones es: **filtro sospechosas → agrupar por dominio**. Si un capítulo tiene `academia.edu/paper-real` y otro capítulo tiene `academia.edu/example-url`, la URL real podría ser omitida si `academia.edu` ya fue descartada | MEDIO | URLs legítimas omitidas por falso positivo del filtro | Aplicar `esSospechosa()` por URL individual antes de agregar a `allReferences`, no sobre el dominio agrupado |
| P4-D | El LLM genera el capítulo con profundidad del Marco Teórico basada en datos Tavily. Sin embargo, si Tavily no tiene resultados para el tema (timeout, sin conexión), `researchData` queda como `{}` y el capítulo se genera sin teoría real — el catch solo logea el warning | MEDIO | Capítulos con Marco Teórico vacío o inventado cuando Tavily falla | Cuando `searchResults` es null/undefined, marcar el capítulo con un banner: `> ⚠️ Marco Teórico generado sin fuentes externas verificadas — validar con SME antes de publicar` |
| P4-E | No hay verificación de que el número de secciones generadas en el capítulo (blocks) coincida con el número esperado (7 secciones). Si el LLM omite `### Ejemplo Práctico` o `### Ejercicio Práctico`, el document.md tiene secciones faltantes sin detección | MEDIO | Capítulos incompletos pasan validación y se incluyen en el manual | Añadir al assembler: contar bloques `###` en el chapter markdown y advertir si son < 6 |

---

### P5 — Guías de Actividades de Aprendizaje

| # | Problema | Gravedad | Impacto | Solución |
|---|---|---|---|---|
| P5-A | **La rúbrica de evaluación tiene criterios con puntos (enteros) pero sin descriptores por nivel de desempeño.** EC0366 requiere que la evaluación sea observable y reproducible por cualquier evaluador. Sin descriptores tipo "Excelente: aplica sin errores / Satisfactorio: 1-2 errores / Insuficiente: >2 errores", dos evaluadores diferentes aplicarían criterios distintos | CRÍTICO | Rúbrica no reproducible — evaluación subjetiva de facto | Añadir `nivel_A` (Completo), `nivel_B` (Parcial), `nivel_C` (Insuficiente) con descriptores observables a cada criterio de la rúbrica |
| P5-B | La `ficha` de la actividad tiene `objetivo`, `duracion`, `modalidad`, `tipo` pero no tiene `unidad_competencia` — la unidad de competencia del EC0366 a la que se alinea la actividad. CONOCER revisa que cada actividad trace hacia una unidad del estándar | ALTO | Actividades sin trazabilidad al estándar EC0366 formal | Añadir campo `unidad_competencia` en la ficha, tomado del nombre de la unidad (disponible en el extractor) |
| P5-C | El agente de evaluación verifica que `evidencia_producto` sea un nombre físico corto (máx 8 palabras). Sin embargo, si el instrumento P1 para esa unidad es un Cuestionario, la evidencia de producto de P5 debería ser "Cuestionario completado" — no hay verificación de coherencia tipo-instrumento | MEDIO | P5 puede generar "Pieza pintada" como evidencia cuando P1 definió Cuestionario para esa unidad | El agente de evaluación recibe `instrumentos_p1` — debería derivar `evidencia_producto` del tipo de instrumento P1 correspondiente |
| P5-D | `medidas_seguridad` solo aparece si Agente B gana la sección de procedimiento. Para cursos con materiales de riesgo (solventes, herramientas cortantes, equipos eléctricos), la ausencia de medidas de seguridad cuando Agente A gana es un riesgo real | ALTO | Actividades sin advertencias de seguridad cuando A gana | Mover `medidas_seguridad` al assembler TypeScript como sección invariante derivada del tipo de material (si `inventario_p4` contiene patrones de riesgo: solvente, elétrico, cortante → inyectar advertencia genérica) |
| P5-E | La duración de la actividad P5 (`ficha.duracion`) no se compara con el tiempo asignado en P6 para esa sesión. Una actividad de 90 minutos en una sesión P6 de 60 minutos es físicamente imposible | ALTO | Actividades que no caben en la sesión planificada | El assembler P5 debería leer `productos_previos.P6.partes[modulo_N].horario.total_horas` y advertir si la actividad P5 excede ese slot |

---

### P6 — Calendario General de Formación

| # | Problema | Gravedad | Impacto | Solución |
|---|---|---|---|---|
| P6-A | **`hora_inicio_sesion` se captura en el form schema pero el template `F4_P6_GENERATE_DOCUMENT` NO extrae este campo.** El extractor lee: `sesion_unidad_N`, `sesion_diagnostica`, `fecha_inicio_curso`, `_modulo_actual`, `_nombre_sesion`. La hora de inicio no está en la lista — el campo del formulario existe pero no llega al pipeline de generación | BLOQUEANTE | El campo nuevo es decorativo: se captura pero no se usa en el documento | Añadir `hora_inicio_sesion` al FIELDS del extractor P6 y usar su valor para anclar los tiempos de las actividades en lugar del "09:00" hardcoded |
| P6-B | `juez_horas` veta si `total_horas > 16`. El assembler emite warning si `total_horas > 10`. Son umbrales inconsistentes: el juez acepta sesiones de 14h que el assembler marca como problemáticas — pero el juez ya las eligió y el documento está generado | ALTO | Jornadas de 11-15h llegan al documento con solo un console.warn | Alinear el umbral del `juez_horas` a 10h: `total_horas > 10 → RECHAZADO` para que el LLM corrija antes de llegar al assembler |
| P6-C | La sesión diagnóstica solo se incluye en **módulo 1**. Si el curso tiene evaluación diagnóstica intermedia (punto de control entre módulos), no existe mecanismo para incluirla | BAJO | Diagnóstica solo en apertura — EC0366 permite (y recomienda) diagnóstica formativa | Bajo impacto a corto plazo, aceptable en estado actual |
| P6-D | El campo `hora` en `actividades[]` está hardcoded a "09:00" como valor inicial en el prompt. Incluso si la hora de inicio del formulario fuera "14:00", el LLM podría no respetarla porque el prompt lo ejemplifica a las 9 | MEDIO | Agenda con horario incorrecto aunque el usuario ingresó hora real | El extractor ya debería pasar `hora_inicio_sesion` para que los agentes anclen desde ahí |
| P6-E | No hay campo de **lugar de impartición por sesión** en el calendario. P8 captura `lugar_imparticion` global, pero el calendario no lo refleja sesión por sesión | BAJO | Calendario sin ubicación — auditor CONOCER puede solicitar este dato | Inyectar en el assembler P6 el `lugar_imparticion` de P8 como campo fijo en el encabezado del calendario |

---

### P7 — Ficha Técnica del Programa

| # | Problema | Gravedad | Impacto | Solución |
|---|---|---|---|---|
| P7-A | `perfil_egreso` viene **exclusivamente del formulario** (sugerencia LLM). No hay fuente autoritativa equivalente a F2 para `perfil_ingreso`. El LLM puede inventar competencias de egreso que no corresponden al EC0366 real del estándar | ALTO | Perfil de egreso ficticio en documento oficial | El perfil de egreso debería derivarse de las unidades de competencia de F3, no de una sugerencia libre del LLM. El assembler debería leer los objetivos de cada unidad de F3 y construir el perfil de egreso desde ahí |
| P7-B | `relacion_puesto` ahora tiene warning a < 80 chars pero **ninguna solución cuando se dispara** — el documento se genera igual con el texto corto. El warning es diagnóstico, no correctivo | MEDIO | Documento con `relacion_puesto` superficial sin mecanismo de rechazo | Si `relacion_puesto < 80` chars, activar fallback al agente perdedor y verificar si el de él es más largo |
| P7-C | El aviso legal de normas inventadas está **fuera de la sección de normativa** — aparece al final de la sección `### Fundamentos Técnicos`, después de la tabla de normativa. El auditor ve primero las normas (posiblemente inventadas) y después la advertencia | MEDIO | Normas falsas visibles antes del aviso que las desacredita | Mover el aviso legal ANTES de la tabla de normativa: `> **Aviso:** Las normas que siguen...` → tabla |
| P7-D | El glosario de P7 acumula conceptos de TODOS los temas pero no tiene entrada de cuándo se añadió cada término (módulo N). Si el mismo término aparece en dos módulos con definiciones ligeramente distintas, el primero en aparecer "gana" silenciosamente | BAJO | Definiciones arbitrarias por orden de aparición, no por calidad | Mantener `glosario[termino]` con fuente (`tema_N`) para trazabilidad |
| P7-E | No existe campo de **duración total del programa** en la Ficha Técnica. EC0366 exige declarar horas totales (teoría + práctica). La ficha técnica de P7 no lo incluye | ALTO | Ficha técnica incompleta para CONOCER | Leer `F3.calculo_duracion.duracion_total_horas` (disponible en productos_previos) e inyectarlo como campo fijo en la sección `## Datos del Programa` |

---

### P8 — Cronograma de Desarrollo

| # | Problema | Gravedad | Impacto | Solución |
|---|---|---|---|---|
| P8-A | La Sección A "Programa de Formación para Candidatos" muestra la **tabla de módulos con fecha de sesión** leída desde P6. Pero la lectura usa `p6Partes[key.replace('modulo_', 'modulo_')]` — una operación de reemplazo que no transforma nada (busca `modulo_` y lo reemplaza por `modulo_`). La fecha de sesión siempre estará vacía | BLOQUEANTE | Las fechas del Programa de Formación nunca se muestran | Corregir: `p6Partes[key]` directamente, o `key.replace('modulo_', 'modulo_')` → `sesionP6?.plan?.fecha` navega a un campo que puede ser null. Usar `sesionP6?.fecha || sesionP6?.plan?.fecha` |
| P8-B | Los riesgos específicos del dominio ahora requieren `dominio_curso` y `materiales_curso` del extractor. Sin embargo, el extractor obtiene `dominio_curso` de `productos_previos.P4.capitulos[0].nombre` — el nombre del **primer capítulo**, que puede ser "Introducción a..." en lugar del dominio real del curso | MEDIO | Dominio extraído incorrectamente → riesgos genéricos de todas formas | Extraer el dominio del nombre del curso (projectName) o del primer objetivo de F3, no del capítulo 1 de P4 |
| P8-C | Las compuertas de calidad estructuradas tienen `responsable` y `criterio`. El `responsable` que genera el LLM es siempre genérico ("Diseñador Instruccional", "Experto en la Materia"). No refleja el equipo real del proyecto — EC0366 requiere responsable nombrado | MEDIO | Compuertas no accionables sin responsable real | Capturar en el form schema de P8 los nombres reales del DI, SME y coordinador para inyectarlos en las compuertas |
| P8-D | La ruta crítica dinámica muestra dependencias entre productos (P3→P4, P1→P5). No muestra dependencias ENTRE MÓDULOS — si el módulo 2 requiere que el módulo 1 esté aprobado antes de continuar producción, esto no está en el cronograma | BAJO | Ruta crítica parcial — solo inter-producto, no inter-módulo | Aceptable en estado actual para un MVP, pero señalarlo al cliente |
| P8-E | Los hitos de producción (`agente_hitos_A/B`) generan fechas reales ancladas a `fecha_inicio_modulo`. Pero si el usuario no llena `fecha_inicio_produccion`, el extractor devuelve `null` y todas las fechas son relativas ("Día 1"). El assembler y la sección A de Formación no alertan sobre este estado incompleto | MEDIO | Cronograma sin fechas reales cuando el campo más importante está vacío | Añadir validación en assembler P8: si `fichaFormacion.fecha_inicio` está ausente, insertar aviso visible en el documento |

---

## ERRORES METODOLÓGICOS

1. **Doble extracción del instrumento P1 en P6.** El template extractor de P6 lee `instrumentos_p1` desde `productos_previos.P1` y se los pasa a los agentes. Luego, el assembler de P6 sobreescribe `partes.entregables.instrumento` con el tipo de P1 leído directamente. Dos caminos hacia el mismo dato, sin garantía de que lleguen igual.

2. **`inventario_materiales` de P4 contamina con términos teóricos.** El inventario que usan P2, P3 y P5 como autoridad de Domain Lock es una lista de `conceptos_clave.termino` — un término como "Teoría del Color" no es un material físico pero bloquea la validación.

3. **P5 duración vs P6 slot no se verifica.** Una actividad de 3 horas puede estar en una sesión de 1 hora sin que ningún sistema lo detecte.

4. **P7 perfil de egreso sin fuente autoritativa.** El único perfil que viene de F2 (perfil_ingreso) tiene control. El perfil de egreso (lo que el participante demostrará) es libre generación LLM.

5. **P2 límite de 20 slides por módulo sin límite total.** El cap es por ejecución (job por módulo), no por documento acumulado.

6. **`hora_inicio_sesion` capturada y no usada.** Un campo de formulario que no llega al pipeline de generación es un contrato roto con el usuario que lo llenó.

---

## ERRORES PEDAGÓGICOS

1. **Rúbrica P5 sin niveles de desempeño.** La evaluación por puntos sin descriptores no es replicable entre evaluadores. EC0366 exige evaluaciones reproducibles.

2. **Progresión de complejidad no verificada en P4.** Los capítulos del manual se generan unidad por unidad sin verificar que cada capítulo asuma los conceptos del anterior. El `audienceProfile` de F2 establece el nivel base, pero no la progresión interna.

3. **Actividades de P2 sin verificación de modalidad.** Una actividad presencial con materiales físicos puede generarse para un curso virtual.

4. **Sin evaluación formativa entre módulos.** P6 tiene diagnóstica inicial (sesión 0), pero no hay punto de control entre módulos. EC0366 permite evaluaciones intermedias parciales.

5. **P3 estructura de video orientada a marketing educativo, no a demostración de competencia.** La escaleta de 9 escenas es un template de e-learning corporativo, no un formato de evidencia de competencia laboral EC0366.

6. **P5 sin `unidad_competencia`.** Las actividades no declaran a qué unidad del estándar EC0366 contribuyen como evidencia.

---

## ERRORES DOCUMENTALES

1. **Terminología inconsistente entre P1 y P6.** P1 usa "Instrucción al Evaluador" (Agente A) y "Directriz de Aplicación" (Agente B). P6 usa "instrumento". El assembler de P6 inyecta el tipo del instrumento P1, pero no el nombre exacto de la sección de instrucción.

2. **Aviso legal de normas P7 posterior a la tabla, no anterior.** El lector ve las normas (potencialmente inventadas) antes de la advertencia.

3. **"Ver Calendario P6" como texto fijo en P8 Sección A.** Cuando las fechas P6 no están disponibles, el documento dice "Ver Calendario P6" — que puede no existir aún si P8 se generó antes que P6.

4. **`fecha_entrega` en P6 entregables es "Same day/Next day" (en inglés).** El campo fue diseñado en inglés en el prompt y puede filtrarse al documento en español.

5. **Los campos vacíos de la tabla de firmas P1 y P4 usan celdas con espacios en blanco** — correcto para documento imprimible, pero sin indicación de "____" o "Firma:" que facilite el llenado físico.

6. **P7 glosario consolida todos los temas pero no indica el orden de complejidad.** Un glosario alfabético mezcla conceptos de módulo 1 (básicos) con módulo 4 (avanzados) sin señalización pedagógica.

---

## INCONSISTENCIAS ENTRE ENTREGABLES

| Inconsistencia | Productos | Gravedad |
|---|---|---|
| `hora_inicio_sesion` capturada en form P6 pero ausente en el pipeline de generación | P6 form ↔ P6 generator | BLOQUEANTE |
| `inventario_materiales` construido de `conceptos_clave` (términos) no de materiales físicos del procedimiento | P4 → P2/P3/P5 | ALTO |
| P5 duración no comparada con slot P6 — actividades pueden no caber en la sesión | P5 ↔ P6 | ALTO |
| P8 Sección A muestra fechas de sesión leídas con lógica errónea (replace no-op) → fechas siempre vacías | P6 → P8 | BLOQUEANTE |
| P7 perfil de egreso LLM-generated vs P7 perfil de ingreso de F2 — coherencia asimétrica | F2 → P7 | ALTO |
| `fecha_entrega` en P6 en inglés ("Same day") en documento español | P6 | MEDIO |
| P5 evidencia_producto no derivada del tipo de instrumento P1 correspondiente | P1 → P5 | MEDIO |
| P7 duración total del programa ausente — F3 la tiene pero P7 no la expone | F3 → P7 | ALTO |
| P3 storyboard escenas no verificadas contra escaleta del mismo P3 | P3 interna | MEDIO |
| Aviso de seguridad P5 condicional (solo Agente B gana) — no invariante | P5 interna | ALTO |

---

## ELEMENTOS FALTANTES

1. **`hora_inicio_sesion` en el pipeline P6.** El campo existe en el form schema pero no se extrae ni usa.

2. **Niveles de desempeño en rúbrica P5.** EC0366 exige descriptores observables por nivel (Completo/Parcial/Insuficiente) — no solo puntos.

3. **`unidad_competencia` en ficha P5.** Cada actividad debe declarar a qué unidad de competencia del estándar EC0366 contribuye como evidencia.

4. **Duración total del programa en P7.** La Ficha Técnica del Programa debe declarar horas totales (teóricas + prácticas) extraídas de F3.

5. **Campo `contexto_puesto` en form schema P1.** Sin saber el entorno laboral real del candidato (taller, campo, oficina, plataforma), los reactivos de workplace context son genéricos.

6. **Medidas de seguridad invariantes en P5.** Cuando Agente A gana, el documento puede quedar sin advertencias de seguridad para materiales de riesgo.

7. **Validación de confirmación de producción audiovisual en form P3.** El sistema siempre genera P3 sin saber si el cliente planea producir videos.

8. **Campo `nombre_di`, `nombre_sme`, `nombre_coordinador` en form P8.** Las compuertas de calidad requieren responsable nombrado, no rol genérico.

9. **Alerta visible en P8 cuando `fecha_inicio_produccion` está ausente.** El documento puede generarse sin fechas reales sin notificación al usuario.

10. **P1: campos institucionales EC0366 invariantes.** "Centro de Evaluación CONOCER", "Número de estándar EC0366-SITTSA", "Fecha de evaluación planificada".

---

## CONTENIDO REDUNDANTE O INÚTIL

| Elemento | Producto | Problema |
|---|---|---|
| EC0366 SCOPE NOTE en P3 advierte que el producto no es obligatorio, pero el sistema lo genera igualmente | P3 | Aviso sin acción — el scope note es cosmético si P3 siempre se genera |
| `vista_previa` y `recursos_adicionales` en P2 cierre (Agente B) — condicional, no garantizado | P2 | Solo aparece ~50% del tiempo, crea expectativas no cumplidas |
| `distribucion_minutos` en P6 horario (Agente B) — condicional | P6 | Si A gana, este desglose fino nunca aparece |
| `indicador_dominio` en P7 conceptos (Agente B) — condicional | P7 | Ídem: desaparece cuando A gana |
| `pre_requisitos` y `complejidad` en P5 ficha (Agente B) — condicional | P5 | Metadatos pedagógicos útiles que desaparecen 50% del tiempo |
| Dos glosarios del mismo curso (P4 + P7) | P4/P7 | El P7 ahora marca los del P4 como "ver también: Manual P4" — mejora pero siguen siendo dos documentos del mismo vocabulario |
| P8 genera hitos de producción de materiales que se repiten por módulo | P8 | Un curso de 6 módulos tiene 6 conjuntos de hitos similares (redactar guion, revisar manual, etc.) — altamente repetitivo |

---

## RIESGOS DE NO APROBACIÓN EN REVISIÓN FORMAL CONOCER

| Riesgo | Probabilidad | Impacto |
|---|---|---|
| P6 con `hora_inicio_sesion` capturada pero no aplicada — sesiones siempre a 09:00 | ALTA | OBSERVACIÓN GRAVE |
| P8 Sección A sin fechas (bug de replace no-op) | ALTA | RECHAZO FUNCIONAL |
| Rúbrica P5 sin niveles de desempeño — evaluación no reproducible | ALTA | OBSERVACIÓN GRAVE |
| P5 actividades de larga duración sin verificación de que caben en slot P6 | MEDIA | OBSERVACIÓN |
| P7 sin duración total del programa | MEDIA | OBSERVACIÓN |
| P1 sin campos institucionales CONOCER (Centro, número de estándar) | ALTA | OBSERVACIÓN GRAVE |
| `inventario_materiales` contaminado con términos teóricos — Domain Lock inexacto | MEDIA | OBSERVACIÓN |
| P4 juez evalúa solo primeros 3200 chars — DOMAIN LOCK incompleto | MEDIA | OBSERVACIÓN |
| P3 generado sin confirmación de producción AV — entregable potencialmente inútil | BAJA (detectado por coordinador) | CONFUSIÓN |
| P5 sin medidas de seguridad cuando Agente A gana en cursos con materiales de riesgo | MEDIA | RIESGO OPERATIVO REAL |

---

## PLAN DE CORRECCIÓN

### PRIORIDAD 1 — Bugs que rompen funcionalidad (implementar hoy)

1. **[P6] Añadir `hora_inicio_sesion` al extractor de `F4_P6_GENERATE_DOCUMENT`** y propagar a los agentes de plan para que anclen las horas de actividades desde la hora real capturada.

2. **[P8] Corregir lógica de lectura de fechas P6 en assembler.** La línea `sesionP6 = p6Partes[key.replace('modulo_', 'modulo_')]` es un no-op. Corregir a `p6Partes[key]` y verificar la ruta de acceso a `fecha`.

3. **[P6] Alinear umbral `juez_horas` a 10h** en lugar de 16h para consistencia con el warning del assembler.

### PRIORIDAD 2 — Brechas EC0366 (implementar esta semana)

4. **[P5] Añadir niveles de desempeño a la rúbrica.** Modificar `agente_evaluacion_A` y `agente_evaluacion_B` para incluir `nivel_a`, `nivel_b`, `nivel_c` en cada criterio. Modificar el assembler P5 para renderizar una rúbrica con 4 columnas (Criterio | Completo | Parcial | Insuficiente).

5. **[P5] Añadir `unidad_competencia` a la ficha.** Tomado del nombre de la unidad, ya disponible en el extractor.

6. **[P7] Añadir duración total del programa.** Leer `F3.calculo_duracion.duracion_total_horas` en el assembler e inyectarlo en `## Datos del Programa`.

7. **[P1] Añadir campos institucionales invariantes.** El assembler P1 debe inyectar en la sección Datos Generales: "Estándar de Competencia: EC0366", "Centro de Evaluación:", "Fecha de evaluación:".

8. **[P7] Mover aviso legal ANTES de la tabla de normativa.**

### PRIORIDAD 3 — Mejoras de calidad (implementar próxima semana)

9. **[P4] Corregir `esSospechosa()` para aplicarse por URL individual**, no eliminando URLs de dominios que también tienen una sospechosa.

10. **[P4] Separar `inventario_materiales` de `inventario_conceptos`.** Construir el inventario de materiales físicos desde las secciones `### Desarrollo` y `### Ejercicio Práctico`, no desde `### Conceptos Clave`.

11. **[P5] Advertencia de duración vs slot P6.** En el assembler P5, leer `productos_previos.P6.partes[modulo_N].horario.total_horas` y comparar con `ficha.duracion`.

12. **[P5] Hacer `medidas_seguridad` invariante.** Si `inventario_p4` contiene patrones de riesgo (solvente, eléctrico, cortante, químico), inyectar advertencias de seguridad genéricas independientemente del agente ganador.

13. **[P1] Añadir workplace context al `juez_doc`.** Criterio de selección: preferir el agente cuyos reactivos incluyen más marcadores de contexto laboral observable.

14. **[P7] Derivar `perfil_egreso` de objetivos de F3.** En el assembler P7, si F3 tiene unidades con objetivos, construir el perfil de egreso desde los objetivos verificables.

15. **[P3] Confirmar producción AV en form schema.** Añadir campo booleano "produce_video" — si No, generar solo guión instruccional simplificado.

---

## QUICK WINS (alto impacto, implementación < 1 hora cada uno)

| Win | Esfuerzo | Impacto |
|---|---|---|
| Corregir P8 no-op replace en lectura de fechas P6 | 10 min | Elimina bug BLOQUEANTE — fechas reales en Sección A |
| Añadir `hora_inicio_sesion` al extractor de F4_P6_GENERATE_DOCUMENT | 20 min | Activa el campo que ya se captura en el formulario |
| Cambiar umbral `juez_horas` de 16h a 10h | 5 min | Consistencia con assembler |
| Añadir campos institucionales invariantes en assembler P1 | 30 min | Elimina riesgo de rechazo formal CONOCER |
| Mover aviso legal P7 antes de tabla normativa | 10 min | Cambia el orden de lectura del auditor |
| Añadir `unidad_competencia` a ficha P5 | 20 min | Trazabilidad al estándar sin cambio de arquitectura |
| Añadir banner en P4 cuando Tavily falla | 15 min | Marco Teórico sin fuentes queda explícitamente marcado |
| Añadir duración total del programa en P7 desde F3 | 20 min | Ficha Técnica completa sin cambio de form schema |

---

## CONCLUSIÓN FINAL

### ¿Los productos parecen profesionales después de 41 correcciones?

**Sí, más que antes — pero con asteriscos.** El diseño del sistema es técnicamente ambicioso y las correcciones de las tres rondas son reales y sustanciales. Los documentos generados tienen una estructura más sólida, validaciones reales en código, y secciones invariantes (firmas, avisos legales, trazabilidad de F2). Un evaluador no familiarizado con sistemas generativos puede considerarlos materiales de calidad.

### ¿Parecen improvisados?

No en arquitectura. Sí en algunos detalles: el bug de P8 (replace no-op que vacía las fechas de impartición), el campo de formulario que no llega al pipeline (hora de inicio P6), y la rúbrica sin niveles de desempeño son señales de que el sistema creció rápido sin revisión funcional end-to-end de cada campo.

### ¿Parecen automatizados?

**Sí, inequívocamente.** Los documentos carecen de señales de autoría humana: no hay comentarios marginales del diseñador instruccional, no hay ajustes contextuales del proyecto específico, no hay "errores de autor" que den autenticidad. Un evaluador CONOCER con experiencia detectará el patrón. Los avisos legales y las secciones de firma son mitigaciones, no soluciones a este problema estructural.

### ¿Son certificables bajo EC0366?

**No completamente en estado actual.** Con las correcciones de Prioridad 1 y 2 (estimadas en 3-4 días de trabajo), la probabilidad de aprobación formal CONOCER sube a **75-80%**. Los bloqueantes funcionales (P8 fechas, P6 hora) y las brechas EC0366 (rúbrica sin niveles, campos institucionales P1) son la diferencia entre un auditor que aprueba con observaciones y uno que rechaza.

### ¿Son utilizables en un proceso real de capacitación/evaluación?

**P4 y P1 sí, con revisión SME.** P5 funcionalmente sí, pero la rúbrica necesita completarse manualmente con niveles. P6 es utilizable si el usuario ignoró el campo de hora. P2 es utilizable pero extenso. P3 es utilizable solo si el cliente produce videos. P7 y P8 son documentos de gestión válidos con las correcciones de bugs.

### Probabilidad de aprobación en revisión formal CONOCER:
- **Estado actual: 55%** (después de 41 correcciones de 3 rondas)
- **Con Prioridad 1 + 2: 78%**
- **Con todo el plan de corrección: 85%** (el 15% restante requiere validación humana CONOCER que ningún sistema automatizado puede reemplazar)

---

*Segunda auditoría técnico-pedagógica especializada. Comité de evaluación EC0366 KnowTo DCFL. 2026-05-10.*
*Esta auditoría evalúa el diseño del sistema generativo — no garantiza el contenido específico generado, que varía por proyecto y dominio.*
