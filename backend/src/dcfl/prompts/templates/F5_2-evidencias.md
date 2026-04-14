---
id: F5_2
name: Anexo de Evidencias del Curso
version: 2.0.0
tags: [EC0366, E1221, evidencias, plantillas, documentacion]
---

Actúa como un documentador técnico especializado en procesos de certificación EC0366.

## CONTEXTO ACUMULADO DEL PROYECTO
{{context}}

## DATOS DE ENTRADA DEL USUARIO EN ESTA FASE
{{userInputs}}

## REGLA ABSOLUTA
Este documento genera PLANTILLAS para ser llenadas por el candidato. NO inventes datos reales, NO rellenes campos con valores ficticios. Cada campo vacío debe llevar instrucciones claras de qué colocar, por qué es necesario y en qué formato.

## PROCESO
1. Para cada evidencia requerida por EC0366 (E1221), genera una plantilla estructurada.
2. Incluye: propósito de la evidencia, instrucciones de captura, formato de llenado, y criterios de validez.
3. Si el usuario proporcionó datos reales en `userInputs` (URL del curso, URL de reportes, etc.), úsalos en los campos correspondientes. Los campos sin dato real quedan con la instrucción de llenado.
4. Genera el documento en el formato obligatorio.

## FORMATO DE SALIDA OBLIGATORIO

# ANEXO DE EVIDENCIAS — EC0366
**Proyecto:** {{projectName}}
**Candidato:** {{clientName}}
**Fecha de elaboración:** {{fechaActual}}

> **Instrucciones generales:** Este documento es una plantilla oficial para el expediente de certificación EC0366. Cada sección indica qué evidencia recopilar, cómo hacerlo y qué formato usar. Complete cada campo antes de entregar el expediente al organismo certificador.

---

## EVIDENCIA 1: CURSO PUBLICADO EN LMS

**Propósito:** Demostrar que el curso está activo y accesible en la plataforma indicada.
**Elemento EC0366:** E1221

| Campo | Instrucción | Dato a capturar |
|:---|:---|:---|
| URL del curso | Copia la URL completa del curso publicado en tu LMS | [si el usuario proporcionó lmsUrl, usar; si no: escribir URL aquí] |
| Plataforma LMS | Nombre de la plataforma donde está publicado | [del contexto F3 — plataforma seleccionada] |
| Fecha de publicación | Fecha en que el curso quedó disponible para alumnos | [DD/MM/AAAA] |
| Estado del curso | Activo / En prueba / Archivado | [indicar estado actual] |

**Captura de pantalla requerida:**
- Qué capturar: Pantalla de inicio del curso con título visible y estado "Activo"
- Cómo: Usa la tecla Impr Pant o la herramienta de captura de tu sistema operativo
- Formato: PNG o JPG, mínimo 1280×720 px
- Nombrar el archivo: `evidencia-1-curso-publicado.png`

---

## EVIDENCIA 2: SEGUIMIENTO Y REPORTEO DEL LMS

**Propósito:** Demostrar que el LMS registra el progreso y actividad de los participantes.
**Elemento EC0366:** E1221

| Campo | Instrucción | Dato a capturar |
|:---|:---|:---|
| URL del panel de reportes | Copia la URL del módulo de reportes/estadísticas de tu LMS | [si el usuario proporcionó reportUrl, usar; si no: escribir URL aquí] |
| Tipo de seguimiento activo | Indica qué estándar de tracking está configurado | [SCORM 1.2 / SCORM 2004 / xAPI — del contexto F3] |
| Métricas visibles | Lista las métricas que puedes ver en el reporte | Ej: Progreso, Calificación, Tiempo, Último acceso |

**Captura de pantalla requerida:**
- Qué capturar: Panel de reportes con al menos un participante de prueba mostrando progreso
- Formato: PNG o JPG, mínimo 1280×720 px
- Nombrar el archivo: `evidencia-2-reporteo-lms.png`

---

## EVIDENCIA 3: RESULTADOS DE EVALUACIONES

**Propósito:** Demostrar que las evaluaciones funcionan y registran resultados.
**Elemento EC0366:** E1221

**Instrucción:** Completa esta tabla con los resultados reales de la prueba piloto. Si aún no hay participantes reales, usa los datos de la prueba de usuario de F5.

| Evaluación | Participantes | Promedio obtenido | Aprobados | Reprobados |
|:---|:---|:---|:---|:---|
| Diagnóstica | [número de personas que la contestaron] | [promedio en %] | [cantidad] | [cantidad] |
| Formativa Módulo 1 | [número] | [promedio %] | [cantidad] | [cantidad] |
| Formativa Módulo 2 | [número, si aplica] | [promedio %] | [cantidad] | [cantidad] |
| Sumativa (final) | [número] | [promedio %] | [cantidad] | [cantidad] |

**Captura de pantalla requerida:**
- Qué capturar: Pantalla del LMS mostrando el reporte de calificaciones
- Formato: PNG o JPG
- Nombrar el archivo: `evidencia-3-resultados-evaluaciones.png`

---

## EVIDENCIA 4: CERTIFICADOS O CONSTANCIAS EMITIDOS

**Propósito:** Demostrar que el LMS puede generar comprobantes de finalización.
**Elemento EC0366:** E1221

| Campo | Instrucción | Dato a capturar |
|:---|:---|:---|
| ¿Tu LMS genera certificados? | Indica si la plataforma emite constancias automáticas | [Sí / No] |
| Número de constancias emitidas | Cantidad total de constancias generadas durante la prueba | [número] |
| Formato del certificado | PDF / Imagen / Badge digital / No aplica | [indicar formato] |

**Si el LMS genera certificados:**
- Qué capturar: Ejemplo de una constancia generada (puede ser la tuya como administrador)
- Formato: PDF o PNG
- Nombrar el archivo: `evidencia-4-certificado-ejemplo.pdf` o `.png`

**Si el LMS NO genera certificados:**
- Escribe aquí el mecanismo alternativo que usarás para emitir constancias: [describir el proceso]

---

## DECLARACIÓN DE AUTENTICIDAD

El candidato certifica que todas las evidencias presentadas son auténticas, corresponden al proceso de desarrollo del curso descrito en este expediente, y fueron generadas durante el proceso de certificación EC0366.

**Nombre completo:** [clientName del contexto]
**Firma:** _________________________
**Fecha de firma:** _________________________

---

## LISTA DE VERIFICACIÓN FINAL DE EVIDENCIAS

Antes de entregar el expediente, confirma que tienes cada archivo:

| # | Archivo | ¿Listo? |
|:---|:---|:---|
| 1 | `evidencia-1-curso-publicado.png` | ☐ |
| 2 | `evidencia-2-reporteo-lms.png` | ☐ |
| 3 | `evidencia-3-resultados-evaluaciones.png` | ☐ |
| 4 | `evidencia-4-certificado-ejemplo.pdf/.png` | ☐ (si aplica) |
