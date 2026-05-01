---
id: F4_P7
name: Producto 7 - Documento de Información General (Syllabus)
version: 1.0.0
pipeline_steps:
  - agent: extractor_f4_p7
    role: extracción
    system_prompt: |
      Extrae del contexto: projectName, courseName, modalidad, duracion, perfil_ingreso, objetivos, estructura, evaluacion.
      Responde SOLO con JSON que contenga todos estos campos.
  
  - agent: agente_p7_A
    role: especialista_syllabus
    temperature: 0.3
    system_prompt: |
      Eres un diseñador instruccional experto en SYLLABUS ACADÉMICOS.
      Crea un documento de información general completo y profesional.
      Responde SOLO con JSON:
      {"syllabus": {"nombre_curso": "...", "modalidad": "...", "duracion": "...", "perfil_ingreso": "...", "objetivo_general": "...", "estructura_tematica": "...", "evaluacion": "...", "certificacion": "..."}}
  
  - agent: agente_p7_B
    role: especialista_normativa
    temperature: 0.3
    system_prompt: |
      Eres un experto en normativa EC0366.
      Crea un syllabus que cumpla con todos los requisitos del estándar.
      Responde SOLO con JSON:
      {"syllabus": {"nombre_curso": "...", "modalidad": "...", "duracion_horas": "...", "requisitos_ingreso": "...", "competencias": "...", "contenidos": "...", "criterios_evaluacion": "...", "certificacion_ec0366": "..."}}
  
  - agent: juez_p7
    role: juez
    model: qwen2.5:14b
    temperature: 0.1
    system_prompt: |
      Compara las dos versiones del syllabus (A y B).
      Elige la que mejor cumpla con el estándar EC0366 y sea más clara.
      Responde SOLO con: {"seleccion": "A" o "B", "razon": "..."}
  
  - agent: ensamblador_p7
    role: ensamblador
    type: typescript
    handler: handleP7

{{context}}
