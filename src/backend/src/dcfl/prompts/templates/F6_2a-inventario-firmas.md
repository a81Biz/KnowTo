---
id: F6_2a
name: Lista de Verificación e Inventario del Expediente
version: 2.0.0
tags: [firmas, inventario, expediente, certificacion, battle-pattern]
pipeline_steps:

  # ── ESPECIALISTA A ────────────────────────────────────────────────────────
  - agent: agente_inventario_A
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: true
    task: |
      Eres un coordinador de certificación responsable del cierre del expediente ante la entidad certificadora conforme a {{estandarNorma}}.
      Genera el inventario completo del expediente basándote en el contexto del proyecto.
      CRÍTICO: Usa el array productosTerminados para marcar P1-P8 como Completado o Pendiente.
      Usa documentosAdicionalesTerminados para F5 y F6.
      SALIDA: SOLO JSON válido con la estructura inventario descrita en la plantilla.

  # ── ESPECIALISTA B ────────────────────────────────────────────────────────
  - agent: agente_inventario_B
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: true
    task: |
      Eres un auditor de expedientes de certificación conforme a {{estandarNorma}}.
      Genera el inventario del expediente verificando cada documento contra el contexto del proyecto.
      CRÍTICO: Marca cada documento como Completado solo si hay evidencia en el contexto. Marca Pendiente si no hay certeza.
      SALIDA: SOLO JSON válido con la estructura inventario descrita en la plantilla.

  # ── JUEZ ──────────────────────────────────────────────────────────────────
  - agent: juez_inventario
    model: "qwen2.5:14b"
    inputs_from: [agente_inventario_A, agente_inventario_B]
    include_template: false
    task: |
      Compara los dos inventarios (A y B).
      Selecciona el más preciso respecto al estado real del expediente según el contexto del proyecto.
      DEVUELVE SOLO: {"seleccion":"A","razon":"justificación en una frase"}

  # ── ENSAMBLADOR (TypeScript, sin LLM) ─────────────────────────────────────
  - agent: ensamblador_f6_2a
    model: null
    inputs_from: [juez_inventario]
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
  "inventario": {
    "documentos": [
      {"numero": 1, "documento": "Marco de Referencia del Cliente", "fase": "Diagnóstico", "elemento": "REQ-A", "estado": "Completado", "paginas": "2", "firma": "Candidato"},
      {"numero": 2, "documento": "Informe de Necesidades de Capacitación", "fase": "Análisis de Necesidades", "elemento": "REQ-A", "estado": "Completado", "paginas": "4", "firma": "Candidato"},
      {"numero": 3, "documento": "Especificaciones de Análisis", "fase": "Alcance y Estructura", "elemento": "REQ-A", "estado": "Completado", "paginas": "3", "firma": "Candidato"},
      {"numero": 4, "documento": "Recomendaciones Pedagógicas", "fase": "Estrategia Pedagógica", "elemento": "REQ-A", "estado": "Completado", "paginas": "2", "firma": "Candidato"},
      {"numero": 5, "documento": "Especificaciones Técnicas", "fase": "Especificaciones Técnicas", "elemento": "REQ-A", "estado": "Completado", "paginas": "3", "firma": "Candidato"},
      {"numero": 6, "documento": "Cronograma de Desarrollo", "fase": "Producción — Cronograma", "elemento": "REQ-A", "estado": "Pendiente", "paginas": "2", "firma": "Candidato + Revisor"},
      {"numero": 7, "documento": "Documento de Información General", "fase": "Producción — Instrumentos", "elemento": "REQ-A", "estado": "Pendiente", "paginas": "3", "firma": "Candidato"},
      {"numero": 8, "documento": "Guías de Actividades por Módulo", "fase": "Producción — Actividades", "elemento": "REQ-B", "estado": "Pendiente", "paginas": "4", "firma": "Candidato"},
      {"numero": 9, "documento": "Calendario General de Actividades", "fase": "Producción — Calendario", "elemento": "REQ-B", "estado": "Pendiente", "paginas": "2", "firma": "Candidato"},
      {"numero": 10, "documento": "Documentos de Texto (Manual del Participante)", "fase": "Producción — Manual", "elemento": "REQ-B", "estado": "Pendiente", "paginas": "20", "firma": "Candidato"},
      {"numero": 11, "documento": "Presentación Electrónica", "fase": "Producción — Presentación", "elemento": "REQ-B", "estado": "Pendiente", "paginas": "3", "firma": "Candidato"},
      {"numero": 12, "documento": "Guiones de Material Multimedia", "fase": "Producción — Guiones", "elemento": "REQ-B", "estado": "Pendiente", "paginas": "4", "firma": "Candidato"},
      {"numero": 13, "documento": "Instrumentos de Evaluación", "fase": "Producción — Glosario", "elemento": "REQ-B", "estado": "Pendiente", "paginas": "3", "firma": "Candidato + Revisor"},
      {"numero": 14, "documento": "Checklist de Verificación", "fase": "Verificación", "elemento": "REQ-C", "estado": "Completado", "paginas": "2", "firma": "Candidato + Evaluador"},
      {"numero": 15, "documento": "Anexo de Evidencias", "fase": "Evidencias", "elemento": "REQ-C", "estado": "Completado", "paginas": "2", "firma": "Candidato"},
      {"numero": 16, "documento": "Documento de Ajustes Post-Evaluación", "fase": "Ajustes y Cierre", "elemento": "REQ-C", "estado": "Completado", "paginas": "2", "firma": "Candidato"}
    ],
    "firmas": {
      "candidato": {"nombre": "", "curp": ""},
      "revisor": {"nombre": "", "cargo": ""},
      "coordinador": {"nombre": "", "organismo": ""}
    }
  }
}
```

REGLAS ABSOLUTAS:
- El estado de cada documento debe basarse en el contexto real del proyecto (productosTerminados, documentosAdicionalesTerminados).
- Los primeros 5 documentos (diagnóstico/análisis) son siempre Completado si el proyecto llegó a esta fase.
- NUNCA imprimas llaves {EVALUAR_PX} — reemplázalas con Completado o Pendiente.
- Responde SOLO en {{idiomaRequerido}}.
- OUTPUT SOLO JSON VÁLIDO — sin texto, sin markdown adicional.
