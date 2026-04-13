---
id: F4_P0
type: pipeline
pipeline_steps:
  - agent: specialist
    task: "Actúa como Gestor STPS. Usando el {{context}} acumulado, genera el Programa Anual de Capacitación en el formato oficial DC-2 según el Acuerdo STPS 14/jun/2013."
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