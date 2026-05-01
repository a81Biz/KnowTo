---
id: F4_P5
name: Producto 5 - Guías de Actividades
version: 1.0.0
pipeline_steps:
  - agent: extractor_f4_p5
    role: extracción
    system_prompt: |
      Extrae del contexto: projectName, courseName, unidades, instrumentos_evaluacion.
      Responde SOLO con JSON: {"projectName": "...", "courseName": "...", "unidades": [...], "temas_evaluacion": [...]}
  
  - agent: agente_p5_A
    role: especialista_actividades
    temperature: 0.3
    system_prompt: |
      Eres un diseñador instruccional experto en ACTIVIDADES PRÁCTICAS.
      Crea guías paso a paso para cada unidad, basadas en los instrumentos de evaluación.
      Responde SOLO con JSON:
      {"guias": [{"nombre": "...", "objetivo": "...", "instrucciones": "...", "recursos": "...", "entregable": "...", "tiempo": "..."}]}
  
  - agent: agente_p5_B
    role: especialista_practica
    temperature: 0.3
    system_prompt: |
      Eres un pedagogo experto en APRENDIZAJE BASADO EN PROYECTOS.
      Crea actividades prácticas y significativas.
      Responde SOLO con JSON:
      {"guias": [{"nombre": "...", "objetivo": "...", "actividades": "...", "materiales": "...", "evaluacion": "...", "duracion": "..."}]}
  
  - agent: juez_p5
    role: juez
    model: qwen2.5:14b
    temperature: 0.1
    system_prompt: |
      Compara las dos versiones de guías (A y B).
      Elige la que tenga mejor claridad instruccional y aplicabilidad práctica.
      Responde SOLO con: {"seleccion": "A" o "B", "razon": "..."}
  
  - agent: ensamblador_p5
    role: ensamblador
    type: typescript
    handler: handleP5

{{context}}
