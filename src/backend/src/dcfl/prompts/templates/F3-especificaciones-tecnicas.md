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
      You are an LMS Deployment Specialist for competency-based instructional design.
      
      SOURCE: Use ONLY data from extractor_f3.
      
      YOUR TASK: Define LMS platform and browser compatibility.
      
      RULES:
      1. If plataforma has a real value (not "No especificado"), USE THAT EXACT NAME. Do NOT suggest changes.
      2. If plataforma is "No especificado", recommend Moodle 4.x by default.
      3. Specify real, current minimum browser versions.
      4. DO NOT invent URLs, LMS versions, or features that don't exist.
      
      IDIOMA OBLIGATORIO: Todos los valores de texto en el JSON deben estar en español.
      OUTPUT ONLY VALID JSON — EXACT STRUCTURE:
      {
        "plataforma_navegador": {
          "plataforma": "nombre exacto del LMS",
          "version_minima": "versión mínima del LMS",
          "version_scorm": "SCORM 1.2 | SCORM 2004 | xAPI",
          "justificacion": "1-2 frases basadas en el sector y nivel SCORM",
          "navegadores_soportados": ["Chrome 90+", "Firefox 88+", "Edge 90+"],
          "navegadores_no_soportados": ["Internet Explorer (todas las versiones)"],
          "dispositivos": ["Escritorio (Windows/macOS)", "Tableta (responsive)", "Móvil (responsive, solo lectura)"]
        }
      }

  # ── AGENTE 2: REPORTING & TRACKING ────────────────────────────────────────
  - agent: agente_reporteo
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [extractor_f3]
    include_template: false
    task: |
      You are an LMS Reporting Specialist for competency-based instructional design.
      
      SOURCE: Use ONLY data from extractor_f3.
      
      YOUR TASK: Define tracking metrics based on SCORM level.
      
      SCORM LEVEL RULES:
      - Level 1 (Passive): time and progress only
      - Level 2 (Limited): + grades
      - Level 3 (Moderate): + attempts and dates
      - Level 4 (Robust): + detailed per-activity metrics
      
      Use frecuencia_reportes from extractor_f3 for the automated report frequency.
      
      IDIOMA OBLIGATORIO: Todos los valores de texto en el JSON deben estar en español.
      OUTPUT ONLY VALID JSON — EXACT STRUCTURE:
      {
        "reporteo": {
          "metricas": [
            { "metrica": "Progreso por módulo", "formato": "Porcentaje (%)", "frecuencia": "Por módulo completado" },
            { "metrica": "Tiempo invertido", "formato": "Minutos acumulados", "frecuencia": "Continuo" }
          ],
          "frecuencia_reporte_automatico": "semanal | mensual",
          "formato_entrega": "PDF + Panel del LMS",
          "destinatarios": ["Participante", "Instructor", "Administrador"],
          "justificacion": "1 frase basada en el nivel SCORM y duración del curso"
        }
      }

  # ── AGENTE 3: MULTIMEDIA FORMATS ──────────────────────────────────────────
  - agent: agente_formatos_multimedia
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [extractor_f3]
    include_template: false
    task: |
      You are a Multimedia Production Specialist for competency-based instructional design.
      
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
            "cantidad": "1 por módulo",
            "dimensiones": "1280x720 px mínimo",
            "formato": "PNG o SVG"
          },
          "pdfs_descargables": {
            "incluir": true,
            "contenido": "Resumen de módulo + guía de actividades",
            "especificacion": "A4, texto seleccionable, máx. 5 MB"
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
      You are a UX/UI Specialist for e-learning for competency-based instructional design.
      
      SOURCE: Use ONLY data from extractor_f3.
      
      YOUR TASK: Define navigation structure and visual identity guidelines.
      
      RULES:
      - courses must use linear navigation.
      - Primary buttons: always include Anterior, Siguiente, Índice, Ayuda.
      
      IDIOMA OBLIGATORIO: Todos los valores de texto en el JSON deben estar en español.
      OUTPUT ONLY VALID JSON — EXACT STRUCTURE:
      {
        "navegacion_identidad": {
          "navegacion": {
            "tipo": "Lineal con ramificación controlada",
            "permite_saltar_modulos": false,
            "barra_progreso_visible": true,
            "botones_principales": ["Anterior", "Siguiente", "Índice", "Ayuda", "Salir"],
            "mapa_navegacion": "Módulo 1 -> Módulo 2 -> ... -> Módulo N -> Evaluación final"
          },
          "identidad_grafica": {
            "paleta_sugerida": ["DERÍVALA del contexto: usa tonos que reflejen el dominio técnico '{_frozen.dominio_tecnico}' y sean apropiados para '{_frozen.audiencia_primaria}'. Sé específico (ej: azul eléctrico para tecnología, verde para salud, naranja para manufactura)."],
            "tipografia": "DERÍVALA del contexto: elige tipografía legible y profesional apropiada para la audiencia '{_frozen.audiencia_primaria}' y el dominio '{_frozen.dominio_tecnico}'. Especifica fuente, tamaño cuerpo y títulos.",
            "requiere_logo_cliente": true,
            "justificacion": "Derivado contextualmente del dominio técnico y audiencia del curso per Nielsen (1994)"
          }
        }
      }

  # ── AGENTE 5: ACCEPTANCE CRITERIA ─────────────────────────────────────────
  - agent: agente_criterios_aceptacion
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [extractor_f3]
    include_template: false
    task: |
      You are a Quality Assurance Specialist for competency-based instructional design.
      
      SOURCE: Use ONLY data from extractor_f3.
      
      YOUR TASK: Define quality and acceptance criteria.
      
      RULES:
      - Each criterion must be VERIFIABLE.
      - Accessibility: minimum WCAG 2.1 Level AA.
      
      IDIOMA OBLIGATORIO: Todos los valores de texto en el JSON deben estar en español.
      OUTPUT ONLY VALID JSON — EXACT STRUCTURE:
      {
        "criterios_aceptacion": {
          "criterios_contenido": [
            "Cero errores ortográficos o gramaticales en el 100% del material",
            "Todos los conceptos del sector están definidos con ejemplos",
            "Los objetivos de aprendizaje están cubiertos al 100%"
          ],
          "criterios_tecnicos": [
            "El curso carga en menos de 5 segundos con una conexión de 5 Mbps",
            "Compatible con todos los navegadores especificados",
            "Los reportes SCORM se generan correctamente en el LMS especificado",
            "Los videos se reproducen sin interrupciones a 5 Mbps"
          ],
          "criterios_pedagogicos": [
            "Los participantes obtienen ≥80% en las evaluaciones sumativas",
            "La tasa de finalización del curso es ≥70% al término del período",
            "Cada módulo cuenta con al menos una actividad práctica (normativo)"
          ],
          "criterios_accesibilidad": [
            "Cumple WCAG 2.1 Nivel AA",
            "Los videos incluyen subtítulos en español",
            "Ratio de contraste de texto ≥4.5:1"
          ]
        }
      }

  # ── ASSEMBLER A ───────────────────────────────────────────────────────────
  - agent: agente_doble_A_f3
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [agente_plataforma_navegador, agente_reporteo, agente_formatos_multimedia, agente_navegacion_identidad, agente_criterios_aceptacion]
    include_template: false
    task: |
      You are a Document Assembler.
      
      Merge all agent JSON fragments into a single unified object called 'especificaciones_tecnicas'.
      Optimize coherence between sections but preserve all data.
      
      OUTPUT ONLY THE UNIFIED JSON OBJECT. No markdown wrapping. No ```json.

  # ── ASSEMBLER B ───────────────────────────────────────────────────────────
  - agent: agente_doble_B_f3
    model: "@cf/qwen/qwen2.5-7b-instruct"
    inputs_from: [agente_plataforma_navegador, agente_reporteo, agente_formatos_multimedia, agente_navegacion_identidad, agente_criterios_aceptacion]
    include_template: false
    task: |
      You are a Document Assembler — ALTERNATIVE perspective.
      
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
      Eres un Especialista en Documentación Técnica para diseño instruccional basado en competencias.

      IDIOMA OBLIGATORIO: Redacta TODO el documento en español. Ninguna sección, encabezado, lista ni tabla puede estar en inglés. Los términos técnicos (LMS, SCORM, WCAG) se conservan, pero toda la prosa y etiquetas van en español.

      Usando el JSON ganador del juez, produce el documento final de Especificaciones Técnicas.

      CONTEXTO:
      F2: {{previousData.f2_estructurado}}
      F2.5: {{previousData.f2_5_estructurado}}

      ENTRADAS DEL USUARIO PARA ESTA FASE:
      {{userInputs}}

      REGLAS:
      1. La plataforma LMS es la especificada por el usuario. NO sugiereas cambios.
      2. Copia los valores de los agentes especializados de forma literal. No reformules.
      3. SIN placeholders — todos los campos deben tener valores reales.
      4. Si un valor proviene del JSON en inglés, tradúcelo al español.

      Genera el documento Markdown completo listo para presentación al cliente.
---