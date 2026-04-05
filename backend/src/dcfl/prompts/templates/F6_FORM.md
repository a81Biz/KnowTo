---
id: F6_FORM
name: Generador de Formulario Dinámico para Ajustes Post-Evaluación
version: 1.0.0
tags: [EC0366, form-generator, ajustes, dinamico]
---

Analiza el contexto del proyecto y genera un formulario dinámico en formato JSON estricto.

## CONTEXTO DEL PROYECTO
{{context}}

## INSTRUCCIÓN
Basándote en el checklist de verificación (F5) del contexto, genera un objeto JSON con los campos que el candidato debe completar para documentar sus ajustes post-evaluación.

Reglas:
- Devuelve ÚNICAMENTE el JSON, sin explicaciones, sin texto antes ni después.
- Analiza qué observaciones y problemas surgieron en el checklist de F5.
- Los campos deben ser específicos para los problemas detectados, no genéricos.
- Si no hay contexto de F5, genera campos estándar de ajuste.

## TIPOS DE CAMPO DISPONIBLES
- `text`: campo de texto corto (1 línea)
- `textarea`: campo de texto largo (múltiples líneas)
- `select`: desplegable con opciones predefinidas
- `number`: campo numérico

## FORMATO DE SALIDA — SOLO JSON, SIN NADA MÁS

```json
{
  "formTitle": "Documento de Ajustes Post-Evaluación",
  "description": "Describe los ajustes realizados al curso después de la evaluación.",
  "fields": [
    {
      "id": "courseVersion",
      "label": "Versión del curso después de ajustes",
      "type": "text",
      "placeholder": "Ej: 1.1",
      "required": true,
      "helpText": "Incremente el número de versión respecto a la versión anterior."
    },
    {
      "id": "observationSummary",
      "label": "Resumen de observaciones recibidas",
      "type": "textarea",
      "placeholder": "Describe las principales observaciones de los participantes de prueba y/o del evaluador.",
      "required": true,
      "helpText": "Incluye tanto observaciones técnicas (errores, navegación) como pedagógicas (claridad, dificultad)."
    },
    {
      "id": "adjustment_1_description",
      "label": "[Nombre del ajuste según F5] — Descripción del problema",
      "type": "textarea",
      "placeholder": "Describe con precisión qué problema se detectó.",
      "required": true,
      "helpText": "Sé específico: ¿en qué módulo?, ¿qué actividad?, ¿qué dice la pantalla?"
    },
    {
      "id": "adjustment_1_solution",
      "label": "[Nombre del ajuste] — Solución implementada",
      "type": "textarea",
      "placeholder": "Describe qué cambio realizaste exactamente.",
      "required": true,
      "helpText": "Indica el archivo modificado, el texto cambiado o la configuración ajustada."
    },
    {
      "id": "adjustment_1_type",
      "label": "[Nombre del ajuste] — Tipo de ajuste",
      "type": "select",
      "required": true,
      "options": [
        { "value": "tecnico", "label": "Técnico (error de plataforma, link roto, video sin audio)" },
        { "value": "pedagogico", "label": "Pedagógico (claridad de instrucciones, nivel de dificultad)" },
        { "value": "administrativo", "label": "Administrativo (fechas, nombres, datos del candidato)" }
      ]
    },
    {
      "id": "adjustment_1_priority",
      "label": "[Nombre del ajuste] — Prioridad",
      "type": "select",
      "required": true,
      "options": [
        { "value": "alta", "label": "Alta — impide completar el curso" },
        { "value": "media", "label": "Media — afecta la experiencia pero no bloquea" },
        { "value": "baja", "label": "Baja — mejora cosmética o menor" }
      ]
    },
    {
      "id": "adjustment_1_verification",
      "label": "[Nombre del ajuste] — ¿Cómo verificaste que quedó resuelto?",
      "type": "text",
      "placeholder": "Ej: Revisé el video corregido y confirmo que el audio funciona correctamente.",
      "required": true,
      "helpText": "La verificación debe ser objetiva y comprobable."
    },
    {
      "id": "additionalAdjustments",
      "label": "Otros ajustes realizados (no contemplados arriba)",
      "type": "textarea",
      "placeholder": "Describe cualquier otro cambio menor que hayas realizado.",
      "required": false,
      "helpText": "Opcional. Para cambios adicionales que no correspondan a observaciones específicas del checklist."
    },
    {
      "id": "completionDate",
      "label": "Fecha de finalización de ajustes",
      "type": "text",
      "placeholder": "DD/MM/AAAA",
      "required": true,
      "helpText": "Fecha en que terminaste de implementar todos los ajustes."
    }
  ]
}
```
