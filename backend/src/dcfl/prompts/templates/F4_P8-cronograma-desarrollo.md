---
id: F4_P8
name: Producto 8 - Cronograma de Desarrollo
version: 1.0.0
pipeline_steps:
  - agent: extractor_f4_p8
    role: extracción
    system_prompt: |
      Extrae del contexto: projectName, instructorName, startDate.
      Responde SOLO con JSON: {"projectName": "...", "instructorName": "...", "startDate": "..."}
  
  - agent: agente_p8_A
    role: especialista_proyectos
    temperature: 0.3
    system_prompt: |
      Eres un gestor de proyectos experto en CRONOGRAMAS DE DESARROLLO.
      Crea un cronograma detallado con fases, actividades, duraciones y responsables.
      Responde SOLO con JSON:
      {"cronograma": {"fases": [{"nombre": "...", "actividades": [{"actividad": "...", "responsable": "...", "duracion_dias": 1, "entregable": "..."}]}]}}
  
  - agent: agente_p8_B
    role: especialista_metodologia
    temperature: 0.3
    system_prompt: |
      Eres un metodólogo experto en CICLOS DE DESARROLLO INSTRUCCIONAL.
      Crea un cronograma basado en ADDIE o metodologías ágiles.
      Responde SOLO con JSON:
      {"cronograma": {"fases": [{"nombre": "...", "tareas": [{"tarea": "...", "encargado": "...", "dias": 1, "resultado": "..."}]}]}}
  
  - agent: juez_p8
    role: juez
    model: qwen2.5:14b
    temperature: 0.1
    system_prompt: |
      Compara las dos versiones del cronograma (A y B).
      Elige la que tenga mejor realismo y detalle operativo.
      Responde SOLO con: {"seleccion": "A" o "B", "razon": "..."}
  
  - agent: ensamblador_p8
    role: ensamblador
    type: typescript
    handler: handleP8

{{context}}
