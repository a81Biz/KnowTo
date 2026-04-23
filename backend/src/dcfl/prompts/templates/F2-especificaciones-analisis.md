---
id: F2
name: Especificaciones de Análisis y Diseño
version: 4.0.0
tags: [EC0366, analisis, modalidad, interactividad, perfil-ingreso]
pipeline_steps:
  # ── Extractor: datos clave de F0 y F1 ────────────────────────────────────
  - agent: extractor_f2
    inputs_from: []
    include_template: false
    task: |
      Extrae y resume los siguientes datos del CONTEXTO. Los datos estructurados de F0 y F1 están disponibles en previousData como f0_estructurado y f1_estructurado.
      
      DE F0 (Marco de Referencia) - de previousData.f0_estructurado:
      - questions: array de preguntas que se hicieron al cliente
      - gaps: brechas identificadas en el sector
      
      DE F1 (Informe de Necesidades) - de previousData.f1_estructurado:
      - objetivos_aprendizaje: lista de objetivos (objetivo, nivel_bloom, tipo)
      - perfil_participante: escolaridad_minima, conocimientos_previos, habilidades_digitales, equipo_recomendado, conexion_internet
      - brechas_competencia: tipo, descripcion, capacitables
      - resultados_esperados: array de resultados
      - duracion_total: duración estimada del curso
      
      IMPORTANTE: Si un campo no está disponible, escribe "No especificado en F0/F1".
      NO uses N/A. Sé específico con los datos disponibles.
      
      Devuelve SOLO los datos extraídos, sin interpretación ni inventar nada. Formato: texto plano con secciones claras.

  # ── Especialista 1: Modalidad y plataforma ───────────────────────────────
  - agent: agente_modalidad_plataforma
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [extractor_f2]
    include_template: false
    task: |
      Con los datos de EXTRACTOR_F2, genera EXACTAMENTE esta sección en Markdown:

      ## 1. DECISIÓN DE MODALIDAD

      | Parámetro | Decisión | Justificación |
      |:---|:---|:---|
      | Modalidad | [escribe UNA opción: Asincrónico, Sincrónico, Mixto, o Autodirigido] | [1-2 oraciones basadas en perfil F1 y sector F0] |
      | Plataforma sugerida | [escribe UNA plataforma de esta lista: Moodle, Canvas, Teachable, Hotmart, Google Classroom, TalentLMS, Chamilo] | [1 oración con razón concreta del sector] |
      | Distribución | [REGLAS ESTRICTAS: Si Modalidad es Asincrónico, Distribución debe ser "N/A". Si Modalidad es Mixto, usar "X% sincrónico / Y% asincrónico". En otro caso, usar "N/A"] | [razón o N/A] |

      REGLAS OBLIGATORIAS:
      - Elige EXACTAMENTE UNA modalidad.
      - Si elegiste Asincrónico, la Distribución DEBE ser "N/A". NO escribas "Mixto" ni porcentajes.
      - Si elegiste Mixto, entonces DEBES especificar porcentajes (ej: "60% sincrónico / 40% asincrónico").
      - Elige la plataforma SOLO de la lista dada.
      - No escribas placeholders entre corchetes en la tabla final.
      - No agregues secciones adicionales. Solo la tabla anterior.

  # ── Especialista 2: Interactividad SCORM ─────────────────────────────────
  - agent: agente_interactividad
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [extractor_f2]
    include_template: false
    max_input_chars: 4000
    task: |
      Basado en el extractor_f2, genera EXACTAMENTE esta tabla Markdown con 5 filas.
      
      ## 2. NIVEL DE INTERACTIVIDAD (SCORM)
      
      | Elemento interactivo | Incluido | Frecuencia concreta |
      |:---|:---|:---|
      | Video con preguntas integradas | Sí | 1 por módulo |
      | Actividades prácticas | Sí | 1 por módulo |
      | Evaluaciones formativas | Sí | 1 por módulo |
      | Simulaciones o ramificaciones | No | No aplica |
      | Foros o colaboración | No | No aplica |
      
      REGLAS OBLIGATORIAS — VIOLARLAS ES UN ERROR:
      - NO omitas filas. La tabla debe tener EXACTAMENTE 5 filas en el orden mostrado.
      - NO uses "No incluidas" o frases similares. Usa "No" exactamente.
      - NO agregues filas adicionales.
      - NO uses JSON. Devuelve SOLO la tabla Markdown.

  # ── Especialista 3: Estructura temática ──────────────────────────────────
  - agent: agente_estructura
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [extractor_f2]
    include_template: false
    max_input_chars: 4000
    task: |
      Genera la estructura temática preliminar del curso como tabla Markdown.

      ## 3. ESTRUCTURA TEMÁTICA PRELIMINAR

      | Módulo | Nombre | Objetivo del módulo | Duración estimada (horas) |
      |:---|:---|:---|:---|
      | 1 | [nombre del módulo 1] | [objetivo] | [duración] |
      | 2 | [nombre del módulo 2] | [objetivo] | [duración] |
      | 3 | [nombre del módulo 3] | [objetivo] | [duración] |

      REGLAS OBLIGATORIAS:
      - NO uses JSON. Devuelve SOLO la tabla Markdown.
      - Genera EXACTAMENTE 3 módulos.
      - Las duraciones deben ser consistentes con el total del curso (ej. 1, 2, 1 horas).

  # ── Especialista 4: Perfil de ingreso ────────────────────────────────────
  - agent: agente_perfil_ingreso
    model: "@cf/qwen/qwen2.5-7b-instruct"
    inputs_from: [extractor_f2]
    include_template: false
    task: |
      Con el perfil del participante de EXTRACTOR_F2, genera EXACTAMENTE esta sección:

      ## 4. PERFIL DE INGRESO (Obligatorio EC0366)

      | Categoría | Requisito | Fuente |
      |:---|:---|:---|
      | Escolaridad mínima | [nivel educativo concreto: "Secundaria terminada" o "Bachillerato terminado" o similar] | [F1, F0 o EC0366] |
      | Conocimientos previos | [lista específica de temas o la palabra exacta "Ninguno"] | [F1, F0 o EC0366] |
      | Habilidades digitales | [acciones concretas: "navegar en internet, usar correo electrónico, abrir archivos PDF"] | [F1 o EC0366] |
      | Equipo de cómputo | [dispositivo + navegador: "Computadora o tablet con navegador actualizado (Chrome/Firefox/Edge)"] | [EC0366] |
      | Conexión a internet | [velocidad en Mbps: "Conexión estable mínima 10 Mbps"] | [EC0366] |

      REGLAS OBLIGATORIAS — LISTA NEGRA (si usas alguna de estas palabras, tu output es INCORRECTO):
      - NUNCA uses: "deseable", "recomendable", "adecuado", "básico", "preferentemente", "bueno", "suficiente"
      - NUNCA pongas velocidad de internet en la fila de Equipo de cómputo. Son categorías separadas.
      - NUNCA pongas hardware en la fila de Conexión a internet. Son categorías separadas.
      - La tabla tiene EXACTAMENTE 5 filas (sin agregar ni quitar categorías).
      - Fuente debe ser "F1 - [dato usado]", "F0 - [dato usado]" o "EC0366 pág. 13".

  # ── Especialista 5: Estrategias, supuestos, restricciones ────────────────
  - agent: agente_estrategias_supuestos
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [extractor_f2, agente_estructura]
    include_template: false
    max_input_chars: 6000
    task: |
      Basado en extractor_f2 y agente_estructura, genera EXACTAMENTE 3 estrategias instruccionales (una por módulo).
      
      ## 5. ESTRATEGIAS INSTRUCCIONALES
      
      | Estrategia | Descripción | Módulo donde aplica | Nivel Bloom |
      |:---|:---|:---|:---|
      | [nombre estrategia 1] | [descripción] | Módulo 1 | [Recordar/Comprender/Aplicar] |
      | [nombre estrategia 2] | [descripción] | Módulo 2 | [Recordar/Comprender/Aplicar] |
      | [nombre estrategia 3] | [descripción] | Módulo 3 | [Recordar/Comprender/Aplicar] |
      
      ## 6. SUPUESTOS Y RESTRICCIONES
      
      ### Supuestos
      - [supuesto 1 basado en F1/F2]
      - [supuesto 2 basado en F1/F2]
      
      ### Restricciones identificadas
      - [restricción 1 basada en el sector]
      - [restricción 2 basada en recursos]
      
      REGLAS OBLIGATORIAS — VIOLARLAS ES UN ERROR:
      - NO generes menos de 3 estrategias. Si hay 3 módulos, deben haber 3 estrategias.
      - Cada estrategia debe referenciar UN MÓDULO específico (no concatenar varios).
      - NO uses JSON. Devuelve SOLO el formato Markdown mostrado.

  # ── Ensamblador A ────────────────────────────────────────────────────────
  - agent: sintetizador_a_f2
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [agente_modalidad_plataforma, agente_interactividad, agente_estructura, agente_perfil_ingreso, agente_estrategias_supuestos]
    max_input_chars: 2000
    include_template: false
    task: |
      Ensambla el borrador A del documento final combinando las secciones generadas por los agentes anteriores.
      
      IMPORTANTE: Usa EXACTAMENTE estos encabezados en el orden indicado:
      
      # ESPECIFICACIONES DE ANÁLISIS Y DISEÑO
      **Proyecto:** {{projectName}}
      **Fase:** Especificaciones de Análisis y Diseño
      **Fecha:** {{fechaActual}}
      **Basado en:** Marco de Referencia F0 + Informe de Necesidades F1
      
      ---
      
      ## 1. DECISIÓN DE MODALIDAD
      
      [Pega aquí el contenido de AGENTE_MODALIDAD_PLATAFORMA]
      
      ---
      
      ## 2. NIVEL DE INTERACTIVIDAD (SCORM)
      
      [Pega aquí el contenido de AGENTE_INTERACTIVIDAD]
      
      ---
      
      ## 3. ESTRUCTURA TEMÁTICA PRELIMINAR
      
      [Pega aquí el contenido de AGENTE_ESTRUCTURA]
      
      ---
      
      ## 4. PERFIL DE INGRESO
      
      [Pega aquí el contenido de AGENTE_PERFIL_INGRESO]
      
      ---
      
      ## 5. ESTRATEGIAS INSTRUCCIONALES
      
      [Pega aquí el contenido de AGENTE_ESTRATEGIAS_SUPUESTOS (solo la sección de estrategias)]
      
      ---
      
      ## 6. SUPUESTOS Y RESTRICCIONES
      
      [Pega aquí el contenido de AGENTE_ESTRATEGIAS_SUPUESTOS (solo la sección de supuestos y restricciones)]
      
      REGLAS OBLIGATORIAS:
      - NO uses corchetes como [Sección 1...]. Usa SOLO los encabezados exactos indicados.
      - NO agregues texto adicional fuera de las secciones.
      - NO modifiques los títulos de las secciones.

  # ── Ensamblador B ────────────────────────────────────────────────────────
  - agent: sintetizador_b_f2
    model: "@cf/qwen/qwen2.5-7b-instruct"
    inputs_from: [agente_modalidad_plataforma, agente_interactividad, agente_estructura, agente_perfil_ingreso, agente_estrategias_supuestos]
    max_input_chars: 2000
    include_template: false
    task: |
      Ensambla el borrador B del documento final combinando las secciones generadas por los agentes anteriores.
      
      IMPORTANTE: Usa EXACTAMENTE estos encabezados en el orden indicado:
      
      # ESPECIFICACIONES DE ANÁLISIS Y DISEÑO
      **Proyecto:** {{projectName}}
      **Fase:** Especificaciones de Análisis y Diseño
      **Fecha:** {{fechaActual}}
      **Basado en:** Marco de Referencia F0 + Informe de Necesidades F1
      
      ---
      
      ## 1. DECISIÓN DE MODALIDAD
      
      [Pega aquí el contenido de AGENTE_MODALIDAD_PLATAFORMA]
      
      ---
      
      ## 2. NIVEL DE INTERACTIVIDAD (SCORM)
      
      [Pega aquí el contenido de AGENTE_INTERACTIVIDAD]
      
      ---
      
      ## 3. ESTRUCTURA TEMÁTICA PRELIMINAR
      
      [Pega aquí el contenido de AGENTE_ESTRUCTURA]
      
      ---
      
      ## 4. PERFIL DE INGRESO
      
      [Pega aquí el contenido de AGENTE_PERFIL_INGRESO]
      
      ---
      
      ## 5. ESTRATEGIAS INSTRUCCIONALES
      
      [Pega aquí el contenido de AGENTE_ESTRATEGIAS_SUPUESTOS (solo la sección de estrategias)]
      
      ---
      
      ## 6. SUPUESTOS Y RESTRICCIONES
      
      [Pega aquí el contenido de AGENTE_ESTRATEGIAS_SUPUESTOS (solo la sección de supuestos y restricciones)]
      
      REGLAS OBLIGATORIAS:
      - NO uses corchetes como [Sección 1...]. Usa SOLO los encabezados exactos indicados.
      - NO agregues texto adicional fuera de las secciones.
      - NO modifiques los títulos de las secciones.

  # ── JUEZ MODALIDAD ──────────────────────────────────────────────────────
  - agent: juez_modalidad
    inputs_from: [sintetizador_a_f2, sintetizador_b_f2]
    include_template: false
    task: |
      Eres el JUEZ de la sección "DECISIÓN DE MODALIDAD".
      
      Compara la sección "## 1. DECISIÓN DE MODALIDAD" de ambos borradores.
      Elige el que tenga mejor justificación y formato correcto.
      
      REGLAS:
      - La tabla debe tener 3 filas: Modalidad, Plataforma sugerida, Distribución
      - Si un borrador tiene "N/A" en Distribución y el otro tiene valores incoherentes, elige el que tiene "N/A"
      
      Devuelve SOLO JSON:
      {
        "seleccion": "A" | "B",
        "razon": "breve justificación"
      }

  # ── JUEZ SCORM ──────────────────────────────────────────────────────────
  - agent: juez_scorm
    inputs_from: [sintetizador_a_f2, sintetizador_b_f2]
    include_template: false
    task: |
      Eres el JUEZ de la sección "NIVEL DE INTERACTIVIDAD (SCORM)".
      
      Compara la sección "## 2. NIVEL DE INTERACTIVIDAD (SCORM)" de ambos borradores.
      
      REGLAS OBLIGATORIAS:
      - La tabla DEBE tener EXACTAMENTE 5 filas en este orden:
        1. Video con preguntas integradas
        2. Actividades prácticas
        3. Evaluaciones formativas
        4. Simulaciones o ramificaciones
        5. Foros o colaboración
      - Si un borrador tiene menos de 5 filas, descártalo automáticamente.
      
      Devuelve SOLO JSON:
      {
        "seleccion": "A" | "B",
        "filas_encontradas": 5,
        "razon": "breve justificación"
      }

  # ── JUEZ ESTRUCTURA ──────────────────────────────────────────────────────
  - agent: juez_estructura
    inputs_from: [sintetizador_a_f2, sintetizador_b_f2]
    include_template: false
    task: |
      Eres el JUEZ de la sección "ESTRUCTURA TEMÁTICA PRELIMINAR".
      
      Compara la sección "## 3. ESTRUCTURA TEMÁTICA PRELIMINAR" de ambos borradores.
      
      REGLAS OBLIGATORIAS:
      - La tabla DEBE tener EXACTAMENTE 3 módulos
      - Si un borrador tiene menos de 3 módulos, descártalo automáticamente
      
      Devuelve SOLO JSON:
      {
        "seleccion": "A" | "B",
        "modulos_encontrados": 3,
        "razon": "breve justificación"
      }

  # ── JUEZ PERFIL ──────────────────────────────────────────────────────────
  - agent: juez_perfil
    inputs_from: [sintetizador_a_f2, sintetizador_b_f2]
    include_template: false
    task: |
      Eres el JUEZ de la sección "PERFIL DE INGRESO".
      
      Compara la sección "## 4. PERFIL DE INGRESO" de ambos borradores.
      
      REGLAS OBLIGATORIAS:
      - La tabla DEBE tener EXACTAMENTE 5 filas en este orden:
        1. Escolaridad mínima
        2. Conocimientos previos
        3. Habilidades digitales
        4. Equipo de cómputo
        5. Conexión a internet
      - Si un borrador tiene menos de 5 filas, descártalo automáticamente
      
      Devuelve SOLO JSON:
      {
        "seleccion": "A" | "B",
        "filas_encontradas": 5,
        "razon": "breve justificación"
      }

  # ── JUEZ ESTRATEGIAS ─────────────────────────────────────────────────────
  - agent: juez_estrategias
    inputs_from: [sintetizador_a_f2, sintetizador_b_f2]
    include_template: false
    task: |
      Eres el JUEZ de la sección "ESTRATEGIAS INSTRUCCIONALES".
      
      Compara la sección "## 5. ESTRATEGIAS INSTRUCCIONALES" de ambos borradores.
      
      REGLAS OBLIGATORIAS:
      - La tabla DEBE tener EXACTAMENTE 3 filas (una por módulo)
      - Debe tener columnas: Estrategia, Descripción, Módulo donde aplica, Nivel Bloom
      - Si un borrador tiene menos de 3 filas, descártalo automáticamente
      
      Devuelve SOLO JSON:
      {
        "seleccion": "A" | "B",
        "estrategias_encontradas": 3,
        "razon": "breve justificación"
      }

  # ── JUEZ SUPUESTOS ───────────────────────────────────────────────────────
  - agent: juez_supuestos
    inputs_from: [sintetizador_a_f2, sintetizador_b_f2]
    include_template: false
    task: |
      Eres el JUEZ de la sección "SUPUESTOS Y RESTRICCIONES".
      
      Compara la sección "## 6. SUPUESTOS Y RESTRICCIONES" de ambos borradores.
      
      REGLAS OBLIGATORIAS:
      - Debe tener "### Supuestos" con al menos 2 elementos
      - Debe tener "### Restricciones identificadas" con al menos 2 elementos
      
      Devuelve SOLO JSON:
      {
        "seleccion": "A" | "B",
        "supuestos_validos": true,
        "restricciones_validas": true,
        "razon": "breve justificación"
      }

  # ── Sintetizador final (post-procesamiento en código, sin IA) ───────────
  - agent: sintetizador_final_f2
    inputs_from: [juez_modalidad, juez_scorm, juez_estructura, juez_perfil, juez_estrategias, juez_supuestos]
---

Actúa como un diseñador instruccional certificable en el estándar EC0366 "Desarrollo de cursos de formación en línea".

CONTEXTO ACUMULADO DEL PROYECTO:
{{context}}

DATOS DE ENTRADA ADICIONALES DEL USUARIO:
{{userInputs}}

FORMATO DE REFERENCIA (para agentes que incluyen la plantilla):

# ESPECIFICACIONES DE ANÁLISIS Y DISEÑO
**Proyecto:** {{projectName}}
**Fase:** Especificaciones de Análisis y Diseño
**Fecha:** {{fechaActual}}
**Basado en:** Marco de Referencia F0 + Informe de Necesidades F1

---

## 1. DECISIÓN DE MODALIDAD

| Parámetro | Decisión | Justificación |
|:---|:---|:---|
| Modalidad | Asincrónico | Basado en perfil F1 |
| Plataforma sugerida | Moodle | Sector manufactura usa Moodle |
| Distribución | N/A | |

---

## 2. NIVEL DE INTERACTIVIDAD (SCORM)

**Nivel seleccionado:** 3 — Moderado

| Elemento interactivo | Incluido | Frecuencia concreta |
|:---|:---|:---|
| Video con preguntas integradas | Sí | 2 por módulo |
| Actividades prácticas | Sí | 1 por módulo |
| Evaluaciones formativas | Sí | 1 por módulo |
| Simulaciones o ramificaciones | No | No aplica |
| Foros o colaboración | No | No aplica |

---

## 3. ESTRUCTURA TEMÁTICA PRELIMINAR

| Módulo | Nombre | Objetivo del módulo | Duración estimada (horas) |
|:---|:---|:---|:---|
| 1 | Fundamentos | Identificar conceptos básicos | 3 |
| 2 | Aplicación | Aplicar procedimientos | 4 |
| 3 | Evaluación | Evaluar resultados | 3 |
| **TOTAL** | | | **10** |

---

## 4. PERFIL DE INGRESO (Obligatorio EC0366)

| Categoría | Requisito | Fuente |
|:---|:---|:---|
| Escolaridad mínima | Secundaria terminada | F1 - perfil participante |
| Conocimientos previos | Ninguno | F0 - mejores prácticas |
| Habilidades digitales | Navegar en internet, usar correo electrónico, abrir archivos PDF | EC0366 pág. 13 |
| Equipo de cómputo | Computadora o tablet con navegador actualizado (Chrome/Firefox/Edge) | EC0366 pág. 13 |
| Conexión a internet | Conexión estable mínima 10 Mbps | EC0366 pág. 13 |

---

## 5. ESTRATEGIAS INSTRUCCIONALES

| Estrategia | Descripción | Módulos donde aplica | Nivel Bloom que atiende |
|:---|:---|:---|:---|
| Aprendizaje basado en casos | Análisis de situaciones reales del sector | Módulo 1 | Comprender |
| Aprendizaje activo | Ejercicios prácticos con retroalimentación | Módulo 2 | Aplicar |
| Evaluación formativa continua | Cuestionarios cortos al final de cada unidad | Módulo 3 | Evaluar |

---

## 6. SUPUESTOS Y RESTRICCIONES

### Supuestos
- Los participantes tienen acceso a un dispositivo con conexión a internet en su lugar de trabajo.
- El cliente dispone de contenido fuente (manuales, procedimientos) para transformar en material del curso.

### Restricciones identificadas
- El presupuesto no permite producción de video profesional; se usarán screencasts y materiales de texto enriquecido.
- La plataforma debe ser de código abierto o bajo costo dado el perfil del cliente.
