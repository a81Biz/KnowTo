---
id: F5
type: pipeline
pipeline_steps:
  - agent: specialist
    task: "Actúa como Auditor EC0301. Usando el {{context}} de la Fase 4, genera los checklists de verificación técnica y pedagógica."
  - agent: judge
    rules: 
      - "Usa exactamente los 3 encabezados requeridos para que el Regex del flow-map los encuentre."
---
## 1. CHECKLIST DE VERIFICACIÓN TÉCNICA
| # | Ítem a verificar | Cumple | Observaciones |
|---|------------------|--------|---------------|

## 2. CHECKLIST DE VERIFICACIÓN PEDAGÓGICA
| # | Ítem a verificar | Cumple | Observaciones |
|---|------------------|--------|---------------|

## 3. PLANTILLA DE REPORTE DE PRUEBAS
| Módulo | Observaciones | Nivel de Error | Estatus |
|--------|---------------|----------------|---------|