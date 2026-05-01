---
id: F3
name: Especificaciones Técnicas del Curso
version: 4.0.0
tags: [EC0366, tecnico, LMS, SCORM, duracion, multimedia]
pipeline_steps:

  # ── Paso 0: Extractor ─────────────────────────────────────────────────────────
  - agent: extractor_f3
    inputs_from: []
    include_template: false
    task: |
      Extrae y resume SOLO los datos necesarios para las Especificaciones Técnicas (F3).
      
      Los datos estructurados están en:
      - compactContext.previousData.f2_estructurado (de Fase 2)
      - compactContext.previousData.f2_5_estructurado (de Fase 2.5)
      
      ============================================================
      DATOS A EXTRAER DE F2 (Especificaciones de Análisis)
      ============================================================
      - num_modulos: número de módulos (de f2_estructurado.modulos.length)
      - perfil_ingreso: las 5 categorías del perfil
      - estrategias: lista de estrategias instruccionales
      - modalidad: modalidad del curso (asincrónico/sincrónico/mixto)
      - plataforma: plataforma LMS sugerida
      
      ============================================================
      DATOS A EXTRAER DE F2.5 (Recomendaciones Pedagógicas)
      ============================================================
      - total_videos: número total de videos recomendados
      - duracion_promedio_video: duración promedio por video (minutos)
      - metricas: lista de métricas a reportear
      - frecuencia_reportes: frecuencia de reporteo (semanal, mensual, etc.)
      - actividades: lista de actividades recomendadas
      
      ============================================================
      INSTRUCCIONES FINALES
      ============================================================
      1. Busca estos datos en compactContext.previousData
      2. Si un dato no está disponible, escribe "No especificado en F2/F2.5"
      3. NO inventes valores. NO uses placeholders.
      4. Devuelve SOLO JSON con esta estructura:
      
      {
        "num_modulos": 0,
        "total_videos": 0,
        "duracion_promedio_video": 0,
        "frecuencia_reportes": "string",
        "plataforma": "string",
        "modalidad": "string",
        "perfil_ingreso": {
          "escolaridad": "string",
          "conocimientos_previos": "string",
          "habilidades_digitales": "string",
          "equipo": "string",
          "conexion": "string"
        }
      }

  # ── Paso 1: Plataforma y navegadores ─────────────────────────────────────────
  - agent: agente_plataforma_navegador
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [extractor_f3]
    include_template: false
    task: |
      ENTRADAS: Usa SOLO los datos de EXTRACTOR_F3.

      TU ÚNICA TAREA: Definir plataforma LMS y navegadores compatibles en formato JSON estricto.

      REGLAS ABSOLUTAS:
      1. Si lmsName tiene un valor real (no "Por definir"), USA ESE NOMBRE EXACTO. NO sugieras cambios.
      2. Si lmsName es "Por definir", recomienda Moodle 4.x por defecto.
      3. Especifica versiones mínimas de navegadores reales y actuales.
      4. NO inventes URLs, versiones de LMS, ni caracterísicas que no existan.
      5. PROHÍBE EL MARKDOWN. Devuelve SOLO tu fragmento JSON.

      FORMATO DE SALIDA EXACTO:
      {
        "plataforma_navegador": {
          "plataforma": "nombre exacto del LMS",
          "version_minima": "versión mínima del LMS",
          "version_scorm": "ej: SCORM 1.2, SCORM 2004, xAPI",
          "justificacion": "1-2 oraciones basadas en sector y nivel SCORM",
          "navegadores_soportados": ["Chrome 90+", "Firefox 88+", "Edge 90+"],
          "navegadores_no_soportados": ["Internet Explorer (todas las versiones)"],
          "dispositivos": ["Desktop (Windows/macOS)", "Tablet (responsive)", "Móvil (responsive, solo lectura)"]
        }
      }

  # ── Paso 2: Reporteo y seguimiento ───────────────────────────────────────────
  - agent: agente_reporteo
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [extractor_f3]
    include_template: false
    task: |
      ENTRADAS: Usa SOLO los datos de EXTRACTOR_F3.

      TU ÚNICA TAREA: Definir métricas de reporteo según el nivel SCORM en JSON estricto.

      REGLAS:
      - SCORM nivel 1 (Pasivo): solo tiempo y progreso
      - SCORM nivel 2 (Limitado): + calificaciones
      - SCORM nivel 3 (Moderado): + intentos y fechas
      - SCORM nivel 4 (Robusto): + métricas detalladas por actividad
      - USA el campo "frecuenciaReporte" de EXTRACTOR_F3 para la frecuencia del reporte automático.
      - PROHÍBE EL MARKDOWN. Devuelve SOLO tu fragmento JSON.

      FORMATO DE SALIDA EXACTO:
      {
        "reporteo": {
          "metricas": [
            { "metrica": "Progreso por módulo", "formato": "Porcentaje (%)", "frecuencia": "Por módulo completado" },
            { "metrica": "Tiempo invertido", "formato": "Minutos acumulados", "frecuencia": "Continuo" }
          ],
          "frecuencia_reporte_automatico": "semanal / mensual",
          "formato_entrega": "PDF + Dashboard en LMS",
          "destinatarios": ["Participante", "Instructor", "Administrador"],
          "justificacion": "1 oración basada en nivel SCORM y duración del curso"
        }
      }

  # ── Paso 3: Formatos multimedia ───────────────────────────────────────────────
  - agent: agente_formatos_multimedia
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [extractor_f3]
    include_template: false
    task: |
      Genera los formatos multimedia en JSON estricto usando los datos del extractor_f3.
      
      Campos disponibles en EXTRACTOR_F3:
      - total_videos: número total de videos del curso
      - duracion_promedio_video: duración promedio por video en minutos
      
      PROHÍBE EL MARKDOWN. Devuelve SOLO tu fragmento JSON:

      FORMATO DE SALIDA EXACTO:
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
            "contenido": "Resumen de cada módulo + guía de actividades",
            "especificacion": "A4, texto seleccionable, máx. 5 MB"
          },
          "audios": {
            "incluir": false
          }
        }
      }

  # ── Paso 4: Navegación e identidad gráfica ────────────────────────────────────
  - agent: agente_navegacion_identidad
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [extractor_f3]
    include_template: false
    task: |
      ENTRADAS: Usa SOLO los datos de EXTRACTOR_F3.

      TU ÚNICA TAREA: Definir estructura de navegación y lineamientos gráficos en JSON estricto.

      REGLAS:
      - La navegación para cursos EC0366 debe ser lineal.
      - Botones principales: siempre incluir Anterior, Siguiente, Índice, Ayuda.
      - PROHÍBE EL MARKDOWN. Devuelve SOLO tu fragmento JSON.

      FORMATO DE SALIDA EXACTO:
      {
        "navegacion_identidad": {
          "navegacion": {
            "tipo": "Lineal con ramificaciones controladas",
            "permite_saltar_modulos": false,
            "barra_progreso_visible": true,
            "botones_principales": ["Anterior", "Siguiente", "Índice", "Ayuda", "Cerrar sesión"],
            "mapa_navegacion": "Módulo 1 -> Módulo 2 -> ... -> Módulo N -> Evaluación final"
          },
          "identidad_grafica": {
            "paleta_sugerida": ["Azul corporativo (#2C3E50)", "Acento (#3498DB)", "Fondo claro (#ECF0F1)"],
            "tipografia": "Sans-serif — Arial 14px (cuerpo), Roboto 18px (títulos)",
            "requiere_logo_cliente": true,
            "justificacion": "Principios de usabilidad para contenido técnico/profesional (Nielsen, 1994)"
          }
        }
      }

  # ── Paso 5: Criterios de aceptación ──────────────────────────────────────────
  - agent: agente_criterios_aceptacion
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [extractor_f3]
    include_template: false
    task: |
      ENTRADAS: Usa SOLO los datos de EXTRACTOR_F3.

      TU ÚNICA TAREA: Definir criterios de calidad y aceptación en JSON estricto.

      REGLAS:
      - Cada criterio debe ser VERIFICABLE.
      - Accesibilidad: mínimo WCAG 2.1 Nivel AA.
      - PROHÍBE EL MARKDOWN. Devuelve SOLO tu fragmento JSON.

      FORMATO DE SALIDA EXACTO:
      {
        "criterios_aceptacion": {
          "criterios_contenido": [
            "Sin errores ortográficos ni gramaticales en el 100% del material",
            "Todos los conceptos del sector están definidos con ejemplos",
            "Los objetivos de aprendizaje del EC0366 están cubiertos al 100%"
          ],
          "criterios_tecnicos": [
            "El curso carga en menos de 5 segundos en conexión de 5 Mbps",
            "Compatible con los navegadores especificados",
            "Los reportes SCORM se generan correctamente en el LMS indicado",
            "Los videos reproducen sin buffering en 5 Mbps"
          ],
          "criterios_pedagogicos": [
            "Los participantes alcanzan ≥80% en las evaluaciones sumativas",
            "La tasa de completitud del curso es ≥70% al final del período",
            "Cada módulo tiene al menos una actividad de práctica (EC0366 §4.2)"
          ],
          "criterios_accesibilidad": [
            "Cumple WCAG 2.1 Nivel AA",
            "Los videos tienen subtítulos en español",
            "Contraste de texto ≥4.5:1"
          ]
        }
      }

  # ── Paso 6: Cálculo de duración ───────────────────────────────────────────────
  - agent: agente_calculo_duracion
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [extractor_f3]
    include_template: false
    max_input_chars: 3000
    task: |
      Calcula la duración total del curso usando los datos del extractor_f3.
      
      REGLAS OBLIGATORIAS:
      - Realiza los cálculos aritméticos EXPLÍCITAMENTE.
      - PROHÍBE EL MARKDOWN. Devuelve SOLO tu fragmento JSON.
      
      FORMATO DE SALIDA EXACTO:
      {
        "calculo_duracion": {
          "desglose": [
            { "componente": "Actividades prácticas", "cantidad": 3, "tiempo_unitario_min": 30, "total_min": 90 },
            { "componente": "Evaluaciones formativas", "cantidad": 3, "tiempo_unitario_min": 30, "total_min": 90 },
            { "componente": "Videos", "cantidad": 8, "tiempo_unitario_min": 5, "total_min": 40 }
          ],
          "duracion_total_minutos": 220,
          "duracion_total_horas_aprox": 3.6,
          "distribucion_semanal_horas": 0.9
        }
      }

  # ── Paso 7: Ensamblador A ─────────────────────────────────────────────────────
  - agent: agente_doble_A_f3
    inputs_from: [agente_plataforma_navegador, agente_reporteo, agente_formatos_multimedia, agente_navegacion_identidad, agente_criterios_aceptacion, agente_calculo_duracion]
    include_template: false
    task: |
      Toma los fragmentos JSON de los agentes anteriores y únelos en un solo objeto JSON unificado llamado 'especificaciones_tecnicas'. 
      Puedes optimizar la coherencia entre ellos, pero la salida DEBE ser estrictamente este objeto JSON gigante.
      NO DEVUELVAS MARKDOWN. NO USES ```json. SOLO EL OBJETO.

  # ── Paso 8: Ensamblador B ─────────────────────────────────────────────────────
  - agent: agente_doble_B_f3
    model: "@cf/qwen/qwen2.5-7b-instruct"
    inputs_from: [agente_plataforma_navegador, agente_reporteo, agente_formatos_multimedia, agente_navegacion_identidad, agente_criterios_aceptacion, agente_calculo_duracion]
    include_template: false
    max_input_chars: 4000
    task: |
      Toma los fragmentos JSON de los agentes anteriores y únelos en un solo objeto JSON unificado llamado 'especificaciones_tecnicas'. 
      Puedes optimizar la coherencia entre ellos, pero la salida DEBE ser estrictamente este objeto JSON gigante.
      NO DEVUELVAS MARKDOWN. NO USES ```json. SOLO EL OBJETO.

  # ── Paso 9: Juez ─────────────────────────────────────────────────────────────
  - agent: agente_juez_f3
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [agente_doble_A_f3, agente_doble_B_f3]
    include_template: false
    max_input_chars: 5000
    task: |
      ENTRADAS: Borrador A y Borrador B del documento F3 (ambos en JSON).

      TU ÚNICA TAREA: Evalúa qué JSON tiene mayor rigor técnico según EC0366 y coherencia.
      
      REGLA ABSOLUTA: Devuelve ÚNICAMENTE el objeto JSON ganador en su totalidad. No respondas con justificaciones ni atributos extra fuera del JSON final unificado que servirá de payload al backend.

  # ── Paso 10: Validador F3 (código, sin IA) ───────────────────────────────────
  - agent: validador_f3
    inputs_from: [agente_juez_f3]

  # ── Paso 11: Sintetizador final (code-only) ───────────────────────────────────
  - agent: sintetizador_final_f3
    inputs_from: [agente_juez_f3]
---

Actúa como un diseñador instruccional certificable en EC0366 con experiencia en implementación de LMS y estándares SCORM/xAPI.

## CONTEXTO ACUMULADO DEL PROYECTO
{{context}}

## DATOS DE ENTRADA DEL USUARIO EN ESTA FASE
{{userInputs}}

## REGLAS ABSOLUTAS
1. La plataforma LMS es la que indicó el usuario. NO sugieras cambiar de plataforma.
2. Copia textualmente los valores de los agentes especializados. No los reformules.
3. NO uses placeholders `[X]`, `[N]`, `[texto]`. Todos los campos deben tener valores reales.
4. Responde SOLO en español.
