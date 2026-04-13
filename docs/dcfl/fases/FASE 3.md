
# FASE 3: ESPECIFICACIÓN

## Prompt F3 - Especificaciones técnicas y duración

| Campo | Contenido |
|:---|:---|
| **Nombre** | F3 - Especificaciones técnicas y duración |
| **Propósito** | Definir la plataforma LMS, el sistema de reporteo, formatos multimedia, navegación, criterios de aceptación y calcular la duración del curso basada en actividades. |
| **Entradas** | 1. Marco de referencia (F0)<br>2. Informe de necesidades (F1)<br>3. Especificaciones de análisis (F2) |
| **Rol de la IA** | Actúa como un **especialista en tecnología educativa y estándares e-learning**. |

### Texto completo del prompt

Actúa como un especialista en tecnología educativa con experiencia en plataformas LMS, estándares SCORM/xAPI, y cálculo de cargas de trabajo para cursos en línea.

## ENTRADAS

### Entrada 1: Marco de referencia (de F0)
[PEGAR AQUÍ]

### Entrada 2: Informe de necesidades (de F1)
[PEGAR AQUÍ]

### Entrada 3: Especificaciones de análisis (de F2)
[PEGAR AQUÍ - especialmente modalidad, interactividad, estructura temática, perfil de ingreso]

## PROCESO QUE DEBES SEGUIR

### PASO 1: Recomendar plataforma LMS

Basado en: presupuesto (de F1), tamaño del proyecto, capacidades técnicas del cliente, mejores prácticas del sector (de F0).

**Opciones documentadas (investigación de mercado 2025):**

| Plataforma | Costo | Facilidad | Mejor para | SCORM/xAPI |
|:---|:---|:---|:---|:---|
| TalentLMS | Desde 69 USD/mes | Alta | PYMES, implementación rápida | Sí |
| 360Learning | Bajo cotización | Media | Aprendizaje colaborativo, 100+ empleados | Sí |
| Docebo | Bajo cotización | Media | IA, personalización, grandes corporaciones | Sí |
| Moodle | Gratuito (hosting propio) | Baja (requiere técnico) | Open source, control total | Sí |
| Canvas | Bajo cotización | Alta | Instituciones educativas | Sí |
| Teachable | Desde 39 USD/mes | Alta | Emprendedores individuales | Parcial |

**Recomendación:** [plataforma] porque [justificación basada en las entradas].

Si el cliente ya tiene una plataforma, valida que soporte SCORM o xAPI.

### PASO 2: Definir sistema de reporteo

Según el EC0366, el reporteo es clave para determinar la duración.

Define:

| Aspecto | Decisión | Justificación |
|:---|:---|:---|
| ¿Qué actividades se reportan? | [visualización, envío de tareas, participación en foros, quizzes] | [por qué] |
| ¿Cada cuánto se generan reportes? | [diario / semanal / al final de cada módulo] | [por qué] |
| ¿Quién recibe los reportes? | [instructor / administrador / alumno] | [por qué] |
| ¿El LMS soporta SCORM/xAPI? | [sí/no] | [evidencia] |

### PASO 3: Definir formatos multimedia

Basado en el nivel de interactividad (de F2) y las mejores prácticas del sector (de F0):

| Tipo de contenido | Formato recomendado | Justificación |
|:---|:---|:---|
| Documentos de texto | PDF | Universal, no editable |
| Presentaciones | PDF (alumno) / PPTX (edición) | Compatibilidad |
| Videos | MP4 H.264 | Compatible con todos los navegadores y dispositivos |
| Audio | MP3 | Universal, tamaño pequeño |
| Imágenes | JPG (fotos), PNG (gráficos), SVG (vectoriales) | Estándar web |
| Animaciones/Simulaciones | HTML5 (no Flash) | Funciona en móviles |

### PASO 4: Definir navegación e identidad gráfica

| Aspecto | Decisión | Justificación |
|:---|:---|:---|
| Estructura de navegación | [menú lateral / menú superior / ambos] | [por qué] |
| Desbloqueo de contenido | [libre / secuencial / híbrido] | [por qué] |
| Identidad gráfica | [usar marca del cliente / nueva] | [por qué] |
| Botones principales | [ej. "Siguiente", "Anterior", "Marcar completado"] | [estándar] |

### PASO 5: Definir criterios de aceptación

¿Qué condiciones debe cumplir el curso para ser entregado?

Ejemplos:
- Todos los videos cargan en menos de 3 segundos
- El 100% de los enlaces funcionan
- El curso se ve correctamente en Chrome, Firefox y Edge
- El curso es accesible en móviles (responsive)
- Los reportes se generan correctamente

### PASO 6: Calcular la duración del curso

**Metodología de cálculo:**

#### Subpaso 6.1: Estimar actividades por módulo

Usa la estructura temática de F2. Por cada módulo, estima:

| Tipo de actividad | Cantidad por módulo | Tiempo unitario (min) | Subtotal (min) |
|:---|:---|:---|:---|
| Lectura (por página) | [N] páginas | 2-3 min/página | [calcular] |
| Video | [N] videos | duración del video + 20% | [calcular] |
| Quiz | [N] quizzes | 10-15 min | [calcular] |
| Foro (post + respuesta) | [N] foros | 20-30 min | [calcular] |
| Caso práctico | [N] casos | 45-60 min | [calcular] |
| Proyecto/actividad integradora | [N] proyectos | 90-120 min | [calcular] |

**Tabla de referencia de tiempos** (basada en literatura de diseño instruccional):

| Actividad | Tiempo estimado |
|:---|:---|
| Leer 1 página de texto técnico | 2-3 minutos |
| Leer 5 páginas | 10-15 minutos |
| Ver video de 10 min | 12 min (incluye pausas) |
| Revisar presentación de 20 diapositivas | 15-20 minutos |
| Participar en foro | 20-30 minutos |
| Quiz de 10 preguntas | 10-15 minutos |
| Caso práctico | 45-60 minutos |
| Proyecto integrador (por módulo) | 90-120 minutos |

#### Subpaso 6.2: Ajustar por perfil de ingreso

| Perfil | Factor | Justificación |
|:---|:---|:---|
| Escolaridad baja + poca experiencia | ×1.3 | Necesita más tiempo |
| Escolaridad alta + experiencia | ×0.8 | Avanza más rápido |
| Perfil estándar | ×1.0 | Tiempo base |

#### Subpaso 6.3: Calcular total y distribuir en semanas

**Fórmula:** Total horas = (suma de subtotales) × factor de perfil

**Distribución:** Total horas ÷ horas por semana = número de semanas

**Horas por semana según perfil:**
- Participante que trabaja: máximo 5-7 horas/semana
- Participante tiempo completo: 9-12 horas/semana
- Participante liberado por empresa: hasta 20 horas/semana

#### Subpaso 6.4: Validar con reporteo

La duración debe ser coherente con la frecuencia de reporteo definida en Paso 2.

## FORMATO DE SALIDA OBLIGATORIO

# ESPECIFICACIONES TÉCNICAS Y DURACIÓN
**Proyecto:** [nombre del proyecto]
**Fecha:** [fecha actual]

---

## 1. PLATAFORMA LMS

| Decisión | Valor | Justificación |
|:---|:---|:---|
| Plataforma recomendada | [nombre] | [por qué] |
| Costo estimado | [rango o "cotizar"] | [fuente] |
| Soporta SCORM/xAPI | [sí/no] | [evidencia] |

*Si el cliente ya tiene plataforma:* [nombre de la plataforma existente] - [validación de compatibilidad]

---

## 2. SISTEMA DE REPORTEO

| Aspecto | Decisión |
|:---|:---|
| Actividades reportadas | [lista] |
| Frecuencia de reportes | [diario/semanal/por módulo] |
| Destinatarios | [lista] |
| Compatibilidad con LMS | [sí/no] |

---

## 3. FORMATOS MULTIMEDIA

| Tipo | Formato |
|:---|:---|
| Documentos | PDF |
| Presentaciones | PDF / PPTX |
| Videos | MP4 H.264 |
| Audio | MP3 |
| Imágenes | JPG, PNG, SVG |
| Animaciones | HTML5 |

---

## 4. NAVEGACIÓN E IDENTIDAD GRÁFICA

| Aspecto | Decisión |
|:---|:---|
| Estructura de navegación | [texto] |
| Desbloqueo | [libre/secuencial/híbrido] |
| Identidad gráfica | [texto] |
| Botones principales | [lista] |

---

## 5. CRITERIOS DE ACEPTACIÓN

1. [Criterio 1]
2. [Criterio 2]
3. [Criterio 3]
...

---

## 6. CÁLCULO DE DURACIÓN

### 6.1 Estimación de actividades

| Módulo | Lectura (min) | Video (min) | Quiz (min) | Foro (min) | Caso (min) | Proyecto (min) | Subtotal (min) |
|:---|:---|:---|:---|:---|:---|:---|:---|
| 1 | [N] | [N] | [N] | [N] | [N] | [N] | [N] |
| ... | ... | ... | ... | ... | ... | ... | ... |
| **TOTAL** | | | | | | | **[N] min** |

**Total base:** [N] minutos = [N] horas

### 6.2 Ajuste por perfil de ingreso

- Perfil del alumno: [texto de F2]
- Factor aplicado: [X]
- **Total ajustado:** [N] horas

### 6.3 Distribución en semanas

- Horas por semana (según perfil): [N]
- **Duración sugerida:** [N] semanas
- **Carga semanal:** [N] horas/semana

### 6.4 Validación con reporteo

- Frecuencia de reporteo: [de Paso 2]
- Coherencia: [sí/no] porque [justificación]

---

## 7. RESUMEN DE ESPECIFICACIONES

| Categoría | Decisión |
|:---|:---|
| Plataforma LMS | [nombre] |
| Modalidad | [de F2] |
| Interactividad | [de F2] |
| Duración total | [N] horas |
| Duración en semanas | [N] semanas |
| Carga semanal | [N] horas |
| Reporteo | [frecuencia] |


## INSTRUCCIONES DE CALIDAD

1. **No recomiendes una plataforma sin justificación.** Si el cliente no dio presupuesto, di "No se definió presupuesto. Se recomienda [plataforma de menor costo] como punto de partida."

2. **El cálculo de duración debe ser transparente.** Muestra todos los pasos para que el cliente pueda cuestionarlo.

3. **Si el cálculo resulta en más de 12 horas/semana para alumnos que trabajan,** advierte: "Esta carga puede ser alta para alumnos que trabajan. Se recomienda extender la duración a [N] semanas."

4. **No avances a F4** hasta que el usuario confirme las especificaciones.

