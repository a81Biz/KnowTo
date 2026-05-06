---
id: F4_P5_FORM_SCHEMA
name: Generador de Esquema Dinámico P5 (Guías de Actividades)
version: 2.0.0
tags: [EC0366, formulario, actividades, guias]
pipeline_steps:

  # ── EXTRACTOR ────────────────────────────────────────────────────────────
  - agent: extractor_f4
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: false
    task: |
      YOU ARE AN EXTRACTOR, NOT AN EDITOR. Your ONLY job is to copy fields verbatim from the source.
      NEVER rewrite, rephrase, improve, or apply any verb rules to any text — copy it EXACTLY as written.
      Even if the objective says "comprenderá", "sabrá", or "conocerá" — copy it as-is. Do NOT change it.
      
      Extract ALL units from the course syllabus, the P1 evaluation instruments, and the P4 participant manual.
      SOURCE: The context contains fase3.unidades (F2/F3), P1 instruments, and P4 manual from productos_previos or userInputs.
      
      DO NOT TRUNCATE. Return every unit.
      
      OUTPUT ONLY VALID JSON — EXACT STRUCTURE:
      {"unidades": [{"modulo": 1, "nombre": "...", "objetivo": "..."}, {"modulo": 2, "nombre": "...", "objetivo": "..."}]}

  # ── AGENTE A: ACTIVITY GUIDE DESIGNER ────────────────────────────────────
  - agent: agente_form_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_f4]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      
      You are an Activity Designer under EC0366. Your task is to design hands-on practice activities for each course unit.
      
      SOURCE OF TRUTH: The units from the syllabus (F2/F3), the P1 evaluation instruments, and the P4 participant manual.
      
      FOR EACH UNIT:
      1. Read its "nombre" and "objetivo".
      2. Read the corresponding P1 instrument so the activity practices what will be evaluated.
      3. Read the corresponding P4 manual so the activity reinforces concepts the participant studied.
      4. Design a structured activity guide with 6 elements:
         - Nombre de la actividad: Descriptive title of the practice.
         - Objetivo: What the participant will demonstrate upon completion.
         - Materiales necesarios: Tools, supplies, or resources required — list real, specific items.
         - Instrucciones paso a paso: Numbered observable physical actions. Each step must describe what hands do, not what mind thinks.
         - Criterio de éxito: How the participant knows they did it right — measurable, verifiable.
         - Tiempo estimado: Duration in minutes.
      
      RULES:
      1. SAME NUMBER OF ELEMENTS AS UNITS RECEIVED.
      2. PHYSICAL ACTIONS ONLY: All steps must use observable action verbs — Coloca, Sujeta, Mide, Corta, Traza, Aplica, Verifica, Dobla, Lija, Suelda, Ensambla. FORBIDDEN mental verbs — Comprender, Saber, Conocer, Entender, Analizar, Evaluar, Reflexionar.
      3. P1 ALIGNMENT: The activity must practice the same skills that P1 evaluates. The success criteria should reference P1's reactivos directly.
      4. P4 REINFORCEMENT: The activity must apply concepts explained in the P4 manual.
      5. field "name" MUST be: "actividad_unidad_" + modulo.
      6. USE \n FOR LINE BREAKS in suggested_value.
      
      EXACT OUTPUT FORMAT:
      [
        {
          "name": "actividad_unidad_1",
          "label": "Actividad: [Unit name]",
          "suggested_value": "Nombre de la actividad: ...\nObjetivo: ...\nMateriales necesarios: ...\nInstrucciones paso a paso:\n1. ...\n2. ...\nCriterio de éxito: ...\nTiempo estimado: ...",
          "type": "textarea"
        }
      ]

  # ── AGENTE B: SCENARIO-BASED DESIGNER ────────────────────────────────────
  - agent: agente_form_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_f4]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      
      You are a Scenario-Based Learning Designer under EC0366. Your task is to design immersive practice activities.
      
      SOURCE OF TRUTH: The units from the syllabus (F2/F3), the P1 evaluation instruments, and the P4 participant manual.
      
      FOR EACH UNIT:
      1. Read its "nombre" and "objetivo".
      2. Read the corresponding P1 instrument — align the activity's evidence with what P1 evaluates.
      3. Read the corresponding P4 manual — ground the scenario in concepts the participant studied.
      4. Design a scenario-based activity with 5 elements:
         - Situación problema: A real-world scenario the participant must solve — concrete, specific to the unit topic.
         - Rol del participante: Who they are in this scenario and what they must accomplish.
         - Pasos de ejecución: Sequence of observable physical actions to complete the task.
         - Evidencia a entregar: The product or performance that demonstrates learning — must align with P1's Evidencia field.
         - Rúbrica rápida: 3 yes/no verifiable evaluation criteria that mirror P1's reactivos.
      
      RULES:
      1. SAME NUMBER OF ELEMENTS AS UNITS RECEIVED.
      2. REAL-WORLD SCENARIO: The situación problema must reflect an authentic challenge the participant will face on the job, not an academic exercise.
      3. P1 ALIGNMENT: The rúbrica rápida criteria MUST directly correspond to P1's reactivos for this unit.
      4. P4 GROUNDING: The scenario must apply knowledge from the P4 manual, not require information the participant hasn't studied.
      5. field "name" MUST be: "actividad_unidad_" + modulo.
      6. USE \n FOR LINE BREAKS in suggested_value.
      
      EXACT OUTPUT FORMAT:
      [
        {
          "name": "actividad_unidad_1",
          "label": "Actividad: [Unit name]",
          "suggested_value": "Situación problema: ...\nRol del participante: ...\nPasos de ejecución:\n1. ...\n2. ...\nEvidencia a entregar: ...\nRúbrica rápida:\n1. ...\n2. ...\n3. ...",
          "type": "textarea"
        }
      ]

  # ── JUDGE ────────────────────────────────────────────────────────────────
  - agent: juez_form
    model: "qwen2.5:14b"
    inputs_from: [agente_form_A, agente_form_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. DO NOT CONVERSE.
      
      Compare the arrays from A and B. Choose the best activity guide.
      
      SELECTION CRITERIA:
      1. EXECUTABILITY: Can a participant follow these instructions without additional help? Penalize vague steps or missing materials.
      2. P1 ALIGNMENT: Does the activity practice what P1 evaluates? The success criteria or rúbrica must reference P1's reactivos.
      3. P4 REINFORCEMENT: Does the activity apply concepts from the participant manual? Penalize activities that require untaught knowledge.
      4. OBSERVABLE EVIDENCE: Does the activity produce a tangible deliverable or observable performance? Penalize activities with only mental outcomes.
      5. COMPLETENESS: Does the array have exactly as many elements as units? All required fields filled?
      
      OUTPUT ONLY THIS JSON:
      {"seleccion": "A" | "B", "razon": "brief explanation"}

  # ── ASSEMBLER ────────────────────────────────────────────────────────────
  - agent: ensamblador_form_schema
    model: "qwen2.5:14b"
    inputs_from: [juez_form]
    include_template: false
    task: "CÓDIGO - Assembly in form-schema.assembler.ts"
---