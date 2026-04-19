---
id: F3
name: Especificaciones Técnicas del Curso
version: 4.0.0
tags: [EC0366, tecnico, LMS, SCORM, duracion, multimedia]
pipeline_steps:

  # ── Paso 0: Extractor ─────────────────────────────────────────────────────────
  - agent: extractor_f3
    include_template: false
    task: |
      Extrae y resume SOLO los datos necesarios para las Especificaciones Técnicas (F3).

      DE LOS INPUTS DEL USUARIO (userInputs):
      - lmsName: nombre de la plataforma LMS indicada por el usuario
      - lmsUrl: URL del LMS si la proporcionó
      - scormVersion: versión SCORM indicada (SCORM 1.2, SCORM 2004, xAPI/Tin Can, etc.)
      - startDate: fecha de inicio del curso si existe
      - perfilAjustado: JSON con el perfil del participante ajustado por el cliente en F2
        (campos: perfil_profesional, nivel_educativo_minimo, experiencia_previa,
         conocimientos_previos_requeridos, rango_de_edad_estimado, motivacion_principal)
        Si está presente, ÚSALO como perfil definitivo. Si no, usa el perfil de F1.

      DEL CONTEXTO ACUMULADO (context):
      - Nombre del proyecto y cliente
      - Sector / industria
      - De F1: horas semanales disponibles del participante
      - De F2: número de módulos, horas por módulo, nivel SCORM (1-4), plataforma sugerida
      - De F2: estrategias instruccionales (tipos de actividades)
      - De F0 (si existe): referencias bibliográficas sobre duración de videos, LMS recomendados
      - Valores resueltos de discrepancias F1↔F2 si están presentes en previousData

      DE F2.5 (FUENTE PRIMARIA — MÁXIMA PRIORIDAD si existe en el contexto):
      Busca la sección de Recomendaciones Pedagógicas (F2.5) en previousData o context.
      Si existe, extrae y usa OBLIGATORIAMENTE:
      - total_videos → numVideos (ESTE valor, no numModulos + 1)
      - duracion_promedio_minutos → duracionVideo (ESTE valor, no el default de 6 min)
      - frecuencia_revision → frecuenciaReporte (ESTE valor, no "semanal" por default)
      - horasTotales de F2.5 si difiere de F2 → usar el de F2.5
      REGLA ABSOLUTA: Si F2.5 existe, sus valores ANULAN cualquier cálculo por defecto.

      FORMATO DE SALIDA — devuelve SOLO esto, sin markdown extra:
      EXTRACTOR_F3:
      lmsName: [valor de userInputs o "Por definir"]
      lmsUrl: [valor de userInputs o "Por definir"]
      scormVersion: [valor de userInputs o "Por definir"]
      numModulos: [número de F2]
      horasTotales: [número de F2.5 si existe, si no de F2]
      nivelScorm: [1-4 de F2]
      plataformaSugerida: [valor de F2 si existe]
      estrategias: [lista breve separada por comas de F2]
      horasSemanalesParticipante: [valor de F1]
      sector: [sector del proyecto]
      refsVideoDuracion: [referencia bibliográfica si existe, o "N/A"]
      perfilParticipante: [resumen del perfil definitivo, 1-2 oraciones]
      numVideos: [de F2.5 total_videos; si no hay F2.5: numModulos + 1]
      duracionVideo: [de F2.5 duracion_promedio_minutos; si no hay F2.5: 6]
      frecuenciaReporte: [de F2.5 frecuencia_revision; si no hay F2.5: "Semanal"]

  # ── Paso 1: Plataforma y navegadores ─────────────────────────────────────────
  - agent: agente_plataforma_navegador
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [extractor_f3]
    include_template: false
    task: |
      ENTRADAS: Usa SOLO los datos de EXTRACTOR_F3.

      TU ÚNICA TAREA: Definir plataforma LMS y navegadores compatibles.

      REGLAS ABSOLUTAS:
      1. Si lmsName tiene un valor real (no "Por definir"), USA ESE NOMBRE EXACTO. NO sugieras cambios.
      2. Si lmsName es "Por definir", recomienda Moodle 4.x por defecto.
      3. Especifica versiones mínimas de navegadores reales y actuales.
      4. NO inventes URLs, versiones de LMS, ni caracterísicas que no existan.

      FORMATO DE SALIDA EXACTO (markdown, sin texto adicional):

      ## PLATAFORMA_NAVEGADOR
      **Plataforma:** [nombre exacto del LMS — usa lmsName de EXTRACTOR_F3]
      **Versión mínima:** [versión mínima del LMS]
      **Versión SCORM:** [scormVersion de EXTRACTOR_F3 — ej: SCORM 1.2, SCORM 2004, xAPI]
      **Justificación:** [1-2 oraciones basadas en sector y nivel SCORM]

      **Navegadores soportados:**
      - Chrome 90+
      - Firefox 88+
      - Edge 90+
      [añade Safari si es relevante para el sector]

      **Navegadores no soportados:**
      - Internet Explorer (todas las versiones)

      **Dispositivos:**
      - Desktop (Windows/macOS)
      - Tablet (responsive)
      - Móvil (responsive, solo lectura)

  # ── Paso 2: Reporteo y seguimiento ───────────────────────────────────────────
  - agent: agente_reporteo
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [extractor_f3]
    include_template: false
    task: |
      ENTRADAS: Usa SOLO los datos de EXTRACTOR_F3.

      TU ÚNICA TAREA: Definir métricas de reporteo según el nivel SCORM.

      REGLAS:
      - SCORM nivel 1 (Pasivo): solo tiempo y progreso
      - SCORM nivel 2 (Limitado): + calificaciones
      - SCORM nivel 3 (Moderado): + intentos y fechas
      - SCORM nivel 4 (Robusto): + métricas detalladas por actividad
      - USA el campo "frecuenciaReporte" de EXTRACTOR_F3 para la frecuencia del reporte automático.
        NO uses "semanal" por defecto si EXTRACTOR_F3 tiene otro valor.
      - Los destinatarios SIEMPRE incluyen Participante, Instructor y Administrador.

      FORMATO DE SALIDA EXACTO:

      ## REPORTEO
      | Métrica | Formato | Frecuencia |
      |:---|:---|:---|
      | Progreso por módulo | Porcentaje (%) | Por módulo completado |
      | Tiempo invertido | Minutos acumulados | Continuo |
      | Calificación en evaluaciones | Puntos / Porcentaje | Por evaluación |
      | Intentos por evaluación | Número entero | Por intento |
      | Fecha de inicio y fin | Fecha ISO | Al entrar/salir |

      **Frecuencia de reporte automático:** [semanal / mensual]
      **Formato de entrega:** PDF + Dashboard en LMS
      **Destinatarios:** Participante, Instructor, Administrador
      **Justificación:** [1 oración basada en nivel SCORM y duración del curso]

  # ── Paso 3: Formatos multimedia ───────────────────────────────────────────────
  - agent: agente_formatos_multimedia
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [extractor_f3]
    include_template: false
    task: |
      ENTRADAS: Usa SOLO los datos de EXTRACTOR_F3.

      TU ÚNICA TAREA: Definir especificaciones técnicas de multimedia.

      REGLAS:
      - Número de videos: USA el campo "numVideos" de EXTRACTOR_F3. NO calcules en base a módulos.
      - Duración por video: USA el campo "duracionVideo" de EXTRACTOR_F3 en minutos. NO uses 5-7 por defecto.
      - Resolución de video: 1920×1080 Full HD, peso máximo 500 MB por video
      - Infografías: 1 por módulo
      - PDFs: resumen por módulo + guía de ejercicios
      - Audios: SOLO si el sector lo justifica (no incluir por defecto)
      - NO pongas valores entre corchetes vacíos []. Si no tienes el dato, usa el estándar de la industria.

      FORMATO DE SALIDA EXACTO:

      ## FORMATOS_MULTIMEDIA
      ### Videos
      - **Cantidad recomendada:** [N] videos (1 por módulo + 1 introductorio)
      - **Duración óptima:** 5-7 minutos por video
      - **Resolución:** 1920×1080 (Full HD)
      - **Peso máximo:** 500 MB por archivo
      - **Herramientas sugeridas:** Camtasia, OBS Studio
      - **Referencia:** Guo, P. J., Kim, J., & Rubin, R. (2014). How video production affects student engagement.

      ### Infografías
      - **Cantidad:** [N] (1 por módulo)
      - **Dimensiones:** 1280×720 px mínimo
      - **Formato:** PNG o SVG
      - **Herramientas sugeridas:** Canva, Adobe Illustrator

      ### PDFs descargables
      - **Incluir:** Sí
      - **Contenido:** Resumen de cada módulo + guía de actividades
      - **Especificación:** A4, texto seleccionable, máx. 5 MB
      - **Herramientas:** LibreOffice Writer, Adobe Acrobat

      ### Audios
      - **Incluir:** [Sí / No — justifica con 1 oración]

  # ── Paso 4: Navegación e identidad gráfica ────────────────────────────────────
  - agent: agente_navegacion_identidad
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [extractor_f3]
    include_template: false
    task: |
      ENTRADAS: Usa SOLO los datos de EXTRACTOR_F3.

      TU ÚNICA TAREA: Definir estructura de navegación y lineamientos gráficos.

      REGLAS:
      - La navegación para cursos EC0366 debe ser lineal (módulos secuenciales)
      - Permitir saltar módulos solo si el curso es de repaso (no aplica por defecto)
      - La paleta de colores debe ser sobria y profesional (no saturada)
      - Botones principales: siempre incluir Anterior, Siguiente, Índice, Ayuda
      - NO inventar logo del cliente

      FORMATO DE SALIDA EXACTO:

      ## NAVEGACION_IDENTIDAD
      ### Navegación
      - **Tipo:** Lineal con ramificaciones controladas
      - **Permite saltar módulos:** No (secuencial obligatorio)
      - **Barra de progreso visible:** Sí
      - **Botones principales:** Anterior, Siguiente, Índice, Ayuda, Cerrar sesión
      - **Mapa de navegación:** Módulo 1 → Módulo 2 → ... → Módulo [N] → Evaluación final

      ### Identidad gráfica
      - **Paleta sugerida:** Azul corporativo (#2C3E50), Acento (#3498DB), Fondo claro (#ECF0F1)
      - **Tipografía:** Sans-serif — Arial 14px (cuerpo), Roboto 18px (títulos)
      - **Requiere logo del cliente:** Sí (insertar en encabezado y portada)
      - **Justificación:** Principios de usabilidad para contenido técnico/profesional (Nielsen, 1994)

  # ── Paso 5: Criterios de aceptación ──────────────────────────────────────────
  - agent: agente_criterios_aceptacion
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [extractor_f3]
    include_template: false
    task: |
      ENTRADAS: Usa SOLO los datos de EXTRACTOR_F3.

      TU ÚNICA TAREA: Definir criterios de calidad y aceptación para el curso.

      REGLAS:
      - Cada criterio debe ser VERIFICABLE (sí/no o tiene una métrica)
      - Incluir criterios de contenido, técnico, pedagógico y accesibilidad
      - Los criterios pedagógicos deben referenciar EC0366
      - Incluir al menos: "El curso carga en menos de 5 segundos en conexión de 5 Mbps"
      - Accesibilidad: mínimo WCAG 2.1 Nivel AA
      - NO escribas criterios vagos como "el curso debe ser bueno"

      FORMATO DE SALIDA EXACTO:

      ## CRITERIOS_ACEPTACION
      ### Criterios de contenido
      - Sin errores ortográficos ni gramaticales en el 100% del material
      - Todos los conceptos del sector [sector] están definidos con ejemplos
      - Los objetivos de aprendizaje del EC0366 están cubiertos al 100%

      ### Criterios técnicos
      - El curso carga en menos de 5 segundos en conexión de 5 Mbps
      - Compatible con los 3 navegadores especificados
      - Los reportes SCORM se generan correctamente en el LMS indicado
      - Los videos reproducen sin buffering en 5 Mbps

      ### Criterios pedagógicos
      - Los participantes alcanzan ≥80% en las evaluaciones sumativas
      - La tasa de completitud del curso es ≥70% al final del período
      - Cada módulo tiene al menos una actividad de práctica (EC0366 §4.2)

      ### Criterios de accesibilidad
      - Cumple WCAG 2.1 Nivel AA
      - Los videos tienen subtítulos en español
      - Contraste de texto ≥4.5:1

  # ── Paso 6: Cálculo de duración ───────────────────────────────────────────────
  - agent: agente_calculo_duracion
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [extractor_f3]
    include_template: false
    task: |
      ENTRADAS: Usa SOLO los datos de EXTRACTOR_F3.

      TU ÚNICA TAREA: Calcular duración total del curso con fórmula explícita.

      REGLAS:
      - Actividades por módulo = 3 (si no hay dato específico de F2)
      - Evaluación por módulo = 1 (30 minutos cada una)
      - Tiempo por actividad = 30 minutos
      - Tiempo por video = la duración de video definida (5-7 min)
      - La suma DEBE ser consistente con las horasTotales de EXTRACTOR_F3
      - Si hay discrepancia > 2 horas, usa el promedio y documéntalo
      - NUNCA dejes campos vacíos o con [N]

      FORMATO DE SALIDA EXACTO:

      ## CALCULO_DURACION
      **Fórmula:** (Módulos × Actividades × 30min) + (Módulos × 1 evaluación × 30min) + (Videos × duración)

      | Componente | Cantidad | Tiempo unitario | Total |
      |:---|:---|:---|:---|
      | Actividades prácticas | [N × módulos] | 30 min | [X] min |
      | Evaluaciones por módulo | [N módulos] | 30 min | [X] min |
      | Videos | [N] | [Y] min | [X] min |
      | Lecturas / PDFs | [N] | 15 min | [X] min |
      | **TOTAL** | | | **[X] min = [Y] horas** |

      **Duración total:** [N] horas
      **Distribución semanal:** [N] semanas × [X] horas/semana
      **Justificación:** [1 oración referenciando disponibilidad de F1 y estructura de F2]

  # ── Paso 7: Ensamblador A ─────────────────────────────────────────────────────
  - agent: agente_doble_A_f3
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [agente_plataforma_navegador, agente_reporteo, agente_formatos_multimedia, agente_navegacion_identidad, agente_criterios_aceptacion, agente_calculo_duracion, extractor_f3]
    include_template: false
    task: |
      ENTRADAS: Los 6 bloques de los agentes especializados.

      TU ÚNICA TAREA: Ensamblar el documento F3 completo en formato Markdown.

      REGLAS ABSOLUTAS:
      1. COPIA los valores de cada agente SIN modificarlos ni reformularlos
      2. NO añadas secciones nuevas ni omitas ninguna de las 7 secciones requeridas
      3. NO uses placeholders [texto] — todos los valores ya vienen de los agentes
      4. Incluye la sección 7 de REFERENCIAS BIBLIOGRÁFICAS siempre
      5. Usa los datos de EXTRACTOR_F3 para el encabezado del documento

      DOCUMENTO F3 — FORMATO OBLIGATORIO:

      # ESPECIFICACIONES TÉCNICAS DEL CURSO
      **Proyecto:** [de extractor_f3]
      **Cliente:** [de extractor_f3]
      **Fecha:** [fecha actual YYYY-MM-DD]

      ---

      ## 1. PLATAFORMA Y NAVEGADORES
      [Contenido de AGENTE_PLATAFORMA_NAVEGADOR — copiar exactamente]

      ---

      ## 2. REPORTEO Y SEGUIMIENTO
      [Contenido de AGENTE_REPORTEO — copiar exactamente]

      ---

      ## 3. FORMATOS MULTIMEDIA
      [Contenido de AGENTE_FORMATOS_MULTIMEDIA — copiar exactamente]

      ---

      ## 4. NAVEGACIÓN E IDENTIDAD GRÁFICA
      [Contenido de AGENTE_NAVEGACION_IDENTIDAD — copiar exactamente]

      ---

      ## 5. CRITERIOS DE ACEPTACIÓN
      [Contenido de AGENTE_CRITERIOS_ACEPTACION — copiar exactamente]

      ---

      ## 6. CÁLCULO DE DURACIÓN DEL CURSO
      [Contenido de AGENTE_CALCULO_DURACION — copiar exactamente]

      ---

      ## 7. REFERENCIAS BIBLIOGRÁFICAS
      - Guo, P. J., Kim, J., & Rubin, R. (2014). How video production affects student engagement. *ACM Learning at Scale Conference*.
      - Mayer, R. E. (2009). *Multimedia Learning* (2nd ed.). Cambridge University Press.
      - Nielsen, J. (1994). *Usability Engineering*. Academic Press.
      - Sweller, J. (1988). Cognitive load during problem solving. *Cognitive Science, 12*(2), 257–285.
      - WCAG 2.1 — Web Content Accessibility Guidelines. W3C Recommendation (2018).

  # ── Paso 8: Ensamblador B ─────────────────────────────────────────────────────
  - agent: agente_doble_B_f3
    model: "@cf/qwen/qwen2.5-7b-instruct"
    inputs_from: [agente_plataforma_navegador, agente_reporteo, agente_formatos_multimedia, agente_navegacion_identidad, agente_criterios_aceptacion, agente_calculo_duracion, extractor_f3]
    include_template: false
    task: |
      ENTRADAS: Los 6 bloques de los agentes especializados.

      TU ÚNICA TAREA: Ensamblar el documento F3 completo en formato Markdown.
      Este es el Borrador B — usa exactamente los mismos datos que el Borrador A pero
      puedes reordenar levemente los bullets y variar el tono (más formal/más conciso).

      REGLAS ABSOLUTAS:
      1. MISMAS 7 SECCIONES que el Borrador A — NO omitas ni añadas secciones
      2. Los valores numéricos (horas, métricas, versiones) deben ser IDÉNTICOS al Borrador A
      3. NO uses placeholders [texto]
      4. Incluye referencias bibliográficas en Sección 7

      MISMO FORMATO DE SALIDA que Borrador A (ver instrucciones del agente_doble_A_f3)

  # ── Paso 9: Juez ─────────────────────────────────────────────────────────────
  - agent: agente_juez_f3
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [agente_doble_A_f3, agente_doble_B_f3]
    include_template: false
    task: |
      ENTRADAS: Borrador A y Borrador B del documento F3.

      TU ÚNICA TAREA: Comparar y validar ambos borradores.

      CRITERIOS DE VALIDACIÓN:
      1. ¿Ambos tienen exactamente 7 secciones numeradas (1-7)?
      2. ¿La duración total en sección 6 es consistente con la suma del desglose?
      3. ¿Los navegadores especificados son coherentes con la plataforma LMS?
      4. ¿Las métricas de reporteo tienen frecuencia definida?
      5. ¿La sección 7 tiene al menos 3 referencias bibliográficas reales?
      6. ¿Hay placeholders sin resolver como [N], [X], [texto]?

      DECISIÓN:
      - "ok": ambos borradores son válidos, elige el más completo
      - "revisar": hay inconsistencias menores corregibles
      - "humano": hay contradicciones graves o datos inventados

      FORMATO DE SALIDA — devuelve SOLO este JSON (sin markdown, sin texto adicional):
      {
        "similitud_general": [0-100],
        "borrador_elegido": "A" o "B",
        "secciones_ok": ["plataforma", "reporteo", "multimedia", "navegacion", "criterios", "duracion", "referencias"],
        "secciones_con_problema": [],
        "discrepancias": [
          {"aspecto": "...", "borrador_A": "...", "borrador_B": "...", "decision": "usar A/B porque..."}
        ],
        "decision": "ok",
        "justificacion": "..."
      }

  # ── Paso 10: Validador F3 (código, sin IA) ───────────────────────────────────
  # Detecta placeholders [Y], [N], [X] en los borradores. Si el borrador elegido
  # tiene más placeholders que el alternativo, cambia la elección del juez.
  # También verifica consistencia de duración y videos contra extractor_f3.
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
