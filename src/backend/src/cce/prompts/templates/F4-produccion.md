---
id: F4
type: pipeline
pipeline_steps:
  - agent: specialist
    task: "Genera los 7 productos de la Fase 4: PAC, Carta Descriptiva, Manual del Participante, Instrumentos, Materiales, DC-5, e Informe Ejecutivo basándote en el perfil, contexto y brechas provistas."
  - agent: judge
    rules:
      - "Asegura exactamente los 7 encabezados H2 correspondientes a cada producto para el parseo del flow-map."
---
# FASE 4: PRODUCCIÓN DE MATERIALES

## PRODUCTO 1: PLAN ANUAL DE CAPACITACIÓN (PAC / DC-2)
Genera la tabla del PAC con los cursos acordados.

## PRODUCTO 2: CARTA DESCRIPTIVA
Genera la carta descriptiva principal.

## PRODUCTO 3: MANUAL DEL PARTICIPANTE
Genera la base del manual o guía principal.

## PRODUCTO 4: INSTRUMENTOS DE EVALUACIÓN
Genera los instrumentos: diagnóstico, formativa y sumativa.

## PRODUCTO 5: MATERIALES DE APOYO
Genera recomendaciones o estructura de presentaciones didácticas.

## PRODUCTO 6: DC-5 / CONSTANCIA DE HABILIDADES
Genera el borrador del DC-5.

## PRODUCTO 7: INFORME EJECUTIVO DE CONSULTORÍA
Genera el informe final consolidando los hallazgos y siguientes pasos.
