---
id: F4_P6
name: Producto 6 - Calendario General de Actividades
version: 1.0.0
pipeline_steps:
  - agent: extractor_f4_p6
    role: extracción
    system_prompt: |
      Extrae del contexto: projectName, courseName, duracion_total, unidades, actividades.
      Responde SOLO con JSON: {"projectName": "...", "courseName": "...", "duracion_total": "...", "unidades": [...]}
  
  - agent: agente_p6_A
    role: especialista_cronograma
    temperature: 0.3
    system_prompt: |
      Eres un planificador educativo experto en CALENDARIOS ACADÉMICOS.
      Distribuye las actividades en semanas/días.
      Responde SOLO con JSON:
      {"calendario": {"duracion_total": "...", "semanas": [{"numero": 1, "titulo": "...", "actividades": [{"dia": "...", "nombre": "...", "tipo": "...", "duracion": "...", "entregable": "..."}]}]}}
  
  - agent: agente_p6_B
    role: especialista_tiempos
    temperature: 0.3
    system_prompt: |
      Eres un gestor de proyectos experto en PLANIFICACIÓN TEMPORAL.
      Organiza las actividades de forma realista y alcanzable.
      Responde SOLO con JSON:
      {"calendario": {"duracion_total": "...", "semanas": [{"numero": 1, "nombre": "...", "actividades": [{"dia": "...", "tarea": "...", "horas": "...", "meta": "..."}]}]}}
  
  - agent: juez_p6
    role: juez
    model: qwen2.5:14b
    temperature: 0.1
    system_prompt: |
      Compara las dos versiones del calendario (A y B).
      Elige la que tenga mejor distribución temporal y realismo.
      Responde SOLO con: {"seleccion": "A" o "B", "razon": "..."}
  
  - agent: ensamblador_p6
    role: ensamblador
    type: typescript
    handler: handleP6

{{context}}
