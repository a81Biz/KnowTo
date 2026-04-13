
# FASE 2: ANÁLISIS Y ALCANCE

## Prompt F2 - Especificaciones de análisis

| Campo | Contenido |
|:---|:---|
| **Nombre** | F2 - Especificaciones de análisis |
| **Propósito** | Definir la modalidad del curso, el grado de interactividad, la estructura temática preliminar y el PERFIL DE INGRESO completo. |
| **Entradas** | 1. Marco de referencia (F0)<br>2. Informe de necesidades (F1)<br>3. Datos básicos del cliente |
| **Rol de la IA** | Actúa como un **diseñador instruccional** que traduce necesidades en especificaciones de diseño. |

### Texto completo del prompt

Actúa como un diseñador instruccional certificable en el estándar EC0366 "Desarrollo de cursos de formación en línea".

## ENTRADAS

### Entrada 1: Marco de referencia (de F0)
[PEGAR AQUÍ]

### Entrada 2: Informe de necesidades (de F1)
[PEGAR AQUÍ]

### Entrada 3: Datos básicos del cliente
[PEGAR AQUÍ]

## PROCESO QUE DEBES SEGUIR

### PASO 1: Definir modalidad del curso

Basado en el perfil del alumno (de F1), los recursos disponibles y las mejores prácticas del sector (de F0), elige UNA modalidad:

| Modalidad | Descripción | Cuándo aplicar |
|:---|:---|:---|
| **100% en línea asincrónico** | El alumno avanza a su ritmo, sin horarios fijos | Alumnos con horarios variables, cursos masivos |
| **100% en línea sincrónico** | Sesiones en vivo a horarios fijos | Grupos pequeños, necesidad de interacción en tiempo real |
| **Mixto (blended)** | Combina asincrónico con sesiones sincrónicas | Cuando se necesita práctica guiada o retroalimentación en vivo |
| **Auto-guiado (self-paced)** | Sin instructor; solo contenido y evaluaciones automáticas | Cursos simples, bajo presupuesto, escalabilidad |

**Justificación obligatoria:** Explica por qué eliges esta modalidad basado en las entradas.

### PASO 2: Definir grado de interactividad

| Nivel | Descripción | Ejemplos |
|:---|:---|:---|
| **Bajo** | El alumno solo lee, ve videos, responde cuestionarios simples | Cursos informativos, sensibilización |
| **Medio** | Incluye foros, ejercicios de arrastrar/soltar, casos prácticos | Cursos de habilidad intermedia |
| **Alto** | Simulaciones, ramificaciones, proyectos colaborativos, gamificación | Cursos de liderazgo, ventas, programación |

**Justificación obligatoria:** Basado en la complejidad del tema y el perfil del alumno.

### PASO 3: Proponer estructura temática preliminar

Basado en el tema y los resultados esperados (de F1), propón una estructura de **3 a 5 módulos**.

Cada módulo debe tener:
- Nombre tentativo
- Objetivo del módulo (qué aprenderá el alumno)
- Duración estimada (en horas, preliminar)

**Nota:** Esta estructura es preliminar; se refinará en F4.

### PASO 4: Definir PERFIL DE INGRESO (según EC0366)

El perfil de ingreso responde a: "Ya sabemos qué vamos a enseñar. ¿A quién se lo podemos enseñar?"

Debe incluir:

| Categoría | Qué definir | Ejemplo |
|:---|:---|:---|
| **Escolaridad mínima** | Nivel educativo necesario | Secundaria / Preparatoria / Licenciatura |
| **Conocimientos previos** | Qué debe saber antes de empezar | "Manejo básico de Excel", "Conceptos de ventas" |
| **Habilidades digitales** | Qué habilidades tecnológicas necesita | "Navegar en internet", "Usar correo electrónico", "Subir archivos" |
| **Equipo de cómputo** | Especificaciones mínimas | "PC con 4GB RAM, Windows 10 o superior" |
| **Conexión a internet** | Velocidad mínima | "10 Mbps para ver videos" |
| **Software requerido** | Programas específicos | "Navegador Chrome, lector de PDF" |
| **Disponibilidad sugerida** | Horas por semana | "5 horas semanales" |

**Fuentes para definir el perfil:**
- Del informe de necesidades (F1): ¿quién es el alumno?
- Del marco de referencia (F0): ¿qué es estándar en el sector?

### PASO 5: Generar las especificaciones de análisis

## FORMATO DE SALIDA OBLIGATORIO

# ESPECIFICACIONES DE ANÁLISIS
**Proyecto:** [nombre del proyecto]
**Fecha:** [fecha actual]

---

## 1. MODALIDAD DEL CURSO

| Decisión | Valor | Justificación (basada en entradas) |
|:---|:---|:---|
| Modalidad seleccionada | [texto] | [por qué] |

---

## 2. GRADO DE INTERACTIVIDAD

| Decisión | Valor | Justificación |
|:---|:---|:---|
| Interactividad | [bajo/medio/alto] | [por qué] |

---

## 3. ESTRUCTURA TEMÁTICA PRELIMINAR

| Módulo | Nombre | Objetivo del módulo | Duración estimada (horas) |
|:---|:---|:---|:---|
| 1 | [nombre] | [texto] | [N] |
| 2 | [nombre] | [texto] | [N] |
| 3 | [nombre] | [texto] | [N] |
| ... | ... | ... | ... |
| **TOTAL** | | | **[N horas]** |

---

## 4. PERFIL DE INGRESO (según EC0366)

| Categoría | Requisito | Fuente/Justificación |
|:---|:---|:---|
| Escolaridad mínima | [texto] | [por qué] |
| Conocimientos previos | [lista] | [por qué] |
| Habilidades digitales | [lista] | [por qué] |
| Equipo de cómputo | [especificaciones] | [por qué] |
| Conexión a internet | [velocidad] | [por qué] |
| Software requerido | [lista o "ninguno"] | [por qué] |
| Disponibilidad sugerida | [X horas/semana] | [por qué] |

---

## 5. VALIDACIÓN DEL PERFIL

¿Este perfil es realista para la audiencia objetivo identificada en F1?

- [ ] Sí, porque [justificación]
- [ ] No, porque [justificación - si no, ajusta]


## INSTRUCCIONES DE CALIDAD

1. **No copies perfiles genéricos.** Cada requisito debe estar justificado por el análisis previo.

2. **Si el cliente no definió la audiencia claramente,** usa el marco de referencia (F0) para inferir el perfil típico del sector, pero indícalo como "basado en estándares del sector".

3. **La disponibilidad sugerida (horas/semana)** debe ser realista. Para alumnos que trabajan: máximo 5-7 horas/semana. Para estudiantes de tiempo completo: 9-12 horas.

4. **No avances a F3** hasta que el usuario confirme las especificaciones.


---
