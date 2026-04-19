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

  # ── Paso 3: Estructura de videos ─────────────────────────────────────────────
  - agent: agente_videos
    inputs_from: [extractor_f2_5]
    include_template: false
    task: |
      ENTRADAS: Usa SOLO los datos de EXTRACTOR_F2_5. El campo numModulos es crítico.

      TU ÚNICA TAREA: Calcular y describir la estructura de videos recomendada.

      REGLAS ABSOLUTAS:
      1. CÁLCULO DE VIDEOS — aplica esta fórmula exacta:
         - Videos por módulo: usa 2 como valor por defecto.
         - Video de resumen ejecutivo: 1 al final del curso.
         - Total = (numModulos × 2) + 1.
         Ejemplo con numModulos=3: Total = (3×2)+1 = 7 videos.
         Ejemplo con numModulos=5: Total = (5×2)+1 = 11 videos.
      2. Escribe el valor concreto de numModulos y el total calculado en cada celda. NO uses [N].
      3. Duración recomendada: 5-7 minutos por video (basado en Guo et al. 2014).
      4. Duración máxima: 10 minutos.
      5. Completa la tabla 3.3 con la duración total en horas: (total_videos × 6) / 60.
      6. Incluye la referencia Guo et al. 2014 obligatoriamente.

      FORMATO DE SALIDA EXACTO (sustituye los valores entre paréntesis con números reales):

      ## VIDEOS_ESTRUCTURA

      ### 3.1 Número de videos recomendado
      | Componente | Cantidad | Criterio |
      |:---|:---|:---|
      | Video introductorio | 1 | Presentación del curso y objetivos |
      | Videos de contenido ([numModulos] módulos × 2 videos/módulo) | [numModulos × 2] | Contenido instruccional por módulo |
      | Video de resumen ejecutivo | 1 | Cierre y síntesis del curso |
      | **Total estimado** | **[total] videos** | |

      ### 3.2 Duración recomendada por tipo
      | Tipo | Duración óptima | Duración máxima | Justificación |
      |:---|:---|:---|:---|
      | Video introductorio | 3-5 minutos | 7 minutos | Captar atención inicial |
      | Video de contenido por módulo | 5-7 minutos | 10 minutos | Carga cognitiva óptima (Guo et al. 2014) |
      | Video de resumen | 4-6 minutos | 8 minutos | Consolidación del aprendizaje |

      ### 3.3 Resumen ejecutivo para F3
      | Parámetro | Valor recomendado |
      |:---|:---|
      | Total de videos sugeridos | [total calculado] |
      | Duración promedio por video | 6 minutos |
      | Duración total de videos | [total × 6 / 60] horas aprox. |
      | Frecuencia de reportes | Semanal |

      **Referencia:** > Guo, P. J., Kim, J., & Rubin, R. (2014). *How video production affects student engagement: An empirical study of MOOC videos*. ACM Learning at Scale 2014.

  # ── Paso 4: Revisor de referencias ───────────────────────────────────────────
  - agent: agente_referencias
    inputs_from: [agente_actividades, agente_metricas, agente_videos]
    include_template: false
    task: |
      ENTRADAS: Los outputs de agente_actividades, agente_metricas y agente_videos.

      TU ÚNICA TAREA: Revisar y completar las referencias bibliográficas de las 3 secciones.

      REGLAS ABSOLUTAS:
      1. Devuelve 3 referencias, una para cada sección: Actividades, Métricas y Videos.
      2. Usa ÚNICAMENTE autores reales con publicaciones verificables:
         - Para Actividades: Mayer, R. E. (2009). *Multimedia Learning* (2nd ed.). Cambridge University Press.
         - Para Métricas: Siemens, G. (2005). Connectivism: A learning theory for the digital age.
           *International Journal of Instructional Technology and Distance Learning, 2*(1), 3–10.
         - Para Videos: Guo, P. J., Kim, J., & Rubin, R. (2014). *How video production affects student engagement:
           An empirical study of MOOC videos*. ACM Learning at Scale 2014.
      3. NO inventes autores, años ni títulos. Usa exactamente las citas de arriba.
      4. Formatea cada referencia en estilo APA.

      FORMATO DE SALIDA EXACTO:

      ## REFERENCIAS_VALIDADAS
      **Sección 1 — Actividades:**
      > Mayer, R. E. (2009). *Multimedia Learning* (2nd ed.). Cambridge University Press.

      **Sección 2 — Métricas:**
      > Siemens, G. (2005). Connectivism: A learning theory for the digital age.
      > *International Journal of Instructional Technology and Distance Learning, 2*(1), 3–10.

      **Sección 3 — Videos:**
      > Guo, P. J., Kim, J., & Rubin, R. (2014). *How video production affects student engagement:
      > An empirical study of MOOC videos*. ACM Learning at Scale 2014.

  # ── Paso 5: Ensamblador A ────────────────────────────────────────────────────
  - agent: agente_doble_A_f2_5
    inputs_from: [agente_actividades, agente_metricas, agente_videos, agente_referencias]
    task: |
      ENTRADAS: Los outputs de agente_actividades, agente_metricas, agente_videos y agente_referencias.

      TU ÚNICA TAREA: Ensamblar el documento F2.5 completo en formato Markdown (Borrador A).

      REGLAS ABSOLUTAS:
      1. COPIA el contenido de cada agente SIN modificar los valores numéricos ni las tablas.
      2. Usa las referencias de agente_referencias (sección REFERENCIAS_VALIDADAS).
      3. NO uses placeholders [N], [X], [valor]. Todos los valores deben ser concretos.
      4. El documento debe tener EXACTAMENTE 4 secciones numeradas (1, 2, 3, 4).
      5. La sección 4 (NOTAS) siempre se incluye.
      6. Usa projectName y fechaActual para el encabezado.

      DOCUMENTO F2.5 — FORMATO OBLIGATORIO:

      # RECOMENDACIONES PEDAGÓGICAS DE PRODUCCIÓN
      **Proyecto:** [projectName del contexto]
      **Fase:** F2.5 — Recomendaciones Pedagógicas de Producción
      **Fecha:** [fecha actual YYYY-MM-DD]

      ---

      ## 1. ACTIVIDADES DE APRENDIZAJE RECOMENDADAS

      [Tabla de actividades de AGENTE_ACTIVIDADES — copiar exactamente]

      **Referencia bibliográfica:**
      [Referencia Sección 1 de AGENTE_REFERENCIAS]

      ---

      ## 2. MÉTRICAS A REPORTEAR Y FRECUENCIA DE SEGUIMIENTO

      [Tabla de métricas de AGENTE_METRICAS — copiar exactamente]

      **Frecuencia de revisión recomendada:** [valor de AGENTE_METRICAS]
      **Justificación:** [justificación de AGENTE_METRICAS]

      **Referencia bibliográfica:**
      [Referencia Sección 2 de AGENTE_REFERENCIAS]

      ---

      ## 3. ESTRUCTURA DE VIDEOS RECOMENDADA

      [Tablas 3.1, 3.2 y 3.3 de AGENTE_VIDEOS — copiar exactamente]

      [Referencia Sección 3 de AGENTE_REFERENCIAS]

      ---

      ## 4. NOTAS PARA EL DISEÑADOR
      - Recomendaciones son punto de partida, ajustables en F3.
      - Valores resueltos de confrontación F1↔F2 aplicados: [valoresResueltos del contexto, o "Sin discrepancias"].

  # ── Paso 6: Ensamblador B ────────────────────────────────────────────────────
  - agent: agente_doble_B_f2_5
    model: "@cf/qwen/qwen2.5-7b-instruct"
    inputs_from: [agente_actividades, agente_metricas, agente_videos, agente_referencias]
    task: |
      ENTRADAS: Los outputs de agente_actividades, agente_metricas, agente_videos y agente_referencias.

      TU ÚNICA TAREA: Ensamblar el documento F2.5 completo en formato Markdown (Borrador B).
      Este es el Borrador B — puedes variar el enfoque pedagógico levemente:
      - Puede diferir en la frecuencia de seguimiento (Quincenal si aplica).
      - Puede diferir en el número de actividades (dentro del rango válido 4-6).
      - Puede diferir en el número de videos por módulo (1 o 3 en lugar de 2).
      - Los valores clave (numModulos, nivelScorm, horasTotales) deben ser IDÉNTICOS.
      - El total de videos DEBE cumplir: total >= numModulos Y total <= numModulos × 4.

      REGLAS ABSOLUTAS:
      1. MISMAS 4 SECCIONES que el Borrador A — NO omitas ni añadas secciones.
      2. NO uses placeholders [N], [X], [valor]. Todos los campos deben tener valores concretos.
      3. Usa las referencias de agente_referencias (igual que en Borrador A).

      MISMO FORMATO DE SALIDA que Borrador A:

      # RECOMENDACIONES PEDAGÓGICAS DE PRODUCCIÓN
      **Proyecto:** [projectName del contexto]
      **Fase:** F2.5 — Recomendaciones Pedagógicas de Producción
      **Fecha:** [fecha actual YYYY-MM-DD]

      ---

      ## 1. ACTIVIDADES DE APRENDIZAJE RECOMENDADAS
      [tabla con posible variación en tipos o frecuencia, dentro del rango 4-6 filas]

      **Referencia bibliográfica:**
      [Referencia Sección 1 de AGENTE_REFERENCIAS]

      ---

      ## 2. MÉTRICAS A REPORTEAR Y FRECUENCIA DE SEGUIMIENTO
      [tabla con posible variación de frecuencia — pero TODAS las métricas con la MISMA frecuencia]

      **Frecuencia de revisión recomendada:** [valor]
      **Justificación:** [justificación]

      **Referencia bibliográfica:**
      [Referencia Sección 2 de AGENTE_REFERENCIAS]

      ---

      ## 3. ESTRUCTURA DE VIDEOS RECOMENDADA
      [tablas 3.1, 3.2, 3.3 con posible variación en videos/módulo dentro del rango 1-3]

      [Referencia Sección 3 de AGENTE_REFERENCIAS]

      ---

      ## 4. NOTAS PARA EL DISEÑADOR
      - Recomendaciones son punto de partida, ajustables en F3.
      - Valores resueltos de confrontación F1↔F2 aplicados: [valoresResueltos del contexto, o "Sin discrepancias"].

  # ── Paso 7: Juez ─────────────────────────────────────────────────────────────
  - agent: agente_juez_f2_5
    inputs_from: [agente_doble_A_f2_5, agente_doble_B_f2_5]
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
