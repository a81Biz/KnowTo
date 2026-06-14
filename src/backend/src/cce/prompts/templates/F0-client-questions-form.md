---
id: F0_CLIENT_QUESTIONS_FORM
type: pipeline
pipeline_steps:
  - agent: specialist
    task: "Genera un esquema JSON de formulario dinámico basado en las preguntas extraídas del Marco de Referencia {{context}}."
  - agent: judge
    rules:
      - "La salida debe ser ÚNICAMENTE un bloque JSON válido envuelto en ```json ... ```."
---
{
  "formTitle": "Preguntas para el Cliente",
  "description": "Complete la información solicitada en la entrevista.",
  "sections": [
    {
      "id": "q1",
      "title": "[Pregunta extraída del contexto]",
      "fields": [{ "id": "resp1", "label": "Respuesta", "type": "textarea", "required": true }]
    }
  ]
}