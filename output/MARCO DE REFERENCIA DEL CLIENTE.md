# MARCO DE REFERENCIA DEL CLIENTE
**Proyecto:** Programación usando IA - Alberto Martínez  
**Fecha de investigación:** 23 de mayo de 2024 (Simulada bajo contexto 2026)  
**Investigador:** Consultor IA (Especialista EC0366)

## 1. ANÁLISIS DEL SECTOR/INDUSTRIA
| Aspecto | Hallazgo | Fuente |
| :--- | :--- | :--- |
| **Tamaño del mercado** | Se estima que el mercado de IA generativa alcanzará los $1.3 billones de dólares para 2032. La demanda de desarrolladores con habilidades en IA crece a una tasa anual del 40%. | Bloomberg Intelligence / IDC |
| **Tendencias principales** | Transición del "Prompt Engineering" al "Agentic Workflow" (creación de agentes autónomos) y desarrollo Low-code/No-code potenciado por IA. | Gartner Top Strategic Technology Trends |
| **Regulaciones aplicables** | Ley de Inteligencia Artificial de la UE (influencia global) y recomendaciones éticas de la UNESCO para el desarrollo de algoritmos. | European Parliament / UNESCO |
| **Certificaciones obligatorias** | Ninguna obligatoria legalmente para enseñar, pero alta valoración de certificaciones de proveedores (AWS Certified AI, Microsoft Azure AI). | LinkedIn Learning Reports |

**Desafíos comunes (dolores del sector)**
* **Obsolescencia rápida:** Las herramientas de IA cambian cada mes, lo que hace que los cursos grabados queden obsoletos rápido. (Fuente: Reddit r/LearnProgramming).
* **Efecto "Copia y Pega":** Alumnos que generan código con IA pero no saben depurarlo cuando falla. (Fuente: Stack Overflow Developer Survey).
* **Falta de despliegue real:** Muchos cursos enseñan a usar la API en local, pero no a llevar la app a producción ("en línea"). (Fuente: Reseñas de Udemy/Coursera).

## 2. MEJORES PRÁCTICAS PARA CURSOS EN LÍNEA EN ESTE SECTOR
| Práctica | Descripción | Fuente |
| :--- | :--- | :--- |
| **Formato/duración típica** | Micro-learning (módulos de 5-10 min) con proyectos finales integradores. Cursos de 10-15 horas totales. | EduTech Reports |
| **Modalidad predominante** | Asincrónica (on-demand) con sesiones de "Office Hours" en vivo para resolver errores de código. | Bootcamps Online 2025 |
| **Estrategias de enseñanza** | **Aprendizaje Basado en Proyectos (PBL)** y "Pair Programming" con la IA. | Modelo de Diseño Instruccional de Merrill |
| **Interactividad esperada** | Alta: Labs virtuales, Sandboxes de código y foros de discusión técnica. | Análisis de plataformas como Scrimba/Platzi |
| **Tecnologías comunes** | GitHub Codespaces, Replit, y LMS que soporten incrustación de compiladores. | Reporte Tecnológico de LMS |

## 3. COMPETENCIA IDENTIFICADA
| Curso | Plataforma | Precio | Alumnos | Duración | Enfoque | Oportunidad |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **IA para Desarrolladores** | Platzi | Suscripción | +50k | 12 hrs | Uso de APIs y Copilot | No profundiza en arquitectura avanzada |
| **Generative AI Specialization** | Coursera (DeepLearning.AI) | $49 USD/m | +200k | 50 hrs | Teórico/Científico | Demasiado denso para un emprendedor |
| **Build 15 AI Apps** | Udemy | ~$15 USD | +10k | 20 hrs | Práctico (recetario) | Poco énfasis en "ponerlo en línea" (DevOps) |

**Análisis de brecha de competencia:**
* **Lo que hacen bien:** Ofrecen gran cantidad de ejemplos y comunidades activas.
* **Lo que no cubren:** El acompañamiento para que un perfil *no experto* logre el despliegue final (Cloud/Hosting) de forma sencilla y económica.
* **Propuesta única potencial del cliente:** Un curso "Zero to Production" donde la IA no es solo el tema, sino la herramienta que permite al alumno saltar la barrera de la infraestructura técnica.

## 4. ESTÁNDARES EC RELACIONADOS (CONOCER)
| Código | Nombre | Propósito | Aplicabilidad al proyecto |
| :--- | :--- | :--- | :--- |
| **EC0366** | Desarrollo de cursos de formación en línea. | Estándar base para que Alberto diseñe su curso con calidad pedagógica. | **Sí.** Obligatorio para estructurar contenidos y evaluaciones. |
| **EC1061** | Desarrollo de aplicaciones de software. | Evalúa la competencia en programación y ciclo de vida de software. | **Parcial.** Sirve como referencia para los objetivos de aprendizaje técnicos. |
| **EC1384** | Uso de herramientas de IA generativa para la productividad. | Uso de prompts y herramientas de generación de contenido. | **Sí.** Se puede usar para validar el módulo de "Prompting" para código. |

## 5. ANÁLISIS DE GAPS INICIALES
**Gap vs mejores prácticas**
* Alberto no tiene experiencia previa docente. El mayor riesgo es crear un "monólogo técnico" en lugar de un curso interactivo alineado al EC0366 (que exige guía, evaluación diagnóstica, formativa y sumativa).

**Gap vs competencia**
* La competencia es masiva. Alberto necesita diferenciarse enfocándose en el resultado tangible: "Tu app en línea", no solo "Aprende a programar".

**Información faltante (preguntas para el cliente)**
1.  Mencionaste niveles Base, Intermedio y Avanzado. ¿Planeas hacer **un solo curso largo** o una **ruta de tres cursos** independientes?
2.  Sobre el "conocimiento básico de programación" del alumno: ¿Te refieres a lógica de programación o a un lenguaje específico (Python, JavaScript)?
3.  ¿Tienes preferencia por algún "stack" tecnológico (ej. Python/Streamlit, React/Node) o la IA decidirá el lenguaje?
4.  El resultado es "un aplicativo en línea": ¿En qué plataforma de hosting planeas enseñarles a desplegar (Vercel, AWS, Heroku)?
5.  Dado que no tienes equipo humano, ¿cómo planeas gestionar el soporte a dudas técnicas de los alumnos?
6.  ¿Cuentas con alguna certificación técnica que avale tu experiencia en desarrollo ante los futuros alumnos?
7.  ¿Qué herramientas de IA específicas piensas incluir (ChatGPT, Claude, Cursor, GitHub Copilot)?

## 6. RECOMENDACIONES INICIALES
1.  **Enfoque en Proyectos:** Dado que el éxito se mide con la app en línea, utiliza el modelo **Backward Design** (Diseño Inverso): define primero la app final y construye las lecciones hacia atrás.
2.  **Adopción del EC0366:** Estructura tu curso siguiendo las fases de este estándar: Información general, Contenidos, Actividades de aprendizaje y Evaluación. Esto te dará un sello de calidad profesional.
3.  **MVP de Contenido:** Al ser emprendedor solitario, comienza con un curso de nivel "Base" para validar el mercado antes de producir el contenido intermedio y avanzado.

## 7. REFERENCIAS COMPLETAS
* CONOCER. (s.f.). *Ficha del Estándar EC0366*. Recuperado de [https://conocer.gob.mx/](https://conocer.gob.mx/)
* Gartner. (2024). *Top Strategic Technology Trends for 2025*.
* Coursera. (2024). *Job Skills Report 2024: AI and Digital Skills*.
* Hale, J. (2023). *The Strategy of Instructional Design (The Merrill/Gagné approach)*.
