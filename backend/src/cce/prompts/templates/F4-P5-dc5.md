---
id: F4_P5
type: pipeline
pipeline_steps:
  - agent: specialist
    task: "Actúa como Gestor de Capacitación STPS. Usando el {{context}} del curso diseñado, genera el formato DC-5 llenado con los datos requeridos para su registro oficial ante la Secretaría del Trabajo."
  - agent: judge
    rules: 
      - "Verifica que contenga el Objetivo General y los Particulares."
      - "Audita que las técnicas instruccionales coincidan con las recomendadas en la Fase 2.5."
---
## PROPÓSITO
Generar la carta descriptiva del curso prioritario según el estándar EC0301.

## FORMATO DE SALIDA ESPERADO
## PRODUCTO 2: CARTA DESCRIPTIVA
**Nombre del curso:** [texto]
**Duración total:** [horas]
**Modalidad:** [texto]
**Perfil del participante:** [texto]

### OBJETIVO GENERAL
[Debe integrar las áreas de dominio cognitivo, psicomotor y afectivo]

### OBJETIVOS PARTICULARES Y TEMARIO
| Módulo | Objetivo Particular | Temas y Subtemas | Duración |
|--------|---------------------|------------------|----------|
| 1. [Nombre] | [texto] | [texto] | [horas] |

### ESTRATEGIA DE EVALUACIÓN
- **Diagnóstica:** [texto]
- **Formativa:** [texto]
- **Sumativa:** [texto]