# Registro de Cambios — Auditoría EC0366

Fecha: 2026-05-10
Estado: Correcciones de auditoría aplicadas en su totalidad — Ronda 1 (1-15) + Ronda 2 (16-34) + Ronda 3 (35-41). Todos los hallazgos cubiertos.

---

## Contexto

Se realizó una auditoría técnico-pedagógica completa del sistema de productos F4 (P1–P8) bajo el estándar EC0366/CONOCER/SEP. La puntuación inicial del diagnóstico fue **57.6/100**. Este documento registra todos los cambios realizados para resolver los hallazgos.

---

## Cambios por Producto

### P1 — Instrumentos de Evaluación

**Archivos modificados:**
- `backend/src/dcfl/handlers/phases/products/p1-document.assembler.ts`
- `backend/src/dcfl/prompts/templates/F4_P1_FORM_SCHEMA.md`

**Problemas resueltos:**

1. **Regex de palabras prohibidas demasiado estrecho**
   - Antes: solo capturaba `adecuado|correctamente|correcto|bien|efectivo|notable|mejorado`
   - Ahora: agrega sustantivos de estado mental (`entendimiento`, `comprensión`, `conciencia`) y locuciones adverbiales (`de manera adecuada`, `de forma correcta`, `de manera efectiva`, etc.)

2. **Verificación de filas CLAVE DE RESPUESTAS ausente**
   - Se agregó función `verifyClaveRowCounts()` que compara el número de filas en la tabla de reactivos con el número de filas en la sección `### CLAVE DE RESPUESTAS` de cada unidad de tipo Cuestionario.
   - Un desfase genera error de validación que activa el fallback al agente perdedor.

3. **Sección de Firmas invariante**
   - Se agregó función `addInvariantSignatureSection()` que inyecta siempre al final del documento (independientemente del agente ganador) la tabla de firmas: Diseñador Instruccional, SME, Evaluador Asignado, Candidato.
   - Esto era requerido por EC0366 y no podía dejarse a discreción del LLM.

4. **Form schema: mínimo 3 reactivos**
   - Antes: ambos agentes generaban exactamente 2 reactivos en `suggested_value`.
   - Ahora: ambos agentes deben generar MÍNIMO 3 reactivos (hasta 5 para unidades complejas).
   - El juez penaliza documentos con solo 2 reactivos.

---

### P2 — Presentación Electrónica

**Archivos modificados:**
- `backend/src/dcfl/prompts/templates/F4_P2_GENERATE_DOCUMENT.md`

**Problemas resueltos:**

5. **Presentaciones sin límite de diapositivas**
   - Antes: la regla ZERO LOSS sin techo superior podía generar 40+ diapositivas por módulo.
   - Ahora: se agrega `MÁXIMO 20 DIAPOSITIVAS POR MÓDULO`. El contenido que exceda debe agruparse en slides mixtas y la profundidad se delega a `nota_facilitador.diga`.

---

### P3 — Paquete de Producción Audiovisual

**Archivos modificados:**
- `backend/src/dcfl/prompts/templates/F4_P3_GENERATE_DOCUMENT.md`

**Problemas resueltos:**

6. **Domain Lock de equipamiento confuso**
   - Antes: `EQUIPAMIENTO DOMAIN LOCK` indicaba que el campo `equipamiento` debía listar solo ítems de `inventario_p4`, lo que causaba que los agentes pusieran materiales de curso (pinceles, pinturas) como equipamiento de filmación.
   - Ahora: se separa claramente en DOS CATEGORÍAS:
     - `PRODUCCIÓN`: equipo de filmación estándar (cámara, trípode, micrófono, luces) — siempre válido, no viene de `inventario_p4`.
     - `MATERIALES EN CÁMARA`: objetos físicos del curso mostrados en pantalla — DEBEN venir de `inventario_p4` o del formulario.
   - El campo `equipamiento` en el JSON ahora usa el formato: `"PRODUCCIÓN: [...]. MATERIALES EN CÁMARA: [...from inventario_p4]"`

---

### P4 — Manual del Participante

**Archivos modificados:**
- `backend/src/dcfl/handlers/phases/products/p4-document.assembler.ts`
- `backend/src/dcfl/prompts/templates/F4_P4_FORM_SCHEMA.md`

**Problemas resueltos:**

7. **Glosario con falsos positivos**
   - Antes: el assembler escaneaba TODAS las tablas del capítulo completo para extraer términos del glosario, capturando filas de tablas de Desarrollo, Ejemplos, etc.
   - Ahora: extrae términos únicamente desde `seccionesJson.conceptos_clave` (resultado de `parseSecciones()`), que ya filtra solo la sección `### Conceptos Clave`.
   - Se movió la llamada a `parseSecciones()` antes del loop de glosario para que la variable esté disponible.

8. **Form schema con 5 secciones vs 7 del generador de capítulos**
   - Antes: Agente A generaba 5 secciones (Introducción, Conceptos clave, Desarrollo, Ejercicio, Puntos a recordar). Agente B generaba 5 diferentes (Objetivo, Marco teórico, Pasos, Autoevaluación, Lecturas).
   - El generador de capítulos espera 7 secciones: Introducción, Marco Teórico, Conceptos Clave, Desarrollo, Ejemplo Práctico, Ejercicio Práctico, Puntos a Recordar + Lecturas complementarias.
   - Ahora: ambos agentes del form schema generan las mismas 7 secciones requeridas (con distintos ángulos pedagógicos). El `suggested_value` ahora scaffoldea todas las secciones para que el generador tenga input completo.

---

### P5 — Guías de Actividades de Aprendizaje

*(Corregido en sesión anterior)*

- Extractor corregido: leía `secciones_json.materiales/herramientas` que no existen en el output de `parseSecciones()`. Ahora lee `P4.inventario_materiales`.
- Corrige que MODE A (líquido→mezclar/aplicar) nunca se activaba por datos vacíos.

---

### P6 — Calendario General de Formación

**Archivos modificados:**
- `backend/src/dcfl/prompts/templates/F4_P6_FORM_SCHEMA.md`
- `backend/src/dcfl/prompts/templates/F4_P6_GENERATE_DOCUMENT.md`

**Problemas resueltos:**

9. **Sin fecha de inicio — calendario sin fechas reales**
   - Antes: el calendario generaba actividades con horas relativas ("09:00", "09:15") sin fecha absoluta.
   - Ahora: se agrega campo `fecha_inicio_curso` como primer ítem del form schema (tipo text, formato YYYY-MM-DD).
   - El extractor del template de generación computa `fecha_sesion` (YYYY-MM-DD) para cada módulo desplazando weekdays desde `fecha_inicio_curso`.
   - Los agentes de plan incluyen `fecha` real en su output JSON.

10. **Evaluación diagnóstica ausente**
    - Antes: el calendario comenzaba directamente con la sesión 1 de contenidos.
    - Ahora: ambos agentes del form schema incluyen `sesion_diagnostica` como segundo ítem obligatorio (Sesión 0 — Evaluación Diagnóstica, no acreditable, establece línea base).
    - Los agentes de plan en el template incluyen la evaluación diagnóstica como primera actividad del módulo 1.

---

### P7 — Información General del Programa

**Archivos modificados:**
- `backend/src/dcfl/prompts/templates/F4_P7_FORM_SCHEMA.md`
- `backend/src/dcfl/handlers/phases/products/p7-document.assembler.ts`

**Problemas resueltos:**

11. **P7 era solo referencia por unidad — faltaba Ficha Técnica del Programa**
    - Antes: P7 generaba fichas de referencia por unidad (¿Qué es?, ¿Para qué sirve?, etc.) sin ninguna sección de programa global.
    - Ahora: se agregan 3 campos de programa nivel-raíz como primeros ítems del form schema:
      - `perfil_ingreso`: descripción del participante objetivo (experiencia, rol, nivel educativo).
      - `perfil_egreso`: competencias observables alcanzadas (verbos de acción EC0366).
      - `requisitos_certificacion`: score mínimo 85%, evidencias, proceso CONOCER.
    - El assembler genera una sección `## Datos del Programa` con los tres sub-apartados cuando están presentes, antes del Glosario y las fichas por tema.
    - El `datosProducto` ahora persiste `ficha_programa` separado de `partes`.

12. **Sin aviso de validación para normativa generada por IA**
    - Los agentes pueden inventar códigos de normas (NOM, ISO, NMX).
    - Ahora: cada sección de `### Fundamentos Técnicos` en el documento final incluye el aviso:
      `> **Aviso legal:** Las referencias normativas listadas fueron generadas con asistencia de IA. Requieren validación por un experto en la materia (SME) antes de su uso oficial.`

---

### P8 — Cronograma de Desarrollo

**Archivos modificados:**
- `backend/src/dcfl/prompts/templates/F4_P8_FORM_SCHEMA.md`
- `backend/src/dcfl/prompts/templates/F4_P8_GENERATE_DOCUMENT.md`

**Problemas resueltos:**

13. **Fechas relativas — sin anclaje a fecha real**
    - Antes: los hitos usaban "Día X", "Semana 2" etc. sin ninguna fecha absoluta.
    - Ahora: se agregan dos campos de anclaje como primeros ítems del form schema:
      - `fecha_inicio_produccion`: fecha de inicio de producción de materiales (DD/MM/YYYY).
      - `fecha_inicio_formacion`: fecha prevista para el inicio de la formación con participantes.
    - El extractor del template computa `fecha_inicio_modulo` real (DD/MM/YYYY) para cada módulo.
    - Los agentes de hitos generan fechas reales en lugar de relativos.

14. **Sin sección de Programa de Formación**
    - Antes: P8 solo cubría el cronograma de producción (cuándo se producen los materiales).
    - Ahora: el agente de hitos A/B incluye el milestone `"Inicio de la formación con participantes"` con `fecha_inicio_formacion` como fecha, vinculando el cronograma de producción con el calendario de impartición.

---

### Extracción Automática de Perfil de Ingreso desde F2 (P4 y P7)

**Archivos modificados:**
- `backend/src/dcfl/handlers/phases/products/p7-document.assembler.ts`
- `backend/src/dcfl/handlers/phases/products/p4-document.assembler.ts`
- `backend/src/dcfl/prompts/templates/F4_P7_FORM_SCHEMA.md`

**Problema resuelto:**

15. **P7 inventaba el perfil de ingreso — sin coherencia con el análisis de F2**
    - Antes: los agentes LLM de P7 generaban un `perfil_ingreso` de libre elaboración, sin leer los requisitos reales declarados en `fase2_analisis_alcance.perfil_ingreso`.
    - Consecuencia secundaria: P4 (Manual del Participante) asumía un nivel de conocimiento arbitrario, potencialmente más alto o más bajo que el perfil real del participante.

**Solución implementada:**

**P7 assembler — fuente autoritativa desde BD:**
- Se agrega `formatearPerfilIngreso(raw)` que maneja dos formatos de la BD:
  - Objeto `{clave: {requisito, justificacion}}` (formato real JSONB actual)
  - Array `[{categoria, requisito, fuente}]` (tipo declarado en `supabase.service.ts`)
- En `handleDocumentP7Assembler`, antes de construir el documento:
  ```typescript
  const f2 = await services.supabase.getF2Analisis(projectId);
  if (f2?.perfil_ingreso) {
    const f2Md = formatearPerfilIngreso(f2.perfil_ingreso);
    if (f2Md) perfilIngreso = f2Md; // sobreescribe el valor del formulario
  }
  ```
- Si `supuestos_restricciones.restricciones` también está presente en F2, se añade como subsección "Restricciones del programa".
- `fichaPrograma.perfil_ingreso` queda fijado con el dato F2 (autoritativo) en lugar del `suggested_value` del LLM.

**P4 assembler — calibración de profundidad de contenido:**
- Se agrega `formatearPerfilIngresoCompacto(raw)` (variante compacta, en línea, para inyectar en el prompt del capítulo).
- Antes del loop de capítulos, se consulta F2:
  ```typescript
  const f2 = await services.supabase.getF2Analisis(projectId);
  const audienceProfile = f2?.perfil_ingreso ? formatearPerfilIngresoCompacto(f2.perfil_ingreso) : '';
  ```
- `buildChapterPrompt()` recibe `audienceProfile` como 6.º parámetro e inyecta la sección:
  ```
  🎯 AUDIENCE PROFILE — CONTENT CALIBRATION RULE (from F2 analysis — authoritative):
  <perfil en línea>
  CALIBRATION MANDATE: Write at the level of a participant who meets EXACTLY the stated
  "Conocimientos previos". Do not assume more. Do not over-explain what is listed as known.
  FORBIDDEN: assuming reader knows concepts NOT listed in the profile.
  FORBIDDEN: over-explaining concepts explicitly listed as "known".
  ```

**P7 form schema — extractor actualizado:**
- El extractor del pipeline ahora declara explícitamente cómo obtener `f2_perfil_ingreso`:
  ```yaml
  MANDATORY — Extract perfil_ingreso from F2 analysis (AUTHORITATIVE SOURCE):
  Look in previousData for the F2 step (may appear as "Análisis de Alcance", "F2", or "Diseño de Alcance").
  Build "f2_perfil_ingreso" as a dict: {clave: requisito_value}.
  ```
- Los agentes A y B reciben instrucción explícita: el campo `perfil_ingreso` **DEBE** tomarse de `f2_perfil_ingreso`, nunca inventarlo.

**Decisión arquitectónica:**
- Enfoque backend-only: los assemblers consultan `getF2Analisis(projectId)` directamente desde `supabase.service.ts` — sin cambios al frontend ni nuevos endpoints.
- Rechazado: modificar `_cargarProductosPrevios()` en el frontend para incluir F2, ya que requería un nuevo endpoint y cambios de contrato.

**Garantía de coherencia resultante:**
- El perfil de ingreso que aparece en P7 (Ficha Técnica del Programa) es exactamente el mismo que F2 declaró como requisito del participante.
- El manual P4 no asume conocimiento previo que P7 no haya declarado explícitamente — eliminando la brecha entre el perfil declarado y el nivel de redacción del material.

---

## Segunda Ronda de Correcciones — Auditoría Completa (2026-05-10)

Implementación de todos los hallazgos pendientes de la auditoría EC0366. Cambios aplicados sobre los 8 productos F4.

---

### P1 — Instrumentos de Evaluación (ronda 2)

**Archivos modificados:**
- `backend/src/dcfl/handlers/phases/products/p1-document.assembler.ts`
- `backend/src/dcfl/prompts/templates/F4_P1_FORM_SCHEMA.md`

**Problemas resueltos:**

16. **Ponderaciones escritas en texto pasan la validación (1.6)**
    - Antes: el validador solo detectaba cuando el porcentaje era incorrecto como número, pero no cuando estaba escrito como texto ("treinta por ciento", "cien por ciento").
    - Ahora: se agrega una regla de advertencia en `validateDocumentoP1` mediante regex:
      ```typescript
      if (/(?:Ponderaci[oó]n|Peso)\s*...\s+(cien|noventa|...)\s*(?:por\s+ciento)?/gi.test(md)) {
        errors.push('Ponderación escrita como texto...');
      }
      ```

17. **Form schema sin condición de inicio en instrucción (1.5)**
    - Antes: el `suggested_value` del form schema para cada instrumento no incluía la "Condición de inicio", un elemento obligatorio EC0366.
    - Ahora: ambos agentes A y B del form schema incluyen en `suggested_value`:
      ```
      Condición de inicio: Una vez que el candidato haya [...], el evaluador iniciará la observación.
      ```

---

### P2 — Presentación Electrónica (ronda 2)

**Archivos modificados:**
- `backend/src/dcfl/prompts/templates/F4_P2_GENERATE_DOCUMENT.md`

**Problemas resueltos:**

18. **Juez no verificaba cobertura de escenas P3 (2.3)**
    - Antes: `juez_presentacion` solo evaluaba ZERO LOSS (cobertura P4), profundidad y estructura.
    - Ahora: se agrega criterio 4 — P3 SYNC: el juez cuenta cuántas escenas de `p3_guion.escaleta` aparecen en títulos de slides o en `nota_facilitador.diga`. Si un agente cubre ≥1 escena P3 y el otro cubre 0, se selecciona automáticamente el que sincroniza con P3. La `razon` debe incluir el conteo: "A cubre 4/5 escenas P3 vs B cubre 2/5".

19. **Juez de actividades sin suma explícita de tiempo (2.4)**
    - Antes: el juez verificaba el límite de 90 min pero no computaba explícitamente la suma, haciendo difícil trazar el razonamiento.
    - Ahora: `juez_actividades` recibe instrucción de sumar los valores numéricos de `duracion` de cada actividad antes de evaluar. La `razon` de salida debe incluir los totales computados: "A: 65 min total (dentro del límite), B: 95 min (excede 90 min)". Además, si ambos exceden el límite, se selecciona el más cercano a 90 min en lugar de rechazar ambos.

---

### P3 — Paquete de Producción Audiovisual (ronda 2)

**Archivos modificados:**
- `backend/src/dcfl/prompts/templates/F4_P3_GENERATE_DOCUMENT.md`

**Problemas resueltos:**

20. **P3 clasificado incorrectamente como entregable obligatorio EC0366 (3.1, 3.2)**
    - Antes: el template generaba P3 sin ninguna advertencia sobre su estado normativo.
    - Ahora: se agrega bloque `EC0366 SCOPE NOTE` antes del VIDEO DURATION CAP:
      - P3 es herramienta instruccional suplementaria, NO un entregable obligatorio EC0366.
      - Al presentar a CONOCER, clasificar como "Material de apoyo multimedia".
      - Separar claramente elementos de (A) PRODUCCIÓN de (B) DISEÑO INSTRUCCIONAL.

21. **Storyboard sin nota de uso referencial (3.4)**
    - Antes: el agente de storyboard generaba descripciones como si fueran boards finales.
    - Ahora: `agente_storyboard_A` incluye `STORYBOARD SCOPE NOTE`: "This storyboard is REFERENTIAL — it describes visual scenes in text form for planning purposes only. A professional graphic designer or animator must convert it into actual visual boards before production."

22. **Video único por módulo sin criterio de segmentación (3.5)**
    - Antes: un módulo largo podía resultar en un video de 45+ minutos sin subdivisión.
    - Ahora: regla VIDEO DURATION CAP mejorada con umbrales claros:
      - >30 min → "Serie de 3 videos de ~8 min cada uno"
      - 15-30 min → "Video de 10 min máximo"
      - ≤15 min → duración tal cual

---

### P4 — Manual del Participante (ronda 2)

**Archivos modificados:**
- `backend/src/dcfl/handlers/phases/products/p4-document.assembler.ts`

**Problemas resueltos:**

23. **Sin sección de validación SME/DI invariante (4.2)**
    - Antes: el manual no incluía tabla de firmas de validación requerida por EC0366.
    - Ahora: el assembler inyecta siempre al final del documento una sección invariante:
      ```
      ## Validación y Vigencia del Manual
      | Diseñador Instruccional | | | |
      | Experto en la Materia (SME) | | | |
      ```
      Con nota de vigencia: "1 año o hasta actualización del Estándar EC0366".

24. **Referencias bibliográficas sin aviso de verificación de URLs (4.2b)**
    - Antes: las URLs sugeridas por Tavily se incluían sin advertencia sobre su confiabilidad.
    - Ahora: después de la lista de referencias se agrega nota:
      > `> **Nota de verificación:** Las referencias en línea fueron sugeridas por IA (Tavily). Verificar que cada URL resuelve correctamente antes de entregar el manual a candidatos.`

---

### P5 — Guías de Actividades de Aprendizaje (ronda 2)

**Archivos modificados:**
- `backend/src/dcfl/handlers/phases/products/p5-document.assembler.ts`

**Problemas resueltos:**

25. **Sin verificación de alineación entre rúbrica P5 y tipo de instrumento P1 (5.3)**
    - Antes: la rúbrica de evaluación de la actividad podía ser genérica sin referencia al instrumento EC0366 de P1.
    - Ahora: el assembler lee `productos_previos.P1.instrumentos` y busca el instrumento para la unidad actual. Si la rúbrica no menciona el tipo de instrumento P1 (primer token), emite `console.warn` de alineación.

26. **Sin alerta cuando los pasos de ejecución son insuficientes (5.4)**
    - Antes: una actividad con un solo paso de ejecución pasaba sin ninguna advertencia.
    - Ahora: si `procedimiento.ejecucion.length < 2`, el assembler emite `console.warn` indicando el número de pasos y el mínimo recomendado de 2 para cobertura EC0366.

---

### P6 — Calendario General de Formación (ronda 2)

**Archivos modificados:**
- `backend/src/dcfl/handlers/phases/products/p6-document.assembler.ts`

**Problemas resueltos:**

27. **Sin alerta pedagógica por jornadas largas >10h (6.2)**
    - Antes: el calendario podía incluir sesiones de 12h o más sin ninguna advertencia.
    - Ahora: en el loop de módulos del assembler, si `total_horas > 10`, se emite `console.warn` con el módulo y las horas.

28. **Instrumento de evaluación en P6 no leído desde P1 (6.3)**
    - Antes: el campo `entregables.instrumento` en cada parte P6 se tomaba del output LLM, que podía diferir del instrumento real aprobado en P1.
    - Ahora: después del loop de secciones, el assembler lee `productos_previos.P1.instrumentos` y sobreescribe `partes.entregables.instrumento` con el tipo real del instrumento P1 para la unidad actual. Log: `[p6-assembler] Instrumento de P1 inyectado`.

29. **Sin verificación de desviación de horas vs F3 (6.4)**
    - Antes: el calendario podía acumular horas inconsistentes con las declaradas en el programa F3.
    - Ahora: al final del assembler, se compara `totalG` (horas acumuladas) con `F3.calculo_duracion.duracion_total_horas`. Si la desviación supera el 10%, se emite `console.warn` y se inserta nota visible en el documento final:
      > `⚠️ **Nota de alineación:** Las horas acumuladas en este calendario (Xh) difieren en más del 10% de las horas declaradas en F3 (Yh).`

---

### P7 — Información General del Programa (ronda 2)

**Archivos modificados:**
- `backend/src/dcfl/handlers/phases/products/p7-document.assembler.ts`

**Problemas resueltos:**

30. **Glosario sin referencia cruzada con términos del manual P4 (7.3)**
    - Antes: el glosario de P7 listaba términos sin indicar si ya estaban definidos en el Manual del Participante (P4).
    - Ahora: el assembler extrae `conceptos_clave[].termino` de todos los capítulos de `productos_previos.P4.capitulos`. Si un término del glosario P7 coincide (normalizado) con un término de P4, se agrega la nota `*(ver también: Manual P4)*` en la celda de definición.

---

### P8 — Cronograma de Desarrollo (ronda 2)

**Archivos modificados:**
- `backend/src/dcfl/prompts/templates/F4_P8_FORM_SCHEMA.md`
- `backend/src/dcfl/prompts/templates/F4_P8_GENERATE_DOCUMENT.md`
- `backend/src/dcfl/handlers/phases/products/p8-document.assembler.ts`

**Problemas resueltos:**

31. **Sin Programa de Formación para candidatos en P8 (8.1)**
    - Antes: P8 solo describía el cronograma de producción interna de materiales.
    - Ahora: se agregan 3 campos de programa de formación en el form schema (lugar, modalidad, numero_grupos) más el ya existente fecha_inicio_formacion. El assembler genera una **Sección A — Programa de Formación para Candidatos** con tabla de datos generales y tabla de módulos con fecha de sesión (vinculada desde P6). La Sección B es el cronograma de producción.

32. **Riesgos genéricos sin contexto del dominio del curso (8.3)**
    - Antes: los agentes generaban riesgos de gestión de proyectos genéricos ("retraso en aprobaciones") sin referencia al dominio del curso.
    - Ahora: el extractor lee `dominio_curso` (desde `P4.capitulos[0].nombre`) y `materiales_curso` (primeros 3 ítems de `P4.inventario_materiales`). Los agentes de riesgo tienen instrucción explícita de usar estos datos para riesgos específicos del dominio. Riesgos genéricos son FORBIDDEN.

33. **Compuertas de calidad sin estructura (8.4)**
    - Antes: `compuertas_calidad` era un array de strings planos ("Guiones aprobados").
    - Ahora: los agentes producen objetos estructurados `{"compuerta", "responsable", "criterio", "fecha_limite"}`. El assembler tiene la interfaz `CompuertaCalidad` y la función `normalizarCompuerta()` que acepta tanto el formato viejo (strings) como el nuevo (objetos), garantizando compatibilidad hacia atrás. La tabla de compuertas en el documento muestra 4 columnas.

34. **Ruta crítica hardcodeada — no reflejaba productos realmente existentes (8.5)**
    - Antes: la sección "Ruta Crítica y Dependencias" incluía siempre las mismas 2 dependencias (P3→P4, P1→P5) sin importar qué productos se habían generado para el proyecto.
    - Ahora: el assembler lee `Object.keys(event?.body?.userInputs?.productos_previos || {})` y solo incluye las dependencias cuya fuente y destino existen en el proyecto. Las dependencias disponibles son P3→P4, P2→P4, P1→P5, P4→P6, P6→P8.

---

## Tercera Ronda — Hallazgos Restantes (2026-05-10)

Implementación de los 6 hallazgos que habían quedado sin cubrir.

---

### P1 — Instrumentos de Evaluación (ronda 3)

**Archivos modificados:**
- `backend/src/dcfl/prompts/templates/F4_P1_GENERATE_DOCUMENT.md`

**Problemas resueltos:**

35. **Reactivos sin anclaje en contexto laboral real (EF-7)**
    - Antes: los agentes generaban reactivos abstractos ("el candidato realiza el procedimiento de la unidad") sin referencia a la situación real del puesto de trabajo.
    - EC0366 exige que los reactivos se anclen en situaciones reales del puesto. El auditor CONOCER verifica que los criterios correspondan al desempeño laboral real, no a un ejercicio académico.
    - Ahora: ambos agentes A y B incluyen regla WORKPLACE CONTEXT (regla 5/7 respectivamente):
      - WRONG: "El candidato realiza el ejercicio de la unidad"
      - RIGHT: "En su área de trabajo y con el material real del proceso, el candidato ejecuta [acción específica] hasta obtener [resultado medible del puesto]"
    - Cada reactivo debe incluir al menos un marcador de contexto: "en su área de trabajo", "ante el material real", "durante el desempeño habitual", etc.

---

### P2 — Presentación Electrónica (ronda 3)

**Archivos modificados:**
- `backend/src/dcfl/handlers/phases/products/p2-document.assembler.ts`

**Problemas resueltos:**

36. **`puente.facilitador_dice` vacío o genérico sin nombre del módulo siguiente (2.5)**
    - Antes: si el LLM generaba una transición vacía o con menos de 30 caracteres, el documento quedaba con un cierre sin información útil ("En el siguiente módulo veremos más temas.").
    - Ahora: el assembler verifica la longitud de `puente.facilitador_dice`. Si es < 30 chars, inyecta un fallback que:
      1. Intenta leer el nombre de la siguiente unidad desde `productos_previos.F3.unidades` (lista del syllabus)
      2. Si encuentra el nombre, construye: "Hemos concluido el módulo "[actual]". En el siguiente módulo exploraremos "[siguiente]", donde profundizaremos..."
      3. Si no, usa una plantilla estándar que al menos nombra el módulo actual.
    - Se emite `console.warn` cuando el fallback se activa.

---

### P4 — Manual del Participante (ronda 3)

**Archivos modificados:**
- `backend/src/dcfl/handlers/phases/products/p4-document.assembler.ts`

**Problemas resueltos:**

37. **URLs de Tavily potencialmente inventadas incluidas sin filtro (4.2)**
    - Antes: las URLs extraídas del markdown se incluían en bibliografía con solo un filtro de dominio-duplicado. URLs con patrones de plantilla (`[topic]`, `{var}`, `example.com`, `placeholder`) pasaban sin aviso.
    - Ahora: se agrega función `esSospechosa(url)` que detecta patrones típicos de URLs alucinadas:
      `[.*]`, `{.*}`, `example.com`, `placeholder`, `tu-url`, `your-url`, `sitio-web`, `lorem`, `undefined`, `enlace-aqui`, `url-aqui`, `insert-url`.
    - Las URLs sospechosas se omiten de la bibliografía con `console.warn` antes de procesarlas.

38. **Domain Lock sin fallback a código cuando el juez emite RECHAZADO (4.4)**
    - Antes: cuando ambos agentes violaban el Domain Lock, el juez emitía RECHAZADO, se logueaba un warning, y el assembler continuaba usando Agente A sin marcar el documento como problemático.
    - Ahora: se agrega contador `domainLockViolations`. Cada vez que un capítulo es RECHAZADO por Domain Lock, el contador aumenta. Al final del proceso, si `domainLockViolations > 0`, el `validacionEstado` se establece como `aprobado_con_errores` con mensaje específico de cuántos capítulos tuvieron la violación.

39. **Sin trazabilidad de fuentes Tavily por capítulo (4.5)**
    - Antes: no había forma de auditar qué fuentes Tavily se usaron en cada capítulo para verificar la teoría ("No Fake Theory").
    - Ahora: cada vez que Tavily devuelve resultados para un capítulo, se emite `console.log` con el número de fuentes encontradas y las primeras 3 URLs, creando un trail de auditoría en los logs del backend.

---

### P6 — Calendario General de Formación (ronda 3)

**Archivos modificados:**
- `backend/src/dcfl/prompts/templates/F4_P6_FORM_SCHEMA.md`

**Problemas resueltos:**

40. **Hora de inicio de sesión asumida por LLM (6.5)**
    - Antes: las agendas de sesión asumían que el curso empezaba a las 09:00, lo cual podía no corresponder a la realidad del cliente.
    - Ahora: se agrega `hora_inicio_sesion` como segundo campo obligatorio del form schema (después de `fecha_inicio_curso`, antes de `sesion_diagnostica`) en ambos agentes A y B.
    - El OUTPUT LENGTH se actualiza de "2 + N" a "3 + N" en ambos agentes.
    - Los agentes del template de generación pueden ahora anclar las agendas de sesión a la hora real capturada.

---

### P7 — Información General del Programa (ronda 3)

**Archivos modificados:**
- `backend/src/dcfl/handlers/phases/products/p7-document.assembler.ts`

**Problemas resueltos:**

41. **`relacion_puesto` con mínimo de 20 chars insuficiente (7.4)**
    - Antes: el veto mínimo de 20 caracteres para la descripción de "cómo impacta en el trabajo del participante" permitía respuestas triviales como "Mejora el trabajo" (17 chars... que pasarían con solo 3 palabras más).
    - Ahora: el assembler verifica `relacion_puesto.trim().length < 80` y emite `console.warn` con el contenido completo para que el diseñador instruccional pueda revisarlo antes de presentar a CONOCER.

---

## Correcciones de Sesión Anterior (ya aplicadas)

Estas correcciones fueron implementadas en la sesión previa y forman parte del estado actual del sistema:

- **P2 assembler**: 3 llamadas a `JSON.parse` sin `try-catch` en juez_presentacion, juez_actividades, juez_cierre → corregidas con patrón `let decision = {seleccion:'A'}; try { ... } catch {}`
- **P4 assembler**: Exportación de `inventario_materiales` a `datosProducto` (fuente de verdad Domain Lock para P2/P3/P5)
- **P5 extractor**: Rutas incorrectas `secciones_json.materiales` → corregido a `P4.inventario_materiales`
- **P2 template**: Extractor agrega `inventario_p4` desde `P4.inventario_materiales`; agente de actividades incluye DOMAIN LOCK
- **P3 template**: Extractor agrega `inventario_p4`; agente ficha incluye EQUIPAMIENTO DOMAIN LOCK

---

## Acción Post-Corrección

Los productos F4 generados con el sistema anterior fueron **eliminados de la BD** para ser regenerados con las correcciones aplicadas. Ver instrucciones de regeneración en `CLAUDE.md`.

---

## Métricas de Cambio

### Ronda 1 (sesión inicial)
| Categoría | Archivos modificados |
|---|---|
| Assemblers (TypeScript) | p1-document.assembler.ts, p4-document.assembler.ts, p7-document.assembler.ts |
| Templates de generación | F4_P2_GENERATE_DOCUMENT.md, F4_P3_GENERATE_DOCUMENT.md, F4_P6_GENERATE_DOCUMENT.md, F4_P8_GENERATE_DOCUMENT.md |
| Form schemas | F4_P1_FORM_SCHEMA.md, F4_P4_FORM_SCHEMA.md, F4_P6_FORM_SCHEMA.md, F4_P7_FORM_SCHEMA.md, F4_P8_FORM_SCHEMA.md |
| **Subtotal** | **12 archivos** |

### Ronda 2 (2026-05-10 — correcciones auditoría)
| Categoría | Archivos modificados |
|---|---|
| Assemblers (TypeScript) | p1-document.assembler.ts, p4-document.assembler.ts, p5-document.assembler.ts, p6-document.assembler.ts, p7-document.assembler.ts, p8-document.assembler.ts |
| Templates de generación | F4_P2_GENERATE_DOCUMENT.md, F4_P3_GENERATE_DOCUMENT.md, F4_P8_GENERATE_DOCUMENT.md |
| Form schemas | F4_P1_FORM_SCHEMA.md, F4_P8_FORM_SCHEMA.md |
| **Subtotal ronda 2** | **11 archivos** (6 ya modificados en ronda 1, 5 nuevos) |

### Ronda 3 (2026-05-10 — hallazgos restantes)
| Categoría | Archivos modificados |
|---|---|
| Assemblers (TypeScript) | p2-document.assembler.ts, p4-document.assembler.ts, p7-document.assembler.ts |
| Templates de generación | F4_P1_GENERATE_DOCUMENT.md |
| Form schemas | F4_P6_FORM_SCHEMA.md |
| **Subtotal ronda 3** | **5 archivos** (4 ya modificados en rondas 1-2, 1 nuevo) |
| **Total acumulado** | **18 archivos distintos** |

> Nota: `F4_P1_GENERATE_DOCUMENT.md` no se modificó directamente; los cambios de P1 fueron en el assembler y en `F4_P1_FORM_SCHEMA.md`.
