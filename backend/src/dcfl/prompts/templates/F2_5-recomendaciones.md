---
id: F2_5
name: Recomendaciones Pedagógicas de Producción
version: 2.0.0
tags: [EC0366, pedagogico, actividades, metricas, videos, produccion]
pipeline_steps:

  # ── Paso 0: Extractor ─────────────────────────────────────────────────────────
  - agent: extractor_f2_5
    include_template: false
    task: |
      Extrae y resume SOLO los datos necesarios para las Recomendaciones Pedagógicas (F2.5).

      DEL CONTEXTO ACUMULADO (context/compactContext):
      - Nombre del proyecto y cliente
      - Sector / industria
      - numModulos: número de módulos del curso (entero)
      - nivelScorm: nivel SCORM del curso (1, 2, 3 o 4)
      - modalidad: presencial, virtual, mixta, etc.
      - horasTotales: horas totales del curso
      - horasSemanales: horas semanales disponibles del participante
      - perfilParticipante: resumen del perfil del participante (1-2 oraciones)

      DE LOS INPUTS DEL USUARIO (userInputs):
      - Cualquier dato adicional proporcionado por el usuario en esta fase
      - valoresResueltos: resoluciones de discrepancias F1↔F2 si existen

      DEL CONTEXTO PREVIO (F1, F2):
      - objetivos: lista de objetivos de aprendizaje relevantes (2-4 máximo)

      FORMATO DE SALIDA — devuelve SOLO esto, sin markdown extra:
      EXTRACTOR_F2_5:
      projectName: [nombre del proyecto]
      clientName: [nombre del cliente]
      sector: [sector del proyecto]
      numModulos: [número entero de módulos]
      nivelScorm: [1, 2, 3 o 4]
      modalidad: [presencial / virtual / mixta]
      horasTotales: [número total de horas]
      horasSemanales: [horas semanales del participante]
      perfilParticipante: [resumen del perfil, 1-2 oraciones]
      valoresResueltos: [lista de resoluciones o "Sin discrepancias"]
      objetivos: [objetivo 1; objetivo 2; ...]

  # ── Paso 1: Actividades de aprendizaje ───────────────────────────────────────
  - agent: agente_actividades
    inputs_from: [extractor_f2_5]
    include_template: false
    task: |
      ENTRADAS: Usa SOLO los datos de EXTRACTOR_F2_5.

      TU ÚNICA TAREA: Generar la tabla de actividades de aprendizaje recomendadas.

      REGLAS ABSOLUTAS:
      1. Genera exactamente 4 a 6 filas en la tabla (ajustado al nivelScorm y horasTotales).
      2. Si nivelScorm es 1 o 2: NO incluyas foros de discusión ni simulaciones.
         Si nivelScorm es 3 o 4: SÍ incluye al menos 1 foro de discusión y 1 simulación/roleplay.
      3. Cada tipo de actividad debe tener propósito pedagógico específico al sector indicado.
      4. La frecuencia sugerida debe ser concreta: "1 por módulo", "2 por semana", etc.
      5. La columna Justificación debe ser 1 oración pedagógica específica (no genérica).
      6. NO uses placeholders [N] o [valor]. Escribe valores reales.
      7. Incluye EXACTAMENTE 1 referencia bibliográfica real al final.
         Usa: Mayer, R. E. (2009). *Multimedia Learning* (2nd ed.). Cambridge University Press.

      FORMATO DE SALIDA EXACTO:

      ## ACTIVIDADES_APRENDIZAJE
      | # | Tipo de actividad | Propósito pedagógico | Frecuencia sugerida | Justificación |
      |:---|:---|:---|:---|:---|
      [4-6 filas con valores concretos, sin celdas vacías]

      **Referencia bibliográfica:**
      > Mayer, R. E. (2009). *Multimedia Learning* (2nd ed.). Cambridge University Press.

  # ── Paso 2: Métricas de seguimiento ──────────────────────────────────────────
  - agent: agente_metricas
    inputs_from: [extractor_f2_5]
    include_template: false
    task: |
      ENTRADAS: Usa SOLO los datos de EXTRACTOR_F2_5.

      TU ÚNICA TAREA: Generar la tabla de métricas a reportar con frecuencia de seguimiento.

      REGLAS ABSOLUTAS:
      1. Genera exactamente 5 métricas en la tabla.
      2. TODAS las métricas deben tener LA MISMA frecuencia de revisión.
         Si horasTotales > 8: frecuencia = "Semanal".
         Si horasTotales <= 8: frecuencia = "Por módulo completado".
      3. Las métricas deben ser relevantes para el nivelScorm:
         - Nivel 1-2: progreso, tiempo, calificación básica.
         - Nivel 3-4: añade intentos por evaluación, actividad por módulo, completitud.
      4. La columna "Por qué es importante" debe ser específica al sector.
      5. NO uses placeholders [N] o [valor]. Escribe valores reales.
      6. Incluye EXACTAMENTE 1 referencia bibliográfica real al final.
         Usa: Siemens, G. (2005). Connectivism: A learning theory for the digital age.
         *International Journal of Instructional Technology and Distance Learning, 2*(1), 3–10.

      FORMATO DE SALIDA EXACTO:

      ## METRICAS_SEGUIMIENTO
      | Métrica | Descripción | Por qué es importante | Frecuencia de revisión |
      |:---|:---|:---|:---|
      [5 filas con la MISMA frecuencia en todas]

      **Frecuencia de revisión recomendada:** [Semanal / Por módulo completado]
      **Justificación:** [1 oración explicando la frecuencia elegida]

      **Referencia bibliográfica:**
      > Siemens, G. (2005). Connectivism: A learning theory for the digital age.
      > *International Journal of Instructional Technology and Distance Learning, 2*(1), 3–10.

  # ── Paso 2.5: Estructura temática real ───────────────────────────────────────
  - agent: agente_estructura
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [extractor_f2_5]
    include_template: false
    max_input_chars: 3000
    task: |
      Genera la estructura temática del curso como tabla Markdown.
      
      ## ESTRUCTURA TEMÁTICA
      
      | Módulo | Nombre |
      |:---|:---|
      | 1 | [nombre del módulo 1] |
      | 2 | [nombre del módulo 2] |
      | 3 | [nombre del módulo 3] |
      
      REGLAS OBLIGATORIAS:
      - NO uses JSON. Devuelve SOLO la tabla Markdown.
      - Genera EXACTAMENTE 3 módulos.
      - Los nombres deben coincidir con los definidos en F2.

  # ── Paso 3: Estructura de videos ─────────────────────────────────────────────
  - agent: agente_videos
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [extractor_f2_5, agente_estructura]
    include_template: false
    max_input_chars: 4000
    task: |
      Genera la configuración de videos en formato JSON simple.
      
      NO generes tablas. NO uses placeholders. Solo devuelve JSON:
      
      {
        "videos_contenido": 6,
        "duracion_por_video_min": 5,
        "duracion_por_video_max": 7
      }
      
      IMPORTANTE: videos_contenido = numModulos × 2. Si numModulos = 3, entonces videos_contenido = 6.

  # ── Paso 4: Revisor de referencias ───────────────────────────────────────────
  - agent: agente_referencias
    inputs_from: [agente_actividades, agente_metricas, agente_videos]
    include_template: false
    task: |
      Genera SOLO las 3 referencias bibliográficas solicitadas.
      
      NO incluyas "Perfil de Ingreso" ni ninguna otra sección.
      NO incluyas tablas adicionales.
      
      Devuelve SOLO:
      ### REFERENCIAS
      
      **Actividades:**
      > [referencia APA]
      
      **Métricas:**
      > [referencia APA]
      
      **Videos:**
      > [referencia APA]

  # ── Paso 5: Ensamblador A ────────────────────────────────────────────────────
  - agent: agente_doble_A_f2_5
    inputs_from: [agente_actividades, agente_metricas, agente_videos, agente_referencias]
    task: |
      Eres el ENSAMBLADOR A. Tu ÚNICA tarea es copiar y pegar las secciones generadas por los agentes anteriores.
      
      REGLAS ESTRICTAS - VIOLARLAS ES UN ERROR GRAVE:
      1. COPIA EXACTAMENTE las tablas SIN MODIFICAR NINGUNA COLUMNA.
      2. Si la tabla de métricas tiene 4 columnas (Métrica | Descripción | Por qué es importante | Frecuencia de revisión), DEBE mantenerlas.
      3. NO elimines, combines ni renombres columnas.
      4. NO modifiques el contenido de las celdas.
      5. NO resumas ni parafrasees.
      6. Solo pega el contenido exacto que recibiste de cada agente.
      
      Secciones a ensamblar en este orden:
      [Pega aquí el contenido de AGENTE_ACTIVIDADES]
      [Pega aquí el contenido de AGENTE_METRICAS]
      [Pega aquí el contenido de AGENTE_ESTRUCTURA]
      [Pega aquí el contenido de AGENTE_VIDEOS]
      [Pega aquí el contenido de AGENTE_REFERENCIAS]

  # ── Paso 6: Ensamblador B ────────────────────────────────────────────────────
  - agent: agente_doble_B_f2_5
    model: "@cf/qwen/qwen2.5-7b-instruct"
    inputs_from: [agente_actividades, agente_metricas, agente_videos, agente_referencias]
    task: |
      Eres el ENSAMBLADOR A. Tu ÚNICA tarea es copiar y pegar las secciones generadas por los agentes anteriores.
      
      REGLAS ESTRICTAS - VIOLARLAS ES UN ERROR GRAVE:
      1. COPIA EXACTAMENTE las tablas SIN MODIFICAR NINGUNA COLUMNA.
      2. Si la tabla de métricas tiene 4 columnas (Métrica | Descripción | Por qué es importante | Frecuencia de revisión), DEBE mantenerlas.
      3. NO elimines, combines ni renombres columnas.
      4. NO modifiques el contenido de las celdas.
      5. NO resumas ni parafrasees.
      6. Solo pega el contenido exacto que recibiste de cada agente.
      
      Secciones a ensamblar en este orden:
      [Pega aquí el contenido de AGENTE_ACTIVIDADES]
      [Pega aquí el contenido de AGENTE_METRICAS]
      [Pega aquí el contenido de AGENTE_ESTRUCTURA]
      [Pega aquí el contenido de AGENTE_VIDEOS]
      [Pega aquí el contenido de AGENTE_REFERENCIAS]

  # ── Paso 7: Juez ─────────────────────────────────────────────────────────────
  - agent: agente_juez_f2_5
    inputs_from: [agente_doble_A_f2_5, agente_doble_B_f2_5]
    rules:
      - "SCORM: nivel debe ser 1,2,3,4 (no rangos)"
      - "Perfil ingreso: exactamente 5 filas"
      - "Estrategias: tabla 4 columnas, módulos referenciados deben existir"
      - "Sin placeholders: [texto], [N], [X], [Y] no permitidos"
      - "TABLA DE VIDEOS: Las columnas Cantidad y Duración total deben contener SOLO números o rangos (ej. 30-42). NO deben contener operadores matemáticos como ×, +, -, / ni fórmulas como '3 × 2' o '1 + 6 + 1'"
    include_template: false
    task: |
      ENTRADAS: Borrador A y Borrador B del documento F2.5.

      TU ÚNICA TAREA: Comparar y validar ambos borradores según las reglas del pipeline F2.5.

      VALIDACIONES OBLIGATORIAS — verifica cada una en ambos borradores:
      1. videos_vs_modulos: El total de videos >= numModulos Y total de videos <= numModulos × 4.
         Extrae numModulos de la tabla 3.1 (busca "módulos"). Extrae total_videos de la tabla 3.3.
      2. scorm_vs_actividades: Si nivelScorm es 1 o 2, no debe haber foros ni simulaciones.
         Si nivelScorm es 3 o 4, debe haber al menos 1 foro o simulación en la sección 1.
      3. frecuencias_consistentes: Todas las métricas de la sección 2 deben tener la MISMA frecuencia.

      CRITERIO DE SELECCIÓN:
      - Elige el borrador que pase más validaciones. En caso de empate, elige A.
      - Si ambos fallan la misma validación, elige A y documenta la corrección en "correcciones".

      FORMATO DE SALIDA — devuelve SOLO este JSON, sin markdown alrededor, sin ```json, sin texto adicional:
      {"borrador_elegido": "A", "validaciones": {"videos_vs_modulos": "ok", "scorm_vs_actividades": "ok", "frecuencias_consistentes": "ok"}, "correcciones": []}

  # ── Paso 8: Sintetizador final (code-only) ────────────────────────────────────
  - agent: sintetizador_final_f2_5
    inputs_from: [agente_juez_f2_5]
    include_template: false
    task: "Código lo maneja"
---

Actúa como un diseñador instruccional certificable en EC0366 con experiencia en pedagogía activa, métricas de aprendizaje y producción de contenidos digitales.

## CONTEXTO ACUMULADO DEL PROYECTO
{{context}}

## DATOS DE ENTRADA DEL USUARIO EN ESTA FASE
{{userInputs}}

## REGLAS ABSOLUTAS
1. Basa las recomendaciones en el número de módulos, nivel SCORM y horas totales del contexto.
2. El número de videos SIEMPRE sigue la fórmula: (numModulos × videos_por_módulo) + 1 video de resumen.
3. Las frecuencias de métricas son CONSISTENTES (todas las métricas tienen la misma frecuencia).
4. NO uses placeholders `[N]`, `[X]`, `[valor]`. Todos los campos deben tener valores reales.
5. Responde SOLO en español.
