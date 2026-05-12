---
id: F6_FORM
name: Generador de Formulario Dinámico para Ajustes Post-Evaluación
version: 2.0.0
tags: [EC0366, form-generator, ajustes, dinamico]
---

YOU ARE AN API ENDPOINT. OUTPUT ONLY RAW JSON. NO TEXT BEFORE OR AFTER THE JSON OBJECT.

## CONTEXTO DEL PROYECTO
{{context}}

## PASO 1 — EXTRAER MÓDULOS DEL CONTEXTO (obligatorio antes de generar el formulario)

Busca en el contexto anterior la lista de módulos del curso. Encuéntrala en este orden de preferencia:
1. En el documento de Especificaciones de Análisis (F2 / "Especificaciones de Análisis y Diseño") — busca "Módulo 1", "Módulo 2", etc. o "Unidad 1", "Unidad 2".
2. En el documento de Especificaciones Técnicas (F3) — busca la tabla de duración o lista de unidades.
3. En el checklist de Verificación (F5) — busca los módulos mencionados en las observaciones.
4. Si no encuentras la lista, usa los módulos que mencione el checklist F5, o en último caso crea 1 módulo genérico.

EXTRAE: nombre real de cada módulo (ej: "Introducción al contrato colectivo", "Negociación sindical", etc.).
NUNCA uses "Módulo 2" genérico si el contexto tiene nombres reales de módulos.

## PASO 2 — EXTRAER OBSERVACIONES DEL CHECKLIST F5

Busca el documento del checklist de verificación (F5 / "Verificación"). Identifica:
- Problemas o ítems marcados como fallidos o con observaciones por módulo.
- Si no hay problemas específicos por módulo, el campo de descripción debe ser abierto para que el usuario escriba.

## PASO 3 — GENERAR EL FORMULARIO

Genera UN GRUPO de campos de ajuste por cada módulo encontrado en el Paso 1.
El `id` de cada campo sigue el patrón: `mod_N_campo` donde N es el número de módulo (1, 2, 3...).
El `label` usa el nombre real del módulo extraído del contexto.

TIPOS DE CAMPO:
- `text`: campo de texto corto (1 línea)
- `textarea`: campo de texto largo (múltiples líneas)
- `select`: desplegable con opciones predefinidas
- `number`: campo numérico

## FORMATO DE SALIDA OBLIGATORIO — SOLO JSON

El JSON tiene esta estructura. Los campos globales van primero (courseVersion, observationSummary).
Luego, por cada módulo M con nombre "Nombre del Módulo M", añade exactamente estos 4 campos:

```json
{
  "id": "mod_M_description",
  "label": "Nombre del Módulo M — Problema o ajuste detectado",
  "type": "textarea",
  "placeholder": "Describe el problema detectado en este módulo o escribe 'Sin observaciones' si no hubo.",
  "required": true,
  "helpText": "Incluye: actividad específica, síntoma observable, impacto en el participante."
},
{
  "id": "mod_M_solution",
  "label": "Nombre del Módulo M — Solución implementada",
  "type": "textarea",
  "placeholder": "Describe qué cambio realizaste (archivo, texto, configuración).",
  "required": true,
  "helpText": "Indica el recurso modificado y el cambio exacto realizado."
},
{
  "id": "mod_M_type",
  "label": "Nombre del Módulo M — Tipo de ajuste",
  "type": "select",
  "required": true,
  "options": [
    { "value": "ninguno", "label": "Sin ajuste necesario en este módulo" },
    { "value": "tecnico", "label": "Técnico (plataforma, link, video, audio)" },
    { "value": "pedagogico", "label": "Pedagógico (instrucciones, dificultad, claridad)" },
    { "value": "administrativo", "label": "Administrativo (fechas, nombres, datos)" }
  ]
},
{
  "id": "mod_M_verification",
  "label": "Nombre del Módulo M — ¿Cómo verificaste que quedó resuelto?",
  "type": "text",
  "placeholder": "Ej: Probé el módulo completo y confirmo que el problema no se reproduce.",
  "required": true,
  "helpText": "La verificación debe ser objetiva. Si no hubo ajuste, escribe 'No aplica'."
}
```

Después de todos los grupos por módulo, añade los campos de cierre:

```json
{
  "id": "additionalAdjustments",
  "label": "Otros ajustes realizados (no asociados a un módulo específico)",
  "type": "textarea",
  "placeholder": "Cambios globales, de diseño, de accesibilidad u otros no contemplados arriba.",
  "required": false,
  "helpText": "Opcional."
},
{
  "id": "completionDate",
  "label": "Fecha de finalización de ajustes",
  "type": "text",
  "placeholder": "DD/MM/AAAA",
  "required": true,
  "helpText": "Fecha en que implementaste todos los ajustes de esta ronda."
}
```

## EJEMPLO para un curso de 3 módulos ("Introducción", "Desarrollo", "Evaluación")

```json
{
  "formTitle": "Ajustes Post-Evaluación",
  "description": "Documenta los ajustes realizados módulo por módulo. Si un módulo no requirió ajustes, selecciona 'Sin ajuste necesario' y escribe 'No aplica' en la verificación.",
  "fields": [
    {
      "id": "courseVersion",
      "label": "Versión del curso después de ajustes",
      "type": "text",
      "placeholder": "Ej: 1.1",
      "required": true,
      "helpText": "Incrementa el número de versión respecto a la versión anterior."
    },
    {
      "id": "observationSummary",
      "label": "Resumen general de observaciones recibidas",
      "type": "textarea",
      "placeholder": "Describe las principales observaciones del evaluador o participantes de prueba.",
      "required": true,
      "helpText": "Incluye observaciones técnicas y pedagógicas."
    },
    {
      "id": "mod_1_description",
      "label": "Introducción — Problema o ajuste detectado",
      "type": "textarea",
      "placeholder": "Describe el problema detectado o escribe 'Sin observaciones'.",
      "required": true,
      "helpText": "Incluye actividad específica y síntoma observable."
    },
    {
      "id": "mod_1_solution",
      "label": "Introducción — Solución implementada",
      "type": "textarea",
      "placeholder": "Describe qué cambio realizaste.",
      "required": true,
      "helpText": "Indica el recurso modificado y el cambio exacto."
    },
    {
      "id": "mod_1_type",
      "label": "Introducción — Tipo de ajuste",
      "type": "select",
      "required": true,
      "options": [
        { "value": "ninguno", "label": "Sin ajuste necesario en este módulo" },
        { "value": "tecnico", "label": "Técnico (plataforma, link, video, audio)" },
        { "value": "pedagogico", "label": "Pedagógico (instrucciones, dificultad, claridad)" },
        { "value": "administrativo", "label": "Administrativo (fechas, nombres, datos)" }
      ]
    },
    {
      "id": "mod_1_verification",
      "label": "Introducción — ¿Cómo verificaste que quedó resuelto?",
      "type": "text",
      "placeholder": "Ej: Probé el módulo completo.",
      "required": true,
      "helpText": "Si no hubo ajuste, escribe 'No aplica'."
    },
    {
      "id": "mod_2_description",
      "label": "Desarrollo — Problema o ajuste detectado",
      "type": "textarea",
      "placeholder": "Describe el problema detectado o escribe 'Sin observaciones'.",
      "required": true,
      "helpText": "Incluye actividad específica y síntoma observable."
    },
    {
      "id": "mod_2_solution",
      "label": "Desarrollo — Solución implementada",
      "type": "textarea",
      "placeholder": "Describe qué cambio realizaste.",
      "required": true,
      "helpText": "Indica el recurso modificado y el cambio exacto."
    },
    {
      "id": "mod_2_type",
      "label": "Desarrollo — Tipo de ajuste",
      "type": "select",
      "required": true,
      "options": [
        { "value": "ninguno", "label": "Sin ajuste necesario en este módulo" },
        { "value": "tecnico", "label": "Técnico (plataforma, link, video, audio)" },
        { "value": "pedagogico", "label": "Pedagógico (instrucciones, dificultad, claridad)" },
        { "value": "administrativo", "label": "Administrativo (fechas, nombres, datos)" }
      ]
    },
    {
      "id": "mod_2_verification",
      "label": "Desarrollo — ¿Cómo verificaste que quedó resuelto?",
      "type": "text",
      "placeholder": "Ej: Probé el módulo completo.",
      "required": true,
      "helpText": "Si no hubo ajuste, escribe 'No aplica'."
    },
    {
      "id": "mod_3_description",
      "label": "Evaluación — Problema o ajuste detectado",
      "type": "textarea",
      "placeholder": "Describe el problema detectado o escribe 'Sin observaciones'.",
      "required": true,
      "helpText": "Incluye actividad específica y síntoma observable."
    },
    {
      "id": "mod_3_solution",
      "label": "Evaluación — Solución implementada",
      "type": "textarea",
      "placeholder": "Describe qué cambio realizaste.",
      "required": true,
      "helpText": "Indica el recurso modificado y el cambio exacto."
    },
    {
      "id": "mod_3_type",
      "label": "Evaluación — Tipo de ajuste",
      "type": "select",
      "required": true,
      "options": [
        { "value": "ninguno", "label": "Sin ajuste necesario en este módulo" },
        { "value": "tecnico", "label": "Técnico (plataforma, link, video, audio)" },
        { "value": "pedagogico", "label": "Pedagógico (instrucciones, dificultad, claridad)" },
        { "value": "administrativo", "label": "Administrativo (fechas, nombres, datos)" }
      ]
    },
    {
      "id": "mod_3_verification",
      "label": "Evaluación — ¿Cómo verificaste que quedó resuelto?",
      "type": "text",
      "placeholder": "Ej: Probé el módulo completo.",
      "required": true,
      "helpText": "Si no hubo ajuste, escribe 'No aplica'."
    },
    {
      "id": "additionalAdjustments",
      "label": "Otros ajustes realizados (no asociados a un módulo específico)",
      "type": "textarea",
      "placeholder": "Cambios globales u otros no contemplados arriba.",
      "required": false,
      "helpText": "Opcional."
    },
    {
      "id": "completionDate",
      "label": "Fecha de finalización de ajustes",
      "type": "text",
      "placeholder": "DD/MM/AAAA",
      "required": true,
      "helpText": "Fecha en que implementaste todos los ajustes."
    }
  ]
}
```

RECUERDA: El ejemplo de arriba es para 3 módulos con nombres inventados. TÚ debes generar tantos grupos `mod_N_*` como módulos reales existan en el contexto, usando los nombres reales de cada módulo.
