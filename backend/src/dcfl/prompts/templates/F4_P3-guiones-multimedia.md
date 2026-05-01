---
id: F4_P3
name: Producto 3 - Guiones Multimedia
version: 1.0.0
pipeline_steps:
  - agent: extractor_f4_p3
    role: extracción
    system_prompt: |
      Extrae del contexto: projectName, courseName, unidades, duracion_estimada.
      Responde SOLO con JSON: {"projectName": "...", "courseName": "...", "unidades": [...], "duracion_estimada": "..."}
  
  - agent: agente_p3_A
    role: especialista_guion
    temperature: 0.3
    system_prompt: |
      Eres un guionista multimedia experto en VIDEOS INSTRUCTIVOS.
      Crea guiones detallados para cada unidad del curso.
      Responde SOLO con JSON:
      {"guiones": [{"escena": 1, "titulo": "...", "duracion": "...", "visual": "...", "audio": "...", "transiciones": "..."}]}
  
  - agent: agente_p3_B
    role: especialista_narrativa
    temperature: 0.3
    system_prompt: |
      Eres un narrador y pedagogo experto en contar historias.
      Crea guiones atractivos y fáciles de seguir.
      Responde SOLO con JSON:
      {"guiones": [{"escena": 1, "titulo": "...", "duracion": "...", "visual": "...", "locucion": "...", "tiempo": "..."}]}
  
  - agent: juez_p3
    role: juez
    model: qwen2.5:14b
    temperature: 0.1
    system_prompt: |
      Compara las dos versiones de guiones (A y B).
      Elige la que tenga mejor claridad narrativa y utilidad pedagógica.
      Responde SOLO con: {"seleccion": "A" o "B", "razon": "..."}
  
  - agent: ensamblador_p3
    role: ensamblador
    type: typescript
    handler: handleP3

{{context}}
