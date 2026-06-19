---
id: F7
name: Resumen Cualitativo del Proceso de Certificación
version: 2.0.0
pipeline_steps:

  # ── ESPECIALISTA A ────────────────────────────────────────────────────────
  - agent: agente_resumen_A
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: true
    task: |
      Eres un coordinador experto en diseño instruccional que presenta el reporte final del proceso de certificación.
      Genera una narrativa cualitativa del proceso: qué brecha existía, qué se hizo y qué valor aporta el resultado.
      Este documento NO habla de datos duros (horas, plataforma) — habla del PROCESO y sus logros.
      SALIDA: SOLO JSON válido con la estructura resumen_proceso descrita en la plantilla.

  # ── ESPECIALISTA B ────────────────────────────────────────────────────────
  - agent: agente_resumen_B
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: true
    task: |
      Eres un consultor de desarrollo organizacional que documenta los resultados de un proceso de certificación instruccional.
      Genera una narrativa ejecutiva del proceso: la brecha detectada, las decisiones pedagógicas clave y el valor aportado.
      Tono: formal, corporativo, orientado a stakeholders ejecutivos.
      SALIDA: SOLO JSON válido con la estructura resumen_proceso descrita en la plantilla.

  # ── JUEZ ──────────────────────────────────────────────────────────────────
  - agent: juez_resumen_proceso
    model: "qwen2.5:14b"
    inputs_from: [agente_resumen_A, agente_resumen_B]
    include_template: false
    task: |
      Compara los dos resúmenes cualitativos del proceso (A y B).
      Selecciona el más narrativo, con mayor profundidad cualitativa y tono más apropiado para un expediente de certificación.
      DEVUELVE SOLO: {"seleccion":"A","razon":"justificación en una frase"}

  # ── ENSAMBLADOR (TypeScript, sin LLM) ─────────────────────────────────────
  - agent: ensamblador_f7
    model: null
    inputs_from: [juez_resumen_proceso]
    include_template: false
    task: ""
---

## CONTEXTO DEL PROYECTO
{context}

## INSTRUCCIÓN PARA LOS ESPECIALISTAS
Genera ÚNICAMENTE el "Resumen Cualitativo del Proceso de Certificación".
Este documento NO debe hablar de datos duros (horas, plataforma) — habla del PROCESO: qué se detectó, qué se hizo y qué se logró.

## ESTRUCTURA JSON REQUERIDA (SALIDA OBLIGATORIA)

Responde SOLO con JSON válido. Sin texto adicional fuera del JSON.

```json
{
  "resumen_proceso": {
    "brecha_y_objetivo": "Narrativa detallada de qué problema de capacitación (brecha) tenía el cliente originalmente y cuál fue el objetivo principal para resolverlo. Basarse en el diagnóstico inicial (F1).",
    "decisiones_pedagogicas": "Narrativa profesional de qué pasó durante el proceso (F2 a F4): cómo se decidió organizar la información, por qué se eligieron ciertas evaluaciones o formatos, y cómo se estructuraron las herramientas para asegurar el aprendizaje.",
    "conclusion_valor": "Resumen ejecutivo del significado de este logro: qué valor aporta ahora el curso al cliente y cómo el proceso de certificación garantiza la calidad del producto."
  }
}
```

REGLAS ABSOLUTAS:
- Redacta en tono formal, claro y corporativo.
- NO repitas tablas de especificaciones — enfócate en la NARRATIVA del proceso.
- Basarse en el contexto acumulado del proyecto para hacer la narrativa específica y real.
- Responde SOLO en {{idiomaRequerido}}.
- OUTPUT SOLO JSON VÁLIDO — sin texto, sin markdown adicional.
