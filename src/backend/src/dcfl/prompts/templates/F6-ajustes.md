---
id: F6
name: Documento de Ajustes Post-Evaluación
version: 2.0.0
tags: [ajustes, revision, calidad, battle-pattern]
pipeline_steps:

  # ── ESPECIALISTA A ────────────────────────────────────────────────────────
  - agent: agente_ajustes_A
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: true
    task: |
      Eres un consultor de calidad instruccional especializado en mejora continua de cursos conforme a {{estandarNorma}}.
      Analiza las observaciones del usuario y el contexto del proyecto para generar un plan de ajustes estructurado.
      PRIORIZA: clasificación clara de observaciones, soluciones accionables, control de versiones.
      SALIDA: SOLO JSON válido con la estructura ajustes descrita en la plantilla.

  # ── ESPECIALISTA B ────────────────────────────────────────────────────────
  - agent: agente_ajustes_B
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: true
    task: |
      Eres un especialista en gestión de proyectos de diseño instruccional con enfoque en certificación conforme a {{estandarNorma}}.
      Analiza las observaciones del usuario y genera un plan de ajustes con verificaciones objetivas y medibles.
      PRIORIZA: criterios de verificación específicos, responsables claros, control de versiones riguroso.
      SALIDA: SOLO JSON válido con la estructura ajustes descrita en la plantilla.

  # ── JUEZ ──────────────────────────────────────────────────────────────────
  - agent: juez_ajustes
    model: "qwen2.5:14b"
    inputs_from: [agente_ajustes_A, agente_ajustes_B]
    include_template: false
    task: |
      Compara los dos planes de ajustes (A y B).
      Selecciona el más completo, con clasificaciones más útiles y verificaciones más objetivas.
      DEVUELVE SOLO: {"seleccion":"A","razon":"justificación en una frase"}

  # ── ENSAMBLADOR (TypeScript, sin LLM) ─────────────────────────────────────
  - agent: ensamblador_f6
    model: null
    inputs_from: [juez_ajustes]
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
  "ajustes": {
    "observaciones_recibidas": "Síntesis de las observaciones del usuario y/o participantes de prueba",
    "clasificacion": [
      {
        "numero": 1,
        "observacion": "descripción de la observación",
        "tipo": "Técnico",
        "prioridad": "Alta",
        "responsable": "Candidato",
        "plazo": "DD/MM/AAAA"
      }
    ],
    "plan_detallado": [
      {
        "nombre": "Nombre del ajuste 1",
        "problema": "Descripción del problema identificado",
        "solucion": "Solución propuesta específica",
        "archivos": "Ej: Video_Modulo_1_v2.mp4, Presentacion_Modulo_3.pptx, Evaluacion_Final_v1.1.pdf, Guion_Video_M2.docx",
        "responsable": "Nombre del responsable",
        "fecha_limite": "DD/MM/AAAA",
        "verificacion": "Criterio objetivo de cómo verificar que el ajuste está completo"
      }
    ],
    "control_versiones": [
      {
        "version": "1.0",
        "fecha": "DD/MM/AAAA",
        "cambios": "Versión inicial del curso",
        "responsable": "Candidato"
      },
      {
        "version": "1.1",
        "fecha": "DD/MM/AAAA",
        "cambios": "Descripción de los ajustes realizados según las observaciones",
        "responsable": "Candidato"
      }
    ]
  }
}
```

REGLAS ABSOLUTAS:
- Cada ajuste debe tener una verificación objetiva y medible.
- El control de versiones es obligatorio para el expediente de certificación.
- Usa datos reales del contexto cuando estén disponibles (nombre del candidato, fechas del proyecto).
- Responde SOLO en {{idiomaRequerido}}.
- OUTPUT SOLO JSON VÁLIDO — sin texto, sin markdown adicional.
- PROHIBIDO colocar en el campo "archivos" nombres de archivos del sistema (.ts, .json, .yaml, .md de código, .sql). Solo deben aparecer materiales del curso: videos, presentaciones, PDFs, guiones, evaluaciones, manuales del participante.
