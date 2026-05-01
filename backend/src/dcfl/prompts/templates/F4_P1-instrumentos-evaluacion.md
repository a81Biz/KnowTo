---
id: F4_P1
name: Producto 1 - Instrumentos de Evaluación
version: 1.0.0
tags: [EC0366, evaluacion, rubricas]
pipeline_steps:
  # EQUIPO PARA TEMA 1: Teoría del contraste y la luz
  - agent: t1_eval_A
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: []
    include_template: false
    task: "Crea la Guía de Observación y Lista de Cotejo DETALLADA para: Teoría del Contraste y la Luz. Mínimo 10 reactivos técnicos. DEVUELVE SOLO JSON ESTRICTO: { \"instrumentos\": [ { \"tipo\": \"Lista de Cotejo | Guía de Observación\", \"tema\": \"Teoría del Contraste y la Luz\", \"reactivos\": [ { \"criterio\": \"El participante...\", \"peso\": 10 } ] } ] }"
  - agent: t1_eval_B
    model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
    inputs_from: []
    include_template: false
    task: "Crea la Guía de Observación y Lista de Cotejo DETALLADA para: Teoría del Contraste y la Luz. Enfoque en criterios de desempeño físico. DEVUELVE SOLO JSON ESTRICTO: { \"instrumentos\": [ { \"tipo\": \"Lista de Cotejo | Guía de Observación\", \"tema\": \"Teoría del Contraste y la Luz\", \"reactivos\": [ { \"criterio\": \"El participante...\", \"peso\": 10 } ] } ] }"
  - agent: t1_juez
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [t1_eval_A, t1_eval_B]
    include_template: false
    task: "Compara A y B. Elige los instrumentos cuyos reactivos sean más medibles y objetivos para el Tema 1. DEVUELVE SOLO JSON ESTRICTO CON PUNTERO: {\"seleccion\": \"A\"} o {\"seleccion\": \"B\"}"

  # EQUIPO PARA TEMA 2: Principios del sombreado
  - agent: t2_eval_A
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: []
    include_template: false
    task: "Crea los instrumentos para: Principios del sombreado (Lavados y Veladuras). Mínimo 10 reactivos. DEVUELVE SOLO JSON ESTRICTO: { \"instrumentos\": [ { \"tipo\": \"Lista de Cotejo | Guía de Observación\", \"tema\": \"Principios del sombreado\", \"reactivos\": [ { \"criterio\": \"...\", \"peso\": 10 } ] } ] }"
  - agent: t2_eval_B
    model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
    inputs_from: []
    include_template: false
    task: "Crea los instrumentos para: Principios del sombreado. Enfoque en técnica de pincel. DEVUELVE SOLO JSON ESTRICTO: { \"instrumentos\": [ { \"tipo\": \"Lista de Cotejo | Guía de Observación\", \"tema\": \"Principios del sombreado\", \"reactivos\": [ { \"criterio\": \"...\", \"peso\": 10 } ] } ] }"
  - agent: t2_juez
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [t2_eval_A, t2_eval_B]
    include_template: false
    task: "Elige el mejor set para el Tema 2. DEVUELVE SOLO JSON ESTRICTO CON PUNTERO: {\"seleccion\": \"A\"} o {\"seleccion\": \"B\"}"

  # EQUIPO PARA TEMA 3: Técnicas avanzadas de resaltado
  - agent: t3_eval_A
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: []
    include_template: false
    task: "Crea los instrumentos para: Técnicas avanzadas de resaltado. Mínimo 10 reactivos. DEVUELVE SOLO JSON ESTRICTO: { \"instrumentos\": [ { \"tipo\": \"Lista de Cotejo | Guía de Observación\", \"tema\": \"Técnicas avanzadas de resaltado\", \"reactivos\": [ { \"criterio\": \"...\", \"peso\": 10 } ] } ] }"
  - agent: t3_eval_B
    model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
    inputs_from: []
    include_template: false
    task: "Crea los instrumentos para: Técnicas avanzadas de resaltado. Enfoque práctico. DEVUELVE SOLO JSON ESTRICTO: { \"instrumentos\": [ { \"tipo\": \"Lista de Cotejo | Guía de Observación\", \"tema\": \"Técnicas avanzadas de resaltado\", \"reactivos\": [ { \"criterio\": \"...\", \"peso\": 10 } ] } ] }"
  - agent: t3_juez
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [t3_eval_A, t3_eval_B]
    include_template: false
    task: "Elige el mejor set para el Tema 3. DEVUELVE SOLO JSON ESTRICTO CON PUNTERO: {\"seleccion\": \"A\"} o {\"seleccion\": \"B\"}"

  # EQUIPO PARA TEMA 4: Proyecto práctico
  - agent: t4_eval_A
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: []
    include_template: false
    task: "Crea los instrumentos para: Proyecto práctico final. Mínimo 10 reactivos. DEVUELVE SOLO JSON ESTRICTO: { \"instrumentos\": [ { \"tipo\": \"Lista de Cotejo | Guía de Observación\", \"tema\": \"Proyecto práctico\", \"reactivos\": [ { \"criterio\": \"...\", \"peso\": 10 } ] } ] }"
  - agent: t4_eval_B
    model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
    inputs_from: []
    include_template: false
    task: "Crea los instrumentos para: Proyecto práctico final. Enfoque de resultado final. DEVUELVE SOLO JSON ESTRICTO: { \"instrumentos\": [ { \"tipo\": \"Lista de Cotejo | Guía de Observación\", \"tema\": \"Proyecto práctico\", \"reactivos\": [ { \"criterio\": \"...\", \"peso\": 10 } ] } ] }"
  - agent: t4_juez
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [t4_eval_A, t4_eval_B]
    include_template: false
    task: "Elige el mejor set para el Tema 4. DEVUELVE SOLO JSON ESTRICTO CON PUNTERO: {\"seleccion\": \"A\"} o {\"seleccion\": \"B\"}"

  - agent: ensamblador_p1_final
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [t1_juez, t2_juez, t3_juez, t4_juez]
    include_template: false
    task: "CÓDIGO - Ensamblaje TS"
---
