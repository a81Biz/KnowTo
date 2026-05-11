---
id: F4_P5_GENERATE_DOCUMENT
name: Generador de Guías de Actividades — Por Módulo
version: 3.0.0
tags: [EC0366, guias, actividades, json-structured]
pipeline_steps:

  # ── EXTRACTOR ────────────────────────────────────────────────────────────
  - agent: extractor_p5
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      
      Extract from userInputs the data for ONE single activity.
      
      FIELDS: "actividad_unidad_N" (where N is _modulo_actual), "_modulo_actual", "_nombre_actividad"
      Also check "fase3.unidades" and "productos_previos.P1" for context.
      
      MANDATORY — Extract inventario_p4 from "productos_previos.P4":
      Use productos_previos.P4.inventario_materiales — this is the COMPLETE flat array of ALL authorized terms
      (tools, materials, instruments, and techniques declared in the participant manual).
      Copy it verbatim into inventario_p4.materiales.
      For inventario_p4.herramientas: look in productos_previos.P4.capitulos for the chapter where
      chapter.unidad === _modulo_actual; extract chapter.secciones_json.conceptos_clave[].termino as strings.
      If "productos_previos.P4" is absent or inventario_materiales is missing: output empty arrays.
      DO NOT invent materials. Only copy what literally appears in the P4 data.
      
      OUTPUT ONLY VALID JSON:
      {
        "modulo": 1,
        "nombre": "string",
        "contenido_form": "verbatim text from form",
        "inventario_p4": {
          "materiales": ["all items from productos_previos.P4.inventario_materiales verbatim"],
          "herramientas": ["conceptos_clave.termino from the chapter matching modulo_actual, or []"]
        },
        "instrumentos_p1": [
          {"unidad": 1, "tipo": "Guía de Observación", "reactivos": ["..."]}
        ]
      }

  # ═══════════════════════════════════════════════════════════════════════
  # SECCIÓN 1: FICHA DE LA ACTIVIDAD
  # ═══════════════════════════════════════════════════════════════════════
  - agent: agente_ficha_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_p5]
    include_template: false
    task: |
      ROLE: Activity Designer. TASK: Generate activity metadata.
      
      INPUT: {nombre}, {contenido_form}
      
      OUTPUT ONLY THIS JSON:
      {
        "ficha": {
          "objetivo": "Concrete SMART objective using physical verbs",
          "duracion": "X minutes",
          "modalidad": "Presencial/Virtual/Híbrida",
          "tipo": "Demostración/Práctica/Roleplay"
        }
      }

  - agent: agente_ficha_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_p5]
    include_template: false
    task: |
      SAME AS AGENT A. ADD: "pre-requisitos", "complejidad" (Baja/Media/Alta).
      OUTPUT ONLY THIS JSON:
      {"ficha": {"objetivo": "...", "duracion": "...", "modalidad": "...", "tipo": "...", "pre_requisitos": "...", "complejidad": "..."}}

  - agent: juez_ficha
    model: "qwen2.5:14b"
    inputs_from: [agente_ficha_A, agente_ficha_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. Compare METADATA.
      
      OBJETIVO FORMAT CHECK (EC0366 compliance):
      A valid EC0366 objective MUST describe a PHYSICAL, OBSERVABLE action performed by the participant using the course materials.
      INVALID: "creará un documento con notas" (academic product, not labor competency)
      INVALID: "demostrará habilidades adecuadas" (subjective adjective)
      VALID:   "Aplicará la técnica de zenithal highlight sobre una miniatura de 28mm usando aerógrafo a 20 PSI"
      Prefer the objective that describes what the participant DOES, not what they CREATE as homework.
      
      SELECTION: most concrete EC0366-compliant objective, realistic timing.
      VETO CRITERIA — Output "RECHAZADO" ONLY IF BOTH of the following are true for BOTH A and B:
      1. Both "objetivo" fields contain mental/non-physical verbs (aprender, entender, conocer, comprender) OR prohibited subjective adjectives (adecuado, correcto, bien, efectivo, apropiado, notable) instead of observable actions.
      2. Both "duracion" fields are missing, "0 min", or exceed "8 horas".
      If RECHAZADO, "razon" MUST describe the specific shared deficiency.
      OUTPUT: {"seleccion": "A"|"B"|"RECHAZADO", "razon": "one-line"}

  # ═══════════════════════════════════════════════════════════════════════
  # SECCIÓN 2: MATERIALES Y EQUIPO
  # ═══════════════════════════════════════════════════════════════════════
  - agent: agente_materiales_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_p5]
    include_template: false
    task: |
      ROLE: Logistic Planner. TASK: Generate lists.
      
      ⚠️ INVENTORY PROTOCOL — TWO MODES, CHOOSE ONE:
      
      MODE A — INHERITANCE (use when {inventario_p4.materiales} has at least one item):
        STEP 1: Copy ONLY items found verbatim in {inventario_p4.materiales} and {inventario_p4.herramientas}.
        STEP 2: For each item you list, confirm it appears word-for-word in the authorized inventory. If NOT → DELETE.
        STEP 3: Do NOT add plausibility-based accessories not in the inventory (no matter how logical they seem).
        VIOLATION EXAMPLES (MODE A):
          Inventory has "pinturas acrílicas"; you add "cinta adhesiva" → DELETE (not in inventory).
          Inventory has "pinceles"; you add "bolsitas de plástico" → DELETE (plausible but not declared).
      
      MODE B — INFERENCE (use ONLY when {inventario_p4.materiales} is empty or absent):
        STEP 1: Read {contenido_form} and {nombre} to understand what physical actions the activity requires.
        STEP 2: Derive the MINIMAL materials needed to execute those actions. Maximum 5 items total across all lists.
        STEP 3: Do NOT apply verbatim check in this mode — use logical inference from the activity description.
        STEP 4: Keep materials generic and tied to the action verbs (if activity says "apply", list an applicator tool; if "mix", list a container).
        DO NOT invent brand names or domain-specific items beyond what the activity description requires.
      
      OUTPUT ONLY THIS JSON:
      {
        "logistica": {
          "materiales": ["Item 1 with quantity", "Item 2"],
          "herramientas": ["Tool 1", "Tool 2"],
          "consumibles": ["Consumable 1", "Consumable 2"]
        }
      }

  - agent: agente_materiales_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_p5]
    include_template: false
    task: |
      SAME AS AGENT A — apply the full INVENTORY PROTOCOL (MODE A if inventory populated, MODE B if empty).
      ADD: "especificaciones_tecnicas" (e.g. "Voltaje 110V", "Luz natural directa") derived from the materials listed.
      OUTPUT ONLY THIS JSON:
      {"logistica": {"materiales": [...], "herramientas": [...], "consumibles": [...], "especificaciones_tecnicas": "..."}}

  - agent: juez_materiales
    model: "qwen2.5:14b"
    inputs_from: [extractor_p5, agente_materiales_A, agente_materiales_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. Compare LOGISTICS.
      
      HERITAGE CHECK (run BEFORE selection):
      Access {inventario_p4.materiales} and {inventario_p4.herramientas} from the extractor output.
      For EACH item in A's logistica (materiales + herramientas + consumibles) and B's logistica:
        Ask: "Does this item appear verbatim in inventario_p4.materiales OR inventario_p4.herramientas?"
        If NO → mark it as NON-HERITAGE.
      Prefer the option with FEWER non-heritage items. If A has fewer non-heritage items than B → prefer A, skip content evaluation.
      If both options have identical non-heritage counts → proceed to content evaluation.
      If {inventario_p4} is empty → skip HERITAGE CHECK and proceed to content evaluation directly.
      
      SELECTION (content evaluation): completeness, specificity.
      VETO CRITERIA — Output "RECHAZADO" ONLY IF BOTH of the following are true for BOTH A and B:
      1. Both have empty arrays for ALL three lists (materiales, herramientas, consumibles simultaneously).
      2. Both lack any physical item that could be associated with the activity.
      If RECHAZADO, "razon" MUST describe the specific shared deficiency.
      OUTPUT: {"seleccion": "A"|"B"|"RECHAZADO", "razon": "one-line"}

  # ═══════════════════════════════════════════════════════════════════════
  # SECCIÓN 3: PROCEDIMIENTO (EL "HACER")
  # ═══════════════════════════════════════════════════════════════════════
  - agent: agente_procedimiento_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_p5]
    include_template: false
    task: |
      ROLE: Instructional Designer. TASK: Step-by-step guide.
      
      ⚠️ MATERIAL-ACTION FACTIBILITY MATRIX — READ BEFORE WRITING ANY STEP:
      STEP 1: Read {inventario_p4.materiales} to know the exact physical items available.
      STEP 2: For each item, determine its physical category and COMPATIBLE VERBS:
        • LIQUID/FLUID (liquids, paints, inks, adhesives, oils, solvents): Aplica, Mezcla, Vierte, Diluye, Extiende, Limpia, Humedece
        • SOLID/RIGID (boards, metals, wood, stone, glass, plastic sheets): Coloca, Mide, Marca, Perfora, Ensambla, Fija, Posiciona
        • DIGITAL/SOFTWARE (files, software, documents, forms): Abre, Escribe, Guarda, Configura, Ejecuta, Copia, Selecciona
        • TEXTILE/SOFT (fabric, thread, foam, leather, paper): Cose, Dobla, Mide, Corta, Pliega, Enrolla
        • EQUIPMENT/TOOL (machines, instruments, measuring devices): Ensambla, Conecta, Ajusta, Calibra, Opera, Verifica
        • CONSUMABLE/GRANULAR (powders, pigments, resins): Mezcla, Aplica, Pesa, Disuelve, Incorpora
      STEP 3: Write each "ejecucion" step so that the verb applied to a material is COMPATIBLE with its category.
      STEP 4: PROHIBITED verb-material pairs (physical impossibility):
        • LIQUID item + Cortar/Lijar/Perforar/Serrar → FORBIDDEN
        • SOLID_RIGID item + Verter/Diluir/Extender/Esparcir → FORBIDDEN
        • DIGITAL item + Cortar/Lijar/Pintar/Soldar/Lijar → FORBIDDEN
      STEP 5: PROHIBITED academic references in any step — FORBIDDEN phrases:
        • "del capítulo N", "el Capítulo N", "como se describe en", "según el manual", "revisar los conceptos", "como se vio en"
        Each step MUST be a standalone physical instruction. No references to study materials.
      STEP 6: MINIMUM STEP COUNT (EC0366 normative):
        • PRÁCTICA or hands-on activity: preparacion ≥ 2, ejecucion ≥ 4, cierre_limpieza ≥ 2.
        • DEMOSTRACIÓN activity: preparacion ≥ 2, ejecucion ≥ 3, cierre_limpieza ≥ 1.
        Each ejecucion step must specify: WHAT action + WITH WHICH tool/material + ON WHICH part of the work object.
      STEP 7: PROHIBITION OF CIRCULAR STEPS:
        A step is circular if it uses vague qualifiers without specifying the criterion.
        FORBIDDEN: "Adjust tools as needed", "repeat if necessary", "do as appropriate"
        REQUIRED: specify the condition, tool, and object explicitly in every step.
      
      CRITICAL — ARRAY FORMAT: Each item in "preparacion", "ejecucion", "cierre_limpieza" MUST be a plain STRING.
      PROHIBITED: nested objects like {"paso": 1, "descripcion": "..."} or {"step": "...", "detail": "..."}
      CORRECT:   ["Coloca el material en la superficie de trabajo.", "Aplica la primera capa de pintura diluida sobre la pieza."]
      WRONG:     [{"paso": 1, "descripcion": "Coloca el material..."}]
      
      OUTPUT ONLY THIS JSON:
      {
        "procedimiento": {
          "preparacion": ["Step 1", "Step 2"],
          "ejecucion": ["Step 1", "Step 2", "Step 3", "Step 4"],
          "cierre_limpieza": ["Step 1", "Step 2"]
        }
      }

  - agent: agente_procedimiento_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_p5]
    include_template: false
    task: |
      SAME AS AGENT A — apply the full MATERIAL-ACTION FACTIBILITY MATRIX using {inventario_p4.materiales}.
      APPLY STEP 5 FROM AGENT A: FORBIDDEN academic references ("del capítulo N", "como se describe en", "revisar los conceptos", "según el manual") in any step.
      ADD: "medidas_seguridad" with at least 3 specific warnings DERIVED from the actual materials in {inventario_p4.materiales} (e.g. if material is a solvent → ventilation warning; if electrical equipment → grounding warning). Do NOT use generic warnings unrelated to the listed materials.
      CRITICAL — ALL arrays ("preparacion", "ejecucion", "cierre_limpieza", "medidas_seguridad") MUST be arrays of plain STRINGS (not objects).
      OUTPUT ONLY THIS JSON:
      {"procedimiento": {"preparacion": ["Step 1", "Step 2"], "ejecucion": ["Step 1", "Step 2"], "cierre_limpieza": ["Step 1"], "medidas_seguridad": ["Warning 1", "Warning 2", "Warning 3"]}}

  - agent: juez_procedimiento
    model: "qwen2.5:14b"
    inputs_from: [agente_procedimiento_A, agente_procedimiento_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. Compare PROCEDURES.
      
      INVENTORY COHERENCE CHECK (run BEFORE selection criteria):
      For each step in "ejecucion" of A and B, identify: (a) the physical verb used, (b) the item the verb acts upon.
      Flag a step as DISSONANT if the verb-item pair violates physical laws:
        • Item contains words like (agua, pintura, aceite, tinta, pegamento, adhesivo, líquido, disolvente, barniz) AND verb is (cortar, lijar, perforar, serrar, doblar, plegar) → DISSONANT
        • Item contains words like (madera, metal, placa, tabla, piedra, vidrio, tablero, lámina) AND verb is (verter, diluir, extender, esparcir, disolver) → DISSONANT
        • Item contains words like (archivo, software, formulario, documento, archivo digital) AND verb is (cortar, lijar, pintar, soldar, perforar) → DISSONANT
      Count: A_dissonances = number of DISSONANT steps in A's ejecucion. B_dissonances = same for B.
      If A_dissonances < B_dissonances → prefer A (skip content evaluation below).
      If B_dissonances < A_dissonances → prefer B (skip content evaluation below).
      If BOTH have more than half their ejecucion steps flagged as DISSONANT → output RECHAZADO with razon describing the shared dissonance pattern.
      If counts are equal → proceed to content evaluation.
      
      SELECTION (if coherence check does not decide): physical verbs only, clear flow, safety included.
      VETO CRITERIA — Output "RECHAZADO" ONLY IF BOTH of the following are true for BOTH A and B:
      1. Both have fewer than 2 steps in the "ejecucion" array.
      2. Both use exclusively mental/abstract verbs (aprender, entender, revisar conceptos) with no physical actions.
      If RECHAZADO, "razon" MUST describe the specific shared deficiency.
      OUTPUT: {"seleccion": "A"|"B"|"RECHAZADO", "razon": "one-line"}

  # ═══════════════════════════════════════════════════════════════════════
  # SECCIÓN 4: EVALUACIÓN Y RÚBRICA (ALINEADO A P1)
  # ═══════════════════════════════════════════════════════════════════════
  - agent: agente_evaluacion_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_p5]
    include_template: false
    task: |
      ROLE: Evaluator. TASK: Rubric aligned to P1.
      INPUT: {instrumentos_p1}
      
      RUBRIC KEY NAMES ARE MANDATORY (case-sensitive, no alternatives):
        "criterio"        → observable action to evaluate
        "puntos"          → integer (e.g., 5 or 10)
        "indicador_exito" → description of what success looks like
      PROHIBITED alternatives: "indicador", "indicator", "puntos_posibles", "points", "score", "puntaje", "criterion"
      EXAMPLE: {"criterio": "Aplica la capa base con pincel plano", "puntos": 10, "indicador_exito": "La capa cubre el 100% de la superficie sin burbujas"}
      
      EVIDENCE CONSTRAINT — NON-NEGOTIABLE:
      "evidencia_producto" MUST be a SHORT physical product name — maximum 8 words — describing what the learner physically produces or performs.
      CORRECT examples: "Miniatura pintada", "Pieza con dilución aplicada", "Modelo terminado con sombreado"
      PROHIBITED content in evidencia_producto: "curso", "capítulo", "contenido", "abordan", "incluye", "estructura", "marco teórico", "perspectiva", "manual". If any of these words appear → your evidencia_producto is WRONG. Rewrite it as a physical product name.
      
      MINIMUM RUBRIC CRITERIA (EC0366 normative — non-negotiable):
        • PRÁCTICA or hands-on activity: minimum 3 criteria covering these 3 dimensions:
            1. TECHNIQUE: how the learner applies the method or procedure
            2. RESULT: what the produced piece visually or functionally shows
            3. PROCESS: order, material care, work area organization
          Total points ≥ 15.
        • DEMOSTRACIÓN activity: minimum 2 criteria (Technique + Result). Total points ≥ 10.
        • If activity type is unclear → default to PRÁCTICA rules (minimum 3 criteria).
      RUBRIC SCOPE: Each "criterio" MUST evaluate the LEARNER'S PHYSICAL PERFORMANCE during the activity — NOT the course content, NOT the manual structure, NOT the instructor's materials. The criterio must start with an action verb (Aplica, Mezcla, Coloca, Ejecuta...).
      
      PERFORMANCE LEVELS — EC0366 NORMATIVE REQUIREMENT:
      Each rubrica item MUST include observable descriptors for 3 performance levels:
      - "nivel_a": What COMPLETE/EXCELLENT performance looks like — the learner does X fully, without errors, on the first attempt.
      - "nivel_b": What PARTIAL performance looks like — 1-2 minor deviations observed, correctable with guidance.
      - "nivel_c": What INSUFFICIENT performance looks like — critical error, omission, or unsafe behavior.
      These descriptors must be OBSERVABLE — an evaluator must be able to distinguish them without subjective interpretation.
      WRONG nivel_a: "Performs well" — RIGHT nivel_a: "Applies all 4 layers in the specified order without skipping any step"
      
      OUTPUT ONLY THIS JSON:
      {
        "evaluacion": {
          "evidencia_producto": "Short physical product name (max 8 words)",
          "rubrica": [
            {
              "criterio": "Specific observable action by the learner",
              "puntos": 5,
              "indicador_exito": "Description of success",
              "nivel_a": "Completo: [observable descriptor of full compliance]",
              "nivel_b": "Parcial: [observable descriptor of partial compliance]",
              "nivel_c": "Insuficiente: [observable descriptor of non-compliance or critical error]"
            }
          ]
        }
      }

  - agent: agente_evaluacion_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_p5]
    include_template: false
    task: |
      SAME AS AGENT A. ADD: "errores_comunes" (What to watch for).
      KEY NAMES MANDATORY: "criterio", "puntos", "indicador_exito", "nivel_a", "nivel_b", "nivel_c" (no alternatives — see Agent A for full rules).
      APPLY ALL CONSTRAINTS FROM AGENT A: EVIDENCE CONSTRAINT (max 8 words, no prohibited words) + MINIMUM RUBRIC CRITERIA (3 for PRÁCTICA, 2 for DEMOSTRACIÓN) + RUBRIC SCOPE (learner's physical performance only) + PERFORMANCE LEVELS (nivel_a/b/c observable descriptors).
      OUTPUT ONLY THIS JSON:
      {"evaluacion": {"evidencia_producto": "Short physical product name", "rubrica": [{"criterio": "...", "puntos": 5, "indicador_exito": "...", "nivel_a": "Completo: ...", "nivel_b": "Parcial: ...", "nivel_c": "Insuficiente: ..."}], "errores_comunes": ["Error 1", "Error 2"]}}

  - agent: juez_evaluacion
    model: "qwen2.5:14b"
    inputs_from: [agente_evaluacion_A, agente_evaluacion_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. Compare EVALUATION.
      
      INTEGRITY PRE-CHECK (run BEFORE any selection criteria):
      For each rubric item in A and B verify it has EXACTLY "criterio", "puntos", AND "indicador_exito" as keys.
      - If any item in A is missing "indicador_exito" OR "puntos" → A FAILS INTEGRITY.
      - If any item in B is missing "indicador_exito" OR "puntos" → B FAILS INTEGRITY.
      - If ONLY A fails integrity → select B immediately (skip content evaluation).
      - If ONLY B fails integrity → select A immediately (skip content evaluation).
      - If BOTH fail integrity → output RECHAZADO with razon "Ambos agentes usan nombres de clave incorrectos en rúbrica".
      
      LEAKAGE FILTER (run AFTER integrity, BEFORE content evaluation):
      Check "evidencia_producto" in A and B for the following PROHIBITED words: "curso", "capítulo", "contenido", "abordan", "incluye", "estructura", "marco teórico", "perspectiva", "manual", "tres capítulos".
      - If A's evidencia_producto contains ANY prohibited word → A FAILS LEAKAGE.
      - If B's evidencia_producto contains ANY prohibited word → B FAILS LEAKAGE.
      - If ONLY A fails leakage → select B immediately.
      - If ONLY B fails leakage → select A immediately.
      - If BOTH fail leakage → output RECHAZADO with razon "Ambos agentes generaron descripción del curso en lugar de evidencia del alumno".
      
      Also check rubric scope: if any "criterio" in the winning option evaluates the course/manual/instructor material (not the learner's physical performance) → note it in "razon" and prefer the other option if it passes.
      
      SELECTION (only if both pass integrity and leakage): alignment to P1, clear rubric, common errors.
      VETO CRITERIA — Output "RECHAZADO" ONLY IF BOTH of the following are true for BOTH A and B:
      1. Both have 0 items in the "rubrica" array.
      2. Both have "evidencia_producto" that is empty or a generic placeholder (e.g., "producto", "evidencia").
      If RECHAZADO, "razon" MUST describe the specific shared deficiency.
      OUTPUT: {"seleccion": "A"|"B"|"RECHAZADO", "razon": "one-line"}

  # ═══════════════════════════════════════════════════════════════════════
  # ASSEMBLER
  # ═══════════════════════════════════════════════════════════════════════
  - agent: ensamblador_doc_p5
    model: "qwen2.5:14b"
    inputs_from: [juez_ficha, juez_materiales, juez_procedimiento, juez_evaluacion]
    include_template: false
    task: "CÓDIGO - Assembly in p5-document.assembler.ts"