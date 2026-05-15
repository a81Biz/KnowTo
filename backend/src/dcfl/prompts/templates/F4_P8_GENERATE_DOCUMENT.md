---
id: F4_P8_GENERATE_DOCUMENT
name: Generador de Cronograma de Desarrollo — Por Módulo
version: 3.0.0
tags: [EC0366, cronograma, desarrollo, json-structured]
pipeline_steps:

  # ── EXTRACTOR ────────────────────────────────────────────────────────────
  - agent: extractor_p8
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      
      Extract from userInputs the data for ONE single module.
      
      FIELDS:
      - "cronograma_unidad_N" (where N is _modulo_actual) — main schedule content
      - "fecha_inicio_produccion" — production start date (REQUIRED for date anchoring)
      - "fecha_inicio_formacion" — training program start date (REQUIRED for Programa de Formación section)
      - "lugar_imparticion" — training location (classroom, online platform, etc.)
      - "modalidad_imparticion" — Presencial / Virtual / Híbrido
      - "numero_grupos" — number of groups or candidates
      - "_modulo_actual", "_nombre_modulo"
      Check "productos_previos.P6" for the training calendar (P6 partes/modulo_N fecha fields).
      
      DOMAIN CONTEXT: Extract for domain-specific risk analysis:
      - "dominio_curso" = Take it from THIS PRIORITY ORDER:
          1. context.projectName (most reliable — the actual course name)
          2. fase3.unidades[0].nombre if available
          3. _nombre_modulo as last resort
        NEVER use capitulos[0].nombre — chapter names may be "Introducción a..." which is not the domain.
      - "materiales_curso" = first 3 items from productos_previos.P4.inventario_materiales (physical items, if available)
      
      DATE RULE: If "fecha_inicio_produccion" is present, compute this module's production start date by
      adding (modulo - 1) * estimated_production_days_per_unit to fecha_inicio_produccion. 
      Assume 5 business days per unit. Return as "fecha_inicio_modulo" (DD/MM/YYYY).
      If absent, set to null.
      
      OUTPUT ONLY VALID JSON:
      {
        "modulo": 1,
        "nombre": "string",
        "contenido_form": "verbatim text",
        "fecha_inicio_produccion": "DD/MM/YYYY or null",
        "fecha_inicio_modulo": "DD/MM/YYYY or null",
        "fecha_inicio_formacion": "DD/MM/YYYY or null",
        "calendario_p6": "excerpts from P6 for this module or null",
        "productos_previos": {
          "P4": "excerpts for page counts",
          "P3": "excerpts for scenes"
        }
      }

  # ═══════════════════════════════════════════════════════════════════════
  # SECCIÓN 1: HITOS Y TAREAS
  # ═══════════════════════════════════════════════════════════════════════
  - agent: agente_hitos_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_p8]
    include_template: false
    task: |
      ROLE: Project Manager. TASK: Define milestones with real calendar dates.
      
      DATE ANCHORING: Use "fecha_inicio_modulo" from extractor as the first real production date for this module.
      CRITICAL RULE 1: Never invent past dates. Assume the current year is 2026. Do NOT use dates from 2023 or 2024.
      CRITICAL RULE 2: ABSOLUTELY NO TEMPLATE ENGINE CODE. DO NOT output tags like {{calcular_fecha_entrega}}. YOU must do the math mentally and output ONLY the final text (e.g., "15/05/2026" or "Día 3").
      If "fecha_inicio_modulo" is not null, compute each task's "inicio" and "entrega" as real DD/MM/YYYY dates.
      If null, use relative notation (Día 1, Día 5, etc.).
      
      PROGRAMA DE FORMACION: If "fecha_inicio_formacion" is not null, include it as the final milestone:
      {"tarea": "Inicio de la formación con participantes", "inicio": "{fecha_inicio_formacion}", "entrega": "{fecha_inicio_formacion}", "responsable": "Coordinador"}
      
      OUTPUT ONLY THIS JSON:
      {
        "hitos": [
          {"tarea": "Task name", "inicio": "DD/MM/YYYY or Día X", "entrega": "DD/MM/YYYY or Día Y", "responsable": "Role"},
          {"tarea": "...", "inicio": "...", "entrega": "...", "responsable": "..."}
        ]
      }

  - agent: agente_hitos_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_p8]
    include_template: false
    task: |
      SAME AS AGENT A. ADD: "dependencia" (e.g. "P3 aprobado").
      DATE ANCHORING: Use "fecha_inicio_modulo" for real DD/MM/YYYY dates. Add "Inicio de la formación" milestone if fecha_inicio_formacion present.
      CRITICAL RULE 1: Never invent past dates. Assume the current year is 2026.
      CRITICAL RULE 2: ABSOLUTELY NO TEMPLATE ENGINE CODE. DO NOT output tags like {{calcular_fecha_entrega}}. YOU must do the math mentally and output ONLY the final calculated string.
      OUTPUT ONLY THIS JSON:
      {"hitos": [{"tarea": "...", "inicio": "DD/MM/YYYY", "entrega": "DD/MM/YYYY", "responsable": "...", "dependencia": "..."}]}

  - agent: juez_hitos
    model: "qwen2.5:14b"
    inputs_from: [agente_hitos_A, agente_hitos_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. Compare MILESTONES.
      SELECTION: logical order, dependencies included.
      VETO CRITERIA — Output "RECHAZADO" ONLY IF BOTH of the following are true for BOTH A and B:
      1. Both have 0 items in the "hitos" array.
      2. Both have "tarea" fields that are empty or are generic placeholders ("Task name", "Tarea").
      If RECHAZADO, "razon" MUST describe the specific shared deficiency.
      OUTPUT: {"seleccion": "A"|"B"|"RECHAZADO", "razon": "one-line"}

  # ═══════════════════════════════════════════════════════════════════════
  # SECCIÓN 2: RIESGOS Y CALIDAD
  # ═══════════════════════════════════════════════════════════════════════
  - agent: agente_riesgos_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_p8]
    include_template: false
    task: |
      ROLE: Risk Manager. TASK: Identify domain-specific risks and structured quality gates for THIS module.
      
      DOMAIN-SPECIFIC RISKS: Use "dominio_curso" and "materiales_curso" from the extractor.
      Write risks specific to the course domain — FORBIDDEN: generic project risks.
      GOOD: "Facilitador no familiarizado con [dominio_curso] puede omitir terminología técnica específica"
      BAD:  "Retraso en la aprobación de materiales" (too generic — prohibited)
      Minimum 2 domain-specific risks. Reference dominio_curso or materiales_curso in each riesgo.
      
      STRUCTURED COMPUERTAS: "compuertas_calidad" MUST be an array of STRUCTURED OBJECTS (not plain strings).
      CORRECT format:
      "compuertas_calidad": [
        {"compuerta": "Guiones P3 aprobados por SME", "responsable": "Diseñador Instruccional", "criterio": "100% de escenas validadas sin observaciones", "fecha_limite": "5 días hábiles antes del inicio de formación"},
        {"compuerta": "Manual P4 revisado y firmado", "responsable": "Experto en la Materia", "criterio": "Sin observaciones de contenido pendientes", "fecha_limite": "3 días hábiles antes del inicio"}
      ]
      PROHIBITED: "compuertas_calidad": ["Guiones aprobados", "Manual revisado"]  — plain strings are NOT allowed.
      
      OUTPUT ONLY THIS JSON:
      {
        "riesgos_calidad": {
          "riesgos": [
            {"riesgo": "Domain-specific risk mentioning dominio_curso", "mitigacion": "Concrete action"}
          ],
          "compuertas_calidad": [
            {"compuerta": "Gate name", "responsable": "Role", "criterio": "Measurable acceptance criterion", "fecha_limite": "Relative timeline"}
          ]
        }
      }

  - agent: agente_riesgos_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_p8]
    include_template: false
    task: |
      SAME AS AGENT A — USE DOMAIN CONTEXT ("dominio_curso", "materiales_curso") for domain-specific risks.
      ADD to each riesgo: "impacto" (Bajo/Medio/Alto) and "probabilidad" (Baja/Media/Alta).
      STRUCTURED COMPUERTAS: same structured object format as Agent A — NOT plain strings.
      OUTPUT ONLY THIS JSON:
      {"riesgos_calidad": {"riesgos": [{"riesgo": "...", "mitigacion": "...", "impacto": "Alto|Medio|Bajo", "probabilidad": "Alta|Media|Baja"}], "compuertas_calidad": [{"compuerta": "...", "responsable": "...", "criterio": "...", "fecha_limite": "..."}]}}

  - agent: juez_riesgos
    model: "qwen2.5:14b"
    inputs_from: [agente_riesgos_A, agente_riesgos_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. Compare RISKS.
      SELECTION: specific to module content, realistic mitigation.
      VETO CRITERIA — Output "RECHAZADO" ONLY IF BOTH of the following are true for BOTH A and B:
      1. Both have 0 items in "riesgos" AND 0 items in "compuertas_calidad".
      2. Both have "mitigacion" fields that are empty or generic ("acción correctiva", "mitigación").
      If RECHAZADO, "razon" MUST describe the specific shared deficiency.
      OUTPUT: {"seleccion": "A"|"B"|"RECHAZADO", "razon": "one-line"}

  # ═══════════════════════════════════════════════════════════════════════
  # ASSEMBLER
  # ═══════════════════════════════════════════════════════════════════════
  - agent: ensamblador_doc_p8
    model: "qwen2.5:14b"
    inputs_from: [juez_hitos, juez_riesgos]
    include_template: false
    task: "CÓDIGO - Assembly in p8-document.assembler.ts"