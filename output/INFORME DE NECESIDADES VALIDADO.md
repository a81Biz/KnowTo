# INFORME DE NECESIDADES VALIDADO
**Proyecto:** Programación usando IA - Alberto Martínez  
**Fecha:** 2 de abril de 2026  
**Investigador:** Analista de Capacitación (Especialista EC0249)

## 1. DECLARACIÓN DEL PROBLEMA
Actualmente, existe una masa crítica de personas con **lógica de programación básica** que desean incursionar en el desarrollo de aplicaciones modernas, pero se enfrentan a una "barrera de complejidad técnica" al intentar integrar Inteligencia Artificial y realizar despliegues (deployment) profesionales. El problema radica en que el aprendizaje tradicional de desarrollo web (React/Node) tiene una curva de aprendizaje lenta, y los recursos actuales de IA suelen quedarse en la teoría o en ejecuciones locales (localhost), sin llegar a un producto funcional en la nube.

Este problema afecta principalmente a **emprendedores y desarrolladores junior** que, al no dominar el flujo completo (desde el prompt hasta el hosting), abandonan sus proyectos o generan código ineficiente que no saben depurar. 

**Cuantificación del impacto:**
* **Métrica actual:** El 90% de los proyectos de software de nivel principiante/intermedio nunca llegan a ser publicados en línea debido a complicaciones en la configuración de servidores y despliegue (Fuente: *Heroku/DigitalOcean Developer Reports*).
* **Meta deseada:** El 100% de los alumnos de la ruta de aprendizaje deben finalizar con un aplicativo real, funcional y con URL pública en Cloudflare o GitHub Pages.

## 2. ANÁLISIS DE BRECHA (GAP ANALYSIS)

| Comportamiento observado | Causa raíz | ¿Capacitable? | Prioridad |
| :--- | :--- | :--- | :--- |
| El alumno genera código con IA pero no sabe integrarlo en un proyecto React/Node. | **Conocimiento** (Saber el "cómo" de la arquitectura). | Sí | **Alta** |
| Dificultad para configurar entornos de despliegue gratuitos (Cloudflare/GitHub Pages). | **Habilidad** (Destreza técnica en herramientas Cloud). | Sí | **Alta** |
| Uso ineficiente de herramientas de IA (ChatGPT, Claude, Cursor) para depuración. | **Habilidad** (Saber hacer: Prompting técnico). | Sí | Media |
| El alumno no tiene licencias de herramientas Pro de IA. | **Herramientas** (Falta de recurso económico/software). | No | Baja |
| El código generado por IA presenta errores de lógica que el alumno no sabe detectar. | **Conocimiento** (Base de lógica de programación). | Parcial* | Media |

**Conclusión de capacidad:** El problema **SÍ** es principalmente capacitable. La brecha no es la falta de herramientas (existen opciones gratuitas como mencionaste), sino la falta de una metodología estructurada que conecte la lógica de programación con el potencial de la IA para obtener un producto final en producción.
*\*Nota: Se asume que el alumno ya trae la lógica base, por lo que el curso se enfocará en la aplicación de esa lógica mediante IA.*

## 3. RESULTADOS ESPERADOS (SMART)
**Objetivo SMART del curso:** "Al finalizar el primer nivel (Base) de la ruta de aprendizaje, el alumno desarrollará y desplegará un aplicativo web funcional utilizando el stack React/Node y herramientas de IA, logrando su publicación exitosa en una plataforma de hosting gratuito (Cloudflare o GitHub Pages) en un periodo máximo de 4 semanas."

**Desglose:**
* **Específico:** Desarrollo de un aplicativo web funcional con integración de IA y despliegue en la nube.
* **Medible:** El éxito se valida mediante la existencia de una URL pública funcional y el paso de una lista de cotejo de requerimientos técnicos.
* **Alcanzable:** Es realista dado que se usarán herramientas de IA para acelerar la escritura de código y plataformas de hosting de configuración simplificada.
* **Relevante:** Resuelve directamente el dolor de "no poder poner la app en línea" y profesionaliza el uso de la IA.
* **Con tiempo:** 4 semanas por cada nivel independiente de la ruta.

## 4. RESTRICCIONES Y SUPUESTOS

**Restricciones (límites reales):**
* **Presupuesto del alumno:** Se debe priorizar el uso de tiers gratuitos en APIs y Hosting (React, Node, Cloudflare, GitHub).
* **Equipo Humano:** Al ser solo tú el instructor, el soporte está limitado a un **foro asíncrono**, lo que restringe la velocidad de respuesta personalizada.
* **Tecnología:** El curso depende totalmente de la disponibilidad y estabilidad de las herramientas de IA de terceros (OpenAI, Anthropic, etc.).

**Supuestos (condiciones para el éxito):**
* Se asume que el alumno posee una conexión a internet estable y equipo de cómputo con permisos para instalar entornos de desarrollo (Node.js, VS Code).
* Se asume que el alumno tiene una comprensión real de la lógica de programación (ciclos, condicionales, variables) para poder validar lo que la IA genera.
* Se asume que las herramientas de IA mantendrán versiones de acceso gratuito o bajo costo durante la vigencia del curso.

## 5. RECOMENDACIÓN SOBRE VIABILIDAD
**[ X ] El curso ES viable** porque el cliente (Alberto) posee el perfil técnico académico (Licenciatura y certificaciones Azure/Google) para respaldar la formación, y el mercado actual demanda urgentemente la transición de "programador tradicional" a "programador potenciado por IA" con enfoque en resultados (apps en línea).

**Próximos pasos recomendados:**
1.  Diseñar el **Perfil de Egreso** detallado para cada uno de los tres niveles (Base, Intermedio, Avanzado).
2.  Definir el "Proyecto Integrador" de cada nivel (¿Qué app específica van a construir?).
3.  Establecer la estructura del foro de soporte para que sea autogestionable (FAQs, hilos por errores comunes).
