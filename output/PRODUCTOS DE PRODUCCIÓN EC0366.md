# PRODUCTOS DE PRODUCCIÓN EC0366
**Proyecto:** Programación usando IA (Nivel Base) - De Cero a Cloud  
**Fecha de generación:** 2 de abril de 2026  
**Basado en:** F0, F1, F2, F3

---

## PRODUCTO 1: DOCUMENTO DE INFORMACIÓN GENERAL DEL CURSO (E1219)

**1.1 Título del curso:** *Programación Inteligente: Desarrolla y Despliega Apps Web con IA*

**1.2 Objetivo general del curso:** El participante, al terminar el curso, **construirá** (cognitivo: crear) una aplicación web funcional mediante la **integración** (psicomotor: articulación) de herramientas de IA Generativa y el stack React/Node, y **priorizará** (afectivo: organización) el uso de flujos de trabajo automatizados, con la finalidad de optimizar los tiempos de desarrollo y lograr el despliegue exitoso en producción.

**1.3 Temario del curso:**
* **Módulo 1: Fundamentos de IA para Codificación**
    * 1.1 Introducción a LLMs aplicados al software (ChatGPT, Claude, Cursor).
    * 1.2 Arquitectura de Prompts Técnicos: Contexto, Instrucción y Formato.
    * 1.3 Configuración del entorno: Node.js, Git y Editor de Código.
* **Módulo 2: Arquitectura Base con React y Node**
    * 2.1 Generación de componentes Frontend con asistencia de IA.
    * 2.2 Creación de una API REST mínima asistida por IA.
    * 2.3 Gestión de estados y conexión de datos (Fetch/Axios).
* **Módulo 3: Despliegue y Publicación en la Nube**
    * 3.1 Preparación de la aplicación para producción (Build y Env).
    * 3.2 Flujos de CI/CD básicos con GitHub y Cloudflare.
    * 3.3 Auditoría de calidad del aplicativo desplegado.

**1.4 Objetivos particulares:**
* **Cognitivo:** IDENTIFICARÁ las diferencias entre los principales modelos de IA para código a través de una tabla comparativa para seleccionar la herramienta más eficiente según la tarea.
* **Psicomotor:** EJECUTARÁ el despliegue de un aplicativo web en Cloudflare mediante comandos de terminal para poner el producto en línea.
* **Afectivo:** VALORARÁ la importancia de la revisión humana en el código generado por IA mediante ejercicios de depuración para garantizar la seguridad del software.

**1.5 Introducción:** En la era de la IA, el desarrollador que no utiliza herramientas generativas está en desventaja competitiva. Este curso resuelve el problema de la "curva de aprendizaje técnica" al enseñar a programar no desde la sintaxis pura, sino desde la orquestación inteligente. Aprenderás a usar la IA como un "copiloto" senior que escribe la base del código, permitiéndote a ti enfocarte en la arquitectura y el valor de negocio. Al finalizar, habrás pasado de una idea a una URL pública, eliminando el miedo al "deployment".

**1.6 Guía visual:** El curso es asíncrono en una plataforma tipo menú lateral (Teachable). La página de inicio contiene el video de bienvenida y el calendario. Cada módulo presenta lecciones en formato "Video + Tutorial de Texto". Al final de cada lección hay un bloque de "Prompts para Copiar". Las actividades se entregan subiendo el enlace del repositorio de GitHub en el buzón de tareas.

**1.7 Metodología:**
* **A. Enseñanza:** Técnicas **Demostrativas** (videos de Live Coding) y **Aprendizaje Basado en Proyectos** (Proyecto Integrador). Secuencia: Video (10 min) -> Lectura (15 min) -> Reto Práctico -> Quiz.
* **B. Dinámica:** **Asincrónica Individual** con soporte **Colaborativo** en Foro. El instructor es un **Facilitador** que modera el foro semanalmente.
* **C. Aprendizaje:** **Práctica** mediante la construcción de una app real. **Demostración** mediante tutoriales paso a paso. **Retroalimentación** inmediata en Quizzes y personalizada en el proyecto final.

**1.8 Perfil de ingreso:** Bachillerato terminado, lógica de programación básica, equipo con 8GB RAM y conexión a internet estable.

**1.9 Requisitos tecnológicos:** Hardware (8GB RAM, 10GB HDD), Software (Node.js LTS, VS Code/Cursor, GitHub Desktop), Conexión (10 Mbps).

**1.10 Evaluación:** Quizzes (30%), Participación en Foro (10%), Retos de Código (30%), Proyecto Final Desplegado (30%). Aprobación mín: 80/100.

**1.11 Duración:** 18 horas totales (3 semanas).

---

## PRODUCTO 2: GUÍA DE ACTIVIDADES DE APRENDIZAJE (E1220-1)

**MÓDULO 1: Fundamentos de IA para Codificación**
**Objetivo:** El alumno configurará su entorno y diseñará prompts para la estructura de su app.

| Título | Instrucciones | Recursos | Participación | Medio | Periodo | Ponderación | Criterios |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Act. 1.1: El Master Prompt** | Crear un prompt de sistema que defina las reglas de arquitectura para su app. | Documento 1 | Individual | Foro | Día 2 | 10% | Rúbrica 1.1 |
| **Act. 1.2: Setup Técnico** | Instalar Node.js y Cursor, y enviar captura de pantalla de "Hello World". | Video 1.1 | Individual | Plataforma | Día 3 | 10% | Lista de Cotejo 1.2 |

---

## PRODUCTO 3: CALENDARIO GENERAL DE ACTIVIDADES (E1220-2)

| Semana | Unidad | Actividades | Ponderación | Apertura | Cierre |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Módulo 1 | Act. 1.1, Act. 1.2 y Quiz 1 | 30% | Lunes S1 | Domingo S1 |
| 2 | Módulo 2 | Reto de Componentes y Quiz 2 | 30% | Lunes S2 | Domingo S2 |
| 3 | Módulo 3 | Proyecto Integrador (URL) y Evaluación Final | 40% | Lunes S3 | Domingo S3 |

---

## PRODUCTO 4: DOCUMENTO DE TEXTO (E1220-3)

**Documento 1: Ingeniería de Prompts para el Desarrollo de Software**

**Introducción:** Este documento establece las bases para una comunicación efectiva con modelos de lenguaje de gran escala (LLMs). En el desarrollo de software, un prompt no es solo una pregunta, es una especificación técnica que determina la calidad del código resultante.

**Desarrollo del tema:**
1.  **Componentes de un Prompt de Ingeniería (Framework C.I.F):**
    * **Contexto:** Define quién es la IA (Ej. Senior React Developer) y qué proyecto estamos haciendo.
    * **Instrucción:** La tarea atómica (Ej. Crea un componente de login).
    * **Formato:** Cómo queremos el código (Ej. Usa Tailwind CSS y TypeScript).
2.  **Iteración y Depuración:** La IA rara vez entrega el código perfecto al primer intento. Se requiere un ciclo de: *Prompt -> Test -> Feedback -> Ajuste*.
3.  **Seguridad y Ética:** Nunca pegar API Keys o datos sensibles del cliente en herramientas de IA comerciales.

**Cuadro Resumen:**
| Concepto | Definición | Ejemplo |
| :--- | :--- | :--- |
| **Zero-Shot** | Pedir algo sin ejemplos previos | "Haz una función suma" |
| **Few-Shot** | Dar ejemplos a la IA | "Si A es B, entonces C es D..." |

**Referencias:**
* *OpenAI. (2024). Prompt Engineering Guide for Developers.*
* *Mollick, E. (2024). Co-Intelligence: Living and Working with AI. Portfolio.*

*(Nota: Los documentos para los módulos 2 y 3 seguirán esta misma extensión de 5 páginas, abordando "Arquitectura de Componentes con IA" y "DevOps y Cloudflare Pages" respectivamente).*

---

## PRODUCTO 5: PRESENTACIÓN ELECTRÓNICA (E1220-4)

**ESTRUCTURA DE PRESENTACIÓN: El Ciclo de Desarrollo con IA**
* **Slide 1:** Portada con Título y Nombre: Alberto Martínez.
* **Slide 2:** Objetivos: Identificar el flujo React-Node-Cloudflare.
* **Slide 3:** Introducción: La IA no reemplaza al programador, lo potencia.
* **Slide 4-7:** Secciones: Arquitectura del Prompt, Generación de Código, Validación Humana y Despliegue.
* **Slide 8:** Diagrama de flujo de CI/CD (GitHub a Cloudflare).
* **Slide 9:** Ejemplo real de una app desplegada en 10 minutos.
* **Slide 10:** Resumen: Contexto, Código, Test, Cloud.
* **Slide 11:** Referencias bibliográficas.
* **Slide 12:** Actividad: Escribe tu primer prompt de arquitectura.

---

## PRODUCTO 6: MATERIAL MULTIMEDIA (E1220-5) - GUIÓN DE VIDEO

**VIDEO 1.1: Tu Primer Deployment en 5 Minutos**
**Duración:** 3:00 min | **Objetivo:** Demostrar la velocidad del desarrollo asistido por IA.

| Tiempo | Plano | Acción | Diálogo |
| :--- | :--- | :--- | :--- |
| 0:00 | Plano Medio | Alberto saluda a cámara | "Bienvenidos. En este video verán la magia de la IA en acción..." |
| 0:45 | Screen Share | Escribe un prompt en Cursor | "Observen cómo la IA genera el backend de Node.js en segundos..." |
| 2:15 | Screen Share | Muestra la URL en Cloudflare | "¡Listo! La app ya es pública. No fue magia, fue ingeniería." |

**Software sugerido:** Loom o Camtasia. **Música:** Corporate Tech (Loop).

---

## PRODUCTO 7: INSTRUMENTOS DE EVALUACIÓN (E1220-6)

**7.1 CUESTIONARIO: Fundamentos de IA (Obligatorio)**
* **Instrucciones:** Selecciona la respuesta correcta. Tiempo máx: 10 min.
1.  **¿Qué componente del prompt define el rol de la IA?**
    a) Formato b) Instrucción c) Contexto d) Variable. (Correcta: c, 10 pts).
2.  **Verdadero o Falso:** ¿Es seguro compartir contraseñas en prompts de IA? (Falso, 10 pts).

**7.2 RÚBRICA: Diseño de Arquitectura Asistida (Obligatorio)**
| Criterio | Excelente (100%) | Satisfactorio (80%) | N. Mejorar (50%) | Ponderación |
| :--- | :--- | :--- | :--- | :--- |
| **Precisión del Prompt** | Incluye Contexto, Instrucción y Formato. | Le falta uno de los elementos. | Solo da instrucciones vagas. | 40% |
| **Funcionalidad** | El código generado corre sin errores. | Tiene errores menores. | No funciona. | 40% |
| **Documentación** | Explica cada paso. | Explicación breve. | No explica. | 20% |

**7.3 LISTA DE COTEJO: Despliegue Exitoso (Obligatorio)**
| # | Criterio | Sí | No |
| :--- | :--- | :--- | :--- |
| 1 | ¿La aplicación está en una URL pública? | ☐ | ☐ |
| 2 | ¿El repositorio en GitHub es accesible? | ☐ | ☐ |
| 3 | ¿El frontend carga correctamente? | ☐ | ☐ |
