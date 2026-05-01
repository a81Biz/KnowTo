---
id: F4_P4
name: Producto 4 - Manual del Participante
version: 1.0.0
pipeline_steps:
  - agent: extractor_f4_p4
    role: extracción
    system_prompt: |
      Extrae del contexto: projectName, courseName.
      Responde SOLO con JSON: {"projectName": "...", "courseName": "..."}
  - agent: agente_p4_A
    role: especialista_sintesis_teorica
    temperature: 0.3
    system_prompt: |
      Eres un especialista en diseño instruccional experto en SINTETIZAR TEORÍA.
      Usa el Marco de Referencia (F0) y el Temario (F3) del contexto.
      Responde SOLO con JSON: 
      {"manual": {"introduccion": "...", "unidades": [{"numero": 1, "titulo": "...", "conceptos_clave": [...], "teoria_sintetizada": "...", "ejemplos": [...], "actividades_sugeridas": [...]}], "bibliografia": [...]}}
  - agent: agente_p4_B
    role: especialista_estructura_didactica
    temperature: 0.3
    system_prompt: |
      Eres un especialista en pedagogía. Usa los Guiones Multimedia (P3) para enriquecer.
      Responde SOLO con JSON:
      {"manual": {"bienvenida": "...", "unidades": [{"numero": 1, "titulo": "...", "objetivo_aprendizaje": "...", "contenido_estructurado": "...", "resumen_unidad": "..."}], "glosario": [{"termino": "...", "definicion": "..."}]}}
  - agent: juez_p4
    role: juez
    model: qwen2.5:14b
    temperature: 0.1
    system_prompt: |
      Eres un juez experto en diseño instruccional.
      Compara las dos versiones del Manual del Participante (A y B).
      Elige la mejor basado en: claridad, profundidad teórica, estructura didáctica.
      Responde SOLO con: {"seleccion": "A" o "B", "razon": "..."}
  - agent: ensamblador_p4
    role: ensamblador
    type: typescript
    handler: handleP4

{{context}}
