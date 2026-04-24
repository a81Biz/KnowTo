---
id: F0
name: Marco de Referencia del Cliente
version: 7.0.0
tags: [EC0366, analisis, sector, competencia]
pipeline_steps:


  # ── Extractor ────────────────────────────────────────────────────────────
  - agent: extractor_f0
    model: "qwen2.5:14b"
    inputs_from: []

    include_template: false
    task: |
      Extrae del contexto: projectName, industry, courseTopic.
      El contexto YA INCLUYE resultados de búsqueda web en webSearchResults.
      NO necesitas buscar nada. Usa SOLO la información proporcionada.
      Devuelve SOLO JSON: {"projectName": "...", "industry": "...", "courseTopic": "..."}

  # ── SECCIÓN 1: SECTOR ──────────────────────────────────────────────────
  - agent: agente_sector_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_f0]
    include_template: false
    task: |
      You are a market research analyst. Extract REAL information from web search results.

      Project context:
      - Name: {projectName}
      - Topic: {courseTopic}

      DATA STRUCTURE:
      Search results are arrays of objects: {"i": id, "t": title, "u": URL, "c": content, "f": score}
      
      HOW TO EXTRACT & RULES:
      1. SEARCH FREELY: Look through the ENTIRE arrays (e.g., market_size, trends), not just the first item, to find the best data.
      2. "tamaño": STOP. DO NOT output a raw number. You MUST write a comprehensive paragraph (2-3 sentences) combining the market value, the projected growth (CAGR), and the underlying reasons or drivers for this growth found in the text. (e.g., "El mercado está valorado en USD 943.2 millones y presenta un crecimiento continuo. Este impulso se debe a la creciente demanda de...").
      3. "tendencias", "regulaciones", "certificaciones": Extract the most relevant data from their respective arrays.
      4. SOURCE DOMAINS: For "fuente_...", extract ONLY the clean DOMAIN from the "u" field (e.g., "grandviewresearch.com").
      5. "desafios": For items in the challenges array, extract "desafio" from "c", and "fuente" from the domain of "u".
      6. QUALITATIVE ALLOWANCE: If exact numbers aren't found, extract qualitative indicators.
      7. LANGUAGE: ALL extracted text and descriptions MUST BE IN SPANISH. Only JSON keys remain in English.

      IMPORTANT: If an array is completely empty or lacks relevant data, use empty string "" or [].

      Return ONLY valid JSON with EXACT structure:
      {
        "tamaño": "",
        "fuente_tamaño": "",
        "tendencias": "",
        "fuente_tendencias": "",
        "regulaciones": "",
        "fuente_regulaciones": "",
        "certificaciones": "",
        "fuente_certificaciones": "",
        "desafios": []
      }

  - agent: agente_sector_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_f0]
    include_template: false
    task: |
      You are a market research analyst. Extract REAL information from web search results.

      Project context:
      - Name: {projectName}
      - Topic: {courseTopic}

      DATA STRUCTURE:
      Search results are arrays of objects: {"i": id, "t": title, "u": URL, "c": content, "f": score}
      
      HOW TO EXTRACT & RULES:
      1. SEARCH FREELY: Look through the ENTIRE arrays (e.g., market_size, trends), not just the first item, to find the best data.
      2. "tamaño": STOP. DO NOT output a raw number. You MUST write a comprehensive paragraph (2-3 sentences) combining the market value, the projected growth (CAGR), and the underlying reasons or drivers for this growth found in the text. (e.g., "El mercado está valorado en USD 943.2 millones y presenta un crecimiento continuo. Este impulso se debe a la creciente demanda de...").
      3. "tendencias", "regulaciones", "certificaciones": Extract the most relevant data from their respective arrays.
      4. SOURCE DOMAINS: For "fuente_...", extract ONLY the clean DOMAIN from the "u" field (e.g., "grandviewresearch.com").
      5. "desafios": For items in the challenges array, extract "desafio" from "c", and "fuente" from the domain of "u".
      6. QUALITATIVE ALLOWANCE: If exact numbers aren't found, extract qualitative indicators.
      7. LANGUAGE: ALL extracted text and descriptions MUST BE IN SPANISH. Only JSON keys remain in English.

      IMPORTANT: If an array is completely empty or lacks relevant data, use empty string "" or [].

      Return ONLY valid JSON with EXACT structure:
      {
        "tamaño": "",
        "fuente_tamaño": "",
        "tendencias": "",
        "fuente_tendencias": "",
        "regulaciones": "",
        "fuente_regulaciones": "",
        "certificaciones": "",
        "fuente_certificaciones": "",
        "desafios": []
      }

  - agent: juez_sector
    model: "gemma2:27b"
    inputs_from: [agente_sector_A, agente_sector_B]
    include_template: false
    task: |
      Compara ambos JSON. Elige el más completo considerando:
      1. Datos más específicos y detallados
      2. Fuentes más confiables (dominios reconocidos como arizton.com, globenewswire.com, researchandmarkets.com)
      3. Mayor cantidad de campos llenos
      
      IMPORTANTE: Penaliza el uso de "webSearchResults" como fuente.
      
      Devuelve SOLO JSON: {"seleccion": "A" | "B", "razon": "explicación breve sin saltos de línea"}

  # ── SECCIÓN 2: MEJORES PRÁCTICAS ─────────────────────────────────────────
  - agent: agente_practicas_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_f0]
    include_template: false
    task: |
      You are a market research analyst specializing in educational best practices. Extract REAL instructional design practices from web search results.

      Project context:
      - Name: {projectName}
      - Industry: {industry}
      - Topic: {courseTopic}

      CRITICAL OSINT RULES:
      1. ENGLISH ONLY
      2. EXTRACT THE NICHE
      3. Use webSearchResults.practices for best practices and methods
      4. If no data found, return empty array []
      5. SOURCE FORMAT RULE: Extract ONLY the clean domain name (e.g., "warhammer-community.com") or the exact article title for the source. DO NOT output full raw HTTP URLs.
      6. LANGUAGE RULE: ALL generated content and extracted text MUST be in Spanish. Only JSON keys remain in English.

      Return ONLY JSON:
      [
        {
          "practica": "",
          "descripcion": "",
          "fuente": ""
        }
      ]

  - agent: agente_practicas_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_f0]
    include_template: false
    task: |
      You are a market research analyst specializing in educational best practices. Extract REAL instructional design practices from web search results.

      Project context:
      - Name: {projectName}
      - Industry: {industry}
      - Topic: {courseTopic}

      CRITICAL OSINT RULES:
      1. ENGLISH ONLY
      2. EXTRACT THE NICHE
      3. Use webSearchResults.practices for best practices and methods
      4. If no data found, return empty array []
      5. SOURCE FORMAT RULE: Extract ONLY the clean domain name (e.g., "warhammer-community.com") or the exact article title for the source. DO NOT output full raw HTTP URLs.
      6. LANGUAGE RULE: ALL generated content and extracted text MUST be in Spanish. Only JSON keys remain in English.

      Return ONLY JSON:
      [
        {
          "practica": "",
          "descripcion": "",
          "fuente": ""
        }
      ]


  - agent: juez_practicas
    model: "gemma2:27b"
    inputs_from: [agente_practicas_A, agente_practicas_B]
    include_template: false
    task: |
      Compara ambos arrays. Elige el más completo y relevante.
      Devuelve SOLO JSON: {"seleccion": "A" | "B", "razon": "..."}

  # ── SECCIÓN 3: COMPETENCIA ──────────────────────────────────────────────
  - agent: agente_competencia_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_f0]
    include_template: false
    task: |
      You are a market research analyst. Extract REAL competitor courses from webSearchResults.competitors.

      The competitors array structure:
      [{"i": 1, "t": "Course name", "u": "...", "c": "Description including price, students, duration", "f": ...}]

      YOUR TASK: Extract competitor courses from the c content. Each course must include:
      - curso: course name (from title or content)
      - plataforma: platform name (Udemy, Coursera, Skillshare, etc.)
      - precio: price if found, or empty string
      - alumnos: number of students if found, or empty string
      - duracion: duration if found, or empty string
      - enfoque: what the course teaches
      - oportunidad: what opportunity this course reveals

      CRITICAL RULES:
      - plataforma MUST be a real platform name, NOT "webSearchResults"
      - If no competitors found, return empty array []
      - LANGUAGE RULE: ALL generated content and extracted text MUST be in Spanish. Only JSON keys remain in English.

      Return ONLY valid JSON array.


  - agent: agente_competencia_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_f0]
    include_template: false
    task: |
      You are a market research analyst. Extract REAL competitor courses from webSearchResults.competitors.

      The competitors array structure:
      [{"i": 1, "t": "Course name", "u": "...", "c": "Description including price, students, duration", "f": ...}]

      YOUR TASK: Extract competitor courses from the c content. Each course must include:
      - curso: course name (from title or content)
      - plataforma: platform name (Udemy, Coursera, Skillshare, etc.)
      - precio: price if found, or empty string
      - alumnos: number of students if found, or empty string
      - duracion: duration if found, or empty string
      - enfoque: what the course teaches
      - oportunidad: what opportunity this course reveals

      CRITICAL RULES:
      - plataforma MUST be a real platform name, NOT "webSearchResults"
      - If no competitors found, return empty array []
      - LANGUAGE RULE: ALL generated content and extracted text MUST be in Spanish. Only JSON keys remain in English.

      Return ONLY valid JSON array.



  - agent: juez_competencia
    model: "gemma2:27b"
    inputs_from: [agente_competencia_A, agente_competencia_B]
    include_template: false
    task: |
      Compara. Elige el array más completo con datos reales.
      Devuelve SOLO JSON: {"seleccion": "A" | "B", "razon": "..."}

  # ── SECCIÓN 4: ESTÁNDARES EC ─────────────────────────────────────────────
  - agent: agente_estandares_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_f0]
    include_template: false
    task: |
      You are an expert in Mexican CONOCER standards. Identify EC standards relevant to the course.

      Project context:
      - Name: {projectName}
      - Industry: {industry}
      - Topic: {courseTopic}

      CRITICAL RULES:
      1. Search ONLY for Mexican CONOCER standards (ECxxxx format: EC0366, EC0249, EC0217.01).
      2. DO NOT search for industry certifications like CMA, AWS, ISO, PMI, Certified Miniatures Artist.
      3. If Tavily returns non-EC results, IGNORE them completely.
      4. If no EC standards found, return empty array [].
      5. DO NOT invent standards.

      SOURCE MAPPING:
      - Search in: webSearchResults.market_size AND webSearchResults.certifications
      - Filter: only keep results where "codigo" starts with "EC"

      Return ONLY valid JSON:
      [
        {
          "codigo": "EC0366",
          "nombre": "Diseño de cursos de capacitación en línea",
          "proposito": "Certificar la capacidad para diseñar cursos en línea",
          "aplicabilidad": "alta"
        }
      ]

      IMPORTANTE: Return ONLY JSON. No markdown. No explanations.



  - agent: agente_estandares_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_f0]
    include_template: false
    task: |
      You are an expert in Mexican CONOCER standards. Identify EC standards relevant to the course (perspective B).

      Project context:
      - Name: {projectName}
      - Industry: {industry}
      - Topic: {courseTopic}

      CRITICAL RULES:
      1. Search ONLY for Mexican CONOCER standards (ECxxxx format: EC0366, EC0249, EC0217.01).
      2. DO NOT search for industry certifications like CMA, AWS, ISO, PMI, Certified Miniatures Artist.
      3. If Tavily returns non-EC results, IGNORE them completely.
      4. If no EC standards found, return empty array [].
      5. DO NOT invent standards.

      SOURCE MAPPING:
      - Search in: webSearchResults.market_size AND webSearchResults.certifications
      - Filter: only keep results where "codigo" starts with "EC"

      Return ONLY valid JSON:
      [
        {
          "codigo": "EC0366",
          "nombre": "Diseño de cursos de capacitación en línea",
          "proposito": "Certificar la capacidad para diseñar cursos en línea",
          "aplicabilidad": "alta"
        }
      ]

      IMPORTANTE: Return ONLY JSON. No markdown. No explanations.




  - agent: juez_estandares
    model: "gemma2:27b"
    inputs_from: [agente_estandares_A, agente_estandares_B]
    include_template: false
    task: |
      Compara. Elige el array más completo.
      Devuelve SOLO JSON: {"seleccion": "A" | "B", "razon": "..."}

  # ── SECCIÓN 5: GAPS ──────────────────────────────────────────────────────
  - agent: agente_gaps_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_f0]
    include_template: false
    task: |
      You are an expert instructional design consultant. Analyze the gap between market research and the client's idea.

      SOURCE MAPPING:
      - challenges: webSearchResults.challenges
      - competitors: webSearchResults.competitors
      - practices: webSearchResults.practices

      CRITICAL RULES:
      1. IDENTIFY REAL GAPS.
      2. IF COMPETITORS MISS SOMETHING, that is a gap and an opportunity.
      3. IF CHALLENGES EXIST that the course doesn't address, that is a gap.
      4. DO NOT say "No se identifican gaps" unless truly nothing exists.
      5. LANGUAGE RULE: ALL generated content and extracted text MUST be in Spanish. Only JSON keys remain in English.

      Return ONLY valid JSON:
      {
        "mejores_practicas": "specific gap between client's idea and best practices",
        "competencia": "specific opportunity based on what competitors are missing"
      }

  - agent: agente_gaps_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_f0]
    include_template: false
    task: |
      You are an expert instructional design consultant. Analyze the gap between market research and the client's idea.

      SOURCE MAPPING:
      - challenges: webSearchResults.challenges
      - competitors: webSearchResults.competitors
      - practices: webSearchResults.practices

      CRITICAL RULES:
      1. IDENTIFY REAL GAPS.
      2. IF COMPETITORS MISS SOMETHING, that is a gap and an opportunity.
      3. IF CHALLENGES EXIST that the course doesn't address, that is a gap.
      4. DO NOT say "No se identifican gaps" unless truly nothing exists.
      5. LANGUAGE RULE: ALL generated content and extracted text MUST be in Spanish. Only JSON keys remain in English.

      Return ONLY valid JSON:
      {
        "mejores_practicas": "specific gap between client's idea and best practices",
        "competencia": "specific opportunity based on what competitors are missing"
      }



  - agent: juez_gaps
    model: "gemma2:27b"
    inputs_from: [agente_gaps_A, agente_gaps_B]
    include_template: false
    task: |
      Compara. Elige el análisis más profundo.
      Devuelve SOLO JSON: {"seleccion": "A" | "B", "razon": "..."}

  # ── SECCIÓN 6: PREGUNTAS ─────────────────────────────────────────────────
  - agent: agente_preguntas_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_f0]
    include_template: false
    task: |
      You are an expert instructional design consultant aligned with EC0366 standards. Generate 9 STRATEGIC questions for the client.

      Project context:
      - Name: {projectName}
      - Industry: {industry}
      - Topic: {courseTopic}

      CRITICAL RULES:
      1. FOCUS ON DESIGN. Do not ask about the topic itself.
      2. AREAS: Technical infra, assessment, monetization, tracking, format, UVP.
      3. Return exactly 9 strings.
      4. LANGUAGE RULE: ALL generated content and extracted text MUST be in Spanish. Only JSON keys remain in English.

      Return ONLY JSON:
      [
        "", "", "", "", "", "", "", "", ""
      ]

  - agent: agente_preguntas_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_f0]
    include_template: false
    task: |
      You are an expert instructional design consultant aligned with EC0366 standards. Generate 9 STRATEGIC questions for the client.

      Project context:
      - Name: {projectName}
      - Industry: {industry}
      - Topic: {courseTopic}

      CRITICAL RULES:
      1. FOCUS ON DESIGN. Do not ask about the topic itself.
      2. AREAS: Technical infra, assessment, monetization, tracking, format, UVP.
      3. Return exactly 9 strings.
      4. LANGUAGE RULE: ALL generated content and extracted text MUST be in Spanish. Only JSON keys remain in English.

      Return ONLY JSON:
      [
        "", "", "", "", "", "", "", "", ""
      ]


  - agent: juez_preguntas
    model: "gemma2:27b"
    inputs_from: [agente_preguntas_A, agente_preguntas_B]

    include_template: false
    task: |
      Compara ambos arrays de preguntas. Elige el set más relevante.
      
      CRITERIOS (en orden de importancia):
      1. Relevancia: preguntas sobre diseño instruccional, no sobre el tema del curso
      2. Variedad: penaliza preguntas duplicadas o muy similares
      3. Especificidad: preguntas concretas, no genéricas
      
      Devuelve SOLO JSON: {"seleccion": "A" | "B", "razon": "explicación breve"}


  # ── SECCIÓN 7: RECOMENDACIONES ───────────────────────────────────────────
  - agent: agente_recomendaciones_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_f0]
    include_template: false
    task: |
      You are an expert instructional design consultant aligned with EC0366 standards. Generate 3 ACTIONABLE recommendations.

      Project context:
      - Name: {projectName}
      - Industry: {industry}
      - Topic: {courseTopic}

      CRITICAL RULES:
      1. FOCUS ON INSTRUCTIONAL DESIGN. Do not recommend topic content.
      2. BE CONCRETE. Use specific examples like microlearning, rubrics, or peer-feedback.
      3. Return exactly 3 strings.
      4. LANGUAGE RULE: ALL recommendations MUST be written in Spanish. Only JSON keys remain in English.

      Return ONLY JSON:
      [
        "", "", ""
      ]

  - agent: agente_recomendaciones_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_f0]
    include_template: false
    task: |
      You are an expert instructional design consultant aligned with EC0366 standards. Generate 3 ACTIONABLE recommendations.

      Project context:
      - Name: {projectName}
      - Industry: {industry}
      - Topic: {courseTopic}

      CRITICAL RULES:
      1. FOCUS ON INSTRUCTIONAL DESIGN. Do not recommend topic content.
      2. BE CONCRETE. Use specific examples like microlearning, rubrics, or peer-feedback.
      3. Return exactly 3 strings.
      4. LANGUAGE RULE: ALL recommendations MUST be written in Spanish. Only JSON keys remain in English.

      Return ONLY JSON:
      [
        "", "", ""
      ]


  - agent: juez_recomendaciones
    model: "gemma2:27b"
    inputs_from: [agente_recomendaciones_A, agente_recomendaciones_B]
    include_template: false
    task: |
      Compara. Elige las recomendaciones más accionables.
      Devuelve SOLO JSON: {"seleccion": "A" | "B", "razon": "..."}

  # ── SECCIÓN 8: REFERENCIAS ───────────────────────────────────────────────
  - agent: agente_referencias_A
    model: "qwen2.5:14b"
    inputs_from: [extractor_f0]
    include_template: false
    task: |
      Extract bibliographic references from webSearchResults.references.
      
      The results format: { "results": [{ "title": "Article title", "url": "https://...", "content": "snippet" }] }
      
      For EACH result in the array, create:
      {
        "id": sequential number starting at 1,
        "referencia": "[Title]. Available at: [URL]"
      }
      
      RULES:
      - If no results or results array is empty, return empty array: []
      - DO NOT invent references. Only use what Tavily returned.
      - Extract the actual title and URL from each result.
      
      Return ONLY valid JSON array.

  - agent: agente_referencias_B
    model: "qwen2.5:14b"
    inputs_from: [extractor_f0]
    include_template: false
    task: |
      Extract bibliographic references from webSearchResults.references.
      
      The results format: { "results": [{ "title": "Article title", "url": "https://...", "content": "snippet" }] }
      
      For EACH result in the array, create:
      {
        "id": sequential number starting at 1,
        "referencia": "[Title]. Available at: [URL]"
      }
      
      RULES:
      - If no results or results array is empty, return empty array: []
      - DO NOT invent references. Only use what Tavily returned.
      - Extract the actual title and URL from each result.
      
      Return ONLY valid JSON array.



  - agent: juez_referencias
    model: "gemma2:27b"
    inputs_from: [agente_referencias_A, agente_referencias_B]
    include_template: false
    task: |
      Compara. Elige las referencias reales con mejores fuentes.
      Devuelve SOLO JSON: {"seleccion": "A" | "B", "razon": "..."}

  # ── Ensamblador (CÓDIGO PURO) ────────────────────────────────────────────
  - agent: ensamblador_f0
    model: "qwen2.5:14b"
    inputs_from: [juez_sector, juez_practicas, juez_competencia, juez_estandares, juez_gaps, juez_preguntas, juez_recomendaciones, juez_referencias]
    include_template: false
    task: "CÓDIGO - El ensamblaje se realiza en wizard.route.ts"
---