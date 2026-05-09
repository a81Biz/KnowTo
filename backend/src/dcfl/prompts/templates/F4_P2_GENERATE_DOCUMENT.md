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
      
      ANTI-LOOP RULE (REFORZADO):
      Antes de escribir la diapositiva N, escribe internamente esta lista de verificación:
        "Diapositivas ya escritas: [titulo_1], [titulo_2], ... [titulo_N-1]"
      Si el tema de la nueva diapositiva ya aparece en esa lista (mismo concepto, técnica, o sección), SALTA a la siguiente sección de p4_secciones sin crear la diapositiva duplicada.
      PROHIBIDO: mismo concepto principal, misma técnica, o misma sección de P4 cubierta en dos diapositivas distintas.
      EJEMPLO DE DUPLICACIÓN PROHIBIDA: "Concepto X" en slide 4 Y "Técnica: Concepto X" en slide 8 → PROHIBIDO (mismo tema cubierto dos veces).
      La ZERO LOSS RULE tiene prioridad: cubre TODAS las secciones únicas del P4, pero NUNCA repitas la misma sección dos veces.
      
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
      APPLY SAME ANTI-LOOP RULE: before writing slide N, list internally all previous slide titles. If the topic already appears in a prior slide, SKIP it and move to the next P4 section.
      
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
      
      VETO CRITERIA — Output "RECHAZADO" ONLY IF BOTH of the following are true for BOTH A and B:
      1. Both outputs have fewer than 5 slides total.
      2. Both outputs have nota_facilitador.diga fields with an average length under 15 words.
      If RECHAZADO, "razon" MUST describe the specific shared deficiency so the agents can correct it.
      
      OUTPUT ONLY THIS JSON:
      {"seleccion": "A" | "B" | "RECHAZADO", "razon": "one-line explanation"}

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
      
      MATERIALES RULE (STRICT):
      "materiales" MUST be copied VERBATIM from p4_secciones.ejercicio_practico.
      FORBIDDEN: adding, substituting, or inventing materials not listed in p4_secciones.
      If p4_secciones.ejercicio_practico does not list materials, use p4_secciones.desarrollo as fallback.
      NEVER use materials from prior course modules or from general domain knowledge.
      
      MINIMUM ACTIVITIES: Generate AT LEAST 2 activities per module. A single activity is never enough for effective learning — always include at least a warm-up activity AND the core practice activity.
      TIME CONSTRAINT: each activity MUST be "15 min", "20 min", "30 min", or "45 min". Total across all activities MUST NOT exceed "90 min" (1.5 hours).
      FORBIDDEN: activities longer than 60 min. FORBIDDEN: activities with total time exceeding 90 min. FORBIDDEN: a single activity for the entire module.
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
      VETO CRITERIA — Output "RECHAZADO" ONLY IF ALL of the following are true for BOTH A and B:
      1. Total activity time exceeds 120 min in both outputs.
      2. "instrucciones" arrays in both outputs contain abstract descriptions instead of executable actions.
      If RECHAZADO, "razon" MUST describe the specific shared deficiency so the agents can correct it.
      
      OUTPUT: {"seleccion": "A"|"B"|"RECHAZADO", "razon": "one-line"}

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
      "puente.facilitador_dice" MUST always be present — never null, undefined, or empty string.
      - If a next module exists: name it explicitly ("En el siguiente módulo exploraremos [nombre_modulo_siguiente], donde [breve_descripcion_de_lo_que_vendra]. Les pido que vengan preparados con [material_o_prerequisito] para continuar nuestro aprendizaje.").
      - If this is the LAST module: "¡Han concluido todos los módulos de este programa! Felicitaciones por su esfuerzo y dedicación. Recuerden aplicar en su práctica diaria todo lo que aprendieron hoy."
      FALLBACK OBLIGATORIO: Si no tienes información del siguiente módulo, usa esta plantilla exacta:
        "Hemos concluido este módulo. En el siguiente profundizaremos en los conceptos que hemos visto hoy y exploraremos nuevas técnicas. Los espero con los materiales listos."
      FORBIDDEN: "undefined", empty string, null, cadena vacía, transiciones genéricas sin tema específico.
      "puente.slide_muestra" MUST be a specific on-screen text or visual description — never empty.
      
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
      SAME AS AGENT A INCLUDING THE MANDATORY FALLBACK FOR puente.facilitador_dice. ADD: "autoevaluacion" (1 question from P4 ejercicio_practico), "vista_previa" (image description from next chapter), "recursos_adicionales" (QR/link from P4 lecturas_complementarias).
      OUTPUT ONLY THIS JSON:
      {"cierre_transicion": {"puntos_clave": [...], "puente": {...}, "mensaje_final": "...", "autoevaluacion": "...", "vista_previa": "...", "recursos_adicionales": "..."}}

  - agent: juez_cierre
    model: "qwen2.5:14b"
    inputs_from: [agente_cierre_A, agente_cierre_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. Compare CLOSING objects.
      SELECTION: from P4, memorable, self-assessment included, resources.
      VETO CRITERIA — Output "RECHAZADO" ONLY IF BOTH of the following are true for BOTH A and B:
      1. Both have null, empty string, or "undefined" in puente.facilitador_dice.
      2. Both have fewer than 3 puntos_clave entries.
      If RECHAZADO, "razon" MUST describe the specific shared deficiency so the agents can correct it.
      
      OUTPUT: {"seleccion": "A"|"B"|"RECHAZADO", "razon": "one-line"}

  # ═══════════════════════════════════════════════════════════════════════
  # ASSEMBLER
  # ═══════════════════════════════════════════════════════════════════════
  - agent: ensamblador_doc_p2
    model: "qwen2.5:14b"
    inputs_from: [juez_presentacion, juez_actividades, juez_cierre]
    include_template: false
    task: "CÓDIGO - Assembly in p2-document.assembler.ts"
