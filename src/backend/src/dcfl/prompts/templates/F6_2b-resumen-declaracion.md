---
id: F6_2b
name: Resumen Ejecutivo y Declaración Final
version: 2.0.0
tags: [resumen-ejecutivo, declaracion, cierre, certificacion, battle-pattern]
pipeline_steps:

  # ── ESPECIALISTA A ────────────────────────────────────────────────────────
  - agent: agente_declaracion_A
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: true
    task: |
      Eres un coordinador de certificación responsable del resumen ejecutivo del expediente conforme a {{estandarNorma}}.
      Extrae los datos del curso del contexto del proyecto (nombre, industria, duración de estudio, modalidad, plataforma, módulos, videos, fechas).
      Para el campo "duracion": usa EXCLUSIVAMENTE el valor de `resumen_datos.duracion` del contexto. Este campo representa las HORAS DE ESTUDIO del curso para los participantes. PROHIBIDO usar duraciones de producción de video (minutos por video de F2.5) — esos son datos de producción, no de estudio.
      Genera un resumen ejecutivo conciso y una declaración formal.
      SALIDA: SOLO JSON válido con la estructura resumen_declaracion descrita en la plantilla.

  # ── ESPECIALISTA B ────────────────────────────────────────────────────────
  - agent: agente_declaracion_B
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: true
    task: |
      Eres un especialista en documentación de cierre para procesos de certificación conforme a {{estandarNorma}}.
      Genera el resumen ejecutivo con datos precisos del contexto del proyecto y una declaración formal completa.
      Para el campo "duracion": usa EXCLUSIVAMENTE el valor de `resumen_datos.duracion` del contexto. Este campo representa las HORAS DE ESTUDIO del curso para los participantes. PROHIBIDO usar duraciones de producción de video (minutos por video de F2.5) — esos son datos de producción, no de estudio.
      Incluye los logros del proceso y observaciones para el organismo certificador.
      SALIDA: SOLO JSON válido con la estructura resumen_declaracion descrita en la plantilla.

  # ── JUEZ ──────────────────────────────────────────────────────────────────
  - agent: juez_declaracion
    model: "qwen2.5:14b"
    inputs_from: [agente_declaracion_A, agente_declaracion_B]
    include_template: false
    task: |
      Compara los dos resúmenes ejecutivos (A y B).
      Selecciona el más completo, con datos más precisos y declaración más formal.
      DEVUELVE SOLO: {"seleccion":"A","razon":"justificación en una frase"}

  # ── ENSAMBLADOR (TypeScript, sin LLM) ─────────────────────────────────────
  - agent: ensamblador_f6_2b
    model: null
    inputs_from: [juez_declaracion]
    include_template: false
    task: ""
---

## CONTEXTO DEL PROYECTO
{context}

## DATOS DEL USUARIO EN ESTA FASE
{userInputs}

## ESTRUCTURA JSON REQUERIDA (SALIDA OBLIGATORIA)

Responde SOLO con JSON válido. Sin texto adicional fuera del JSON.

```json
{
  "resumen_declaracion": {
    "datos_curso": {
      "nombre": "Nombre oficial del curso extraído del contexto",
      "industria": "Industria/Sector del proyecto",
      "duracion": "usar resumen_datos.duracion — son las HORAS DE ESTUDIO del curso (NO minutos de producción de video)",
      "modalidad": "Virtual/Presencial/Mixta",
      "plataforma": "Nombre de la plataforma LMS",
      "scorm": "SCORM 1.2/2004/No aplica",
      "modulos": "N módulos",
      "videos": "N videos producidos",
      "fecha_inicio": "DD/MM/AAAA"
    },
    "logros": "Párrafo conciso sobre el logro principal de este curso y cómo resolverá la necesidad del cliente.",
    "observaciones_organismo": "Indicar si hubo ajustes post-evaluación y que el curso pasó por revisión. Si no hubo ajustes significativos, indicarlo.",
    "declaracion_adicional": "Texto formal de declaración del candidato (este campo es informativo para el ensamblador)"
  }
}
```

REGLAS ABSOLUTAS:
- Extrae todos los datos disponibles del contexto — no inventes ni estimes.
- Si un dato no está en el contexto, usa "No especificado" (NUNCA imprimas llaves o corchetes).
- El campo logros debe redactarse en un tono formal y corporativo.
- Responde SOLO en {{idiomaRequerido}}.
- OUTPUT SOLO JSON VÁLIDO — sin texto, sin markdown adicional.
- PROHIBIDO usar datos de duración de producción audiovisual (minutos por video, duración_minima, duracion_maxima de F2.5) como valor del campo "duracion". Ese campo representa HORAS DE ESTUDIO del participante, no tiempo de producción.
- Para "duracion": usar ÚNICAMENTE resumen_datos.duracion. Si no está disponible, usar "No especificado".
