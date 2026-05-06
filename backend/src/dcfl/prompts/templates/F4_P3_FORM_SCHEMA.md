---
id: F4_P3_FORM_SCHEMA
name: Generador de Esquema Dinámico P3 (Características de Producción Audiovisual)
version: 3.0.0
tags: [EC0366, formulario, guiones, multimedia, produccion]
pipeline_steps:

  # ── EXTRACTOR ────────────────────────────────────────────────────────────
  - agent: extractor_f4
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: false
    task: |
      YOU ARE AN EXTRACTOR. Copy fields verbatim from the source. DO NOT rewrite or summarize.
      
      SOURCES IN context:
      1. fase3.unidades — array of course modules from F2/F3 (copy as-is)
      2. fase3.calculo_duracion — duration data from F3 (copy as-is)
      3. productos_previos.P4 — P4 datos_producto JSON object (NOT markdown). Structure: {capitulos: [{unidad, nombre, secciones_json, palabras}], palabras_totales}
      4. productos_previos.P1 — P1 datos_producto JSON object if available
      
      OUTPUT ONLY VALID JSON:
      {
        "unidades": [{"modulo": 1, "nombre": "...", "objetivo": "..."}],
        "duracion_total": "...",
        "capitulos_p4": [{"unidad": 1, "nombre": "...", "secciones_json": {...}}],
        "reactivos_p1": []
      }

  # ── AGENTE A: PRODUCTION PLANNER ─────────────────────────────────────────
  - agent: agente_form_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_f4]
    include_template: false
    task: |
      ACTÚA COMO UN PRODUCTOR AUDIOVISUAL EDUCATIVO. Tu tarea es definir la ESTRUCTURA DE PRODUCCIÓN para los videos del curso, NO el contenido narrativo.

      Debes proponer un formulario para que el usuario valide las características técnicas de CADA VIDEO.

      DATA LINEAGE STRICT RULE:
      - MÓDULOS: Crea exactamente UN campo por CADA objeto del array `context.fase3.unidades`. PROHIBIDO inventar módulos, omitir módulos o cambiarles el nombre.
      - TIEMPOS: En el `suggested_value` de cada campo, DEBES incluir la duración exacta del módulo según `context.fase3.calculo_duracion[modulo]`. Si ese dato no existe, usa `context.fase3.duracion_promedio_minutos` como fallback. PROHIBIDO inventar duraciones.

      PARA CADA MÓDULO/UNIDAD:
      Genera un bloque de configuración que incluya:
      1. Cantidad de videos: ¿Cuántos videos se necesitan para cubrir este módulo? (Sugerir 1 por unidad temática).
      2. Duración por video: Basado en el cálculo de duración de F3, distribuir el tiempo.
      3. Estructura Interna: Definir porcentajes sugeridos: Apertura (10%), Desarrollo (80%), Cierre (10%).
      4. Recursos Visuales Requeridos: Lista de selección (Close-up, Animación, Comparación, Captura de pantalla, Demo en vivo, Entrevista).
      5. Trazabilidad: Indicar qué reactivos de P1 cubre y qué capítulo de P4 explica.

      REGLAS:
      - Formato de salida: Array de objetos para un formulario dinámico.
      - Nombres de campos: "guion_unidad_[modulo]".
      - Tipo: "textarea" (para que el usuario ajuste la ficha técnica de producción).

      EJEMPLO DE VALOR SUGERIDO:
      "Videos totales: 1\nDuración estimada: 5 min\nEstructura: Apertura (30s), Desarrollo (4m), Cierre (30s)\nRecursos: Animación 2D, Captura de software\nRelación P1: Cubre reactivos 4, 5 y 8\nRelación P4: Explica el Capítulo 2.1"

      SALIDA JSON RAW:
      [
        {
          "name": "guion_unidad_1",
          "label": "Configuración de Producción: [Nombre Unidad]",
          "suggested_value": "...",
          "type": "textarea"
        }
      ]

  # ── AGENTE B: TECHNICAL DIRECTOR ─────────────────────────────────────────
  - agent: agente_form_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_f4]
    include_template: false
    task: |
      ACTÚA COMO UN DIRECTOR TÉCNICO DE MULTIMEDIA. Tu enfoque es la VIABILIDAD y CALIDAD de la producción.

      Propón la estructura de producción para los videos basándote en la complejidad de los temas de F2/F3 y el Manual P4.

      DATA LINEAGE STRICT RULE:
      - MÓDULOS: Crea exactamente UN campo por CADA objeto del array `context.fase3.unidades`. PROHIBIDO inventar módulos, omitir módulos o cambiarles el nombre.
      - TIEMPOS: En el `suggested_value` de cada campo, DEBES incluir la duración exacta del módulo según `context.fase3.calculo_duracion[modulo]`. Si ese dato no existe, usa `context.fase3.duracion_promedio_minutos` como fallback. PROHIBIDO inventar duraciones.

      REQUERIMIENTOS:
      - Definir la ficha técnica de producción por cada bloque temático.
      - Asegurar que la suma de duraciones sea coherente con F3.
      - Especificar el "Mix de Medios" (qué se ve en pantalla: busto parlante vs. material de apoyo).

      SALIDA JSON RAW (Igual estructura que A):
      [
        {
          "name": "guion_unidad_1",
          "label": "Ficha Técnica de Producción: [Nombre Unidad]",
          "suggested_value": "...",
          "type": "textarea"
        }
      ]

  # ── JUDGE ────────────────────────────────────────────────────────────────
  - agent: juez_form
    model: "qwen2.5:14b"
    inputs_from: [agente_form_A, agente_form_B]
    include_template: false
    task: |
      Compara las propuestas de producción A y B.
      Elige la que mejor integre:
      1. Trazabilidad clara con P1 y P4.
      2. Estructura de tiempos realista (Apertura/Desarrollo/Cierre).
      3. Definición precisa de recursos visuales.

      SALIDA: {"seleccion": "A" | "B", "razon": "..."}

  # ── ASSEMBLER ────────────────────────────────────────────────────────────
  - agent: ensamblador_form_schema
    model: "qwen2.5:14b"
    inputs_from: [juez_form]
    include_template: false
    task: "CÓDIGO - Assembly in form-schema.assembler.ts"
---