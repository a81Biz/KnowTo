---
id: F4_P8_GENERATE_DOCUMENT
name: Compilador de Documento P8 — Cronograma de Desarrollo EC0366
version: 2.0.0
tags: [EC0366, cronograma, desarrollo, markdown]
pipeline_steps:

  # ── EXTRACTOR ────────────────────────────────────────────────────────────
  - agent: extractor_doc_generic
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: false
    task: |
      Read from userInputs AND productos_previos in the provided context. Ignore previousData entirely.
      
      SOURCE MAPPING:
      - Form fields follow the pattern "cronograma_unidad_N" where N is the unit number.
      - productos_previos contains the full Markdown documents of P1 through P7.
      - projectName and clientName come from the context root.
      
      YOUR TASK: Map each form field to its unit number. Extract factual quantities from previously generated products.
      
      OUTPUT ONLY VALID JSON — EXACT STRUCTURE:
      {
        "producto": "P8",
        "proyecto": "[projectName from context]",
        "candidato": "[clientName from context]",
        "secciones": [
          { "campo": "cronograma_unidad_1", "contenido": "[value of userInputs.cronograma_unidad_1]" },
          { "campo": "cronograma_unidad_2", "contenido": "[value of userInputs.cronograma_unidad_2]" }
        ],
        "entregables_existentes": {
          "P1": "[extract instrument types per unit from productos_previos.P1 if present, else null]",
          "P2": "[extract slide counts per unit from productos_previos.P2 if present, else null]",
          "P3": "[extract scene counts per unit from productos_previos.P3 if present, else null]",
          "P4": "[extract page counts per unit from productos_previos.P4 if present, else null]",
          "P5": "[extract activity count per unit from productos_previos.P5 if present, else null]",
          "P6": "[extract session durations per unit from productos_previos.P6 if present, else null]"
        }
      }
      
      RULES:
      - Include ONLY fields whose key starts with "cronograma_unidad_" in secciones
      - Preserve the exact text of each field value — do not paraphrase or summarize
      - The number of secciones must equal the number of cronograma_unidad_* keys in userInputs
      - For entregables_existentes: extract factual quantities (counts, durations) if present; null if absent

  # ── AGENTE A: PRODUCTION SCHEDULE COMPILER ───────────────────────────────
  - agent: agente_doc_generic_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_doc_generic]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      
      You are an EC0366 Project Manager compiling the official production schedule for all course materials.
      
      SOURCE: The development task sections extracted from the user-confirmed form and the entregables_existentes from P1-P6.
      
      HOW TO BUILD THE DOCUMENT:
      
      1. Generate the complete document in SPANISH.
      2. Start with a ## Resumen del Proyecto section with: project name, client, total production weeks, total estimated hours.
      3. Create a master ## Plan de Producción table with all units: Módulo | Entregables | Responsable | Inicio | Entrega | Estado.
      4. For each unit, create a detailed ## Módulo [N]: [Name] section with:
         - A production detail table: Material | Horas de Producción | Recursos | Hito de Validación | Prioridad.
         - Production notes referencing dependencies from other modules.
      5. Add a ## Ruta Crítica section identifying the longest chain of dependent deliverables that determines the project end date.
      6. Add a ## Dependencias de Producción section explicitly listing: P3 → P4, P2 → P4, P1 → P5.
      
      CRITICAL RULES:
      1. BUSINESS DAYS ONLY: All dates MUST fall on business days (Mon–Fri). If a milestone naturally lands on a weekend, move it to the next Monday. Never schedule deliveries or reviews on weekends.
      2. PRODUCTION DEPENDENCIES: The schedule MUST respect and reflect: P3 scripts finish before P4 manual starts for the same unit. P2 slides finish before P4 manual starts for the same unit. P1 instruments must be approved before P5 activity guides begin for the same unit. Mark these dependencies explicitly in the schedule notes.
      3. REAL DELIVERABLES: If entregables_existentes contains data, use the ACTUAL slide counts, page counts, scene counts, and durations from P2, P3, P4, and P6. The Estado column MUST show "Producido" for any deliverable present in entregables_existentes. Do NOT invent quantities that contradict what has already been produced.
      4. RUTA CRÍTICA: Identify the sequence of dependent tasks that determines the minimum project duration. Calculate it from the actual P1-P6 volume, not estimates.
      5. NO RAW JSON OR FIELD NAMES in the output. Clean, professional project schedule.
      
      OUTPUT ONLY THIS JSON:
      {"documento_md": "# Cronograma de Desarrollo\n\n## Resumen del Proyecto\n| Campo | Detalle |\n|---|---|\n...\n\n## Plan de Producción\n| Módulo | Entregables | Responsable | Inicio | Entrega | Estado |\n|---|---|---|---|---|---|\n...\n\n## Ruta Crítica\n...\n\n## Dependencias de Producción\n..."}

  # ── AGENTE B: RESOURCE & MILESTONE COMPILER ──────────────────────────────
  - agent: agente_doc_generic_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_doc_generic]
    include_template: false
    task: |
      YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.
      
      You are an EC0366 Resource Manager compiling a detailed production schedule with resource allocation, milestones, and quality gates.
      
      SOURCE: The development task sections from the user-confirmed form and entregables_existentes from P1-P6.
      
      HOW TO BUILD THE DOCUMENT:
      
      1. Generate the complete document in SPANISH.
      2. Start with a ## Resumen Ejecutivo with total project scope, production team, and timeline.
      3. Create a master ## Calendario de Producción with a Gantt-style table: Semana | Módulo | Actividad | Responsable | Entregable | Hito.
      4. For each unit, create a detailed ## Módulo [N]: [Name] section with:
         - Resource allocation table: Recurso | Tipo | Cantidad | Disponibilidad.
         - Validation milestones from F3's criterios_aceptacion.
         - Quality gates with pass/fail criteria.
      5. Add a ## Ruta Crítica y Holguras section with:
         - Critical path tasks that cannot be delayed.
         - Non-critical tasks with float time.
      6. Add a ## Gestión de Riesgos section identifying top 3 schedule risks and mitigation actions.
      
      CRITICAL RULES:
      1. CONTENT COMPLETENESS: Your document may have a different structure than the standard template, but it MUST contain ALL factual information from the form fields. Different structure ≠ different content.
      2. F3 VALIDATION GATES: Each quality gate must reference specific criteria from F3's criterios_aceptacion — contenido, técnicos, pedagógicos, accesibilidad.
      3. REAL CAPACITY: Resource availability must be realistic — one diseñador instruccional cannot produce 80 hours of material in one week.
      4. RISK MANAGEMENT: Identify risks specific to this project's scope (derived from P1-P7 volume), not generic project management risks.
      5. NO RAW JSON OR FIELD NAMES in the output.
      
      OUTPUT ONLY THIS JSON:
      {"documento_md": "# Cronograma de Desarrollo — Plan de Producción\n\n## Resumen Ejecutivo\n...\n\n## Calendario de Producción\n| Semana | Módulo | Actividad | Responsable | Entregable | Hito |\n|---|---|---|---|---|---|\n...\n\n## Ruta Crítica y Holguras\n...\n\n## Gestión de Riesgos\n..."}

  # ── JUDGE ────────────────────────────────────────────────────────────────
  - agent: juez_doc_generic
    model: "qwen2.5:14b"
    inputs_from: [agente_doc_generic_A, agente_doc_generic_B]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. DO NOT CONVERSE.
      
      Compare "documento_md" from A and B. Select the better Cronograma de Desarrollo.
      
      SELECTION CRITERIA:
      1. No raw JSON or field names visible — clean, professional project document.
      2. Clear production schedule with responsibilities, dates, and status per deliverable.
      3. Production dependencies: Are P3→P4, P2→P4, and P1→P5 dependencies explicitly reflected in the schedule?
      4. Business-day compliance: Are all dates on Mon–Fri? No weekend deliveries.
      5. Real deliverable data: Does the Estado column show "Producido" for deliverables present in entregables_existentes? Are quantities (slides, pages, durations) consistent with P1-P6 data?
      6. Critical path: Is a ruta crítica or dependency chain identified? Is it based on actual P1-P6 volume?
      7. Fidelity to form: ALL content comes from userInputs — no invented dates, deliverables, or milestones.
      8. Correct module count: ALL modules from the form input are present; none missing, none added.
      
      OUTPUT ONLY THIS JSON:
      {"seleccion": "A" | "B", "razon": "1-line explanation"}

  # ── ASSEMBLER ────────────────────────────────────────────────────────────
  - agent: ensamblador_doc_generic
    model: "qwen2.5:14b"
    inputs_from: [juez_doc_generic]
    include_template: false
    task: "CÓDIGO - Assembly in document-generic.assembler.ts"
---