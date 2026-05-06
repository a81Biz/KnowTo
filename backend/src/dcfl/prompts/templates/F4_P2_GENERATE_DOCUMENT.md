---
id: F4_P2_GENERATE_DOCUMENT
name: Generador de Presentación Electrónica — Por Módulo
version: 7.0.0
tags: [EC0366, presentacion, slides, facilitador, json-structured]
pipeline_steps:

  # ── EXTRACTOR ────────────────────────────────────────────────────────────
  - agent: extractor_p2
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      
      You receive pre-structured JSON data in userInputs. DO NOT parse or summarize — map it verbatim.
      
      FIELDS IN userInputs:
      - "presentacion_unidad_N": slide design text from form (string)
      - "_modulo_actual": module number (integer)
      - "_nombre_modulo": human-readable module name (string)
      - "p3_escaleta": JSON array with P3 escaleta rows (already structured — pass through as-is)
      - "p3_guion_literario": JSON array with P3 literary script blocks (already structured — pass through as-is)
      - "p4_secciones": JSON object with P4 chapter sections (already structured — pass through as-is)
      
      OUTPUT ONLY VALID JSON:
      {
        "modulo": {_modulo_actual},
        "nombre": "{_nombre_modulo}",
        "contenido_form": "{presentacion_unidad_N verbatim}",
        "p3_guion": {
          "escaleta": {p3_escaleta as-is},
          "literario": {p3_guion_literario as-is}
        },
        "p4_secciones": {p4_secciones as-is}
      }

  # ═══════════════════════════════════════════════════════════════════════
  # SECCIÓN 1: PRESENTACIÓN COMPLETA (Agente Maestro Unificado)
  # ═══════════════════════════════════════════════════════════════════════
  - agent: agente_presentacion_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_p2]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. OUTPUT ONLY RAW JSON.
      
      Crea la Presentación Electrónica completa basándote en {p4_secciones} y sincronizándola con p3_guion.escaleta y p3_guion.literario.
      
      REGLA DE LONGITUD DINÁMICA (ZERO LOSS):
      - Crea TANTAS diapositivas como sean necesarias para abarcar el 100% de {p4_secciones} sin omitir nada.
      - Una diapositiva por sección del P4 (introduccion, marco_teorico, cada concepto_clave, cada paso de desarrollo, ejemplo_practico, ejercicio_practico, puntos_recordar).
      - PROHIBIDO hacer muros de texto en 'slide.contenido' — usa viñetas breves (máx. 6 palabras por viñeta).
      - La 'nota_facilitador.diga' debe contener TODA la profundidad técnica: si el P4 menciona 10 pasos, el facilitador los dice todos.
      
      TIME SCALE RULE:
      - El tiempo total de la presentación es {contenido_form} (busca el patrón "X min").
      - Distribución sugerida: ~1 diapositiva por cada 2-3 minutos de duración.
      
      SYNCHRONIZATION RULE:
      - Verifica p3_guion.escaleta: si hay una escena "Concepto_1" en la escaleta, debe existir una diapositiva correspondiente.
      - El guion del facilitador (diga) debe ser coherente con p3_guion.literario para ese marcador.
      
      OUTPUT ONLY THIS JSON:
      {
        "presentacion_completa": [
          {
            "numero": 1,
            "slide": {
              "titulo": "Título breve de la diapositiva",
              "contenido": "• Viñeta 1\n• Viñeta 2\n• Viñeta 3",
              "tipo": "texto|comparacion|diagrama|apertura|cierre"
            },
            "nota_facilitador": {
              "diga": "El guion exacto y detallado que el instructor leerá, conservando los términos técnicos del P4.",
              "pregunte": "Pregunta de interacción para los participantes",
              "haga": "Instrucción de dinámica o actividad"
            },
            "recurso_visual": {
              "tipo": "photo|diagram|illustration|animation|comparison",
              "descripcion": "Descripción detallada del visual derivado del P4 para apoyar la diapositiva"
            }
          }
        ]
      }

  - agent: agente_presentacion_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_p2]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. OUTPUT ONLY RAW JSON.
      
      SAME TASK AS AGENT A: Create the complete presentation from {p4_secciones}.
      APPLY SAME ZERO LOSS RULE: same slide count, same coverage of all P4 sections, same word depth in nota_facilitador.diga.
      
      DIFFERENT PEDAGOGICAL STYLE — use the "I do, we do, you do" framework:
      - Slides with "Marco Teórico" → nota_facilitador.diga starts with "Yo les muestro..."
      - Slides with "Ejemplo_practico" → nota_facilitador.diga starts with "Ahora lo hacemos juntos..."
      - Slides with "Ejercicio_practico" → nota_facilitador.diga starts with "Ahora ustedes intentan..."
      
      ADD "layout" field to each slide: "texto" | "comparacion" | "diagrama" | "antes_despues".
      ADD "mood" field to each recurso_visual: energetic, calm, instructional, collaborative.
      
      OUTPUT ONLY THIS JSON (same structure as A with extra fields):
      {
        "presentacion_completa": [
          {
            "numero": 1,
            "slide": {"titulo": "...", "contenido": "...", "tipo": "...", "layout": "..."},
            "nota_facilitador": {"diga": "...", "pregunte": "...", "haga": "..."},
            "recurso_visual": {"tipo": "...", "descripcion": "...", "mood": "..."}
          }
        ]
      }

  - agent: juez_presentacion
    model: "qwen2.5:14b"
    inputs_from: [agente_presentacion_A, agente_presentacion_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. DO NOT CONVERSE. DO NOT SYNTHESIZE OR MERGE.
      
      Compare presentacion_completa from A and B.
      SELECTION CRITERIA (apply in order, first failure eliminates):
      1. ZERO LOSS: Which agent covered MORE sections of p4_secciones without omitting content?
      2. DEPTH: Which agent's nota_facilitador.diga entries are longer and more specific?
      3. STRUCTURE: Does every slide have slide, nota_facilitador, AND recurso_visual filled?
      
      OUTPUT ONLY THIS JSON:
      {"seleccion": "A" | "B", "razon": "one-line explanation"}

  # ═══════════════════════════════════════════════════════════════════════
  # SECCIÓN 2: ACTIVIDADES DIDÁCTICAS
  # ═══════════════════════════════════════════════════════════════════════
  - agent: agente_actividades_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_p2]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      ROLE: Active Learning Designer. TASK: Generate DIDACTIC ACTIVITIES as array.
      
      INPUT: p4_secciones
      
      Core activity FROM p4_secciones.ejercicio_practico.
      Add warm-up FROM p4_secciones.introduccion.
      Add reflection FROM p4_secciones.puntos_recordar.
      
      TIME CONSTRAINT: each activity MUST be "15 min", "20 min", "30 min", or "45 min". Total across all activities MUST NOT exceed "90 min" (1.5 hours).
      FORBIDDEN: activities longer than 60 min. FORBIDDEN: activities with total time exceeding 90 min.
      "instrucciones": each step MUST be a concrete action the facilitator can execute. Minimum 2 steps, maximum 5.
      
      OUTPUT ONLY THIS JSON:
      {
        "actividades": [
          {
            "nombre": "string derived from P4",
            "duracion": "minutes",
            "instrucciones": ["step 1", "step 2"],
            "materiales": ["item 1", "item 2"],
            "resultado_esperado": "string"
          }
        ]
      }

  - agent: agente_actividades_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_p2]
    include_template: false
    task: |
      SAME AS AGENT A. ADD for each activity:
      - "versiones": {"pares": "...", "grupos_pequenos": "...", "individual": "...", "virtual": "..."}
      - "gestion_tiempo": {"si_falta": "...", "si_sobra": "..."}
      OUTPUT ONLY THIS JSON:
      {"actividades": [{"nombre": "...", "duracion": "...", "instrucciones": [...], "materiales": [...], "resultado_esperado": "...", "versiones": {...}, "gestion_tiempo": {...}}]}

  - agent: juez_actividades
    model: "qwen2.5:14b"
    inputs_from: [agente_actividades_A, agente_actividades_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. Compare ACTIVITIES.
      SELECTION (apply in order, first failure eliminates):
      1. TIME: total activity time ≤ 90 min. If exceeds → auto-select other.
      2. SINGLE ACTIVITY MAX: no single activity > 60 min. If any exceeds → auto-select other.
      3. CONCRETE STEPS: each actividad has 2-5 instrucciones that are executable actions, not abstract descriptions.
      4. P4 ALIGNMENT: activities derive from p4_secciones.ejercicio_practico.
      OUTPUT: {"seleccion": "A"|"B", "razon": "one-line"}

  # ═══════════════════════════════════════════════════════════════════════
  # SECCIÓN 3: CIERRE Y TRANSICIÓN
  # ═══════════════════════════════════════════════════════════════════════
  - agent: agente_cierre_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_p2]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      ROLE: Instructional Designer. TASK: Generate CLOSING as structured object.
      
      INPUT: p4_secciones
      
      Derive from P4 "Puntos a Recordar" and "Lecturas Complementarias".
      
      MANDATORY:
      "puente.facilitador_dice" MUST be a complete sentence naming the next module's topic specifically. FORBIDDEN: "undefined", empty, generic phrases without a topic name.
      "puente.slide_muestra" MUST be a specific on-screen text or visual description.
      
      OUTPUT ONLY THIS JSON:
      {
        "cierre_transicion": {
          "puntos_clave": ["takeaway from P4", "takeaway from P4", "takeaway from P4"],
          "puente": {
            "facilitador_dice": "transition words",
            "slide_muestra": "on-screen teaser"
          },
          "mensaje_final": "motivational closing"
        }
      }

  - agent: agente_cierre_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_p2]
    include_template: false
    task: |
      SAME AS AGENT A. ADD: "autoevaluacion" (1 question from P4 ejercicio_practico), "vista_previa" (image description from next chapter), "recursos_adicionales" (QR/link from P4 lecturas_complementarias).
      OUTPUT ONLY THIS JSON:
      {"cierre_transicion": {"puntos_clave": [...], "puente": {...}, "mensaje_final": "...", "autoevaluacion": "...", "vista_previa": "...", "recursos_adicionales": "..."}}

  - agent: juez_cierre
    model: "qwen2.5:14b"
    inputs_from: [agente_cierre_A, agente_cierre_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. Compare CLOSING objects.
      SELECTION: from P4, memorable, self-assessment included, resources.
      OUTPUT: {"seleccion": "A"|"B", "razon": "one-line"}

  # ═══════════════════════════════════════════════════════════════════════
  # ASSEMBLER
  # ═══════════════════════════════════════════════════════════════════════
  - agent: ensamblador_doc_p2
    model: "qwen2.5:14b"
    inputs_from: [juez_presentacion, juez_actividades, juez_cierre]
    include_template: false
    task: "CÓDIGO - Assembly in p2-document.assembler.ts"
