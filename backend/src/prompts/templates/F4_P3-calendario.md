---
id: F4_P3
name: Producto 3 - Calendario General de Actividades EC0366
version: 1.0.0
tags: [EC0366, E1220, produccion, calendario]
---

Actúa como un diseñador instruccional certificable en EC0366. Genera ÚNICAMENTE el Producto 3 indicado.

## CONTEXTO ACUMULADO DEL PROYECTO
{{context}}

## DATOS DE ENTRADA DEL USUARIO EN ESTA FASE
{{userInputs}}

## INSTRUCCIÓN
Genera SOLO el CALENDARIO GENERAL DE ACTIVIDADES (Producto 3 / E1220 - producto #2). No generes ningún otro producto.

Usa: estructura temática de F2 (módulos y duración), actividades definidas en el Producto 2 (del contexto si está disponible), duración total calculada en F3, y fecha de inicio del usuario (`startDate` en userInputs).

## FORMATO DE SALIDA OBLIGATORIO

# PRODUCTO 3: CALENDARIO GENERAL DE ACTIVIDADES
**Elemento EC0366:** E1220 — Producto #2
**Proyecto:** [nombre del proyecto]
**Candidato:** [clientName]
**Fecha de elaboración:** [fecha actual]

---

**Fecha de inicio del curso:** [startDate de userInputs o indicar "por definir"]
**Duración total:** [N semanas] | [N horas totales de F3]

| Semana | Módulo | Actividades incluidas | Ponderación | Fecha de apertura | Fecha de cierre |
|:---|:---|:---|:---|:---|:---|
| 1 | [Módulo 1 — nombre] | [Act. 1.1, Act. 1.2 — nombres breves] | [%] | [DD/MM/AAAA] | [DD/MM/AAAA] |
| 2 | [Módulo 1-2] | [Act. 1.3, Act. 2.1] | [%] | [DD/MM/AAAA] | [DD/MM/AAAA] |
| [N] | [Módulo N] | [actividades] | [%] | [DD/MM/AAAA] | [DD/MM/AAAA] |
| **CIERRE** | Evaluación sumativa | Evaluación final del curso | [%] | [DD/MM/AAAA] | [DD/MM/AAAA] |

**Totales:**
| Dato | Valor |
|:---|:---|
| Total de semanas | [N] |
| Total de horas | [N] |
| Fecha de inicio | [fecha] |
| Fecha de cierre | [fecha] |
| Total de actividades | [N] |

## INSTRUCCIONES DE CALIDAD
- Las fechas deben ser consecuentes (sin traslapes entre actividades de la misma semana).
- La suma de ponderaciones debe ser 100%.
- Responde SOLO en español. Genera únicamente este producto, sin preámbulos.
