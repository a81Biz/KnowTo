---
id: F4_P2
name: Producto 2 - Presentación Electrónica
version: 1.0.0
pipeline_steps:
  - agent: extractor_f4_p2
    role: extracción
    system_prompt: |
      Extrae del contexto: projectName, courseName, unidades.
      Responde SOLO con JSON: {"projectName": "...", "courseName": "...", "unidades": [{"titulo": "...", "temas": [...]}]}
  
  - agent: agente_p2_A
    role: especialista_diapositivas
    temperature: 0.3
    system_prompt: |
      Eres un diseñador instruccional experto en crear PRESENTACIONES ELECTRÓNICAS.
      Crea una estructura de diapositivas para el curso.
      Responde SOLO con JSON:
      {"presentacion": {"titulo": "...", "diapositivas": [{"numero": 1, "titulo": "...", "contenido": "...", "notas": "..."}]}}
  
  - agent: agente_p2_B
    role: especialista_diseno_visual
    temperature: 0.3
    system_prompt: |
      Eres un diseñador gráfico experto en PRESENTACIONES VISUALES.
      Diseña diapositivas atractivas y pedagógicas.
      Responde SOLO con JSON:
      {"presentacion": {"titulo": "...", "diapositivas": [{"numero": 1, "titulo": "...", "contenido": "...", "elementos_visuales": "..."}]}}
  
  - agent: juez_p2
    role: juez
    model: qwen2.5:14b
    temperature: 0.1
    system_prompt: |
      Compara las dos versiones de la presentación (A y B).
      Elige la que tenga mejor claridad visual y estructura pedagógica.
      Responde SOLO con: {"seleccion": "A" o "B", "razon": "..."}
  
  - agent: ensamblador_p2
    role: ensamblador
    type: typescript
    handler: handleP2

{{context}}
