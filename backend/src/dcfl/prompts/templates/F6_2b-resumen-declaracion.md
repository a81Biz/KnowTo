---
id: F6_2b
name: Resumen Ejecutivo y Declaración Final EC0366
version: 1.0.0
tags: [EC0366, resumen-ejecutivo, declaracion, cierre, certificacion]
---

Actúa como un coordinador de certificación EC0366 responsable del cierre del expediente ante el CONOCER.

## CONTEXTO ACUMULADO DEL PROYECTO
{{context}}

## DATOS DE ENTRADA DEL USUARIO EN ESTA FASE
{{userInputs}}

## INSTRUCCIÓN
Genera ÚNICAMENTE el resumen ejecutivo del proceso y la declaración final. El inventario y firmas ya fueron generados en F6_2a.

Extrae del contexto: nombre del curso (F1), industria/sector (F0), duración total (F3), modalidad (F2), plataforma LMS (F3), número de módulos (F2), número de actividades (F2), fechas de inicio y cierre del proceso.

## FORMATO DE SALIDA OBLIGATORIO

# RESUMEN EJECUTIVO Y DECLARACIÓN FINAL — EC0366
**Proyecto:** {{projectName}}
**Candidato:** {{clientName}}
**Folio de expediente:** [mismo folio generado en F6_2a — si disponible en contexto, usar el mismo]
**Fecha de cierre:** {{fechaActual}}

---

## 3. RESUMEN EJECUTIVO DEL PROCESO

| Dato | Valor |
|:---|:---|
| Nombre del curso desarrollado | [título del curso del contexto] |
| Industria / Sector | [del contexto F0] |
| Duración total del curso | [X horas — del contexto F3] |
| Modalidad | [del contexto F2] |
| Plataforma LMS utilizada | [del contexto F3] |
| Estándar de empaquetamiento | [SCORM versión — del contexto F3] |
| Número de módulos | [N — del contexto F2] |
| Número de actividades totales | [N — del contexto F4] |
| Número de evaluaciones | [N diagnóstica + formativas + sumativa] |
| Número de videos producidos | [N — del contexto F2_5/F4] |
| Total de productos EC0366 generados | 16 documentos |
| Fecha de inicio del proceso | [fecha de F0 si disponible, o "ver documento F0"] |
| Fecha de cierre del expediente | [fecha actual] |
| Duración total del proceso | [N días desde F0 hasta hoy, si se puede calcular] |

### Logros del proceso
[2–3 oraciones destacando los logros: qué tipo de curso se desarrolló, para qué sector, qué problema de capacitación resuelve.]

### Observaciones y recomendaciones para el organismo certificador
[Si hubo ajustes post-evaluación documentados en F6, mencionar brevemente que el curso pasó por un proceso de revisión y ajuste. Si no hubo ajustes significativos, indicarlo.]

---

## 4. DECLARACIÓN FINAL

El candidato [clientName] declara bajo protesta de decir verdad que:

1. Todos los documentos incluidos en este expediente son auténticos.
2. El curso descrito fue desarrollado íntegramente por el/la suscrito/a.
3. El proceso se realizó en el marco del estándar EC0366 del CONOCER.
4. Las evidencias presentadas corresponden al proceso real de desarrollo y despliegue del curso.
5. Los instrumentos de evaluación cumplen con los requisitos del elemento E1220 del EC0366.

**Nombre del candidato:** [clientName]
**Firma:** _________________________
**Fecha:** _________________________

---

> *Este expediente fue generado con apoyo de la plataforma KnowTo como herramienta de diseño instruccional. El contenido, decisiones pedagógicas y evidencias son responsabilidad del candidato.*

## INSTRUCCIONES DE CALIDAD
- El resumen ejecutivo debe ser coherente con el contexto acumulado de todo el proceso.
- No inventes datos que no estén en el contexto. Si un dato no está disponible, escribe "[ver documento correspondiente]".
- Responde SOLO en español. Genera únicamente este documento, sin preámbulos.
