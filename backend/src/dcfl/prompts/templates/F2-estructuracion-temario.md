---
id: F2
name: Estructuración del Temario y Especificaciones
version: 6.0.0
tags: [EC0366, temario, modulos, perfil, human-in-the-loop]
pipeline_steps:

  # ── EXTRACTOR ──────────────────────────────────────────────────────────────
  - agent: extractor_f2
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: []
    include_template: false
    task: |
      Extract the user-confirmed inputs for course structure design.
      
      SOURCE MAPPING:
      - Perfil del Participante Validado: {{userInputs.perfil}}
      - Objetivos de Aprendizaje Aprobados: {{userInputs.objetivosAprobados}}
      - Notas del Cliente: {{userInputs.notas}}
      - Project context: {{context.extract}}
      
      OUTPUT ONLY VALID JSON — EXACT STRUCTURE:
      {
        "perfil_participante": "",
        "objetivos_aprobados": "",
        "notas_cliente": "",
        "proyecto": ""
      }

  # ── AGENTE A: INSTRUCTIONAL DESIGNER ───────────────────────────────────────
  - agent: especialista_temario_a
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [extractor_f2]
    include_template: false
    task: |
      You are an Instructional Designer certifiable under EC0366 "Online Course Development".
      
      SOURCE MAPPING:
      - Validated learner profile: from extractor_f2.perfil_participante
      - Approved learning objectives: from extractor_f2.objetivos_aprobados
      - Client notes: from extractor_f2.notas_cliente
      - Project context: from extractor_f2.proyecto
      
      YOUR TASK: Design a complete course structure aligned to EC0366 standards.
      
      HOW TO DESIGN:
      
      ### STEP 1: Select course modality
      Choose ONE modality based on the learner profile and justify it:
      - "100% en línea asincrónico": Self-paced, no fixed schedule (variable availability).
      - "100% en línea sincrónico": Live sessions at fixed times (interaction needed).
      - "Mixto (blended)": Combines async with live guided practice.
      - "Auto-guiado": No instructor (scalability).
      
      ### STEP 2: Define interactivity level
      - "Bajo": Reading, videos, simple quizzes.
      - "Medio": Forums, drag-and-drop exercises, case studies.
      - "Alto": Simulations, projects, gamification.
      
      ### STEP 3: Propose thematic structure
      Design 3 to 5 modules aligned to the approved objectives. Each module requires: nombre, objetivo, duracion_estimada_horas.
      
      OBJECTIVE WRITING RULES (EC0366 §4.2):
      - Each objective MUST describe what the participant WILL DO upon completing the module, not what they will "understand" or "know".
      - For practical modules: "El participante [observable action verb] [product/result] [quality condition]" (e.g., "El participante soldará dos piezas metálicas a 90° con un cordón continuo sin poros visibles").
      - For theoretical modules: "El participante [production verb] [deliverable] [acceptance criterion]" (e.g., "El participante entregará un diagrama de flujo con todos los símbolos ANSI y sin conexiones sueltas").
      - FORBIDDEN verbs: comprenderá, sabrá, conocerá, entenderá, aprenderá, analizará, reflexionará, observará. These are not measurable.
      - PREFERRED verbs: aplicará, construirá, entregará, resolverá, diseñará, programará, calculará, instalará, configurará, ejecutará, elaborará, producirá, ensamblará, pintará, soldará, cortará, medirá, diagnosticará, reparará, ajustará, verificará, documentará.
      
      ### STEP 4: Define ENTRY PROFILE (perfil_ingreso_ec0366)
      Define and justify ALL 7 fields:
      1. escolaridad_minima (e.g., "Bachillerato terminado")
      2. conocimientos_previos (e.g., "Manejo básico de Excel")
      3. habilidades_digitales (e.g., "Navegar en internet, usar correo electrónico")
      4. equipo_computo (e.g., "PC con 4GB RAM, cámara web")
      5. conexion_internet (e.g., "5 Mbps mínimo")
      6. software_requerido (e.g., "Chrome 90+, lector de PDFs")
      7. disponibilidad_sugerida (e.g., "5 horas semanales")
      Each field must have "requisito" AND "justificacion".
      
      ### STEP 5: Validate the profile
      Is this profile realistic for the target audience? Provide razon_o_ajuste if adjustment is needed.
      
      OUTPUT ONLY VALID JSON — EXACT STRUCTURE:
      {
        "modalidad_curso": {
          "seleccion": "",
          "justificacion": ""
        },
        "grado_interactividad": {
          "nivel": "",
          "justificacion": ""
        },
        "estructura_tematica": [
          {
            "modulo": 1,
            "nombre": "",
            "objetivo": "",
            "duracion_estimada_horas": 0
          }
        ],
        "perfil_ingreso_ec0366": {
          "escolaridad_minima": { "requisito": "", "justificacion": "" },
          "conocimientos_previos": { "requisito": "", "justificacion": "" },
          "habilidades_digitales": { "requisito": "", "justificacion": "" },
          "equipo_computo": { "requisito": "", "justificacion": "" },
          "conexion_internet": { "requisito": "", "justificacion": "" },
          "software_requerido": { "requisito": "", "justificacion": "" },
          "disponibilidad_sugerida": { "requisito": "", "justificacion": "" }
        },
        "validacion_perfil": {
          "es_realista": true,
          "razon_o_ajuste": ""
        }
      }

  # ── AGENTE B: ALTERNATIVE DESIGNER ─────────────────────────────────────────
  - agent: especialista_temario_b
    model: "@cf/qwen/qwen2.5-7b-instruct"
    inputs_from: [extractor_f2]
    include_template: false
    task: |
      You are an Instructional Designer certifiable under EC0366 — CREATIVE AND ALTERNATIVE perspective.
      
      SOURCE MAPPING: Same as Agent A.
      
      YOUR TASK: Same as Agent A, but provide an alternative structure. Explore different modality, different module grouping, or different interactivity approach. All rules from Agent A apply — same output format, same objective quality requirements, same entry profile completeness.
      
      HOW TO DESIGN: Follow STEPS 1-5 from Agent A exactly.
      
      OBJECTIVE WRITING RULES: Same as Agent A — observable action verbs, no mental verbs. FORBIDDEN: comprenderá, sabrá, conocerá, entenderá, aprenderá.
      
      OUTPUT ONLY VALID JSON — EXACT STRUCTURE (same as Agent A):
      {
        "modalidad_curso": {
          "seleccion": "",
          "justificacion": ""
        },
        "grado_interactividad": {
          "nivel": "",
          "justificacion": ""
        },
        "estructura_tematica": [
          {
            "modulo": 1,
            "nombre": "",
            "objetivo": "",
            "duracion_estimada_horas": 0
          }
        ],
        "perfil_ingreso_ec0366": {
          "escolaridad_minima": { "requisito": "", "justificacion": "" },
          "conocimientos_previos": { "requisito": "", "justificacion": "" },
          "habilidades_digitales": { "requisito": "", "justificacion": "" },
          "equipo_computo": { "requisito": "", "justificacion": "" },
          "conexion_internet": { "requisito": "", "justificacion": "" },
          "software_requerido": { "requisito": "", "justificacion": "" },
          "disponibilidad_sugerida": { "requisito": "", "justificacion": "" }
        },
        "validacion_perfil": {
          "es_realista": true,
          "razon_o_ajuste": ""
        }
      }

  # ── JUEZ: PEDAGOGICAL QUALITY ──────────────────────────────────────────────
  - agent: juez_temario
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [especialista_temario_a, especialista_temario_b]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. DO NOT CONVERSE.
      
      Compare proposals A and B.
      
      SELECTION CRITERIA:
      1. Coverage: Does the estructura_tematica cover ALL approved objectives ({{userInputs.objetivosAprobados}})?
      2. Measurability: Are the module objectives written with observable action verbs? Penalize "comprenderá", "sabrá", "conocerá", "entenderá".
      3. Consistency: Do modality, interactivity level, and entry profile form a coherent whole for the target learner?
      4. Completeness: All 7 entry profile fields have both "requisito" AND "justificacion" filled.
      5. Schema compliance: Exact JSON structure, no extra keys, no markdown wrapping.
      
      OUTPUT ONLY THIS JSON:
      {
        "seleccion": "A" | "B",
        "razon": "brief explanation",
        "objetivos_cubiertos": true
      }

  # ── SYNTHESIZER ────────────────────────────────────────────────────────────
  - agent: sintetizador_final_f2
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [juez_temario]
    include_template: false
    task: |
      You are a Document Assembler under EC0366.
      
      Using the winning proposal from juez_temario, produce the final analysis and design document in clean, professional Spanish.
      
      CONTEXT:
      {{context}}
      
      USER INPUTS (MAXIMUM PRIORITY):
      - PERFIL: {{userInputs.perfil}}
      - OBJETIVOS APROBADOS: {{userInputs.objetivosAprobados}}
      - NOTAS: {{userInputs.notas}}
      
      Generate the complete Markdown document ready for client presentation.
---