---
id: F0
name: Marco de Referencia del Cliente
version: 7.0.0
tags: [EC0366, analisis, sector, competencia]
pipeline_steps:
  # ── Extractor ────────────────────────────────────────────────────────────
  - agent: extractor_f0
    model: "llama3.1:8b"
    inputs_from: []
    include_template: false
    task: |
      Extrae del contexto: projectName, industry, courseTopic.
      El contexto YA INCLUYE resultados de búsqueda web en webSearchResults.
      NO necesitas buscar nada. Usa SOLO la información proporcionada.
      Devuelve SOLO JSON: {"projectName": "...", "industry": "...", "courseTopic": "..."}

  # ── SECCIÓN 1: SECTOR ──────────────────────────────────────────────────
  - agent: agente_sector_A
    model: "llama3.1:8b"
    inputs_from: [extractor_f0]
    include_template: false
    task: |
      IMPORTANTE: Tu respuesta debe ser SOLO el JSON. No incluyas texto antes, después, ni explicaciones.
      No uses markdown. No uses comillas triples. No uses frases como "Aquí está el resultado".
      El JSON debe ser válido y parseable directamente por JSON.parse().

      El contexto YA TIENE información de búsqueda web en webSearchResults.
      USA ESA INFORMACIÓN para responder. NO hagas nuevas búsquedas.

      EJEMPLO EXACTO del formato que debes devolver:
      {
        "tamaño": "El mercado de cursos de arte en línea alcanzó $2.5M en 2025",
        "fuente_tamaño": "Market Research Report 2025",
        "tendencias": "Aumento del 40% en demanda de cursos de pintura de miniaturas",
        "fuente_tendencias": "Trends in Art Education 2025",
        "regulaciones": "No se identifican regulaciones específicas",
        "fuente_regulaciones": "",
        "certificaciones": "No se identifican certificaciones obligatorias",
        "fuente_certificaciones": "",
        "desafios": [
          {"desafio": "Falta de referencias visuales de calidad", "fuente": "webSearchResults"},
          {"desafio": "Dificultad para encontrar materiales básicos", "fuente": "webSearchResults"}
        ]
      }

      IMPORTANTE: 
      - NO devuelvas projectName, industry, courseTopic, clientName, targetAudience.
      - NO uses valores vacíos "" para tamaño o tendencias. Si no hay dato, escribe "No se encontró información".
      - El campo "desafios" debe ser un ARRAY de objetos, cada uno con "desafio" y "fuente".
      - Si no hay desafíos, devuelve un array vacío [].

  - agent: agente_sector_B
    model: "qwen2.5:7b"
    inputs_from: [extractor_f0]
    include_template: false
    task: |
      IMPORTANTE: Tu respuesta debe ser SOLO el JSON. No incluyas texto antes, después, ni explicaciones.
      No uses markdown. No uses comillas triples. No uses frases como "Aquí está el resultado".
      El JSON debe ser válido y parseable directamente por JSON.parse().

      El contexto YA TIENE información de búsqueda web en webSearchResults (perspectiva B).
      USA ESA INFORMACIÓN para responder. NO hagas nuevas búsquedas.

      EJEMPLO EXACTO del formato que debes devolver:
      {
        "tamaño": "El mercado de cursos de arte en línea alcanzó $2.5M en 2025",
        "fuente_tamaño": "Market Research Report 2025",
        "tendencias": "Aumento del 40% en demanda de cursos de pintura de miniaturas",
        "fuente_tendencias": "Trends in Art Education 2025",
        "regulaciones": "No se identifican regulaciones específicas",
        "fuente_regulaciones": "",
        "certificaciones": "No se identifican certificaciones obligatorias",
        "fuente_certificaciones": "",
        "desafios": [
          {"desafio": "Falta de referencias visuales de calidad", "fuente": "webSearchResults"},
          {"desafio": "Dificultad para encontrar materiales básicos", "fuente": "webSearchResults"}
        ]
      }

      IMPORTANTE: 
      - NO devuelvas projectName, industry, courseTopic, clientName, targetAudience.
      - NO uses valores vacíos "" para tamaño o tendencias. Si no hay dato, escribe "No se encontró información".
      - El campo "desafios" debe ser un ARRAY de objetos, cada uno con "desafio" y "fuente".
      - Si no hay desafíos, devuelve un array vacío [].

  - agent: juez_sector
    inputs_from: [agente_sector_A, agente_sector_B]
    include_template: false
    task: |
      Compara ambos JSON. Elige el más completo (más campos llenos, mejores fuentes).
      Devuelve SOLO JSON: {"seleccion": "A" | "B", "razon": "..."}

  # ── SECCIÓN 2: MEJORES PRÁCTICAS ─────────────────────────────────────────
  - agent: agente_practicas_A
    model: "llama3.1:8b"
    inputs_from: [extractor_f0]
    include_template: false
    task: |
      IMPORTANTE: Tu respuesta debe ser SOLO el JSON. No incluyas texto antes, después, ni explicaciones.
      No uses markdown. No uses comillas triples.
      El JSON debe ser válido y parseable directamente por JSON.parse().

      El contexto YA TIENE información de búsqueda web en webSearchResults.
      USA ESA INFORMACIÓN para responder. NO hagas nuevas búsquedas.

      EJEMPLO EXACTO del formato que debes devolver:
      [
        {
          "practica": "Usar referencias visuales de contraste",
          "descripcion": "Mejorar el contraste mediante comparación directa entre zonas iluminadas y en sombra",
          "fuente": "Artículo de técnicas de pintura 2025"
        },
        {
          "practica": "Practicar con escalas de grises",
          "descripcion": "Dominar el contraste tonal antes de introducir color",
          "fuente": "Guía para principiantes en pintura de miniaturas"
        }
      ]

      IMPORTANTE:
      - Devuelve UN ARRAY de objetos. El primer carácter debe ser "[" y el último "]".
      - NO uses "webSearchResults[0].snippet" como fuente. Escribe una fuente real o "webSearchResults".
      - Si no hay prácticas, devuelve un array vacío [].

  - agent: agente_practicas_B
    model: "qwen2.5:7b"
    inputs_from: [extractor_f0]
    include_template: false
    task: |
      IMPORTANTE: Tu respuesta debe ser SOLO el JSON. No incluyas texto antes, después, ni explicaciones.
      No uses markdown. No uses comillas triples.
      El JSON debe ser válido y parseable directamente por JSON.parse().

      El contexto YA TIENE información de búsqueda web en webSearchResults.
      USA ESA INFORMACIÓN para responder. NO hagas nuevas búsquedas.

      EJEMPLO EXACTO del formato que debes devolver:
      [
        {
          "practica": "Usar referencias visuales de contraste",
          "descripcion": "Mejorar el contraste mediante comparación directa entre zonas iluminadas y en sombra",
          "fuente": "Artículo de técnicas de pintura 2025"
        },
        {
          "practica": "Practicar con escalas de grises",
          "descripcion": "Dominar el contraste tonal antes de introducir color",
          "fuente": "Guía para principiantes en pintura de miniaturas"
        }
      ]

      IMPORTANTE:
      - Devuelve UN ARRAY de objetos. El primer carácter debe ser "[" y el último "]".
      - NO uses "webSearchResults[0].snippet" como fuente. Escribe una fuente real o "webSearchResults".
      - Si no hay prácticas, devuelve un array vacío [].

  - agent: juez_practicas
    inputs_from: [agente_practicas_A, agente_practicas_B]
    include_template: false
    task: |
      Compara ambos arrays. Elige el más completo y relevante.
      Devuelve SOLO JSON: {"seleccion": "A" | "B", "razon": "..."}

  # ── SECCIÓN 3: COMPETENCIA ──────────────────────────────────────────────
  - agent: agente_competencia_A
    model: "llama3.1:8b"
    inputs_from: [extractor_f0]
    include_template: false
    task: |
      IMPORTANTE: Tu respuesta debe ser SOLO el JSON. No incluyas texto antes, después, ni explicaciones.
      No uses markdown. No uses comillas triples.
      El JSON debe ser válido y parseable directamente por JSON.parse().

      El contexto YA TIENE información de búsqueda web en webSearchResults.
      USA ESA INFORMACIÓN para responder. NO hagas nuevas búsquedas.

      EJEMPLO EXACTO del formato que debes devolver:
      [
        {
          "curso": "Miniaturas Pro",
          "plataforma": "Udemy",
          "precio": "$29",
          "alumnos": "1500",
          "duracion": "3h",
          "enfoque": "Técnicas avanzadas de contraste",
          "oportunidad": "Aprender desde cero con ejercicios prácticos"
        },
        {
          "curso": "Pintura de miniaturas para principiantes",
          "plataforma": "Skillshare",
          "precio": "$19.99",
          "alumnos": "1000",
          "duracion": "4h",
          "enfoque": "Técnicas básicas de luz y sombra",
          "oportunidad": "Mejorar el impacto visual sin invertir en materiales caros"
        }
      ]

      IMPORTANTE:
      - Devuelve UN ARRAY de objetos. El primer carácter debe ser "[" y el último "]".
      - Si no hay competencia, devuelve un array vacío [].
      - NO uses cadenas vacías "". Si no encuentras información para un campo, omite el objeto completo.

  - agent: agente_competencia_B
    model: "qwen2.5:7b"
    inputs_from: [extractor_f0]
    include_template: false
    task: |
      IMPORTANTE: Tu respuesta debe ser SOLO el JSON. No incluyas texto antes, después, ni explicaciones.
      No uses markdown. No uses comillas triples.
      El JSON debe ser válido y parseable directamente por JSON.parse().

      El contexto YA TIENE información de búsqueda web en webSearchResults.
      USA ESA INFORMACIÓN para responder. NO hagas nuevas búsquedas.

      EJEMPLO EXACTO del formato que debes devolver:
      [
        {
          "curso": "Miniaturas Pro",
          "plataforma": "Udemy",
          "precio": "$29",
          "alumnos": "1500",
          "duracion": "3h",
          "enfoque": "Técnicas avanzadas de contraste",
          "oportunidad": "Aprender desde cero con ejercicios prácticos"
        },
        {
          "curso": "Pintura de miniaturas para principiantes",
          "plataforma": "Skillshare",
          "precio": "$19.99",
          "alumnos": "1000",
          "duracion": "4h",
          "enfoque": "Técnicas básicas de luz y sombra",
          "oportunidad": "Mejorar el impacto visual sin invertir en materiales caros"
        }
      ]

      IMPORTANTE:
      - Devuelve UN ARRAY de objetos. El primer carácter debe ser "[" y el último "]".
      - Si no hay competencia, devuelve un array vacío [].
      - NO uses cadenas vacías "". Si no encuentras información para un campo, omite el objeto completo.

  - agent: juez_competencia
    inputs_from: [agente_competencia_A, agente_competencia_B]
    include_template: false
    task: |
      Compara. Elige el array más completo con datos reales.
      Devuelve SOLO JSON: {"seleccion": "A" | "B", "razon": "..."}

  # ── SECCIÓN 4: ESTÁNDARES EC ─────────────────────────────────────────────
  - agent: agente_estandares_A
    model: "llama3.1:8b"
    inputs_from: [extractor_f0]
    include_template: false
    task: |
      IMPORTANTE: Tu respuesta debe ser SOLO el JSON. No incluyas texto antes, después, ni explicaciones.
      No uses markdown. No uses comillas triples.
      El JSON debe ser válido y parseable directamente por JSON.parse().

      EJEMPLO EXACTO del formato que debes devolver:
      [
        {
          "codigo": "EC0366",
          "nombre": "Diseño de cursos de capacitación",
          "proposito": "Certificar la capacidad para diseñar cursos de capacitación",
          "aplicabilidad": "sí"
        }
      ]

      IMPORTANTE:
      - Devuelve UN ARRAY de objetos. El primer carácter debe ser "[" y el último "]".
      - El código EC0366 es obligatorio. Si no hay otros estándares, devuelve solo ese.
      - NO devuelvas strings con comillas escapadas como '["{\"codigo\":\"EC0366\"..."]'.
      - NO uses markdown. NO uses bloques de código.

  - agent: agente_estandares_B
    model: "mistral:7b"
    inputs_from: [extractor_f0]
    include_template: false
    task: |
      IMPORTANTE: Tu respuesta debe ser SOLO el JSON. No incluas texto antes, después, ni explicaciones.
      No uses markdown. No uses comillas triples.
      El JSON debe ser válido y parseable directamente por JSON.parse().

      EJEMPLO EXACTO del formato que debes devolver:
      [
        {
          "codigo": "EC0366",
          "nombre": "Diseño de cursos de capacitación",
          "proposito": "Certificar la capacidad para diseñar cursos de capacitación",
          "aplicabilidad": "sí"
        }
      ]

      IMPORTANTE:
      - Devuelve UN ARRAY de objetos. El primer carácter debe ser "[" y el último "]".
      - El código EC0366 es obligatorio. Si no hay otros estándares, devuelve solo ese.
      - NO devuelvas strings con comillas escapadas como '["{\"codigo\":\"EC0366\"..."]'.
      - NO uses markdown. NO uses bloques de código.

  - agent: juez_estandares
    inputs_from: [agente_estandares_A, agente_estandares_B]
    include_template: false
    task: |
      Compara. Elige el array más completo.
      Devuelve SOLO JSON: {"seleccion": "A" | "B", "razon": "..."}

  # ── SECCIÓN 5: GAPS ──────────────────────────────────────────────────────
  - agent: agente_gaps_A
    inputs_from: [extractor_f0]
    include_template: false
    task: |
      IMPORTANTE: Tu respuesta debe ser SOLO el JSON. No incluyas texto antes, después, ni explicaciones.
      No uses markdown. No uses comillas triples.
      El JSON debe ser válido y parseable directamente por JSON.parse().

      EJEMPLO EXACTO del formato que debes devolver:
      {
        "mejores_practicas": "Los cursos existentes no incluyen ejercicios prácticos de contraste gradual",
        "competencia": "Ningún curso gratuito cubre técnicas de contraste para principiantes"
      }

      IMPORTANTE:
      - El JSON debe tener EXACTAMENTE dos propiedades: "mejores_practicas" y "competencia".
      - NO uses "brecas" u otras propiedades.
      - Si no hay gaps, usa "No se identifican gaps iniciales".

  - agent: agente_gaps_B
    inputs_from: [extractor_f0]
    include_template: false
    task: |
      IMPORTANTE: Tu respuesta debe ser SOLO el JSON. No incluyas texto antes, después, ni explicaciones.
      No uses markdown. No uses comillas triples.
      El JSON debe ser válido y parseable directamente por JSON.parse().

      EJEMPLO EXACTO del formato que debes devolver:
      {
        "mejores_practicas": "Los cursos existentes no incluyen ejercicios prácticos de contraste gradual",
        "competencia": "Ningún curso gratuito cubre técnicas de contraste para principiantes"
      }

      IMPORTANTE:
      - El JSON debe tener EXACTAMENTE dos propiedades: "mejores_practicas" y "competencia".
      - NO uses "brecas" u otras propiedades.
      - Si no hay gaps, usa "No se identifican gaps iniciales".

  - agent: juez_gaps
    inputs_from: [agente_gaps_A, agente_gaps_B]
    include_template: false
    task: |
      Compara. Elige el análisis más profundo.
      Devuelve SOLO JSON: {"seleccion": "A" | "B", "razon": "..."}

  # ── SECCIÓN 6: PREGUNTAS ─────────────────────────────────────────────────
  - agent: agente_preguntas_A
    inputs_from: [extractor_f0]
    include_template: false
    task: |
      IMPORTANTE: Tu respuesta debe ser SOLO el JSON. No incluyas texto antes, después, ni explicaciones.
      No uses markdown. No uses comillas triples. No uses frases como "Aquí está el resultado".
      El JSON debe ser válido y parseable directamente por JSON.parse().

      Genera 9 preguntas para el cliente. Devuelve array de 9 strings.

  - agent: agente_preguntas_B
    inputs_from: [extractor_f0]
    include_template: false
    task: |
      IMPORTANTE: Tu respuesta debe ser SOLO el JSON. No incluyas texto antes, después, ni explicaciones.
      No uses markdown. No uses comillas triples. No uses frases como "Aquí está el resultado".
      El JSON debe ser válido y parseable directamente por JSON.parse().

      Genera 9 preguntas (perspectiva B). Devuelve array de 9 strings.

  - agent: juez_preguntas
    inputs_from: [agente_preguntas_A, agente_preguntas_B]
    include_template: false
    task: |
      Compara. Elige el set de preguntas más relevante.
      Devuelve SOLO JSON: {"seleccion": "A" | "B", "razon": "..."}

  # ── SECCIÓN 7: RECOMENDACIONES ───────────────────────────────────────────
  - agent: agente_recomendaciones_A
    inputs_from: [extractor_f0]
    include_template: false
    task: |
      IMPORTANTE: Tu respuesta debe ser SOLO el JSON. No incluyas texto antes, después, ni explicaciones.
      No uses markdown. No uses comillas triples. No uses frases como "Aquí está el resultado".
      El JSON debe ser válido y parseable directamente por JSON.parse().

      REGLAS ADICIONALES:
      - Devuelve UN ARRAY de 3 strings. El primer carácter debe ser "[" y el último "]".
      - Cada recomendación debe ser una string corta, sin saltos de línea internos.
      - Ejemplo: ["recomendación 1", "recomendación 2", "recomendación 3"]

      Genera 3 recomendaciones. Devuelve array de 3 strings.

  - agent: agente_recomendaciones_B
    inputs_from: [extractor_f0]
    include_template: false
    task: |
      IMPORTANTE: Tu respuesta debe ser SOLO el JSON. No incluyas texto antes, después, ni explicaciones.
      No uses markdown. No uses comillas triples. No uses frases como "Aquí está el resultado".
      El JSON debe ser válido y parseable directamente por JSON.parse().

      REGLAS ADICIONALES:
      - Devuelve UN ARRAY de 3 strings. El primer carácter debe ser "[" y el último "]".
      - Cada recomendación debe ser una string corta, sin saltos de línea internos.
      - Ejemplo: ["recomendación 1", "recomendación 2", "recomendación 3"]

      Genera 3 recomendaciones (perspectiva B). Devuelve array de 3 strings.

  - agent: juez_recomendaciones
    inputs_from: [agente_recomendaciones_A, agente_recomendaciones_B]
    include_template: false
    task: |
      Compara. Elige las recomendaciones más accionables.
      Devuelve SOLO JSON: {"seleccion": "A" | "B", "razon": "..."}

  # ── SECCIÓN 8: REFERENCIAS ───────────────────────────────────────────────
  - agent: agente_referencias_A
    model: "llama3.1:8b"
    inputs_from: [extractor_f0]
    include_template: false
    task: |
      IMPORTANTE: Tu respuesta debe ser SOLO el JSON. No incluyas texto antes, después, ni explicaciones.
      No uses markdown. No uses comillas triples.
      El JSON debe ser válido y parseable directamente por JSON.parse().
      
      El contexto YA TIENE información de búsqueda web en webSearchResults.
      USA ESA INFORMACIÓN para identificar referencias bibliográficas reales.
      
      IMPORTANTE: CADA referencia debe ser un OBJETO entre LLAVES {}.
      El array completo debe comenzar con "[" y terminar con "]".
      
      Formato CORRECTO:
      [
        {"id": 1, "referencia": "Apellido, N. (Año). Título. Editorial."},
        {"id": 2, "referencia": "Apellido, N. (Año). Título. Editorial."}
      ]
      
      REGLAS ESTRICTAS:
      - CADA referencia = OBJETO con { "id": número, "referencia": "texto" }
      - NO uses arrays de pares

  - agent: agente_referencias_B
    model: "qwen2.5:7b"
    inputs_from: [extractor_f0]
    include_template: false
    task: |
      IMPORTANTE: Tu respuesta debe ser SOLO el JSON. No incluyas texto antes, después, ni explicaciones.
      No uses markdown. No uses comillas triples.
      El JSON debe ser válido y parseable directamente por JSON.parse().
      
      El contexto YA TIENE información de búsqueda web en webSearchResults.
      USA ESA INFORMACIÓN para identificar referencias bibliográficas reales (perspectiva B).
      
      IMPORTANTE: CADA referencia debe ser un OBJETO entre LLAVES {}.
      El array completo debe comenzar con "[" y terminar con "]".
      
      Formato CORRECTO:
      [
        {"id": 1, "referencia": "Apellido, N. (Año). Título. Editorial."},
        {"id": 2, "referencia": "Apellido, N. (Año). Título. Editorial."}
      ]
      
      REGLAS ESTRICTAS:
      - CADA referencia = OBJETO con { "id": número, "referencia": "texto" }
      - NO uses arrays de pares

  - agent: juez_referencias
    inputs_from: [agente_referencias_A, agente_referencias_B]
    include_template: false
    task: |
      Compara. Elige las referencias reales con mejores fuentes.
      Devuelve SOLO JSON: {"seleccion": "A" | "B", "razon": "..."}

  # ── Ensamblador (CÓDIGO PURO) ────────────────────────────────────────────
  - agent: ensamblador_f0
    inputs_from: [juez_sector, juez_practicas, juez_competencia, juez_estandares, juez_gaps, juez_preguntas, juez_recomendaciones, juez_referencias]
    include_template: false
    task: "CÓDIGO - El ensamblaje se realiza en wizard.route.ts"
---