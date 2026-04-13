
# DOCUMENTO 3: DIAGRAMA DE FASES - VERSIÓN CORREGIDA


# DIAGRAMA DE FASES COMPLETO CON ENTRADAS Y SALIDAS (VERSIÓN FINAL)

## DIAGRAMA DE FLUJO DE FASES


┌──────────────────────────────────────────────────────────────────────────────────────┐
│                              FASE 0: IDENTIFICACIÓN DEL CLIENTE                      │
│                                                                                      │
│  ENTRADA: Datos básicos del cliente (Documento 4)                                    │
│                                                                                      │
│  PROCESO IA:                                                                         │
│  1. Investigación externa profunda sobre sector, mejores prácticas, competencia      │
│  2. Análisis del perfil del cliente en ese contexto                                  │
│  3. Identificación de gaps y generación de preguntas específicas                     │
│                                                                                      │
│  SALIDA: Marco de referencia del cliente + preguntas específicas                     │
└──────────────────────────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                           FASE 1: IDENTIFICACIÓN DE NECESIDADES                      │
│                                                                                      │
│  ENTRADA: Marco de referencia (F0) + respuestas del cliente                          │
│                                                                                      │
│  PROCESO IA:                                                                         │
│  1. Personaliza entrevista según contexto                                            │
│  2. Cruza información con marco de referencia                                        │
│  3. Identifica brechas (conocimiento, habilidad, actitud)                            │
│                                                                                      │
│  SALIDA: Informe de necesidades validado                                             │
└──────────────────────────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                           FASE 2: ANÁLISIS Y ALCANCE                                 │
│                                                                                      │
│  ENTRADA: Informe de necesidades (F1) + Marco de referencia (F0)                     │
│                                                                                      │
│  PROCESO IA:                                                                         │
│  1. Define modalidad, interactividad, estructura temática                            │
│  2. Define PERFIL DE INGRESO (escolaridad, conocimientos, habilidades digitales)     │
│                                                                                      │
│  SALIDA: Especificaciones de análisis                                                │
└──────────────────────────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                           FASE 3: ESPECIFICACIÓN                                     │
│                                                                                      │
│  ENTRADA: Especificaciones de análisis (F2) + Marco de referencia (F0)               │
│                                                                                      │
│  PROCESO IA:                                                                         │
│  1. Recomienda plataforma LMS                                                        │
│  2. Define reporteo, formatos multimedia, navegación                                 │
│  3. CALCULA DURACIÓN (basado en actividades y frecuencia de reporteo)                │
│                                                                                      │
│  SALIDA: Especificaciones técnicas + Duración calculada                              │
└──────────────────────────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                           FASE 4: PRODUCCIÓN (UNIFICADA)                             │
│                                                                                      │
│  ENTRADA: F0, F1, F2, F3 (todas las anteriores)                                      │
│                                                                                      │
│  PROCESO IA: UN SOLO PROMPT QUE GENERA 8 PRODUCTOS:                                  │
│                                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────────────┐  │
│  │ PRODUCTO 0: Cronograma de desarrollo (E1219 - #1)                              │  │
│  │ PRODUCTO 1: Documento de información general (E1219 - #2)                      │  │
│  │ PRODUCTO 2: Guías de actividades por módulo (E1220 - #1)                       │  │
│  │ PRODUCTO 3: Calendario general de actividades (E1220 - #2)                     │  │
│  │ PRODUCTO 4: Documentos de texto (E1220 - #3) - mínimo 5 páginas                │  │
│  │ PRODUCTO 5: Presentación electrónica (E1220 - #4)                              │  │
│  │ PRODUCTO 6: Material multimedia - guión de video (E1220 - #5)                  │  │
│  │ PRODUCTO 7: Instrumentos de evaluación (E1220 - #6) - cuestionario+rúbrica+    │  │
│  │            lista de cotejo OBLIGATORIOS                                        │  │
│  └────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                      │
│  SALIDA: 8 productos de producción (E1219 + E1220 completos)                         │
└──────────────────────────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                      ACCIÓN MANUAL DEL USUARIO (entre F4 y F5)                       │
│                                                                                      │
│  1. Subir todos los materiales a la plataforma LMS                                   │
│  2. Configurar actividades, foros, quizzes                                           │
│  3. Obtener cuentas de prueba (admin, instructor, alumno)                            │
└──────────────────────────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                           FASE 5.1: VERIFICACIÓN                                     │
│                                                                                      │
│  ENTRADA: Productos de F4 + Curso configurado en LMS                                 │
│                                                                                      │
│  PROCESO IA: Genera checklist de pruebas, plantilla de reporte, ejemplo              │
│                                                                                      │
│  SALIDA: Reporte de revisión (plantilla + ejemplo)                                   │
└──────────────────────────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                           FASE 5.2: EVIDENCIAS                                       │
│                                                                                      │
│  ENTRADA: Reporte de revisión (F5.1) + LMS real                                      │
│                                                                                      │
│  PROCESO IA: Genera anexo con lista de capturas obligatorias                         │
│                                                                                      │
│  SALIDA: Anexo de evidencias (plantilla para capturas)                               │
└──────────────────────────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                      ACCIÓN MANUAL DEL USUARIO (entre F5.2 y F6.1)                   │
│                                                                                      │
│  1. Realizar pruebas funcionales usando checklist de F5.1                            │
│  2. Tomar capturas de pantalla listadas en F5.2                                      │
│  3. Llenar reporte de revisión con observaciones reales                              │
│  4. Corregir observaciones críticas y mayores                                        │
└──────────────────────────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                           FASE 6.1: AJUSTES                                          │
│                                                                                      │
│  ENTRADA: Reporte de revisión lleno (usuario)                                        │
│                                                                                      │
│  PROCESO IA: Documenta cada acción correctiva                                        │
│                                                                                      │
│  SALIDA: Documento de ajustes implementados                                          │
└──────────────────────────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                           FASE 6.2: FIRMAS                                           │
│                                                                                      │
│  ENTRADA: Todos los productos de F4 + F5.1 + F6.1                                    │
│                                                                                      │
│  PROCESO IA: Genera formato de firmas para todos los productos requeridos            │
│                                                                                      │
│  SALIDA: Lista de verificación de firmas                                             │
└──────────────────────────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
                    ┌───────────────────────────────────────┐
                    │   CURSO COMPLETO PARA CERTIFICACIÓN   │
                    │   EC0366                              │
                    └───────────────────────────────────────┘


---

## TABLA DE FASES CON ENTRADAS, SALIDAS Y PRODUCTOS

| Fase | Nombre | Entradas | Proceso IA | Salidas | Productos EC0366 |
|:---|:---|:---|:---|:---|:---|
| **F0** | Identificación del Cliente | Datos básicos del usuario | Investigación externa | Marco de referencia | Prerrequisito |
| **F1** | Identificación de Necesidades | F0 + respuestas | Análisis de brecha | Informe de necesidades | Prerrequisito |
| **F2** | Análisis y Alcance | F0 + F1 | Definir modalidad, perfil | Especificaciones de análisis | Prerrequisito |
| **F3** | Especificación | F0 + F1 + F2 | LMS, reporteo, duración | Especificaciones técnicas | Prerrequisito |
| **F4** | Producción (UNIFICADA) | F0 + F1 + F2 + F3 | Generar 8 productos | Prod 0 al 7 | E1219 (#1 y #2) + E1220 (#1 al #6) |
| **F5.1** | Verificación | F4 + LMS | Checklist, plantilla, ejemplo | Reporte de revisión | E1221 (#1) |
| **F5.2** | Evidencias | F5.1 + LMS | Anexo de capturas | Lista de capturas | E1221 (desempeños) |
| **F6.1** | Ajustes | Reporte lleno (usuario) | Documentar correcciones | Documento de ajustes | Cierre de ciclo |
| **F6.2** | Firmas | Todos los productos | Formato de firmas | Lista de firmas | Transversal |

---

## RELACIÓN DE PRODUCTOS POR FASE (PARA EL APLICATIVO)

| Fase | Producto generado | ¿Quién lo genera? | ¿Qué hace el usuario? |
|:---|:---|:---|:---|
| F0 | Marco de referencia | IA | Responde preguntas |
| F1 | Informe de necesidades | IA | Confirma o corrige |
| F2 | Especificaciones de análisis | IA | Confirma o corrige |
| F3 | Especificaciones técnicas | IA | Confirma o corrige |
| F4 | 8 productos (Prod 0-7) | IA | Confirma o corrige |
| - | Subir a LMS | USUARIO | Acción manual |
| F5.1 | Checklist + plantilla + ejemplo | IA | Usa para probar |
| F5.2 | Anexo de capturas | IA | Toma las fotos |
| - | Probar y llenar reporte | USUARIO | Acción manual |
| F6.1 | Documento de ajustes | IA | Confirma correcciones |
| F6.2 | Lista de firmas | IA | Firma los documentos |


---

# DOCUMENTO 4: FORMATO DE ENTRADA DEL CLIENTE (NUEVO)


# FORMATO DE ENTRADA DEL CLIENTE PARA EC0366

## PROPÓSITO

Este documento es el **insumo principal** del aplicativo. El usuario debe llenarlo con la información de su proyecto antes de comenzar a usar los prompts. La IA tomará estos datos como entrada para la Fase 0 (Marco de referencia).

---

## INSTRUCCIONES PARA EL USUARIO

1. **Completa todos los campos** que puedas. Si no sabes algo, escribe "no definido".
2. **Sé específico** en las respuestas. Cuanto más detalle, mejor será la investigación de la IA.
3. **Este documento se arrastra** como referencia en todas las fases del proceso.
4. **Guarda este archivo** como `DATOS_CLIENTE_[nombre_proyecto].md`

---

## FORMATO PARA LLENAR


# DATOS BÁSICOS DEL CLIENTE
**Fecha de captura:** [DD/MM/AAAA]
**Versión:** 1.0

---

## 1. IDENTIFICACIÓN DEL PROYECTO

| Campo | Respuesta |
|:---|:---|
| Nombre o alias del proyecto | [ej. "Curso IA - Alberto"] |
| Tipo de cliente | [empresa / individuo / institución / emprendedor] |
| Industria o sector específico | [ej. "tecnología educativa", "telecomunicaciones", "salud"] |
| Tamaño (si es empresa) | [micro / pequeña / mediana / grande / no aplica] |

---

## 2. EXPERIENCIA PREVIA DEL CLIENTE

| Campo | Respuesta |
|:---|:---|
| ¿Has desarrollado cursos en línea antes? | [sí / no] |
| Si sí, ¿cuál fue tu experiencia? | [texto libre] |
| ¿Qué equipo o herramientas usas actualmente? | [ej. "Hotmart", "Zoom", "Canva", "ninguna"] |
| ¿Tienes experiencia docente? | [sí / no / parcial] |

---

## 3. IDEA INICIAL DEL CURSO

| Campo | Respuesta |
|:---|:---|
| Tema o materia principal | [texto libre - ej. "Desarrollo web con IA"] |
| Nivel deseado | [básico / intermedio / avanzado / no definido] |
| Nombre tentativo del curso | [texto libre - ej. "De Cero a Cloud"] |
| ¿Hay algún estándar EC relacionado? | [si conoces, ej. "EC0909"; si no, "no sé"] |

---

## 4. AUDIENCIA OBJETIVO (según el cliente)

| Campo | Respuesta |
|:---|:---|
| ¿Para quién es este curso? | [ej. "desarrolladores junior", "emprendedores", "estudiantes"] |
| ¿Qué perfil tiene el alumno ideal? | [ej. "lógica de programación básica", "conocimiento de HTML"] |
| ¿Cuántos alumnos esperas? | [ej. "100 en el primer mes", "no definido"] |

---

## 5. RESULTADO ESPERADO

| Campo | Respuesta |
|:---|:---|
| ¿Qué debe lograr el alumno al terminar? | [ej. "desplegar una app en la nube"] |
| ¿Cómo se medirá el éxito? | [ej. "URL pública funcionando", "certificación", "evaluación"] |
| ¿Hay un problema específico que quieras resolver? | [ej. "la gente no sabe usar IA para programar"] |

---

## 6. RECURSOS DISPONIBLES

| Campo | Respuesta |
|:---|:---|
| Presupuesto estimado para el desarrollo | [ej. "$5,000 MXN", "no definido", "gratuito"] |
| Plazo deseado para tener el curso listo | [ej. "3 meses", "antes de junio", "no definido"] |
| Materiales existentes | [ej. "tengo 5 videos", "tengo un libro", "ninguno"] |
| Equipo humano disponible | [ej. "solo yo", "yo + un diseñador", "un社区"] |

---

## 7. RESTRICCIONES CONOCIDAS

| Campo | Respuesta |
|:---|:---|
| Restricciones técnicas | [ej. "los alumnos usan celular", "internet lenta"] |
| Restricciones legales | [ej. "debe ser accesible", "sin derechos de autor"] |
| Otras restricciones | [ej. "debe ser gratuito", "debe incluir certificado"] |

---

## 8. EJEMPLO REAL (CASO ALBERTO MARTÍNEZ)

A continuación, un ejemplo de cómo se ve este formato llenado para un proyecto real:


# DATOS BÁSICOS DEL CLIENTE
**Fecha de captura:** 02/04/2026
**Versión:** 1.0

## 1. IDENTIFICACIÓN DEL PROYECTO
- Nombre: "Curso IA - Alberto Martínez"
- Tipo: individuo / emprendedor
- Industria: tecnología educativa / desarrollo de software
- Tamaño: no aplica

## 2. EXPERIENCIA PREVIA
- ¿Cursos antes?: No
- Experiencia: Ninguna en diseño instruccional, pero sí en programación
- Herramientas: Hotmart, Cursor, GitHub
- Experiencia docente: Parcial (he dado mentorías)

## 3. IDEA INICIAL
- Tema: Desarrollo y despliegue de aplicaciones usando IA
- Nivel: Básico - intermedio
- Nombre tentativo: "De Cero a Cloud"
- Estándar EC relacionado: No sé

## 4. AUDIENCIA
- ¿Para quién?: Desarrolladores junior, programadores autodidactas
- Perfil ideal: Lógica de programación básica, bachillerato
- Alumnos esperados: 50 en primer mes

## 5. RESULTADO ESPERADO
- Logro: Desplegar una app web funcional en la nube
- Medición: URL pública funcionando + repositorio en GitHub
- Problema a resolver: La gente no sabe usar IA para programar y desplegar

## 6. RECURSOS
- Presupuesto: $0 (uso de herramientas gratuitas)
- Plazo: 1 mes
- Materiales: Ninguno
- Equipo: Solo yo

## 7. RESTRICCIONES
- Técnicas: Alumnos con equipos básicos (8GB RAM)
- Legales: Uso de licencias Creative Commons
- Otras: El curso debe ser asincrónico


---

## VALIDACIÓN DEL FORMATO

Antes de comenzar F0, verifica que:

- [ ] Todos los campos están completos (o marcados como "no definido")
- [ ] El nombre del proyecto es único y fácil de recordar
- [ ] La industria o sector está claramente especificado
- [ ] El tema del curso es concreto (no "programación" sino "desarrollo web con IA")

**Este documento es el PUNTO DE PARTIDA. Sin él, el aplicativo no puede funcionar.**


---

## RESUMEN DE CAMBIOS REALIZADOS

| Documento | Cambios realizados |
|:---|:---|
| **1 EXTRACCIÓN DE LA METODOLOGÍA** | ✅ Agregada checklist de 16 productos al final |
| **2 BATERÍA DE PROMPTS** | ✅ Diagrama actualizado a versión unificada (F4 único, F5.2, F6.2) |
| **3 DIAGRAMA DE FASES** | ✅ Reescribí todo el diagrama con fases finales. Agregué tabla de productos por fase |
| **4 FORMATO DE ENTRADA** | ✅ Creado como documento separado. Incluye instrucciones y ejemplo real |
