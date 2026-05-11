---
id: F4_P3_GENERATE_DOCUMENT
name: Generador de Paquete de Producción — Video Individual
version: 11.1.0
tags: [EC0366, guiones, multimedia, produccion, json-structured, zero-loss]
pipeline_steps:

  # ── EXTRACTOR ────────────────────────────────────────────────────────────
  - agent: extractor_p3
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      
      You receive pre-structured JSON data in userInputs. DO NOT parse or summarize — map it verbatim.
      
      FIELDS IN userInputs:
      - "guion_unidad_N": technical sheet text from form (string)
      - "_modulo_actual": module number (integer)
      - "_nombre_video": human-readable video name (string)
      - "productos_previos": object containing all approved products data
      
      EXTRACT p4_secciones as follows:
        1. Access productos_previos.P4.capitulos (array of chapters)
        2. Find the chapter where chapter.unidad === _modulo_actual
        3. Use that chapter's "secciones_json" as p4_secciones
        4. If productos_previos.P4 is absent or no matching chapter found: output empty object {}
      
      EXTRACT inventario_p4 as follows:
        - inventario_p4 = productos_previos.P4.inventario_materiales (flat string array — pass as-is; use [] if absent)
        - This is the authorized list of physical items for the course. Used to validate equipamiento.
      
      EC0366 SCOPE NOTE (IMPORTANT):
      P3 is classified as a SUPPLEMENTARY INSTRUCTIONAL TOOL (guión instruccional para soporte multimedia).
      It is NOT a required EC0366 deliverable — EC0366 mandates didactic materials (manuals, instruments, guides, calendar) but does NOT require video production.
      P3 enables optional e-learning or video versions of the course content. When presenting this document to CONOCER, classify it as "Material de apoyo multimedia" not as a primary evaluation deliverable.
      Clearly separate: (A) PRODUCTION elements (filming equipment, crew, post-production) from (B) INSTRUCTIONAL DESIGN elements (learning objectives, key concepts, pedagogical structure).
      
      VIDEO DURATION CAP (CRITICAL RULE):
      The "duracion" field represents the VIDEO length — NOT the class/module duration.
      Videos for e-learning must NEVER exceed 15 minutes (industry standard: 5-12 min optimal).
      If guion_unidad_N mentions a duration > 15 min (e.g., "60 min", "2 horas", "1 hora"), that refers to the CLASS duration.
      FORMULA for long content: if extracted_duration > 30 min → recommend a SERIES of 3 videos of ~8 min each (use "8 min per video — Series of 3"). If 15 < duration ≤ 30 → use "10 min". If ≤ 15 → use as-is.
      If no duration found: Default = "8 min".
      EXAMPLES: "5 min" → "5 min" | "12 min" → "12 min" | "30 min" → "10 min" | "60 min" → "8 min por video — Serie de 3" | "2 horas" → "8 min por video — Serie de 4" | not found → "8 min".
      
      OUTPUT ONLY VALID JSON:
      {
        "modulo": {_modulo_actual},
        "nombre": "{_nombre_video}",
        "ficha_tecnica_form": "{guion_unidad_N verbatim}",
        "duracion": "extracted or default '8 min'",
        "p4_secciones": {extracted secciones_json or {}},
        "inventario_p4": {inventario_p4 as-is}
      }

  # ═══════════════════════════════════════════════════════════════════════
  # SECCIÓN 1: FICHA TÉCNICA
  # ═══════════════════════════════════════════════════════════════════════
  - agent: agente_ficha_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_p3]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      ROLE: Production Director. TASK: Generate FICHA TÉCNICA as structured JSON.
      
      INPUT: {nombre}, {ficha_tecnica_form}, {duracion}, p4_secciones
      
      Derive objetivo_aprendizaje from p4_secciones.introduccion + p4_secciones.puntos_recordar.
      
      EQUIPAMIENTO — TWO SEPARATE CATEGORIES:
      1. PRODUCCIÓN: Standard filming equipment always allowed — cámara, trípode, micrófono, iluminación, pantalla verde, etc. These do NOT come from inventario_p4.
      2. MATERIALES EN CÁMARA: Physical course items that appear on screen (shown to participants during the video). These MUST come from {inventario_p4} or {ficha_tecnica_form} — FORBIDDEN to invent course materials absent from both sources.
      Format: "equipamiento" = "PRODUCCIÓN: [list]. MATERIALES EN CÁMARA: [list from inventario_p4/form]."
      
      OUTPUT ONLY THIS JSON:
      {
        "ficha_tecnica": {
          "modulo": "MUST be exactly the value of {nombre}.",
          "objetivo_aprendizaje": "Acción observable. STRICT RULE: PROHIBIDO USAR la raíz de las palabras: aprender, comprender, entender, saber, conocer.",
          "duracion": "{duracion}",
          "recursos": ["Format: Array de STRINGS SIMPLES. Ej: 'Animación 2D', 'Close-up'. PROHIBIDO devolver objetos JSON."],
          "equipamiento": "PRODUCCIÓN: [filming equipment]. MATERIALES EN CÁMARA: [items from inventario_p4 only].",
          "perfil_talento": "Narrador/actor sugerido..."
        }
      }

  - agent: agente_ficha_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_p3]
    include_template: false
    task: |
      SAME AS AGENT A. APPLY SAME EQUIPAMIENTO TWO-CATEGORY RULE:
      PRODUCCIÓN = standard filming equipment (always valid). MATERIALES EN CÁMARA = only from {inventario_p4} or {ficha_tecnica_form}.
      DIFFERENT: vary the "perfil_talento" suggestion and prioritize different items from {inventario_p4} for MATERIALES EN CÁMARA.
      OUTPUT ONLY THIS JSON:
      {
        "ficha_tecnica": {
          "modulo": "MUST be exactly the value of {nombre}.",
          "objetivo_aprendizaje": "Acción observable. STRICT RULE: PROHIBIDO USAR la raíz de las palabras: aprender, comprender, entender, saber, conocer.",
          "duracion": "{duracion}",
          "recursos": ["Format: Array de STRINGS SIMPLES. Ej: 'Animación 2D', 'Close-up'. PROHIBIDO devolver objetos JSON."],
          "equipamiento": "PRODUCCIÓN: [filming equipment]. MATERIALES EN CÁMARA: [items from inventario_p4 only].",
          "perfil_talento": "Narrador/actor sugerido..."
        }
      }

  - agent: juez_ficha
    model: "qwen2.5:14b"
    inputs_from: [agente_ficha_A, agente_ficha_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER AND STRICT AUDITOR. DO NOT CONVERSE. DO NOT SYNTHESIZE.
      
      Compare the Ficha Técnica from A and B. 
      Select the BEST ONE based on:
      1. No forbidden verbs in objetivo_aprendizaje.
      2. Specific and logical physical 'equipamiento'.
      3. Strict JSON structure compliance.
      
      VETO CRITERIA — Output "RECHAZADO" ONLY IF BOTH of the following are true for BOTH A and B:
      1. Both objetivo_aprendizaje contain forbidden verb roots (aprender, comprender, entender, saber, conocer).
      2. Both "recursos" fields contain nested objects instead of simple strings.
      If RECHAZADO, "razon" MUST describe the specific shared deficiency so the agents can correct it.
      
      OUTPUT ONLY THIS EXACT JSON:
      {"seleccion": "A" | "B" | "RECHAZADO", "razon": "1-line explanation"}

  # ═══════════════════════════════════════════════════════════════════════
  # SECCIÓN 2: ESCALETA
  # ═══════════════════════════════════════════════════════════════════════
  - agent: agente_escaleta_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_p3]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      ROLE: Production Director. TASK: Generate ESCALETA as array of exactly 9 objects.
      
      BUILD 9 SCENES exactly matching: Apertura-Gancho, Agenda, Concepto_1, Ejemplo_1, Concepto_2, Ejemplo_2, Practica_guiada, Error_comun, Cierre.
      
      TIME SCALE STRICT RULE:
      - The total elapsed time of all 9 scenes MUST equal {duracion} (e.g., if duracion is "8 min", last row ends at "8:00").
      - Distribute proportionally: Apertura-Gancho ~8%, Agenda ~5%, each Concepto+Ejemplo pair ~18%, Practica_guiada ~15%, Error_comun ~10%, Cierre ~8%.
      - FORBIDDEN: time ranges that don't sum to {duracion}. FORBIDDEN: rows with overlapping or non-consecutive times.
      
      REGLA DE DENSIDAD DE CONTENIDO (ZERO LOSS):
      1. PROHIBIDO usar tiempos de ejemplo genéricos (como "5 min") — usa siempre {duracion}.
      2. El detalle de cada "accion" debe ser PROPORCIONAL a {p4_secciones}: si el P4 describe 10 pasos técnicos, DEBES distribuirlos entre las 9 escenas, nombrando cada paso específicamente.
      3. Eres un transcriptor técnico, no un resumidor. PROHIBIDO escribir "se explica el proceso" — escribe EL proceso.
      
      RULES:
      - "accion" MUST describe a concrete, physical visual. 
      - ZERO LOSS: If P4 mentions specific tools or techniques, THEY MUST be in the "accion".
      - End of row N MUST equal start of row N+1.
      
      OUTPUT ONLY THIS JSON:
      {
        "escaleta": [
          {"tiempo": "0:00 - 0:30", "escena": "Apertura-Gancho", "accion": "CONCRETE VISUAL ACTION derived from P4"},
          ...9 rows total
        ]
      }

  - agent: agente_escaleta_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_p3]
    include_template: false
    task: |
      SAME AS AGENT A. APPLY SAME TIME SCALE STRICT RULE (total elapsed time MUST equal {duracion}) AND SAME REGLA DE DENSIDAD DE CONTENIDO (transcribe all specific P4 steps, no summaries). DIFFERENT: vary shot_type field: "close_up", "medium_shot", "wide_shot", "insert_shot", "split_screen". Max 2 consecutive same type.
      OUTPUT ONLY THIS JSON:
      {"escaleta": [{"tiempo": "...", "escena": "...", "accion": "...", "shot_type": "..."}, ...9 rows]}

  - agent: juez_escaleta
    model: "qwen2.5:14b"
    inputs_from: [agente_escaleta_A, agente_escaleta_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER AND STRICT AUDITOR. DO NOT CONVERSE. DO NOT SYNTHESIZE.
      
      Compare the Escaleta from A and B. 
      Select the BEST ONE based on:
      1. Exactly 9 rows with the mandatory scene names.
      2. Consecutive and ascending time ranges.
      3. The "accion" field contains highly specific visual descriptions retaining P4 details, not generic summaries.
      
      VETO CRITERIA — Output "RECHAZADO" ONLY IF BOTH of the following are true for BOTH A and B:
      1. Both have fewer than 9 rows.
      2. OR both have time ranges that do not sum to {duracion}.
      If RECHAZADO, "razon" MUST describe the specific structural failure (e.g., "ambas escaletas tienen 7 filas").
      
      OUTPUT ONLY THIS EXACT JSON:
      {"seleccion": "A" | "B" | "RECHAZADO", "razon": "1-line explanation"}

  # ═══════════════════════════════════════════════════════════════════════
  # SECCIÓN 3: GUION LITERARIO (ANTI-LOSS COMPRESSION)
  # ═══════════════════════════════════════════════════════════════════════
  - agent: agente_literario_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_p3]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      ROLE: Production Director. TASK: Generate GUION LITERARIO as array of 9 scene narrations.
      
      TIME DENSITY STRICT RULE:
      - Target word count: approximately 130 words per minute of narration (natural speech pace).
      - Total word count across all 9 scenes MUST be approximately {duracion} × 130 (e.g., "8 min" → ~1040 words).
      - Distribute proportionally by scene: longer scenes (Concepto, Ejemplo) get more words; shorter scenes (Agenda, Cierre) get fewer.
      - FORBIDDEN: scenes with fewer than 20 words. FORBIDDEN: total word count below 80% of target.
      
      REGLA DE DENSIDAD DE CONTENIDO (ZERO LOSS):
      1. PROHIBIDO usar duración genérica (como "5 min") — la duración oficial es {duracion}.
      2. El tamaño de cada "texto" debe ser PROPORCIONAL a {p4_secciones}: si el P4 menciona 10 pasos técnicos, DEBES narrar los 10. Eres un transcriptor, no un resumidor.
      3. PROHIBIDO escribir "se explica el proceso" — escribe EL proceso con sus términos exactos.
      
      REGLA DE FIDELIDAD EXTREMA (ZERO LOSS): 
      IT IS STRICTLY FORBIDDEN to summarize or generalize the P4 content. If the P4 manual mentions specific tools, physical steps, materials, or technical names, YOU MUST USE THOSE EXACT WORDS in the spoken narration. Copy technical terminology verbatim — do not paraphrase or substitute synonyms.
      
      STRICT SCHEMA — YOU MUST NOT INVENT OR RENAME MARCADORES. Output exactly these 9 rows:
      
      FINAL OUTPUT CHECKLIST — Verify BEFORE outputting:
      [ ] guion_literario has EXACTLY 9 objects. Count them: 1.Apertura-Gancho 2.Agenda 3.Concepto_1 4.Ejemplo_1 5.Concepto_2 6.Ejemplo_2 7.Practica_guiada 8.Error_comun 9.Cierre
      [ ] Every object has BOTH "marcador" AND "texto" fields present and non-empty
      [ ] KEY NAME RULE: "marcador" MUST be lowercase. "Marcador", "Marker", "label", "scene" are FORBIDDEN.
      [ ] Verify object 7 specifically: does {"marcador": "Practica_guiada", "texto": "..."} have both fields? If not, fix before outputting.
      [ ] PROHIBITED: empty strings, null, or undefined in any field
      
      OUTPUT ONLY THIS JSON:
      {
        "guion_literario": [
          {"marcador": "Apertura-Gancho", "texto": "2-3 conversational sentences from p4_secciones.introduccion"},
          {"marcador": "Agenda", "texto": "1-2 sentences previewing what will be learned"},
          {"marcador": "Concepto_1", "texto": "4-6 conversational sentences retaining exact technical terms from p4_secciones.marco_teorico"},
          {"marcador": "Ejemplo_1", "texto": "5-8 sentences retaining specific steps from p4_secciones.ejemplo_practico"},
          {"marcador": "Concepto_2", "texto": "4-6 sentences from p4_secciones.conceptos_clave[0]"},
          {"marcador": "Ejemplo_2", "texto": "5-8 sentences retaining specific steps from p4_secciones.desarrollo[0]"},
          {"marcador": "Practica_guiada", "texto": "3-4 sentences inviting action from p4_secciones.ejercicio_practico"},
          {"marcador": "Error_comun", "texto": "4-5 sentences warning about a mistake"},
          {"marcador": "Cierre", "texto": "4-5 sentences: 3 takeaways + call to action"}
        ]
      }

  - agent: agente_literario_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_p3]
    include_template: false
    task: |
      SAME AS AGENT A. APPLY SAME TIME DENSITY STRICT RULE (word count ~{duracion} × 130), SAME REGLA DE DENSIDAD DE CONTENIDO (transcribe all specific P4 steps), SAME ZERO LOSS RULE (retain exact technical terms).
      DIFFERENT: use "I do, we do, you do" pedagogy INSIDE the "texto" fields.
      STRICT RULE: DO NOT CHANGE THE "marcador" NAMES. You MUST use exactly these 9 marcadores in this order: Apertura-Gancho, Agenda, Concepto_1, Ejemplo_1, Concepto_2, Ejemplo_2, Practica_guiada, Error_comun, Cierre.
      
      FINAL OUTPUT CHECKLIST — Verify BEFORE outputting:
      [ ] guion_literario has EXACTLY 9 objects. Count them: 1.Apertura-Gancho 2.Agenda 3.Concepto_1 4.Ejemplo_1 5.Concepto_2 6.Ejemplo_2 7.Practica_guiada 8.Error_comun 9.Cierre
      [ ] Every object has BOTH "marcador" AND "texto" fields present and non-empty
      [ ] KEY NAME RULE: "marcador" MUST be lowercase. "Marcador", "Marker", "label", "scene" are FORBIDDEN.
      [ ] Verify object 7 specifically: does {"marcador": "Practica_guiada", "texto": "..."} have both fields? If not, fix before outputting.
      [ ] PROHIBITED: empty strings, null, or undefined in any field
      
      OUTPUT ONLY THIS JSON:
      {"guion_literario": [{"marcador": "Apertura-Gancho", "texto": "..."}, {"marcador": "Agenda", "texto": "..."}, {"marcador": "Concepto_1", "texto": "..."}, {"marcador": "Ejemplo_1", "texto": "..."}, {"marcador": "Concepto_2", "texto": "..."}, {"marcador": "Ejemplo_2", "texto": "..."}, {"marcador": "Practica_guiada", "texto": "..."}, {"marcador": "Error_comun", "texto": "..."}, {"marcador": "Cierre", "texto": "..."}]}

  - agent: juez_literario
    model: "qwen2.5:14b"
    inputs_from: [agente_literario_A, agente_literario_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER AND STRICT AUDITOR. DO NOT CONVERSE. DO NOT SYNTHESIZE OR MERGE.
      
      INTEGRITY PRE-CHECK (runs BEFORE all other criteria):
      For each output A and B, inspect every object in the "guion_literario" array:
      - Does it have a "marcador" field (lowercase, non-empty string)?
      - Does it have a "texto" field (non-empty string)?
      If ANY object is missing "marcador" or "texto":
        - That output has an INTEGRITY FAILURE.
        - If BOTH outputs have integrity failures → emit RECHAZADO immediately with the broken marcador name.
        - If ONLY ONE has an integrity failure → select the other immediately, skip all other criteria.
      ONLY IF BOTH outputs pass the integrity check → proceed to the Selection Criteria below.
      
      Compare the Guion Literario from A and B. 
      CRITICAL FIDELITY CHECK: Read the "texto" fields. Which agent actually used specific technical terms, tools, and examples from the P4? If an agent wrote generic fluff without naming the specific techniques, tools, or steps from the source material, it loses.
      
      WORD COUNT CHECK (APPLY BEFORE SELECTING):
      For each output, estimate the total word count by summing words across all 9 "texto" fields.
      Target: approximately {duracion} × 130 words total (e.g., "8 min" → ~1040 words minimum).
      Minimum acceptable: 80% of target (e.g., "8 min" → 832 words minimum).
      If one output clearly has more total words AND both contain relevant P4 content, select the one with more words.
      If one output meets the word count minimum and the other does not, auto-select the one that meets the minimum.
      
      Select the BEST ONE based on:
      1. WORD COUNT: meets the {duracion} × 104 words minimum (80% of 130 wpm target).
      2. FIDELITY: highest retention of specific technical details from the source.
      3. CONVERSATIONAL: natural narrator tone, not robotic or list-like.
      4. Exactly 9 required rows.
      
      VETO CRITERIA — Output "RECHAZADO" ONLY IF BOTH of the following are true for BOTH A and B:
      1. Both have fewer than 9 marcadores.
      2. OR both have marcadores renamed away from the 9 required names.
      3. OR both have "texto" fields averaging under 20 words each (extreme summarization).
      If RECHAZADO, "razon" MUST describe the specific failure so the agents can correct it.
      
      OUTPUT ONLY THIS EXACT JSON:
      {"seleccion": "A" | "B" | "RECHAZADO", "razon": "1-line explanation"}

  # ═══════════════════════════════════════════════════════════════════════
  # SECCIÓN 4: GUION TÉCNICO
  # ═══════════════════════════════════════════════════════════════════════
  - agent: agente_tecnico_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_p3]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      ROLE: Production Director. TASK: Generate GUION TÉCNICO as array of exactly 9 objects.
      
      AUDIO LOCUCIÓN RULE (HIGHEST PRIORITY):
      "audio_locucion" de CADA fila DEBE contener la narración COMPLETA del narrador para esa escena,
      derivada VERBATIM de p4_secciones según el tema del marcador correspondiente.
      PROHIBIDO: resúmenes, "first and last 10 words", frases genéricas ("Bienvenidos...", "descubrirán cómo...").
      Escribe lo que el narrador REALMENTE DICE durante esa escena, en español conversacional natural.
      
      UNIQUENESS RULE (AUDIO LOCUCIÓN): Antes de finalizar, verifica que ningún par de filas comparte más de 10 palabras consecutivas en su "audio_locucion". Cada escena debe narrar una SECCIÓN DISTINTA de p4_secciones:
      - Apertura-Gancho → p4_secciones.introduccion
      - Agenda → vista general de lo que se verá
      - Concepto_1 → p4_secciones.marco_teorico (primera mitad)
      - Ejemplo_1 → p4_secciones.ejemplo_practico
      - Concepto_2 → p4_secciones.marco_teorico (segunda mitad) o conceptos_clave[0]
      - Ejemplo_2 → p4_secciones.desarrollo (primeros pasos)
      - Practica_guiada → p4_secciones.ejercicio_practico
      - Error_comun → advertencia técnica específica del proceso
      - Cierre → p4_secciones.puntos_recordar
      Si detectas que dos escenas tienen la misma narración, reescribe la duplicada con contenido de otra sección.
      
      STRICT TABLE SCHEMA — LOS 10 CAMPOS SON OBLIGATORIOS EN LAS 9 FILAS:
      escena, imagen_tipo_plano, imagen_descripcion, audio_locucion, audio_musica, audio_sfx,
      notas_camara, notas_transicion, notas_duracion, notas_color.
      Si no tienes datos, usa defaults razonables: audio_musica "Ambiental instrumental 40%", notas_camara "tripod".
      PROHIBIDO: strings vacíos, null, o campos omitidos.
      
      STRICT RULE: The "escena" field MUST MATCH EXACTLY these 9 names in this order: Apertura-Gancho, Agenda, Concepto_1, Ejemplo_1, Concepto_2, Ejemplo_2, Practica_guiada, Error_comun, Cierre. DO NOT invent new scene names.
      
      OUTPUT ONLY THIS JSON:
      {
        "guion_tecnico": [
          {
            "escena": "Apertura-Gancho",
            "imagen_tipo_plano": "close_up|medium_shot|wide_shot|insert_shot|split_screen",
            "imagen_descripcion": "What camera sees: elements, lighting setup, text overlays, animation type",
            "audio_locucion": "Narración completa derivada de p4_secciones.introduccion para esta escena",
            "audio_musica": "Music style and volume %",
            "audio_sfx": "SFX description with timing",
            "notas_camara": "tripod|handheld",
            "notas_transicion": "cut|dissolve|wipe",
            "notas_duracion": "duration in seconds",
            "notas_color": "color grading notes"
          },
          ...9 rows total matching the 9 required names
        ]
      }

  - agent: agente_tecnico_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_p3]
    include_template: false
    task: |
      SAME AS AGENT A. APPLY SAME AUDIO LOCUCIÓN RULE (full verbatim narration per scene from p4_secciones), SAME STRICT TABLE SCHEMA (all 10 fields mandatory), AND SAME UNIQUENESS RULE (no two audio_locucion fields share more than 10 consecutive words).
      DIFFERENT: Add b_roll_sugerencias field with 1-2 B-roll ideas per scene derived from p4_secciones.conceptos_clave.
      STRICT RULE: Use exactly the 9 required scene names in order.
      OUTPUT ONLY THIS JSON:
      {"guion_tecnico": [{"escena": "Apertura-Gancho", "imagen_tipo_plano": "...", "audio_locucion": "narración completa...", ...9 rows with b_roll_sugerencias}]}

  - agent: juez_tecnico
    model: "qwen2.5:14b"
    inputs_from: [agente_tecnico_A, agente_tecnico_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER AND STRICT AUDITOR. DO NOT CONVERSE. DO NOT SYNTHESIZE OR MERGE.
      
      Compare the Guion Técnico from A and B. 
      Select the BEST ONE based on:
      1. NO empty fields, nulls, or "undefined".
      2. Exactly 9 rows matching the required scenes.
      3. Specificity in "imagen_descripcion" holding true to the P4 content.
      4. LANGUAGE CHECK: ALL field values must be in Spanish. If any field (especially "notas_color", "imagen_descripcion", "audio_sfx") contains English text, that output FAILS the language check. Prefer the output with fewer or no English values.
      5. UNIQUENESS CHECK: Prefer the output where no two "audio_locucion" fields share more than 10 consecutive words. Duplicated narrations are a critical deficiency.
      
      VETO CRITERIA — Output "RECHAZADO" ONLY IF BOTH of the following are true for BOTH A and B:
      1. Both have NULL, empty strings, or "undefined" in 3 or more fields per row.
      2. OR both have fewer than 9 rows.
      3. OR both use wrong scene names that don't match the 9 required names.
      If RECHAZADO, "razon" MUST describe the specific failure so the agents can correct it.
      
      OUTPUT ONLY THIS EXACT JSON:
      {"seleccion": "A" | "B" | "RECHAZADO", "razon": "1-line explanation"}

  # ═══════════════════════════════════════════════════════════════════════
  # SECCIÓN 5: STORYBOARD
  # ═══════════════════════════════════════════════════════════════════════
  - agent: agente_storyboard_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_p3]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      ROLE: Production Director. TASK: Generate STORYBOARD as array of 4 scene objects.
      
      STORYBOARD SCOPE NOTE: This storyboard is REFERENTIAL — it describes visual scenes in text form for planning purposes only.
      A professional graphic designer or animator must convert it into actual visual boards before production.
      Its purpose is to guide the production team conceptually, not to replace professional pre-production visuals.
      
      LANGUAGE: ALL field VALUES MUST be written in SPANISH. JSON keys stay in English.
      
      "subject" RULE: MUST be a concrete noun describing WHO or WHAT is being filmed.
      Derive from p4_secciones content for the matching scene topic.
      Examples: "Instructor demostrando el procedimiento sobre el equipo de trabajo", "Herramienta posicionada en el punto de aplicación", "Resultado final mostrando el criterio de calidad esperado".
      FORBIDDEN: null, undefined, empty string, or repeating the scene name verbatim.
      If uncertain, use the most relevant tool or material from p4_secciones.
      
      OUTPUT ONLY THIS JSON:
      {
        "storyboard": [
          {
            "escena": "Apertura",
            "framing": "shot type, angle, distance",
            "subject": "concrete noun: who/what is filmed, derived from p4_secciones",
            "lighting": "direction, quality (hard/soft), color temp",
            "environment": "background, setting, props",
            "color_palette": "dominant colors, contrast level",
            "composition": "rule of thirds, leading lines, depth"
          },
          ...4 scenes total (Apertura, Concepto Principal, Ejemplo Práctico, Cierre)
        ]
      }

  - agent: agente_storyboard_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_p3]
    include_template: false
    task: |
      SAME AS AGENT A. DIFFERENT: add "mood" and "camera_movement" fields. Choose most visually striking moment.
      OUTPUT ONLY THIS JSON:
      {"storyboard": [{"escena": "...", "framing": "...", ..., "mood": "...", "camera_movement": "..."}, ...4 scenes]}

  - agent: juez_storyboard
    model: "qwen2.5:14b"
    inputs_from: [agente_storyboard_A, agente_storyboard_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER AND STRICT AUDITOR. DO NOT CONVERSE. DO NOT SYNTHESIZE OR MERGE.
      
      Compare the Storyboard from A and B. 
      Select the BEST ONE based on:
      1. AI-prompt readiness: Highly descriptive fields.
      2. No missing fields, no english values.
      3. Exactly 4 scenes.
      
      VETO CRITERIA — Output "RECHAZADO" ONLY IF BOTH of the following are true for BOTH A and B:
      1. Both have fewer than 4 scenes.
      2. OR both have "subject" fields that are null, "undefined", or repeat the scene name verbatim.
      If RECHAZADO, "razon" MUST describe the specific failure so the agents can correct it.
      
      OUTPUT ONLY THIS EXACT JSON:
      {"seleccion": "A" | "B" | "RECHAZADO", "razon": "1-line explanation"}

  # ═══════════════════════════════════════════════════════════════════════
  # ASSEMBLER
  # ═══════════════════════════════════════════════════════════════════════
  - agent: ensamblador_doc_p3
    model: "qwen2.5:14b"
    inputs_from: [juez_ficha, juez_escaleta, juez_literario, juez_tecnico, juez_storyboard]
    include_template: false
    task: "CÓDIGO - Assembly in p3-document.assembler.ts (The assembler MUST read the 'seleccion' boolean output of each judge and extract the raw JSON array from the winning agent's output)"
---