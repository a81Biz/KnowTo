---
id: F2_5
name: Recomendaciones Pedagógicas de Producción
version: 3.0.0
tags: [EC0366, pedagogico, actividades, metricas, videos, produccion]
pipeline_steps:

  # ── EXTRACTOR ──────────────────────────────────────────────────────────────
  - agent: extractor_f2_5
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: []
    include_template: false
    task: |
      Extract the relevant data for pedagogical production recommendations.
      
      SOURCE MAPPING:
      - F1 validated data (needs, profile, gaps): from compactContext.previousData.f1_estructurado
      - F2 course structure (modality, modules, entry profile): from compactContext.previousData.f2_estructurado
      - Full context: {{context.compactContext}}
      
      Extract these specific fields:
      - num_modulos: number of modules from F2 estructura_tematica.length
      - modalidad: course modality from F2
      - nivel_interactividad: interactivity level from F2
      - perfil_participante: learner profile summary from F1
      - brechas_capacitables: capacitable gaps from F1 (count and types)
      
      OUTPUT ONLY VALID JSON — EXACT STRUCTURE:
      {
        "num_modulos": 0,
        "modalidad": "",
        "nivel_interactividad": "",
        "perfil_participante": "",
        "brechas_capacitables": 0
      }

  # ── AGENTE A: ASYNCHRONOUS & GAMIFIED ──────────────────────────────────────
  - agent: especialista_produccion_a
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [extractor_f2_5]
    include_template: false
    task: |
      You are a Pedagogical Production Expert certified under EC0366 "Online Course Development".
      
      SOURCE MAPPING:
      - num_modulos, modalidad, nivel_interactividad, perfil_participante, brechas_capacitables: from extractor_f2_5
      
      YOUR TASK: Generate pedagogical production recommendations. Prioritize asynchronous and gamified approaches.
      
      HOW TO GENERATE:
      
      ### 1. actividades_recomendadas
      Recommend 4-6 activity types aligned with the course modality and interactivity level. Each activity needs:
      - tipo: activity type (e.g., "Cuestionario interactivo", "Foro de discusión", "Simulación práctica", "Proyecto integrador")
      - proposito: what learning objective this activity serves
      - frecuencia: how often (e.g., "1 por módulo", "Al final del curso")
      - justificacion: why this activity fits the learner profile and modality
      
      ### 2. metricas_seguimiento
      Define 4-6 tracking metrics for SCORM/LMS reporting. Each metric needs:
      - metrica: metric name (e.g., "Tasa de completitud", "Tiempo promedio por módulo")
      - descripcion: what is measured
      - importancia: why this metric matters for this specific course
      - frecuencia_revision: how often to review (e.g., "Semanal", "Por módulo completado")
      
      ### 3. produccion_audiovisual
      - numero_total_videos: MUST be ≥ num_modulos AND ≥ 3. If num_modulos < 3, set to at least 3.
      - duracion_minima_minutos: per video minimum (3-5 min recommended for async)
      - duracion_maxima_minutos: per video maximum (10-12 min max per EC0366 multimedia guidelines)
      
      ### 4. referencias_bibliograficas
      Provide 3-5 real academic or industry references in APA format that support the chosen pedagogical approach.
      
      RULES:
      - All fields required. No empty strings, no placeholders.
      - JSON output ONLY. No markdown wrapping.
      
      OUTPUT ONLY VALID JSON — EXACT STRUCTURE:
      {
        "actividades_recomendadas": [
          { "tipo": "", "proposito": "", "frecuencia": "", "justificacion": "" }
        ],
        "metricas_seguimiento": [
          { "metrica": "", "descripcion": "", "importancia": "", "frecuencia_revision": "" }
        ],
        "produccion_audiovisual": {
          "numero_total_videos": 0,
          "duracion_minima_minutos": 0,
          "duracion_maxima_minutos": 0
        },
        "referencias_bibliograficas": [""]
      }

  # ── AGENTE B: SOCIAL & PRAGMATIC ───────────────────────────────────────────
  - agent: especialista_produccion_b
    model: "@cf/qwen/qwen2.5-7b-instruct"
    inputs_from: [extractor_f2_5]
    include_template: false
    task: |
      You are a Pedagogical Production Expert certified under EC0366 — SOCIAL AND PRAGMATIC focus.
      
      SOURCE MAPPING: Same as Agent A.
      
      YOUR TASK: Same as Agent A, but prioritize social learning, peer interaction, and practical hands-on application. Center the design on the learner's real-world context.
      
      HOW TO GENERATE: Follow the same 4 sections as Agent A. Same output structure.
      
      ADDITIONAL FOCUS:
      - actividades_recomendadas: Include at least 1 peer-review or collaborative activity.
      - metricas_seguimiento: Include at least 1 engagement/interaction metric.
      - produccion_audiovisual: Consider shorter videos if social activities demand time.
      - referencias_bibliograficas: Include references on social learning or communities of practice.
      
      RULES:
      - All fields required. No empty strings.
      - JSON output ONLY.
      
      OUTPUT ONLY VALID JSON — EXACT STRUCTURE:
      {
        "actividades_recomendadas": [
          { "tipo": "", "proposito": "", "frecuencia": "", "justificacion": "" }
        ],
        "metricas_seguimiento": [
          { "metrica": "", "descripcion": "", "importancia": "", "frecuencia_revision": "" }
        ],
        "produccion_audiovisual": {
          "numero_total_videos": 0,
          "duracion_minima_minutos": 0,
          "duracion_maxima_minutos": 0
        },
        "referencias_bibliograficas": [""]
      }

  # ── JUEZ ───────────────────────────────────────────────────────────────────
  - agent: juez_produccion
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [especialista_produccion_a, especialista_produccion_b]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. DO NOT CONVERSE.
      
      Compare proposals A and B.
      
      SELECTION CRITERIA:
      1. Video count: numero_total_videos ≥ num_modulos AND ≥ 3. Reject if lower.
      2. Activity feasibility: actividades_recomendadas are achievable within the course modality. Penalize activities that contradict the modality (e.g., live workshops in an async course).
      3. Metric relevance: metricas_seguimiento align with SCORM tracking capabilities and the interactivity level.
      4. Completeness: All 4 sections fully populated — no empty strings, no placeholder zeros.
      5. Schema compliance: Exact JSON structure, parseable without errors.
      
      OUTPUT ONLY THIS JSON:
      {
        "seleccion": "A" | "B",
        "justificacion": "brief explanation of why this proposal is more complete and realistic"
      }

  # ── SYNTHESIZER ────────────────────────────────────────────────────────────
  - agent: sintetizador_final_f2_5
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [juez_produccion]
    include_template: false
    task: |
      You are a Document Assembler under EC0366.
      
      Using the winning proposal from juez_produccion, produce the final pedagogical recommendations document in clean, professional Spanish.
      
      CONTEXT:
      {{context.compactContext}}
      
      Generate the complete Markdown document ready for client presentation.
---