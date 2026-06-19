---
id: F5_2
name: Anexo de Evidencias del Proceso
version: 2.0.0
tags: [evidencias, plantillas, documentacion, battle-pattern]
pipeline_steps:

  # ── ESPECIALISTA A ────────────────────────────────────────────────────────
  - agent: agente_evidencias_A
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: true
    task: |
      Eres un documentador técnico especializado en expedientes de certificación conforme a {{estandarNorma}}.
      Genera el listado de evidencias requeridas basándote en el contexto del proyecto.
      Cada evidencia debe tener propósito claro, instrucción de captura específica y nombre de archivo sugerido.
      REGLA: Las evidencias son PLANTILLAS con instrucciones, NO datos inventados.
      SALIDA: SOLO JSON válido con la estructura evidencias descrita en la plantilla.

  # ── ESPECIALISTA B ────────────────────────────────────────────────────────
  - agent: agente_evidencias_B
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: true
    task: |
      Eres un coordinador de certificación experto en recopilación de evidencias para {{estandarNorma}}.
      Genera el listado de evidencias con instrucciones detalladas de captura, adaptadas a la plataforma LMS del proyecto.
      REGLA: Las evidencias son PLANTILLAS con instrucciones, NO datos inventados.
      SALIDA: SOLO JSON válido con la estructura evidencias descrita en la plantilla.

  # ── JUEZ ──────────────────────────────────────────────────────────────────
  - agent: juez_evidencias
    model: "qwen2.5:14b"
    inputs_from: [agente_evidencias_A, agente_evidencias_B]
    include_template: false
    task: |
      Compara los dos listados de evidencias (A y B).
      Selecciona el más completo, con instrucciones más claras y mejor adaptado al contexto del proyecto.
      DEVUELVE SOLO: {"seleccion":"A","razon":"justificación en una frase"}

  # ── ENSAMBLADOR (TypeScript, sin LLM) ─────────────────────────────────────
  - agent: ensamblador_f5_2
    model: null
    inputs_from: [juez_evidencias]
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
  "evidencias": {
    "lista": [
      {
        "numero": 1,
        "nombre": "Curso publicado en LMS",
        "proposito": "Demostrar que el curso está activo y accesible en la plataforma",
        "archivo": "evidencia-1-curso-publicado.png",
        "instruccion_captura": "Captura de pantalla de la pantalla de inicio del curso con título visible y estado Activo",
        "formato": "PNG o JPG, mínimo 1280×720 px"
      },
      {
        "numero": 2,
        "nombre": "Seguimiento y reporteo del LMS",
        "proposito": "Demostrar que el LMS registra el progreso y actividad de los participantes",
        "archivo": "evidencia-2-reporteo-lms.png",
        "instruccion_captura": "Captura del panel de reportes con al menos un participante mostrando progreso",
        "formato": "PNG o JPG, mínimo 1280×720 px"
      },
      {
        "numero": 3,
        "nombre": "Resultados de evaluaciones",
        "proposito": "Demostrar que las evaluaciones funcionan y registran resultados",
        "archivo": "evidencia-3-resultados-evaluaciones.png",
        "instruccion_captura": "Captura del reporte de calificaciones en el LMS con datos de participantes de prueba",
        "formato": "PNG o JPG"
      },
      {
        "numero": 4,
        "nombre": "Certificados o constancias emitidos",
        "proposito": "Demostrar que el LMS puede generar comprobantes de finalización",
        "archivo": "evidencia-4-certificado-ejemplo.pdf",
        "instruccion_captura": "Ejemplo de una constancia generada durante la prueba piloto (puede ser la del administrador)",
        "formato": "PDF o PNG"
      }
    ],
    "lista_verificacion": [
      {"numero": 1, "archivo": "evidencia-1-curso-publicado.png"},
      {"numero": 2, "archivo": "evidencia-2-reporteo-lms.png"},
      {"numero": 3, "archivo": "evidencia-3-resultados-evaluaciones.png"},
      {"numero": 4, "archivo": "evidencia-4-certificado-ejemplo.pdf"}
    ]
  }
}
```

REGLAS ABSOLUTAS:
- Las instrucciones de captura deben ser específicas y accionables (qué capturar, cómo, qué mostrar).
- Adapta evidencias al tipo de plataforma LMS del proyecto si está disponible en el contexto.
- NO inventes datos reales (URLs, nombres, fechas) — solo instrucciones de qué capturar.
- Responde SOLO en {{idiomaRequerido}}.
- OUTPUT SOLO JSON VÁLIDO — sin texto, sin markdown adicional.
