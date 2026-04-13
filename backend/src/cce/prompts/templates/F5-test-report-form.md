---
id: F5_TEST_REPORT_FORM
type: pipeline
pipeline_steps:
  - agent: specialist
    task: "Genera un esquema JSON de formulario dinámico para el Reporte de Pruebas Funcionales basado en el {{context}}."
  - agent: judge
    rules:
      - "La salida debe ser ÚNICAMENTE un bloque JSON válido envuelto en ```json ... ```."
---
{
  "formTitle": "Reporte de Pruebas Funcionales",
  "sections": [
    {
      "id": "evaluacion",
      "title": "Evaluación del Curso",
      "fields": [
        { "id": "modulo", "label": "Módulo Probado", "type": "text" },
        { "id": "error", "label": "Nivel de Error (Crítico/Mayor/Menor)", "type": "text" },
        { "id": "observaciones", "label": "Observaciones", "type": "textarea" }
      ]
    }
  ]
}