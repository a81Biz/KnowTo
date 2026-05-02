---
id: F3
name: Especificaciones Técnicas del Curso
version: 5.0.0
tags: [EC0366, tecnico, LMS, SCORM, duracion, multimedia]
pipeline_steps:

  # ── EXTRACTOR ──────────────────────────────────────────────────────────────
  - agent: extractor_f3
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: []
    include_template: false
    task: |
      Extract the data required for Technical Specifications (F3).
      
      SOURCE MAPPING:
      - F2 structured data: compactContext.previousData.f2_estructurado
      - F2.5 structured data: compactContext.previousData.f2_5_estructurado
      - User inputs (LMS, platform, publishing preferences): {{userInputs}}
      
      FROM F2, extract:
      - num_modulos: number of modules (from estructura_tematica array length)
      - perfil_ingreso: the 7 entry profile fields
      - modalidad: course modality
      - plataforma: LMS platform name specified by user or from F2 context
      
      FROM F2.5, extract:
      - total_videos: from produccion_audiovisual.numero_total_videos
      - duracion_promedio_video: average of duracion_minima and duracion_maxima from produccion_audiovisual
      - metricas: from metricas_seguimiento array
      - frecuencia_reportes: from metricas_seguimiento[0].frecuencia_revision or most common frequency
      - actividades: from actividades_recomendadas array
      
      RULES:
      - If a field is not available, use "No especificado en F2/F2.5"
      - DO NOT invent values. DO NOT use placeholders.
      
      OUTPUT ONLY VALID JSON — EXACT STRUCTURE:
      {
        "num_modulos": 0,
        "total_videos": 0,
        "duracion_promedio_video": 0,
        "frecuencia_reportes": "",
        "plataforma": "",
        "modalidad": "",
        "perfil_ingreso": {
          "escolaridad": "",
          "conocimientos_previos": "",
          "habilidades_digitales": "",
          "equipo": "",
          "conexion": ""
        }
      }

  # ── AGENTE 1: LMS PLATFORM & BROWSERS ─────────────────────────────────────
  - agent: agente_plataforma_navegador
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [extractor_f3]
    include_template: false
    task: |
      You are an LMS Deployment Specialist under EC0366.
      
      SOURCE: Use ONLY data from extractor_f3.
      
      YOUR TASK: Define LMS platform and browser compatibility.
      
      RULES:
      1. If plataforma has a real value (not "No especificado"), USE THAT EXACT NAME. Do NOT suggest changes.
      2. If plataforma is "No especificado", recommend Moodle 4.x by default.
      3. Specify real, current minimum browser versions.
      4. DO NOT invent URLs, LMS versions, or features that don't exist.
      
      OUTPUT ONLY VALID JSON — EXACT STRUCTURE:
      {
        "plataforma_navegador": {
          "plataforma": "exact LMS name",
          "version_minima": "minimum LMS version",
          "version_scorm": "SCORM 1.2 | SCORM 2004 | xAPI",
          "justificacion": "1-2 sentences based on sector and SCORM level",
          "navegadores_soportados": ["Chrome 90+", "Firefox 88+", "Edge 90+"],
          "navegadores_no_soportados": ["Internet Explorer (all versions)"],
          "dispositivos": ["Desktop (Windows/macOS)", "Tablet (responsive)", "Mobile (responsive, read-only)"]
        }
      }

  # ── AGENTE 2: REPORTING & TRACKING ────────────────────────────────────────
  - agent: agente_reporteo
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [extractor_f3]
    include_template: false
    task: |
      You are an LMS Reporting Specialist under EC0366.
      
      SOURCE: Use ONLY data from extractor_f3.
      
      YOUR TASK: Define tracking metrics based on SCORM level.
      
      SCORM LEVEL RULES:
      - Level 1 (Passive): time and progress only
      - Level 2 (Limited): + grades
      - Level 3 (Moderate): + attempts and dates
      - Level 4 (Robust): + detailed per-activity metrics
      
      Use frecuencia_reportes from extractor_f3 for the automated report frequency.
      
      OUTPUT ONLY VALID JSON — EXACT STRUCTURE:
      {
        "reporteo": {
          "metricas": [
            { "metrica": "Module progress", "formato": "Percentage (%)", "frecuencia": "Per completed module" },
            { "metrica": "Time invested", "formato": "Accumulated minutes", "frecuencia": "Continuous" }
          ],
          "frecuencia_reporte_automatico": "weekly | monthly",
          "formato_entrega": "PDF + LMS Dashboard",
          "destinatarios": ["Participant", "Instructor", "Administrator"],
          "justificacion": "1 sentence based on SCORM level and course duration"
        }
      }

  # ── AGENTE 3: MULTIMEDIA FORMATS ──────────────────────────────────────────
  - agent: agente_formatos_multimedia
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [extractor_f3]
    include_template: false
    task: |
      You are a Multimedia Production Specialist under EC0366.
      
      SOURCE: Use ONLY data from extractor_f3.
      Available fields: total_videos, duracion_promedio_video.
      
      YOUR TASK: Define multimedia formats.
      
      OUTPUT ONLY VALID JSON — EXACT STRUCTURE:
      {
        "formatos_multimedia": {
          "videos": {
            "cantidad_recomendada": 0,
            "duracion_optima_minutos": 0,
            "resolucion": "1920x1080 (Full HD)",
            "peso_maximo_mb": 500,
            "herramientas_sugeridas": ["Camtasia", "OBS Studio"],
            "referencia": "Guo, P. J., Kim, J., & Rubin, R. (2014). How video production affects student engagement."
          },
          "infografias": {
            "cantidad": "1 per module",
            "dimensiones": "1280x720 px minimum",
            "formato": "PNG or SVG"
          },
          "pdfs_descargables": {
            "incluir": true,
            "contenido": "Module summary + activity guide",
            "especificacion": "A4, selectable text, max 5 MB"
          },
          "audios": {
            "incluir": false
          }
        }
      }

  # ── AGENTE 4: NAVIGATION & VISUAL IDENTITY ────────────────────────────────
  - agent: agente_navegacion_identidad
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [extractor_f3]
    include_template: false
    task: |
      You are a UX/UI Specialist for e-learning under EC0366.
      
      SOURCE: Use ONLY data from extractor_f3.
      
      YOUR TASK: Define navigation structure and visual identity guidelines.
      
      RULES:
      - EC0366 courses must use linear navigation.
      - Primary buttons: always include Previous, Next, Index, Help.
      
      OUTPUT ONLY VALID JSON — EXACT STRUCTURE:
      {
        "navegacion_identidad": {
          "navegacion": {
            "tipo": "Linear with controlled branching",
            "permite_saltar_modulos": false,
            "barra_progreso_visible": true,
            "botones_principales": ["Previous", "Next", "Index", "Help", "Logout"],
            "mapa_navegacion": "Module 1 -> Module 2 -> ... -> Module N -> Final evaluation"
          },
          "identidad_grafica": {
            "paleta_sugerida": ["Corporate blue (#2C3E50)", "Accent (#3498DB)", "Light background (#ECF0F1)"],
            "tipografia": "Sans-serif — Arial 14px (body), Roboto 18px (titles)",
            "requiere_logo_cliente": true,
            "justificacion": "Usability principles for technical/professional content (Nielsen, 1994)"
          }
        }
      }

  # ── AGENTE 5: ACCEPTANCE CRITERIA ─────────────────────────────────────────
  - agent: agente_criterios_aceptacion
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [extractor_f3]
    include_template: false
    task: |
      You are a Quality Assurance Specialist under EC0366.
      
      SOURCE: Use ONLY data from extractor_f3.
      
      YOUR TASK: Define quality and acceptance criteria.
      
      RULES:
      - Each criterion must be VERIFIABLE.
      - Accessibility: minimum WCAG 2.1 Level AA.
      
      OUTPUT ONLY VALID JSON — EXACT STRUCTURE:
      {
        "criterios_aceptacion": {
          "criterios_contenido": [
            "Zero spelling or grammar errors in 100% of the material",
            "All sector concepts are defined with examples",
            "EC0366 learning objectives are 100% covered"
          ],
          "criterios_tecnicos": [
            "Course loads in under 5 seconds on a 5 Mbps connection",
            "Compatible with all specified browsers",
            "SCORM reports generate correctly in the specified LMS",
            "Videos play without buffering at 5 Mbps"
          ],
          "criterios_pedagogicos": [
            "Participants score ≥80% on summative assessments",
            "Course completion rate ≥70% by end of period",
            "Each module has at least one practice activity (EC0366 §4.2)"
          ],
          "criterios_accesibilidad": [
            "Meets WCAG 2.1 Level AA",
            "Videos include Spanish subtitles",
            "Text contrast ratio ≥4.5:1"
          ]
        }
      }

  # ── AGENTE 6: DURATION CALCULATION ────────────────────────────────────────
  - agent: agente_calculo_duracion
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [extractor_f3]
    include_template: false
    task: |
      You are a Course Duration Calculator under EC0366.
      
      SOURCE: Use ONLY data from extractor_f3.
      Available fields: num_modulos, total_videos, duracion_promedio_video.
      
      YOUR TASK: Calculate the total course duration with explicit arithmetic.
      
      HOW TO CALCULATE:
      1. Videos: total_videos × duracion_promedio_video
      2. Practice activities: num_modulos × 30 min per module
      3. Formative assessments: num_modulos × 20 min per module
      4. Sum all components for total
      
      RULES:
      - Show explicit arithmetic in the desglose.
      - Round horas_aprox to 1 decimal place.
      
      OUTPUT ONLY VALID JSON — EXACT STRUCTURE:
      {
        "calculo_duracion": {
          "desglose": [
            { "componente": "Videos", "cantidad": 0, "tiempo_unitario_min": 0, "total_min": 0 },
            { "componente": "Practice activities", "cantidad": 0, "tiempo_unitario_min": 0, "total_min": 0 },
            { "componente": "Formative assessments", "cantidad": 0, "tiempo_unitario_min": 0, "total_min": 0 }
          ],
          "duracion_total_minutos": 0,
          "duracion_total_horas_aprox": 0.0,
          "distribucion_semanal_horas": 0.0
        }
      }

  # ── ASSEMBLER A ───────────────────────────────────────────────────────────
  - agent: agente_doble_A_f3
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [agente_plataforma_navegador, agente_reporteo, agente_formatos_multimedia, agente_navegacion_identidad, agente_criterios_aceptacion, agente_calculo_duracion]
    include_template: false
    task: |
      You are a Document Assembler under EC0366.
      
      Merge all agent JSON fragments into a single unified object called 'especificaciones_tecnicas'.
      Optimize coherence between sections but preserve all data.
      
      OUTPUT ONLY THE UNIFIED JSON OBJECT. No markdown wrapping. No ```json.

  # ── ASSEMBLER B ───────────────────────────────────────────────────────────
  - agent: agente_doble_B_f3
    model: "@cf/qwen/qwen2.5-7b-instruct"
    inputs_from: [agente_plataforma_navegador, agente_reporteo, agente_formatos_multimedia, agente_navegacion_identidad, agente_criterios_aceptacion, agente_calculo_duracion]
    include_template: false
    task: |
      You are a Document Assembler under EC0366 — ALTERNATIVE perspective.
      
      Same task as Assembler A. Merge all agent JSON fragments into a single unified object called 'especificaciones_tecnicas'.
      Optimize coherence while preserving all data.
      
      OUTPUT ONLY THE UNIFIED JSON OBJECT. No markdown wrapping. No ```json.

  # ── JUEZ ──────────────────────────────────────────────────────────────────
  - agent: agente_juez_f3
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [agente_doble_A_f3, agente_doble_B_f3]
    include_template: false
    task: |
      YOU ARE A JSON PARSER. DO NOT CONVERSE.
      
      Compare drafts A and B of the F3 technical specifications document.
      
      SELECTION CRITERIA:
      1. Technical rigor: Are LMS specs, SCORM version, and browser requirements accurate and specific?
      2. Internal consistency: Do video counts, durations, and module counts align across all sections?
      3. Completeness: All 6 component sections present and fully populated.
      4. Schema compliance: Both are unified JSON objects — no extra wrapping, no markdown.
      
      OUTPUT ONLY THE WINNING JSON OBJECT in its entirety. No justification text outside the JSON.
      The output will serve as the backend payload directly.

  # ── VALIDATOR ─────────────────────────────────────────────────────────────
  - agent: validador_f3
    inputs_from: [agente_juez_f3]
    task: "CÓDIGO - Validation in f3.phase.ts"

  # ── SYNTHESIZER ───────────────────────────────────────────────────────────
  - agent: sintetizador_final_f3
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [agente_juez_f3]
    include_template: false
    task: |
      You are a Technical Document Specialist under EC0366.
      
      Using the winning F3 JSON from the judge, produce the final technical specifications document.
      
      CONTEXT:
      {{context}}
      
      USER INPUTS FOR THIS PHASE:
      {{userInputs}}
      
      RULES:
      1. The LMS platform is the one specified by the user. Do NOT suggest changes.
      2. Copy values from the specialized agents verbatim. Do not reformulate.
      3. NO placeholders — all fields must have real values.
      4. Output in professional Spanish.
      
      Generate the complete Markdown document ready for client presentation.
---