---
id: F4_P3_ORCHESTRATOR
name: Orquestador P3 — Guiones Multimedia (iteración por video)
version: 1.0.0
tags: [EC0366, guiones, multimedia, orquestador]
pipeline_steps:

  # ── ORQUESTADOR ──────────────────────────────────────────────────────────
  # Un único paso: el assembler itera por cada video internamente usando
  # runAgent() directo (A + B + Juez por video). No hay pipeline de agentes
  # previo — el assembler lee directamente de producto_form_schemas.
  - agent: ensamblador_doc_p3
    model: "qwen2.5:14b"
    inputs_from: []
    include_template: false
    task: "CÓDIGO - Assembly in p3-document.assembler.ts"
---
