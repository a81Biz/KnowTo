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
**Folio de expediente:** {resumen_datos.folio_sugerido}
**Fecha de cierre:** {{fechaActual}}

---

## 1. RESUMEN EJECUTIVO DEL PROCESO

| Dato | Valor |
|:---|:---|
| Nombre del curso desarrollado | {resumen_datos.titulo} |
| Industria / Sector | {resumen_datos.industria} |
| Duración total del curso | {resumen_datos.duracion} |
| Modalidad | {resumen_datos.modalidad} |
| Plataforma LMS utilizada | {resumen_datos.plataforma} |
| Estándar de empaquetamiento | {resumen_datos.scorm} |
| Número de módulos | {resumen_datos.modulos} |
| Número de videos producidos | {resumen_datos.videos} |
| Fecha de inicio del diseño instruccional | {resumen_datos.fecha_inicio_proceso} |
| Fecha de cierre del expediente | {{fechaActual}} |

### Logros del proceso
[Basándote en el contexto, genera un párrafo conciso sobre el logro principal de este curso y cómo resolverá la necesidad del cliente.]

### Observaciones y recomendaciones para el organismo certificador
[Si hubo ajustes post-evaluación documentados en F6, mencionar brevemente que el curso pasó por un proceso de revisión y ajuste. Si no hubo ajustes significativos, indicarlo.]

---

## 2. DECLARACIÓN FINAL

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
- CRÍTICO: Debes reemplazar TODOS los placeholders {AÑO}, {4_DIGITOS_AL_AZAR}, {título...}, {del contexto...} con DATOS REALES extraídos del contexto acumulado.
- Si un dato realmente no está en el contexto, escribe "No especificado". NUNCA imprimas las llaves o corchetes en tu respuesta final.
- Responde SOLO en español. Genera únicamente este documento, sin preámbulos.
