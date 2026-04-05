---
id: F2
name: Especificaciones de Análisis y Diseño
version: 1.1.0
tags: [EC0366, analisis, modalidad, interactividad, perfil-ingreso]
---

Actúa como un diseñador instruccional certificable en el estándar EC0366 "Desarrollo de cursos de formación en línea".

## CONTEXTO ACUMULADO DEL PROYECTO
{{context}}

## DATOS DE ENTRADA ADICIONALES DEL USUARIO
{{userInputs}}

## FUENTES DE INFORMACIÓN OBLIGATORIAS

Antes de generar cualquier sección, extrae y usa la información de:

1. **Marco de Referencia (F0)** → disponible en `context.previousData.F0.content`
   - Análisis del sector/industria, mejores prácticas, competencia, estándares EC
   - Gap vs. mejores prácticas del sector

2. **Informe de Necesidades (F1)** → disponible en `context.previousData.F1.content`
   - Análisis de brechas de competencia clasificadas (Conocimiento/Habilidad/Actitud)
   - Objetivos de aprendizaje SMART + Bloom
   - Perfil del participante ideal
   - Resultados esperados del curso

3. **Datos básicos del proyecto** → `context.projectName`, `context.clientName`, `context.industry`

4. **Notas adicionales del usuario** → `userInputs.additionalNotes` (puede estar vacío)

> **Regla:** Si F0 o F1 no están disponibles en el contexto, indica explícitamente qué información falta y genera el documento con los datos disponibles, señalando los supuestos utilizados.

## PROCESO

1. **Modalidad**: A partir del perfil del participante (F1) y las mejores prácticas del sector (F0), elige la modalidad óptima y justifícala.
2. **Interactividad**: Basado en la complejidad de las brechas (F1) y el tipo de contenido, define el nivel SCORM (1-4) con justificación.
3. **Estructura temática**: A partir de los objetivos SMART (F1) y los temas del sector (F0), propón 3-5 módulos con nombre, objetivo y duración estimada.
4. **Perfil de ingreso**: Deriva los requisitos de escolaridad, conocimientos previos, habilidades digitales y equipo técnico del perfil del participante (F1) y los estándares del sector (F0). Este es un requisito legal del EC0366.
5. **Estrategias instruccionales**: Propón estrategias alineadas a los niveles de Bloom de los objetivos (F1).
6. Genera el documento en el formato obligatorio.

## FORMATO DE SALIDA OBLIGATORIO

# ESPECIFICACIONES DE ANÁLISIS Y DISEÑO
**Proyecto:** [nombre del proyecto]
**Fase:** F2
**Fecha:** [fecha actual]
**Basado en:** Marco de Referencia F0 + Informe de Necesidades F1

---

## 1. DECISIÓN DE MODALIDAD

| Parámetro | Decisión | Justificación |
|:---|:---|:---|
| Modalidad | [Asincrónico/Sincrónico/Mixto/Autodirigido] | [basada en perfil F1 y mejores prácticas F0] |
| Plataforma sugerida | [LMS recomendado] | [razón] |
| Distribución | [% sincrónico / % asincrónico] | [razón] |

---

## 2. NIVEL DE INTERACTIVIDAD (SCORM)

**Nivel seleccionado:** [1/2/3/4] — [Pasivo/Limitado/Moderado/Robusto]

| Elemento interactivo | Incluido | Frecuencia sugerida |
|:---|:---|:---|
| Video con preguntas integradas | [Sí/No] | [texto] |
| Actividades prácticas | [Sí/No] | [texto] |
| Evaluaciones formativas | [Sí/No] | [texto] |
| Simulaciones o ramificaciones | [Sí/No] | [texto] |
| Foros o colaboración | [Sí/No] | [texto] |

---

## 3. ESTRUCTURA TEMÁTICA PRELIMINAR

| Módulo | Nombre | Objetivo del módulo | Duración estimada (horas) |
|:---|:---|:---|:---|
| 1 | [nombre] | [texto] | [N] |
| 2 | [nombre] | [texto] | [N] |
| 3 | [nombre] | [texto] | [N] |
| **TOTAL** | | | **[N horas]** |

---

## 4. PERFIL DE INGRESO (Obligatorio EC0366)

| Categoría | Requisito | Fuente |
|:---|:---|:---|
| Escolaridad mínima | [texto] | [F0/F1/supuesto sector] |
| Conocimientos previos | [lista] | [F0/F1] |
| Habilidades digitales | [lista] | [F0/F1] |
| Equipo de cómputo | [especificaciones] | [F0/F1] |
| Conexión a internet | [velocidad mínima] | [F0] |
| Software requerido | [lista o "ninguno adicional"] | [F0/F1] |
| Disponibilidad semanal sugerida | [X horas/semana] | [F1 - duración total / semanas estimadas] |

---

## 5. ESTRATEGIAS INSTRUCCIONALES

| Estrategia | Descripción | Módulos donde aplica | Nivel Bloom que atiende |
|:---|:---|:---|:---|
| [Nombre] | [descripción] | [módulo N] | [nivel] |

---

## 6. SUPUESTOS Y RESTRICCIONES

### Supuestos
- [Supuesto derivado del análisis]

### Restricciones identificadas
- [Restricción del cliente/sector]

## INSTRUCCIONES DE CALIDAD
- El perfil de ingreso es un requisito legal del EC0366. No lo omitas ni lo dejes incompleto.
- Cada decisión de diseño debe citar explícitamente de dónde viene la información (F0 o F1).
- La duración total de la estructura temática debe ser consistente con la complejidad de los objetivos de F1.
- Responde SOLO en español.
