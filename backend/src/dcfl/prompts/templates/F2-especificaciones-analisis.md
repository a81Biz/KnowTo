---
id: F2
name: Especificaciones de Análisis y Diseño
version: 4.0.0
tags: [EC0366, analisis, modalidad, interactividad, perfil-ingreso]
pipeline_steps:
  # ── Extractor: datos clave de F0 y F1 ────────────────────────────────────
  - agent: extractor_f2
    include_template: false
    task: |
      Extrae y resume los siguientes datos del CONTEXTO ORIGINAL. Sé conciso.

      DE F0 (Marco de Referencia):
      - Sector/industria
      - Mejores prácticas de formación en el sector
      - Plataformas LMS o tecnologías mencionadas (nombres exactos)
      - Nivel tecnológico típico de los participantes

      DE F1 (Informe de Necesidades):
      - Lista completa de objetivos de aprendizaje (verbo + nivel Bloom exacto)
      - Perfil del participante: escolaridad, conocimientos previos, habilidades digitales, dispositivos, conexión
      - Brechas de competencia (tipo: Conocimiento/Habilidad/Actitud)
      - Resultados esperados
      - Duración total estimada del curso si se menciona

      Devuelve SOLO los datos extraídos, sin interpretación ni inventar nada.

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
      | Distribución | [si Mixto: "X% sincrónico / Y% asincrónico"; si no es Mixto: "N/A"] | [razón o N/A] |

      REGLAS OBLIGATORIAS:
      - Elige EXACTAMENTE UNA modalidad. No escribas dos ni combines.
      - Elige la plataforma SOLO de la lista dada. No inventes otras.
      - No escribas placeholders entre corchetes en la tabla final.
      - No agregues secciones adicionales. Solo la tabla anterior.

  # ── Especialista 2: Interactividad SCORM ─────────────────────────────────
  - agent: agente_interactividad
    model: "@cf/qwen/qwen2.5-7b-instruct"
    inputs_from: [extractor_f2]
    include_template: false
    task: |
      Con los datos de EXTRACTOR_F2 (especialmente las brechas de F1), genera EXACTAMENTE esta sección:

      ## 2. NIVEL DE INTERACTIVIDAD (SCORM)

      **Nivel seleccionado:** [escribe UN número del 1 al 4] — [escribe UNA de estas palabras: Pasivo, Limitado, Moderado, Robusto]

      | Elemento interactivo | Incluido | Frecuencia concreta |
      |:---|:---|:---|
      | Video con preguntas integradas | [Sí o No] | [si Sí: escribe "N por módulo" con N=número real; si No: "No aplica"] |
      | Actividades prácticas | [Sí o No] | [si Sí: escribe "N por módulo"; si No: "No aplica"] |
      | Evaluaciones formativas | [Sí o No] | [si Sí: escribe "N por módulo"; si No: "No aplica"] |
      | Simulaciones o ramificaciones | [Sí o No] | [si Sí: escribe "N por módulo"; si No: "No aplica"] |
      | Foros o colaboración | [Sí o No] | [si Sí: escribe "N por módulo"; si No: "No aplica"] |

      REGLAS OBLIGATORIAS:
      - Elige EXACTAMENTE UN número de nivel (1, 2, 3 o 4). NUNCA escribas un rango como "2-3" o "Moderado-robusto".
      - Nivel 1=Pasivo, 2=Limitado, 3=Moderado, 4=Robusto. UNO solo.
      - Si el elemento está marcado Sí, DEBES escribir una frecuencia con un número real (ej: "2 por módulo").
      - NUNCA dejes "N/A" ni vacío en frecuencia cuando el elemento es Sí.
      - No escribas más texto que la línea de nivel y la tabla.

  # ── Especialista 3: Estructura temática ──────────────────────────────────
  - agent: agente_estructura
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [extractor_f2]
    include_template: false
    task: |
      Con los objetivos de aprendizaje de EXTRACTOR_F2 (de F1), genera EXACTAMENTE esta sección:

      ## 3. ESTRUCTURA TEMÁTICA PRELIMINAR

      | Módulo | Nombre | Objetivo del módulo | Duración estimada (horas) |
      |:---|:---|:---|:---|
      | 1 | [nombre descriptivo] | [verbo Bloom + resultado medible] | [número] |
      | 2 | [nombre descriptivo] | [verbo Bloom + resultado medible] | [número] |
      | 3 | [nombre descriptivo] | [verbo Bloom + resultado medible] | [número] |
      | **TOTAL** | | | **[suma de horas]** |

      REGLAS OBLIGATORIAS:
      - Incluye 3 a 5 módulos. Cada módulo mapea a AL MENOS UN objetivo de F1.
      - La fila TOTAL es obligatoria con la suma real de las horas.
      - Los números de horas deben ser coherentes con la complejidad del curso.
      - No escribas placeholders. No escribas texto adicional fuera de la tabla.

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
    task: |
      Con los datos de EXTRACTOR_F2 y los módulos de AGENTE_ESTRUCTURA, genera EXACTAMENTE estas dos secciones:

      ## 5. ESTRATEGIAS INSTRUCCIONALES

      | Estrategia | Descripción | Módulos donde aplica | Nivel Bloom que atiende |
      |:---|:---|:---|:---|
      | [nombre de estrategia] | [descripción de 1-2 oraciones] | [Módulo 1] | [UN nivel Bloom] |
      | [nombre de estrategia] | [descripción de 1-2 oraciones] | [Módulo 2] | [UN nivel Bloom] |
      | [nombre de estrategia] | [descripción de 1-2 oraciones] | [Módulo 3] | [UN nivel Bloom] |

      ## 6. SUPUESTOS Y RESTRICCIONES

      ### Supuestos
      - [supuesto específico del proyecto]
      - [supuesto específico del proyecto]

      ### Restricciones identificadas
      - [restricción concreta del cliente/sector/presupuesto]
      - [restricción concreta del cliente/sector/presupuesto]

      REGLAS OBLIGATORIAS:
      - La columna "Nivel Bloom que atiende" DEBE ser ÚNICAMENTE una de estas palabras: Recordar, Comprender, Aplicar, Analizar, Evaluar, Crear. NADA MÁS.
      - "Nivel de comprensión" NO es un nivel Bloom. "Nivel de habilidad" NO es un nivel Bloom.
      - El número de filas en Estrategias DEBE ser igual al número de módulos de AGENTE_ESTRUCTURA (máximo 5).
      - La columna "Módulos donde aplica" DEBE referenciar módulos reales de AGENTE_ESTRUCTURA (no módulos inventados).
      - Supuestos y restricciones: mínimo 2 cada uno, específicos (no genéricos).
      - CRÍTICO: NUNCA escribas referencias a otros agentes como AGENTE_ESTRUCTURA.nombre, AGENTE_X.Y,
        AGENTE_INTERACTIVIDAD.campo, etc. Si necesitas el nombre de un módulo, escríbelo completo
        (ej: "Módulo 1 — Fundamentos de [tema]"). Si no tienes el dato exacto, inventa un nombre
        coherente con el sector. NUNCA dejes texto con formato AGENTE_*.* en tu salida.

  # ── Ensamblador A ────────────────────────────────────────────────────────
  - agent: sintetizador_a_f2
    model: "@cf/meta/llama-3.1-8b-instruct"
    inputs_from: [agente_modalidad_plataforma, agente_interactividad, agente_estructura, agente_perfil_ingreso, agente_estrategias_supuestos]
    max_input_chars: 2000
    include_template: false
    task: |
      Ensambla el borrador A del documento final combinando las secciones generadas por los agentes anteriores.
      El documento debe tener EXACTAMENTE este encabezado seguido de las secciones en orden:

      # ESPECIFICACIONES DE ANÁLISIS Y DISEÑO
      **Proyecto:** {{projectName}}
      **Fase:** Especificaciones de Análisis y Diseño
      **Fecha:** {{fechaActual}}
      **Basado en:** Marco de Referencia F0 + Informe de Necesidades F1

      ---

      [Pega aquí el contenido de AGENTE_MODALIDAD_PLATAFORMA — sección 1]

      ---

      [Pega aquí el contenido de AGENTE_INTERACTIVIDAD — sección 2]

      ---

      [Pega aquí el contenido de AGENTE_ESTRUCTURA — sección 3]

      ---

      [Pega aquí el contenido de AGENTE_PERFIL_INGRESO — sección 4]

      ---

      [Pega aquí el contenido de AGENTE_ESTRATEGIAS_SUPUESTOS — secciones 5 y 6]

      REGLA: No modifiques el contenido de las secciones. Solo copia y organiza con el encabezado.
      REGLA: Si un agente no generó su sección o la generó vacía, escribe "SECCIÓN NO DISPONIBLE".

  # ── Ensamblador B ────────────────────────────────────────────────────────
  - agent: sintetizador_b_f2
    model: "@cf/qwen/qwen2.5-7b-instruct"
    inputs_from: [agente_modalidad_plataforma, agente_interactividad, agente_estructura, agente_perfil_ingreso, agente_estrategias_supuestos]
    max_input_chars: 2000
    include_template: false
    task: |
      Ensambla el borrador B del documento final. Usa los mismos datos de los agentes anteriores.
      Aplica correcciones menores de redacción y consistencia si ves contradicciones.

      El documento debe tener EXACTAMENTE este encabezado seguido de las secciones en orden:

      # ESPECIFICACIONES DE ANÁLISIS Y DISEÑO
      **Proyecto:** {{projectName}}
      **Fase:** Especificaciones de Análisis y Diseño
      **Fecha:** {{fechaActual}}
      **Basado en:** Marco de Referencia F0 + Informe de Necesidades F1

      ---

      [Sección 1 de AGENTE_MODALIDAD_PLATAFORMA]
      ---
      [Sección 2 de AGENTE_INTERACTIVIDAD]
      ---
      [Sección 3 de AGENTE_ESTRUCTURA]
      ---
      [Sección 4 de AGENTE_PERFIL_INGRESO]
      ---
      [Secciones 5 y 6 de AGENTE_ESTRATEGIAS_SUPUESTOS]

      REGLA CRÍTICA: Si ves que el nivel SCORM tiene un rango (ej: "2-3"), elige el número mayor.
      REGLA CRÍTICA: Si el perfil de ingreso tiene más de 5 filas, elimina las extras.
      REGLA CRÍTICA: Si los niveles Bloom en estrategias no son de la lista [Recordar, Comprender, Aplicar, Analizar, Evaluar, Crear], corrígelos.

  # ── Juez ─────────────────────────────────────────────────────────────────
  - agent: juez_f2
    inputs_from: [sintetizador_a_f2, sintetizador_b_f2]
    rules:
      - "SCORM: el nivel debe ser UN número entero (1, 2, 3 o 4) seguido de UN descriptor (Pasivo/Limitado/Moderado/Robusto). Si cualquier borrador dice 'Moderado-robusto', 'Pasivo o Limitado', o cualquier rango — rechaza ese borrador en esta regla y toma el otro."
      - "PERFIL DE INGRESO: debe tener EXACTAMENTE 5 filas. La fila 'Equipo de cómputo' NO debe mencionar Mbps ni velocidad de internet. La fila 'Conexión a internet' NO debe mencionar tipo de dispositivo ni navegador. Si una fila mezcla categorías — rechaza ese borrador y toma el otro."
      - "ESTRATEGIAS: la sección 5 DEBE ser una tabla Markdown con 4 columnas. Los valores en 'Nivel Bloom que atiende' DEBEN ser únicamente: Recordar, Comprender, Aplicar, Analizar, Evaluar, o Crear. Si dice 'nivel de comprensión', 'nivel de habilidad', o cualquier otra cosa — rechaza ese borrador."
      - "MÓDULOS REFERENCIADOS: en la tabla de estrategias, los módulos referenciados deben existir en la sección 3 del mismo borrador. Si estrategias menciona 'Módulo 4' pero solo hay 3 módulos — rechaza ese borrador."
      - "PLACEHOLDERS: ningún borrador puede tener texto entre corchetes [texto], [N], [X]. Si los tiene — rechaza."
      - "Selecciona el borrador que pasa más reglas. Si ambos pasan todas las reglas, selecciona el más detallado. Devuelve el documento completo del borrador seleccionado en Markdown válido, aplicando las correcciones necesarias."

  # ── Validador F2 (código, sin IA) ────────────────────────────────────────
  # Detecta placeholders AGENTE_*.* y patrones [texto] en el output del juez.
  # Si los encuentra, los limpia en código antes del sintetizador_final.
  - agent: validador_f2
    inputs_from: [juez_f2]

  # ── Sintetizador final (post-procesamiento en código, sin IA) ───────────
  # ai.service.ts intercepta este agente y aplica _cleanF2Document():
  #   - Deduplicar secciones (primera ocurrencia de cada ## N.)
  #   - Corregir nivel SCORM si quedó como rango (toma el número mayor)
  #   - Eliminar líneas sueltas de "corrección" del LLM
  - agent: sintetizador_final_f2
    inputs_from: [juez_f2]
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
