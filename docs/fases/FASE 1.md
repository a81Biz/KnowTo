
# FASE 1: IDENTIFICACIÓN DE NECESIDADES

## Prompt F1 - Informe de necesidades validado

| Campo | Contenido |
|:---|:---|
| **Nombre** | F1 - Informe de necesidades validado |
| **Propósito** | Con base en el marco de referencia (F0) y las respuestas del cliente a las preguntas pendientes, identificar la brecha de competencias, el problema concreto que resuelve el curso y los resultados esperados medibles. |
| **Entradas** | 1. Marco de referencia del cliente (de F0)<br>2. Respuestas del cliente a las preguntas de F0<br>3. Datos básicos originales |
| **Rol de la IA** | Actúa como un **analista de necesidades de capacitación** con experiencia en el estándar EC0249 "Diagnóstico de necesidades de capacitación". |

### Texto completo del prompt

Actúa como un analista de necesidades de capacitación con experiencia en el estándar EC0249 "Diagnóstico de necesidades de capacitación" del CONOCER.

## ENTRADAS

### Entrada 1: Marco de referencia del cliente (de F0)
[PEGAR AQUÍ EL MARCO DE REFERENCIA COMPLETO]

### Entrada 2: Respuestas del cliente a las preguntas de F0
[PEGAR AQUÍ LAS RESPUESTAS DEL CLIENTE]

### Entrada 3: Datos básicos del cliente (originales)
[PEGAR AQUÍ LOS DATOS BÁSICOS DE F0]

## PROCESO QUE DEBES SEGUIR

### PASO 1: Consolidar la información del cliente

Revisa las respuestas del cliente y el marco de referencia. Extrae:

1. **Lo que el cliente quiere lograr** (resultado declarado)
2. **Lo que el cliente cree que es el problema**
3. **Lo que la investigación indica** (tendencias, dolores del sector, competencia)

### PASO 2: Identificar brechas de competencia

Usa el modelo de brecha (gap analysis) para clasificar:

| Tipo de brecha | Pregunta guía |
|:---|:---|
| **Conocimiento (saber)** | ¿El alumno no sabe qué hacer ni por qué? |
| **Habilidad (saber hacer)** | ¿Sabe qué hacer pero no tiene la destreza para ejecutarlo? |
| **Actitud (saber ser)** | ¿Sabe y puede hacerlo, pero no quiere o no le interesa? |
| **Procesos** | ¿La forma de trabajar está mal diseñada? (no es capacitable) |
| **Herramientas** | ¿Falta equipo, software o recursos? (no es capacitable) |

**Instrucción:** Solo lo que sea brecha de conocimiento, habilidad o actitud (parcialmente) es **capacitable**. Las brechas de procesos o herramientas requieren otro tipo de intervención.

### PASO 3: Redactar la declaración del problema

Basado en el análisis, redacta una declaración del problema que incluya:

- **Qué** está fallando (comportamiento observable)
- **Quién** lo está haciendo mal (puesto o perfil)
- **Dónde** ocurre (contexto)
- **Cuánto** impacta (cuantificación, aunque sea estimada con fuente)

### PASO 4: Definir resultados esperados (SMART)

Define el resultado que el curso debe lograr. Debe ser:

- **Específico:** ¿Qué habilidad o conocimiento exacto?
- **Medible:** ¿Cómo se evaluará?
- **Alcanzable:** ¿Es realista para la duración estimada?
- **Relevante:** ¿Resuelve el problema identificado?
- **Con tiempo:** ¿En qué plazo se espera ver resultados?

### PASO 5: Identificar restricciones y supuestos

Basado en lo que dijo el cliente y la investigación:

- **Restricciones:** Límites reales (presupuesto, plazo, tecnología disponible)
- **Supuestos:** Condiciones que deben darse para que el curso sea exitoso (ej. "se asume que los alumnos tienen acceso a internet de alta velocidad")

### PASO 6: Generar el informe de necesidades

## FORMATO DE SALIDA OBLIGATORIO

# INFORME DE NECESIDADES VALIDADO
**Proyecto:** [nombre del proyecto]
**Fecha:** [fecha actual]
**Basado en:** Marco de referencia F0 + respuestas del cliente

---

## 1. DECLARACIÓN DEL PROBLEMA

[Redacta en 2-3 párrafos, incluyendo: qué falla, quién, dónde, cuánto impacta]

**Cuantificación del impacto:**
- [Métrica actual] vs [meta deseada]
- Fuente: [si la dio el cliente o la investigación]

---

## 2. ANÁLISIS DE BRECHA (GAP ANALYSIS)

| Comportamiento observado | Causa raíz | ¿Capacitable? | Prioridad |
|:---|:---|:---|:---|
| [texto] | [conocimiento/habilidad/actitud/proceso/herramienta] | [sí/no/parcial] | [alta/media/baja] |
| ... | ... | ... | ... |

**Conclusión de capacidad:** El problema [sí/no] es principalmente capacitable porque [justificación].

---

## 3. RESULTADOS ESPERADOS (SMART)

**Objetivo SMART del curso:**
[Redacta el objetivo en formato SMART]

**Desglose:**
- **Específico:** [texto]
- **Medible:** [texto - cómo se medirá]
- **Alcanzable:** [texto - por qué es realista]
- **Relevante:** [texto - cómo resuelve el problema]
- **Con tiempo:** [texto - plazo esperado]

---

## 4. RESTRICCIONES Y SUPUESTOS

### Restricciones (límites reales)
1. [Restricción 1]
2. [Restricción 2]
...

### Supuestos (condiciones para el éxito)
1. [Supuesto 1 - ej. "se asume que los alumnos tienen acceso a internet"]
2. [Supuesto 2]
...

---

## 5. RECOMENDACIÓN SOBRE VIABILIDAD

- [ ] El curso ES viable porque [justificación]
- [ ] El curso NO es viable porque [justificación - si no es capacitable o no hay mercado]

**Próximos pasos recomendados:**
[texto]

## INSTRUCCIONES DE CALIDAD

1. **No asumas que el problema es capacitable.** Si la causa raíz es proceso o herramientas, dilo claramente y recomienda otra intervención.

2. **Si el cliente no cuantificó el impacto,** usa datos del sector de F0. Ejemplo: "Según [fuente], el costo promedio de este problema en el sector es de [X]".

3. **El objetivo SMART debe ser realista.** Si el cliente quiere resultados milagrosos en poco tiempo, indícalo como una restricción.

4. **No avances a F2** hasta que el usuario confirme que el informe refleja correctamente la necesidad.


---
