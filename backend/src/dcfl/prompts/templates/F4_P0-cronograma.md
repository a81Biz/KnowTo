---
id: F4_P0
name: Producto 0 - Cronograma de Desarrollo EC0366
version: 1.0.0
tags: [EC0366, E1219, produccion, cronograma]
---

Actúa como un diseñador instruccional certificable en EC0366. Genera ÚNICAMENTE el Producto 0 indicado.

## CONTEXTO ACUMULADO DEL PROYECTO
{{context}}

## DATOS DE ENTRADA DEL USUARIO EN ESTA FASE
{{userInputs}}

## INSTRUCCIÓN
Genera SOLO el CRONOGRAMA DE DESARROLLO (Producto 0 / E1219 - producto #1). No generes ningún otro producto.

Usa los datos del contexto: nombre del proyecto, clientName, estructura temática de F2, especificaciones técnicas de F3.
Si el usuario proporcionó `startDate` en userInputs, úsala como fecha de inicio del cronograma.
Si proporcionó `instructorName`, úsalo como nombre del desarrollador.
Si proporcionó `reviewerName`, úsalo como revisor.

## FORMATO DE SALIDA OBLIGATORIO

# PRODUCTO 0: CRONOGRAMA DE DESARROLLO
**Elemento EC0366:** E1219 — Producto #1
**Proyecto:** [nombre del proyecto]
**Candidato:** [clientName]
**Fecha de elaboración:** [fecha actual]
**Folio:** EC0366-CRON-[año][4 dígitos]

---

**Curso:** [título del curso del contexto]
**Desarrollador:** [instructorName o clientName]
**Objetivo general:** [del contexto F2/F1]
**Fecha de inicio:** [startDate de userInputs o fecha actual]

| # | Actividad | Duración estimada | Fecha inicio | Fecha fin | Responsable |
|:---|:---|:---|:---|:---|:---|
| 1 | Elaborar estructura temática del curso | [N días] | [fecha] | [fecha] | [nombre] |
| 2 | Desarrollar documento de información general | [N días] | [fecha] | [fecha] | [nombre] |
| 3 | Diseñar guías de actividades por módulo | [N días] | [fecha] | [fecha] | [nombre] |
| 4 | Elaborar calendario general de actividades | [N días] | [fecha] | [fecha] | [nombre] |
| 5 | Desarrollar documentos de texto (contenido) | [N días] | [fecha] | [fecha] | [nombre] |
| 6 | Crear presentación electrónica | [N días] | [fecha] | [fecha] | [nombre] |
| 7 | Producir material multimedia (guión de video) | [N días] | [fecha] | [fecha] | [nombre] |
| 8 | Diseñar instrumentos de evaluación | [N días] | [fecha] | [fecha] | [nombre] |
| 9 | Configurar curso en plataforma LMS | [N días] | [fecha] | [fecha] | [nombre] |
| 10 | Verificar funcionamiento técnico y publicar | [N días] | [fecha] | [fecha] | [nombre] |
| **TOTAL** | | **[N días totales]** | [fecha inicio] | [fecha fin] | |

**Firmas:**

| Rol | Nombre | Firma | Fecha |
|:---|:---|:---|:---|
| Elaboró | [instructorName o clientName] | _________________ | [fecha] |
| Revisó | [reviewerName o "Por designar"] | _________________ | [fecha] |

## INSTRUCCIONES DE CALIDAD
- Las fechas deben ser consecuentes (una actividad termina antes de que empiece la siguiente).
- Estima duraciones realistas según la complejidad del curso definida en el contexto.
- Responde SOLO en español. Genera únicamente este producto, sin preámbulos.
