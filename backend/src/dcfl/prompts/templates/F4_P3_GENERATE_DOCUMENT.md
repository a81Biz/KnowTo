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
      - "p4_secciones": JSON object with P4 chapter sections (already structured — pass through as-is)
      
      Extract "duracion" from guion_unidad_N (look for a pattern like "5 min", "10 min"). Default: "5 min".
      
      OUTPUT ONLY VALID JSON:
      {
        "modulo": {_modulo_actual},
        "nombre": "{_nombre_video}",
        "ficha_tecnica_form": "{guion_unidad_N verbatim}",
        "duracion": "extracted or default '5 min'",
        "p4_secciones": {p4_secciones as-is}
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
      
      OUTPUT ONLY THIS JSON:
      {
        "ficha_tecnica": {
          "modulo": "MUST be exactly the value of {nombre}.",
          "objetivo_aprendizaje": "Acción observable. STRICT RULE: PROHIBIDO USAR la raíz de las palabras: aprender, comprender, entender, saber, conocer.",
          "duracion": "{duracion}",
          "recursos": ["Format: Array de STRINGS SIMPLES. Ej: 'Animación 2D', 'Close-up'. PROHIBIDO devolver objetos JSON."],
          "equipamiento": "Menciona solo objetos físicos reales (ej. Pinturas, Pinceles, Agua).",
          "perfil_talento": "Narrador/actor sugerido..."
        }
      }

  - agent: agente_ficha_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_p3]
    include_template: false
    task: |
      SAME AS AGENT A. DIFFERENT: vary the "perfil_talento" and "equipamiento" suggestions.
      OUTPUT ONLY THIS JSON:
      {
        "ficha_tecnica": {
          "modulo": "MUST be exactly the value of {nombre}.",
          "objetivo_aprendizaje": "Acción observable. STRICT RULE: PROHIBIDO USAR la raíz de las palabras: aprender, comprender, entender, saber, conocer.",
          "duracion": "{duracion}",
          "recursos": ["Format: Array de STRINGS SIMPLES. Ej: 'Animación 2D', 'Close-up'. PROHIBIDO devolver objetos JSON."],
          "equipamiento": "Menciona solo objetos físicos reales (ej. Pinturas, Pinceles, Agua).",
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
      
      OUTPUT ONLY THIS EXACT JSON (Choose ONLY 'A' or 'B'):
      {"seleccion": "A", "razon": "1-line explanation"}

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
      
      OUTPUT ONLY THIS EXACT JSON (Choose ONLY 'A' or 'B'):
      {"seleccion": "B", "razon": "1-line explanation"}

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
      IT IS STRICTLY FORBIDDEN to summarize or generalize the P4 content. If the P4 manual mentions specific tools, physical steps, materials, or technical names (e.g., 'veladuras', 'pincel seco'), YOU MUST USE THOSE EXACT WORDS in the spoken narration.
      
      STRICT SCHEMA — YOU MUST NOT INVENT OR RENAME MARCADORES. Output exactly these 9 rows:
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
      OUTPUT ONLY THIS JSON:
      {"guion_literario": [{"marcador": "Apertura-Gancho", "texto": "..."}, {"marcador": "Agenda", "texto": "..."}, {"marcador": "Concepto_1", "texto": "..."}, {"marcador": "Ejemplo_1", "texto": "..."}, {"marcador": "Concepto_2", "texto": "..."}, {"marcador": "Ejemplo_2", "texto": "..."}, {"marcador": "Practica_guiada", "texto": "..."}, {"marcador": "Error_comun", "texto": "..."}, {"marcador": "Cierre", "texto": "..."}]}

  - agent: juez_literario
    model: "qwen2.5:14b"
    inputs_from: [agente_literario_A, agente_literario_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER AND STRICT AUDITOR. DO NOT CONVERSE. DO NOT SYNTHESIZE OR MERGE.
      
      Compare the Guion Literario from A and B. 
      CRITICAL FIDELITY CHECK: Read the "texto" fields. Which agent actually used specific technical terms, tools, and examples from the P4? If an agent wrote generic fluff like "el contraste es clave" without explaining the specific technique, it loses.
      
      Select the BEST ONE based on:
      1. Highest retention of specific technical details from the source.
      2. Conversational tone.
      3. Exactly 9 required rows.
      
      OUTPUT ONLY THIS EXACT JSON (Choose ONLY 'A' or 'B'):
      {"seleccion": "A", "razon": "1-line explanation"}

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
      
      STRICT RULE: The "escena" field MUST MATCH EXACTLY these 9 names in this order: Apertura-Gancho, Agenda, Concepto_1, Ejemplo_1, Concepto_2, Ejemplo_2, Practica_guiada, Error_comun, Cierre. DO NOT invent new scene names.
      
      MANDATORY: EVERY field must be filled with specific data. "notas_duracion" MUST be a number followed by "s". "notas_color" MUST exist.
      
      OUTPUT ONLY THIS JSON:
      {
        "guion_tecnico": [
          {
            "escena": "Apertura-Gancho",
            "imagen_tipo_plano": "close_up|medium_shot|wide_shot|insert_shot|split_screen",
            "imagen_descripcion": "What camera sees: elements, lighting setup, text overlays, animation type",
            "audio_locucion": "First and last 10 words of narration for this scene",
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
      SAME AS AGENT A. DIFFERENT: Add b_roll_sugerencias field with 1-2 B-roll ideas per scene derived from p4_secciones.conceptos_clave.
      STRICT RULE: Use exactly the 9 required scene names in order.
      OUTPUT ONLY THIS JSON:
      {"guion_tecnico": [{"escena": "Apertura-Gancho", "imagen_tipo_plano": "...", ...9 rows with b_roll_sugerencias}]}

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
      
      OUTPUT ONLY THIS EXACT JSON (Choose ONLY 'A' or 'B'):
      {"seleccion": "B", "razon": "1-line explanation"}

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
      
      LANGUAGE: ALL 6 field VALUES MUST be written in SPANISH. JSON keys stay in English.
      
      OUTPUT ONLY THIS JSON:
      {
        "storyboard": [
          {
            "escena": "Apertura",
            "framing": "shot type, angle, distance",
            "subject": "what/who, position, action",
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
      
      OUTPUT ONLY THIS EXACT JSON (Choose ONLY 'A' or 'B'):
      {"seleccion": "B", "razon": "1-line explanation"}

  # ═══════════════════════════════════════════════════════════════════════
  # ASSEMBLER
  # ═══════════════════════════════════════════════════════════════════════
  - agent: ensamblador_doc_p3
    model: "qwen2.5:14b"
    inputs_from: [juez_ficha, juez_escaleta, juez_literario, juez_tecnico, juez_storyboard]
    include_template: false
    task: "CÓDIGO - Assembly in p3-document.assembler.ts (The assembler MUST read the 'seleccion' boolean output of each judge and extract the raw JSON array from the winning agent's output)"
---