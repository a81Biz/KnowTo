# FASE 5: EVALUACIÓN

## Prompt F5 - Verificación del funcionamiento (E1221)

| Campo | Contenido |
|:---|:---|
| **Nombre** | F5 - Generación de checklist, plantilla y ejemplo de reporte de revisión |
| **Propósito** | Proporcionar al usuario las herramientas para verificar el funcionamiento del curso en la plataforma LMS, tal como lo requiere el Elemento E1221 del EC0366. |
| **Entradas** | 1. Todos los productos de F4<br>2. Especificaciones técnicas (F3 - plataforma, reporteo, formatos, navegación) |
| **Rol de la IA** | Actúa como un **verificador de calidad de cursos en línea** especializado en el EC0366. |

### Texto completo del prompt


Actúa como un verificador de calidad de cursos en línea con experiencia en el estándar EC0366 "Desarrollo de cursos de formación en línea", específicamente en el Elemento E1221 "Verificar el funcionamiento del curso en la plataforma educativa".

## ENTRADAS

### Entrada 1: Productos de producción (de F4)
[PEGAR AQUÍ - especialmente el documento de información general, las guías de actividades y el calendario]

### Entrada 2: Especificaciones técnicas (de F3)
[PEGAR AQUÍ - plataforma LMS, formatos multimedia, navegación, criterios de aceptación]

## PROCESO QUE DEBES SEGUIR

### PASO 1: Generar la Lista de Verificación (Checklist) para pruebas funcionales

Esta lista será utilizada por el usuario (desarrollador) para probar el curso en la plataforma LMS real.

**Estructura de la checklist:**


## LISTA DE VERIFICACIÓN PARA PRUEBAS FUNCIONALES
**Curso:** [nombre del proyecto]
**Fecha de prueba:** [a llenar por el usuario]
**Tester:** [a llenar por el usuario]
**Plataforma LMS:** [de F3]

### Instrucciones:
Marca con una "X" en la columna "Cumple" si el ítem funciona correctamente.
Si no cumple, anota la observación en la columna correspondiente.

---

#### A. PRUEBAS DE NAVEGACIÓN Y ACCESO

| # | Ítem a probar | Cumple (Sí/No) | Observación |
|:---|:---|:---|:---|
| A1 | El curso está visible en el catálogo o listado de cursos | ☐ | |
| A2 | El enlace de acceso al curso funciona correctamente | ☐ | |
| A3 | La página de inicio del curso carga en menos de 5 segundos | ☐ | |
| A4 | El menú de navegación principal (lateral o superior) es visible y funcional | ☐ | |
| A5 | Todos los botones de navegación funcionan ("Siguiente", "Anterior", "Inicio") | ☐ | |
| A6 | El desbloqueo de contenido funciona según lo especificado (libre/secuencial) | ☐ | |
| A7 | El marcador o "progreso" se guarda al cerrar y reabrir el curso | ☐ | |
| A8 | El curso es accesible desde dispositivos móviles (responsive) | ☐ | |

#### B. PRUEBAS DE CONTENIDOS (Documento de texto)

| # | Ítem a probar | Cumple (Sí/No) | Observación |
|:---|:---|:---|:---|
| B1 | El documento de texto [nombre] se abre correctamente | ☐ | |
| B2 | El formato del documento (PDF/Word) es el especificado | ☐ | |
| B3 | El contenido del documento coincide con el desarrollado en F4 | ☐ | |
| B4 | Las imágenes dentro del documento se ven correctamente | ☐ | |
| B5 | Los enlaces (si tiene) funcionan y abren en nueva pestaña | ☐ | |
| B6 | No hay errores ortográficos evidentes | ☐ | |

#### C. PRUEBAS DE CONTENIDOS (Presentación electrónica)

| # | Ítem a probar | Cumple (Sí/No) | Observación |
|:---|:---|:---|:---|
| C1 | La presentación [nombre] se abre correctamente | ☐ | |
| C2 | El formato (PDF/PPTX) es el especificado | ☐ | |
| C3 | El contenido de la presentación coincide con el desarrollado en F4 | ☐ | |
| C4 | Las imágenes/diagramas se ven correctamente | ☐ | |
| C5 | La presentación se puede descargar (si está configurado) | ☐ | |

#### D. PRUEBAS DE CONTENIDOS (Material multimedia - video)

| # | Ítem a probar | Cumple (Sí/No) | Observación |
|:---|:---|:---|:---|
| D1 | El video [nombre] se carga correctamente | ☐ | |
| D2 | El video se reproduce sin cortes ni buffering excesivo | ☐ | |
| D3 | El audio del video se escucha claramente | ☐ | |
| D4 | El video tiene subtítulos o transcripción (si aplica) | ☐ | |
| D5 | Los controles de reproducción (play, pausa, volumen) funcionan | ☐ | |
| D6 | El video es compatible con el navegador usado | ☐ | |

#### E. PRUEBAS DE ACTIVIDADES (Guía de actividades)

| # | Ítem a probar | Cumple (Sí/No) | Observación |
|:---|:---|:---|:---|
| E1 | La guía de actividades del Módulo 1 está visible | ☐ | |
| E2 | El objetivo del módulo es claro y visible | ☐ | |
| E3 | Las instrucciones de cada actividad son claras | ☐ | |
| E4 | Los materiales asociados a cada actividad están disponibles | ☐ | |
| E5 | El medio de entrega especificado (foro, tarea, etc.) está configurado | ☐ | |
| E6 | Las fechas de apertura y cierre corresponden al calendario | ☐ | |

#### F. PRUEBAS DE FOROS Y COLABORACIÓN

| # | Ítem a probar | Cumple (Sí/No) | Observación |
|:---|:---|:---|:---|
| F1 | El foro [nombre] está creado en la plataforma | ☐ | |
| F2 | El tema de discusión es el especificado | ☐ | |
| F3 | Se puede publicar un mensaje de prueba | ☐ | |
| F4 | Se puede responder a un mensaje existente | ☐ | |
| F5 | La calificación (si aplica) se puede registrar | ☐ | |

#### G. PRUEBAS DE CUESTIONARIOS Y EVALUACIONES

| # | Ítem a probar | Cumple (Sí/No) | Observación |
|:---|:---|:---|:---|
| G1 | El cuestionario [nombre] está creado en la plataforma | ☐ | |
| G2 | Las preguntas son las especificadas en F4.7 | ☐ | |
| G3 | El tiempo límite (si aplica) está configurado | ☐ | |
| G4 | Se puede responder y enviar el cuestionario | ☐ | |
| G5 | La calificación automática funciona (para opción múltiple) | ☐ | |
| G6 | El sistema guarda la calificación en el reporte del alumno | ☐ | |

#### H. PRUEBAS DE REPORTEO (Sistema de reportes)

| # | Ítem a probar | Cumple (Sí/No) | Observación |
|:---|:---|:---|:---|
| H1 | El instructor puede ver el progreso de los alumnos | ☐ | |
| H2 | El reporte muestra qué actividades están completadas | ☐ | |
| H3 | El reporte muestra las calificaciones obtenidas | ☐ | |
| H4 | El reporte se puede exportar (si aplica) | ☐ | |
| H5 | El alumno puede ver su propio progreso | ☐ | |

#### I. PRUEBAS MULTIPLATAFORMA Y MULTIDISPOSITIVO

| # | Ítem a probar | Cumple (Sí/No) | Observación |
|:---|:---|:---|:---|
| I1 | El curso funciona en Chrome (última versión) | ☐ | |
| I2 | El curso funciona en Firefox (última versión) | ☐ | |
| I3 | El curso funciona en Edge (última versión) | ☐ | |
| I4 | El curso funciona en Safari (si aplica) | ☐ | |
| I5 | El curso se ve correctamente en computadora de escritorio | ☐ | |
| I6 | El curso se ve correctamente en tablet (iPad/Android) | ☐ | |
| I7 | El curso se ve correctamente en teléfono móvil | ☐ | |

#### J. PRUEBAS DE ESTRÉS (opcional, para cursos masivos)

| # | Ítem a probar | Cumple (Sí/No) | Observación |
|:---|:---|:---|:---|
| J1 | El curso responde con [N] usuarios concurrentes simulados | ☐ | (requiere herramienta externa) |
| J2 | Los videos se reproducen sin interrupciones con carga alta | ☐ | |



### PASO 2: Generar la Plantilla de Reporte de Revisión (E1221 - producto #1)

Según el EC0366 oficial (pág. 9), el reporte debe incluir: nombre del curso, nombre del desarrollador, fecha de revisión, observaciones de diseño, unidad o tema donde se presentó la observación, propuesta de modificación, observaciones del contenido, observaciones de la funcionalidad en la plataforma.


## REPORTE DE REVISIÓN DEL FUNCIONAMIENTO DEL CURSO
**(Según EC0366 - Elemento E1221)**

**Nombre del curso:** [nombre del proyecto]
**Nombre del desarrollador:** [a llenar por el usuario]
**Fecha de revisión:** [a llenar por el usuario]
**Versión del curso:** [a llenar por el usuario]
**Plataforma LMS utilizada:** [de F3]

---

### INSTRUCCIONES DE LLENADO

1. Realice las pruebas funcionales siguiendo la Checklist de la Fase 5.
2. Por cada ítem que NO cumpla, registre una observación en la tabla correspondiente.
3. Para cada observación, proponga una modificación concreta.
4. Al final, priorice las observaciones por gravedad (crítica, mayor, menor).

---

### TABLA DE OBSERVACIONES

| # | Tipo de observación | Unidad/Tema | Descripción de la observación | Propuesta de modificación | Prioridad (Crítica/Mayor/Menor) |
|:---|:---|:---|:---|:---|:---|
| 1 | ☐ Diseño ☐ Contenido ☐ Funcionalidad | | | | |
| 2 | ☐ Diseño ☐ Contenido ☐ Funcionalidad | | | | |
| 3 | ☐ Diseño ☐ Contenido ☐ Funcionalidad | | | | |
| ... | ... | ... | ... | ... | ... |

---

### RESUMEN DE OBSERVACIONES POR TIPO

| Tipo | Cantidad | Prioridad Crítica | Prioridad Mayor | Prioridad Menor |
|:---|:---|:---|:---|:---|
| Diseño | [N] | [N] | [N] | [N] |
| Contenido | [N] | [N] | [N] | [N] |
| Funcionalidad | [N] | [N] | [N] | [N] |
| **TOTAL** | **[N]** | **[N]** | **[N]** | **[N]** |

---

### VALIDACIÓN FINAL

¿El curso está listo para ser implementado con participantes reales?

- [ ] Sí, todas las observaciones críticas y mayores han sido corregidas.
- [ ] No, porque [justificación].

---

### FIRMAS

| Nombre | Rol | Firma |
|:---|:---|:---|
| [nombre] | Desarrollador | [digital o manuscrita] |
| [nombre] | Revisor (opcional) | [digital o manuscrita] |



### PASO 3: Generar un Ejemplo de Reporte de Revisión (simulado)

La IA debe generar un **ejemplo de reporte lleno** con problemas ficticios pero realistas, para que el usuario entienda cómo usarlo.


## EJEMPLO DE REPORTE DE REVISIÓN LLENO (SIMULADO)

**Nombre del curso:** "Ventas Consultivas para Agentes de Call Center"
**Nombre del desarrollador:** Juan Pérez
**Fecha de revisión:** 15 de marzo de 2025
**Plataforma LMS utilizada:** TalentLMS

---

### TABLA DE OBSERVACIONES (EJEMPLO)

| # | Tipo | Unidad/Tema | Descripción | Propuesta de modificación | Prioridad |
|:---|:---|:---|:---|:---|:---|
| 1 | Funcionalidad | Módulo 1, Actividad 1.2 | El video tutorial no se reproduce en dispositivos móviles (error "formato no soportado") | Convertir el video a MP4 H.264 y volver a subir | Crítica |
| 2 | Contenido | Módulo 2, Documento de texto | El documento "Técnicas de manejo de objeciones" tiene un error en la página 3: el paso 2 está duplicado | Corregir el texto eliminando la línea duplicada y subir nueva versión | Mayor |
| 3 | Diseño | Navegación general | El botón "Siguiente" no está visible en la parte inferior de las páginas largas, obligando a scroll hacia arriba | Agregar un botón flotante "Siguiente" en la parte inferior derecha | Mayor |
| 4 | Funcionalidad | Módulo 3, Quiz | El quiz no guarda las respuestas si el alumno cierra el navegador a la mitad | Configurar "guardado automático" en la configuración del quiz (si el LMS lo permite) o agregar advertencia | Menor |
| 5 | Contenido | Módulo 1, Introducción | La introducción menciona un caso de estudio que no está incluido en los materiales | Eliminar la referencia al caso de estudio o agregar el documento correspondiente | Mayor |

---

### RESUMEN DE OBSERVACIONES

| Tipo | Cantidad | Crítica | Mayor | Menor |
|:---|:---|:---|:---|:---|
| Diseño | 1 | 0 | 1 | 0 |
| Contenido | 2 | 0 | 2 | 0 |
| Funcionalidad | 2 | 1 | 0 | 1 |
| **TOTAL** | **5** | **1** | **3** | **1** |

---

### VALIDACIÓN FINAL

¿El curso está listo para ser implementado con participantes reales?

- [ ] Sí, todas las observaciones críticas y mayores han sido corregidas.
- [x] **No, porque** hay 1 observación crítica (video no funciona en móviles) y 3 mayores que deben corregirse antes del lanzamiento.



---

## FORMATO DE SALIDA OBLIGATORIO (F5)


# PRODUCTOS DE EVALUACIÓN EC0366 (E1221)
**Proyecto:** [nombre del proyecto]
**Fecha de generación:** [fecha actual]

---

## PRODUCTO 1: LISTA DE VERIFICACIÓN PARA PRUEBAS FUNCIONALES

[Aquí va la checklist completa con los ítems A.1 a J.2]

---

## PRODUCTO 2: PLANTILLA DE REPORTE DE REVISIÓN (en blanco)

[Aquí va la plantilla para que el usuario la llene]

---

## PRODUCTO 3: EJEMPLO DE REPORTE DE REVISIÓN (simulado)

[Aquí va el ejemplo con problemas ficticios]

---

## INSTRUCCIONES PARA EL USUARIO

1. Sube todos los materiales generados en F4 a tu plataforma LMS.
2. Configura las actividades (foros, quizzes, tareas) según las guías de F4.2.
3. Obtén cuentas de prueba: al menos una como administrador, una como instructor y una como alumno.
4. Sigue la Checklist ítem por ítem, probando cada funcionalidad.
5. Por cada ítem que no cumpla, registra una observación en la Plantilla de Reporte.
6. Propón una modificación para cada observación.
7. Corrige las observaciones críticas y mayores antes de implementar el curso con alumnos reales.
8. Cuando todas las observaciones críticas y mayores estén resueltas, el curso está listo.



## INSTRUCCIONES DE CALIDAD

1. **No inventes ítems en la checklist.** Todos los ítems deben estar justificados por el EC0366 o por buenas prácticas documentadas.

2. **El ejemplo de reporte debe ser realista.** Usa problemas comunes en cursos en línea (formatos de video incompatibles, enlaces rotos, navegación confusa, etc.).

3. **La priorización (crítica/mayor/menor) debe tener sentido:**
   - **Crítica:** Impide completamente el uso del curso (ej. video no carga, enlace roto a contenido obligatorio).
   - **Mayor:** Afecta la experiencia pero hay un workaround (ej. error ortográfico en instrucción, botón poco visible).
   - **Menor:** Mejorable pero no afecta el aprendizaje (ej. color de fuente, sugerencia de mejora).

4. **No avances a F6** hasta que el usuario confirme que realizó las pruebas y llenó el reporte.


