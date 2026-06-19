---
id: F5
name: Verificación y Evaluación del Curso
version: 2.0.0
tags: [verificacion, checklist, evaluacion, battle-pattern]
pipeline_steps:

  # ── ESPECIALISTA A: TÉCNICO ───────────────────────────────────────────────
  - agent: agente_verificacion_A
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: true
    task: |
      Eres un especialista en verificación TÉCNICA de cursos e-learning conforme a {{estandarNorma}}.
      Analiza el contexto del proyecto y genera una verificación técnica detallada.
      PRIORIZA: funcionamiento del LMS, seguimiento {{estandarSeguimiento}}, videos, evaluaciones, certificados, compatibilidad móvil.
      PROHIBIDO: Colocar "✅ Verificado" en ningún resultado — el estado final lo determina el verificador humano. Todos los resultados deben ser "☐ Pendiente".
      SALIDA: SOLO JSON válido con la estructura verificacion descrita en la plantilla.

  # ── ESPECIALISTA B: PEDAGÓGICO ────────────────────────────────────────────
  - agent: agente_verificacion_B
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: true
    task: |
      Eres un especialista en verificación PEDAGÓGICA de cursos conforme a {{estandarNorma}}.
      Analiza el contexto del proyecto y genera una verificación pedagógica e instruccional.
      PRIORIZA: alineación de objetivos, secuencia didáctica, pertinencia de actividades, claridad de instrucciones.
      PROHIBIDO: Colocar "✅ Verificado" en ningún resultado — el estado final lo determina el verificador humano. Todos los resultados deben ser "☐ Pendiente".
      SALIDA: SOLO JSON válido con la estructura verificacion descrita en la plantilla.

  # ── JUEZ ──────────────────────────────────────────────────────────────────
  - agent: juez_verificacion
    model: "qwen2.5:14b"
    inputs_from: [agente_verificacion_A, agente_verificacion_B]
    include_template: false
    task: |
      Compara los dos reportes de verificación del curso (A y B).
      Selecciona el que sea MÁS COMPLETO, más específico y más útil para el expediente de certificación.
      Considera: cobertura de ítems técnicos y pedagógicos, detalle de observaciones, utilidad práctica.
      DEVUELVE SOLO: {"seleccion":"A","razon":"justificación en una frase"}

  # ── ENSAMBLADOR (TypeScript, sin LLM) ─────────────────────────────────────
  - agent: ensamblador_f5
    model: null
    inputs_from: [juez_verificacion]
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
  "verificacion": {
    "checklist_tecnico": [
      {"item": "El curso carga correctamente en el LMS", "resultado": "☐ Pendiente", "evidencia": "", "observacion": ""},
      {"item": "El seguimiento {{estandarSeguimiento}} funciona", "resultado": "☐ Pendiente", "evidencia": "", "observacion": ""},
      {"item": "Los videos reproducen sin error", "resultado": "☐ Pendiente", "evidencia": "", "observacion": ""},
      {"item": "Las evaluaciones calculan correctamente", "resultado": "☐ Pendiente", "evidencia": "", "observacion": ""},
      {"item": "El certificado se emite al aprobar", "resultado": "☐ Pendiente", "evidencia": "", "observacion": ""},
      {"item": "El curso es compatible con móviles", "resultado": "☐ Pendiente", "evidencia": "", "observacion": ""},
      {"item": "Los enlaces están activos", "resultado": "☐ Pendiente", "evidencia": "", "observacion": ""},
      {"item": "El tiempo de carga es aceptable (<5s)", "resultado": "☐ Pendiente", "evidencia": "", "observacion": ""}
    ],
    "checklist_pedagogico": [
      {"item": "Los objetivos son alcanzables", "resultado": "☐ Pendiente", "observacion": ""},
      {"item": "La secuencia didáctica es lógica", "resultado": "☐ Pendiente", "observacion": ""},
      {"item": "Las actividades corresponden a los objetivos", "resultado": "☐ Pendiente", "observacion": ""},
      {"item": "Las evaluaciones miden lo que deben medir", "resultado": "☐ Pendiente", "observacion": ""},
      {"item": "El lenguaje es claro y apropiado", "resultado": "☐ Pendiente", "observacion": ""},
      {"item": "El nivel de dificultad es adecuado", "resultado": "☐ Pendiente", "observacion": ""},
      {"item": "Las instrucciones son claras", "resultado": "☐ Pendiente", "observacion": ""}
    ],
    "reporte_pruebas": {
      "participantes": null,
      "tasa_aprobacion": null,
      "hallazgos": ["hallazgo 1"],
      "ajustes_recomendados": [{"ajuste": "descripción del ajuste", "prioridad": "Media"}]
    }
  }
}
```

REGLAS ABSOLUTAS:
- Incluye los 8 ítems técnicos y los 7 ítems pedagógicos obligatoriamente.
- Usa datos reales del contexto del proyecto cuando estén disponibles.
- Responde SOLO en {{idiomaRequerido}}.
- OUTPUT SOLO JSON VÁLIDO — sin texto, sin markdown adicional.
- PROHIBIDO colocar "✅ Verificado" en cualquier resultado — el estado final lo determina el verificador humano. Todos los resultados DEBEN ser "☐ Pendiente".
- PROHIBIDO copiar los valores de ejemplo de "evidencia" — dejar el campo vacío ("") si no hay evidencia real capturada.
- PROHIBIDO colocar valores numéricos en "participantes" ni porcentajes en "tasa_aprobacion" si no se ha ejecutado la prueba con usuarios reales. Usar null.
