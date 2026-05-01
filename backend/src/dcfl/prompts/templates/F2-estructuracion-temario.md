---
id: F2
name: Estructuración del Temario y Especificaciones
version: 5.0.0
tags: [EC0366, temario, modulos, perfil, human-in-the-loop]
pipeline_steps:
  # ── Especialista A: Diseño de Estructura ────────────────────────────────────
  - agent: especialista_temario_a
    model: "@cf/meta/llama-3.1-8b-instruct"
    include_template: false
    task: |
      Actúa como un diseñador instruccional certificable en el estándar EC0366 "Desarrollo de cursos de formación en línea".

      ## ENTRADAS DISPONIBLES (Contexto Inyectado)
      - Perfil del Participante Validado: {{userInputs.perfil}}
      - Objetivos de Aprendizaje Aprobados: {{userInputs.objetivosAprobados}}
      - Notas del Cliente: {{userInputs.notas}}
      - Extracto del Proyecto: {{context.extract}}

      ## PROCESO QUE DEBES SEGUIR

      ### PASO 1: Definir modalidad del curso
      Basado en el perfil del alumno, elige UNA modalidad y justifícala:
      - **100% en línea asincrónico**: A su ritmo, sin horarios (para horarios variables).
      - **100% en línea sincrónico**: En vivo a horarios fijos (necesidad de interacción).
      - **Mixto (blended)**: Combina asincrónico con vivo (práctica guiada).
      - **Auto-guiado**: Sin instructor (escalabilidad).

      ### PASO 2: Definir grado de interactividad
      - **Bajo**: Solo lee, ve videos, cuestionarios simples.
      - **Medio**: Foros, ejercicios arrastrar/soltar, casos prácticos.
      - **Alto**: Simulaciones, proyectos, gamificación.

      ### PASO 3: Proponer estructura temática preliminar
      Propón una estructura de 3 a 5 módulos alineada a los objetivos. Cada módulo necesita un nombre, un objetivo claro y duración en horas.

      ### PASO 4: Definir PERFIL DE INGRESO (según EC0366)
      ¿A quién se lo podemos enseñar? Define y justifica:
      1. Escolaridad mínima (Ej: Bachillerato)
      2. Conocimientos previos (Ej: Manejo de Excel)
      3. Habilidades digitales (Ej: Navegar en internet)
      4. Equipo de cómputo (Ej: PC con 4GB RAM)
      5. Conexión a internet (Ej: 10 Mbps)
      6. Software requerido (Ej: Chrome)
      7. Disponibilidad sugerida (Ej: 5 horas semanales)

      ### PASO 5: Validación del Perfil
      Confirma si este perfil es realista para la audiencia.

      ## FORMATO DE SALIDA OBLIGATORIO (JSON ESTRICTO)
      No generes Markdown. No uses markdown de código (```json). Devuelve ÚNICA Y EXCLUSIVAMENTE este objeto JSON válido:

      {
        "modalidad_curso": {
          "seleccion": "string",
          "justificacion": "string"
        },
        "grado_interactividad": {
          "nivel": "string",
          "justificacion": "string"
        },
        "estructura_tematica": [
          {
            "modulo": 1,
            "nombre": "string",
            "objetivo": "string",
            "duracion_estimada_horas": 0
          }
        ],
        "perfil_ingreso_ec0366": {
          "escolaridad_minima": { "requisito": "string", "justificacion": "string" },
          "conocimientos_previos": { "requisito": "string", "justificacion": "string" },
          "habilidades_digitales": { "requisito": "string", "justificacion": "string" },
          "equipo_computo": { "requisito": "string", "justificacion": "string" },
          "conexion_internet": { "requisito": "string", "justificacion": "string" },
          "software_requerido": { "requisito": "string", "justificacion": "string" },
          "disponibilidad_sugerida": { "requisito": "string", "justificacion": "string" }
        },
        "validacion_perfil": {
          "es_realista": true,
          "razon_o_ajuste": "string"
        }
      }

  # ── Especialista B: Diseño de Estructura (Modelo Alternativo) ───────────────
  - agent: especialista_temario_b
    model: "@cf/qwen/qwen2.5-7b-instruct"
    include_template: false
    task: |
      Actúa como un diseñador instruccional certificable en el estándar EC0366 "Desarrollo de cursos de formación en línea". Proporciona una propuesta alternativa y creativa.

      ## ENTRADAS DISPONIBLES (Contexto Inyectado)
      - Perfil del Participante Validado: {{userInputs.perfil}}
      - Objetivos de Aprendizaje Aprobados: {{userInputs.objetivosAprobados}}
      - Notas del Cliente: {{userInputs.notas}}
      - Extracto del Proyecto: {{context.extract}}

      ## PROCESO QUE DEBES SEGUIR

      ### PASO 1: Definir modalidad del curso
      Basado en el perfil del alumno, elige UNA modalidad y justifícala:
      - **100% en línea asincrónico**: A su ritmo, sin horarios (para horarios variables).
      - **100% en línea sincrónico**: En vivo a horarios fijos (necesidad de interacción).
      - **Mixto (blended)**: Combina asincrónico con vivo (práctica guiada).
      - **Auto-guiado**: Sin instructor (escalabilidad).

      ### PASO 2: Definir grado de interactividad
      - **Bajo**: Solo lee, ve videos, cuestionarios simples.
      - **Medio**: Foros, ejercicios arrastrar/soltar, casos prácticos.
      - **Alto**: Simulaciones, proyectos, gamificación.

      ### PASO 3: Proponer estructura temática preliminar
      Propón una estructura de 3 a 5 módulos alineada a los objetivos. Cada módulo necesita un nombre, un objetivo claro y duración en horas.

      ### PASO 4: Definir PERFIL DE INGRESO (según EC0366)
      ¿A quién se lo podemos enseñar? Define y justifica:
      1. Escolaridad mínima (Ej: Bachillerato)
      2. Conocimientos previos (Ej: Manejo de Excel)
      3. Habilidades digitales (Ej: Navegar en internet)
      4. Equipo de cómputo (Ej: PC con 4GB RAM)
      5. Conexión a internet (Ej: 10 Mbps)
      6. Software requerido (Ej: Chrome)
      7. Disponibilidad sugerida (Ej: 5 horas semanales)

      ### PASO 5: Validación del Perfil
      Confirma si este perfil es realista para la audiencia.

      ## FORMATO DE SALIDA OBLIGATORIO (JSON ESTRICTO)
      No generes Markdown. No uses markdown de código (```json). Devuelve ÚNICA Y EXCLUSIVAMENTE este objeto JSON válido:

      {
        "modalidad_curso": {
          "seleccion": "string",
          "justificacion": "string"
        },
        "grado_interactividad": {
          "nivel": "string",
          "justificacion": "string"
        },
        "estructura_tematica": [
          {
            "modulo": 1,
            "nombre": "string",
            "objetivo": "string",
            "duracion_estimada_horas": 0
          }
        ],
        "perfil_ingreso_ec0366": {
          "escolaridad_minima": { "requisito": "string", "justificacion": "string" },
          "conocimientos_previos": { "requisito": "string", "justificacion": "string" },
          "habilidades_digitales": { "requisito": "string", "justificacion": "string" },
          "equipo_computo": { "requisito": "string", "justificacion": "string" },
          "conexion_internet": { "requisito": "string", "justificacion": "string" },
          "software_requerido": { "requisito": "string", "justificacion": "string" },
          "disponibilidad_sugerida": { "requisito": "string", "justificacion": "string" }
        },
        "validacion_perfil": {
          "es_realista": true,
          "razon_o_ajuste": "string"
        }
      }

  # ── Juez de Estructura (Embudo) ─────────────────────────────────────────────
  - agent: juez_temario
    inputs_from: [especialista_temario_a, especialista_temario_b]
    include_template: false
    task: |
      Eres el Juez de Calidad Pedagógica bajo el estándar EC0366. Debes evaluar las propuestas integrales A y B.

      CRITERIOS DE EVALUACIÓN:
      1. ¿Cubre TODOS los objetivos aprobados ({{userInputs.objetivosAprobados}}) en la estructura temática?
      2. ¿La modalidad y el perfil de ingreso son congruentes con el participante objetivo?
      3. ¿Sigue estrictamente el formato JSON solicitado sin texto adicional?

      Devuelve un JSON con la decisión:
      {
        "seleccion": "A" | "B",
        "razon": "Explicación breve",
        "objetivos_cubiertos": true/false
      }
      
      DEBES RESPONDER ÚNICA Y EXCLUSIVAMENTE CON UN OBJETO JSON VÁLIDO. NO INCLUYAS TEXTO INTRODUCTORIO NI EXPLICACIONES.

  # ── Ensamblador Final ──────────────────────────────────────────────────────
  - agent: sintetizador_final_f2
    inputs_from: [juez_temario]
    task: |
      Ensambla el documento final de Especificaciones de Análisis y Diseño utilizando la estructura ganadora validada por el Juez.

---

# ESPECIFICACIONES DE ANÁLISIS Y DISEÑO

Actúa bajo los estándares de competencia EC0366.
Tu salida debe ser profesional y lista para ser presentada al cliente.

CONTEXTO PREVIO (F0/F1):
{{context}}

INPUTS HUMANOS (MÁXIMA PRIORIDAD):
- PERFIL: {{userInputs.perfil}}
- OBJETIVOS APROBADOS: {{userInputs.objetivosAprobados}}
- NOTAS: {{userInputs.notas}}
