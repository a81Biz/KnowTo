---
id: F3
name: Especificaciones Técnicas del Curso
version: 3.0.0
tags: [EC0366, tecnico, LMS, SCORM, duracion]
pipeline_steps:
  - agent: extractor
    task: "Extrae de userInputs: lmsName, lmsUrl, scormVersion. De F2: estructura temática con horas, tipos de multimedia requeridos. De F3_inputs: startDate, instructorName si existen."
  - agent: specialist_a
    model: "@cf/meta/llama-3.1-8b-instruct"
    task: "Redacta secciones de plataforma LMS (datos literales del usuario), análisis técnico del LMS, estándar SCORM/xAPI y configuración de reporteo. NO cambies ni inventes la plataforma indicada."
  - agent: specialist_b
    model: "@cf/qwen/qwen2.5-7b-instruct"
    task: "Redacta duración estimada del curso (con cálculo explícito), especificaciones multimedia (video, audio, interactividad), compatibilidad técnica y herramientas de producción recomendadas."
  - agent: synthesizer
    model: "@cf/mistral/mistral-7b-instruct-v0.2"
    task: "Combina A y B en las Especificaciones Técnicas completas. Verifica que los datos del LMS del usuario no fueron alterados."
  - agent: judge
    rules:
      - "Los valores de lmsName, lmsUrl y scormVersion deben ser exactamente los del usuario o '[Por definir]'."
      - "La duración calculada debe mostrar la fórmula de cálculo."
      - "CRÍTICO: NO debe quedar NINGÚN placeholder entre corchetes en el documento final. Reemplaza todos los que encuentres — [texto], [N], [X], [nombre], [$], [%], [MB], [kbps], [px], [KB], [Sí/No], [1080p/720p], [basado en documentación conocida del LMS indicado], [copiar exactamente de userInputs.*], [N — del contexto F2_5 o userInputs], [X min/video], [X hrs], [N/lectura], [N/actividad], [N/evaluación] — con el valor real del usuario o del contexto, o con '[Por definir]' solo si el usuario no proporcionó el dato y no existe estándar aplicable."
      - "Devuelve el documento completo en Markdown válido."
---

Actúa como un diseñador instruccional certificable en EC0366 con experiencia en implementación de LMS y estándares SCORM/xAPI.

## CONTEXTO ACUMULADO DEL PROYECTO
{{context}}

## DATOS DE ENTRADA DEL USUARIO EN ESTA FASE
{{userInputs}}

## REGLAS ABSOLUTAS — NO VIOLAR
1. **La plataforma LMS es la que indicó el usuario.** NO sugieras cambiar de plataforma. NO inventes una diferente.
2. **Copia textualmente** los valores de `lmsName`, `lmsUrl` y `scormVersion` de `userInputs`. Si el usuario no los proporcionó, escribe `[Por definir]`.
3. **Los valores de recomendaciones pedagógicas** (actividades a reportar, frecuencia, videos, duración) vienen del contexto de F2_5. Úsalos tal como están; solo ajusta si el usuario los modificó en `userInputs`.
4. No inventes URLs, versiones, ni compatibilidades que no estén en los inputs.

## PROCESO
1. **Sección 1a**: Copia literalmente los datos del LMS del usuario.
2. **Sección 1b**: Analiza técnicamente la plataforma indicada (capacidades reales conocidas del LMS nombrado).
3. Define el estándar de empaquetamiento según `scormVersion` del usuario.
4. Completa las secciones de reporteo, duración, multimedia y criterios con el contexto acumulado y los inputs.
5. Genera el documento en el formato obligatorio.

## FORMATO DE SALIDA OBLIGATORIO

# ESPECIFICACIONES TÉCNICAS DEL CURSO
**Proyecto:** {{projectName}}
**Fase:** Especificaciones Técnicas del Curso
**Fecha:** {{fechaActual}}

---

## 1. PLATAFORMA LMS

### 1a. Datos proporcionados por el usuario

| Parámetro | Valor ingresado |
|:---|:---|
| LMS seleccionado | [copiar exactamente de userInputs.lmsName] |
| URL / hosting | [copiar exactamente de userInputs.lmsUrl, o "Por definir"] |
| Estándar de empaquetamiento | [copiar exactamente de userInputs.scormVersion] |

### 1b. Análisis técnico de la plataforma indicada

| Parámetro | Especificación técnica |
|:---|:---|
| Compatibilidad con navegadores | [basado en documentación conocida del LMS indicado] |
| Soporte para móviles | [basado en documentación conocida del LMS indicado] |
| Capacidades de tracking | [lo que soporta el LMS indicado] |
| Notas de implementación | [consideraciones técnicas relevantes para EC0366] |

---

## 2. REQUISITOS DE REPORTEO Y SEGUIMIENTO

| Métrica | ¿Se rastrea? | Herramienta |
|:---|:---|:---|
| Progreso por módulo | [Sí/No] | [LMS nativo / xAPI / otro] |
| Tiempo invertido | [Sí/No] | [texto] |
| Calificaciones | [Sí/No] | [texto] |
| Intentos por evaluación | [Sí/No] | [texto] |
| Fecha de inicio/fin | [Sí/No] | [texto] |

---

## 3. DURACIÓN CALCULADA

| Componente | Cantidad | Tiempo unitario | Total |
|:---|:---|:---|:---|
| Videos | [N — del contexto F2_5 o userInputs] | [X min/video] | [X hrs] |
| Lecturas | [N] | [X min/lectura] | [X hrs] |
| Actividades prácticas | [N] | [X min/actividad] | [X hrs] |
| Evaluaciones | [N] | [X min/evaluación] | [X hrs] |
| **TOTAL** | | | **[X hrs]** |

---

## 4. ESPECIFICACIONES MULTIMEDIA

| Formato | Resolución/Calidad | Peso máximo | Herramienta sugerida |
|:---|:---|:---|:---|
| Video | [1080p/720p] | [MB] | [texto] |
| Audio | [kbps] | [MB] | [texto] |
| Imágenes | [px] | [KB] | [texto] |
| PDFs | [texto] | [MB] | [texto] |

---

## 5. CRITERIOS DE APROBACIÓN

| Criterio | Valor |
|:---|:---|
| Calificación mínima aprobatoria | [%] |
| Progreso mínimo requerido | [%] |
| Número máximo de intentos | [N] |
| ¿Se emite constancia/certificado? | [Sí/No] |
| Vigencia de la constancia | [texto] |

---

## 6. ARQUITECTURA DE EVALUACIÓN

| Tipo | Peso | Descripción |
|:---|:---|:---|
| Evaluación diagnóstica | [%] | [texto] |
| Evaluaciones formativas | [%] | [texto] |
| Evaluación sumativa | [%] | [texto] |

## INSTRUCCIONES DE CALIDAD (REQUERIDO — NO IGNORAR)

- **La plataforma LMS en sección 1a DEBE ser EXACTAMENTE la que el usuario indicó.** Si difiere de cualquier sugerencia previa, prevalece lo que el usuario escribió. NO sugieras cambios ni alternativas.
- **NO uses placeholders `[X]`, `[texto]`, `[valor]`, `[nombre]`, `[plataforma]`, `[MB]`, `[%]`, `[N]`.** Todos los campos deben tener valores concretos propuestos por la IA.
- **Para cada especificación multimedia, propón un valor concreto basado en mejores prácticas:**
  - Video: 1920×1080 (Full HD) · 500 MB máx · YouTube (público) o Vimeo (privado)
  - Audio: 128 kbps (narración), 320 kbps (música/efectos) · MP3 o AAC
  - Imágenes: 1280×720 px mínimo · JPEG 85% o PNG · máx 200 KB
  - PDFs: A4 portrait, texto seleccionable · máx 5 MB
- **Si no hay suficiente contexto para un campo específico, usa el valor estándar de la industria e indica entre paréntesis: (estándar de la industria).**
- Especifica versiones exactas (SCORM 1.2 vs SCORM 2004 tienen diferencia técnica importante).
- Los criterios de aprobación deben ser medibles y objetivos.
- **Al final del documento, incluye una sección "📝 Propuesta de valores para revisión" con una tabla resumen de los valores clave propuestos por la IA, para que el usuario pueda revisarlos y ajustarlos.**
- Responde SOLO en español.
