# ESPECIFICACIONES TÉCNICAS Y DURACIÓN
**Proyecto:** Programación usando IA (Nivel Base)  
**Fecha:** 2 de abril de 2026

## 1. PLATAFORMA LMS
| Decisión | Valor | Justificación |
| :--- | :--- | :--- |
| **Plataforma recomendada** | **Teachable (o Gumroad/Hotmart)** | Como emprendedor individual (F0) con presupuesto no definido (F1), necesitas una plataforma que gestione pagos y entrega de contenido sin configurar servidores. Teachable permite subir videos y PDFs rápidamente. |
| **Costo estimado** | Desde $39 USD/mes o comisión por venta | Fuente: Teachable Pricing 2025. |
| **Soporta SCORM/xAPI** | Parcial | Suficiente para cursos de video y quizzes básicos; el seguimiento avanzado se hará mediante el proyecto en GitHub. |

## 2. SISTEMA DE REPORTEO
| Aspecto | Decisión |
| :--- | :--- |
| **Actividades reportadas** | Visualización de videos (%), calificación de quizzes, participación en foro de dudas y entrega de URL del proyecto final. |
| **Frecuencia de reportes** | Semanal (para monitorear el progreso de la cohorte) y al finalizar cada módulo. |
| **Destinatarios** | Alberto Martínez (Instructor) y el Alumno (Dashboard de progreso). |
| **Compatibilidad con LMS** | Sí, nativa en plataformas para emprendedores. |

## 3. FORMATOS MULTIMEDIA
| Tipo | Formato | Justificación |
| :--- | :--- | :--- |
| **Documentos** | PDF | Para guías de instalación y "Cheatsheets" de prompts. |
| **Presentaciones** | PDF | Versión ligera de las diapositivas de arquitectura. |
| **Videos** | MP4 H.264 | Grabaciones de pantalla (Screencasts) de alta resolución para ver código. |
| **Audio** | MP3 | Opcional para resúmenes de módulos. |
| **Imágenes** | PNG / SVG | Diagramas de flujo de datos y arquitectura React/Node. |
| **Animaciones** | HTML5 | Embebidos de depuración o simuladores de consola si es necesario. |

## 4. NAVEGACIÓN E IDENTIDAD GRÁFICA
| Aspecto | Decisión | Justificación |
| :--- | :--- | :--- |
| **Estructura de navegación** | Menú lateral izquierdo | Estándar en cursos de programación; permite saltar entre lecciones de código fácilmente. |
| **Desbloqueo** | Secuencial | Crucial en programación; no puedes saltar al despliegue (M4) sin haber configurado el entorno (M2). |
| **Identidad gráfica** | Marca personal "Alberto Martínez / a81.biz" | Aprovecha tus dominios existentes (F0) para generar autoridad de marca. |
| **Botones principales** | "Siguiente", "Completar lección", "Ir al Foro", "Ver Código en GitHub". | Orientados a la acción técnica. |

## 5. CRITERIOS DE ACEPTACIÓN
* El 100% de las lecciones en video deben tener subtítulos generados por IA para accesibilidad.
* El repositorio de GitHub de ejemplo debe ser público y clonable sin errores.
* El curso debe ser 100% *responsive* (visualización óptima en móviles para consultas rápidas de teoría).
* El tiempo de carga de los materiales no debe exceder los 3 segundos en conexiones de 10 Mbps.

## 6. CÁLCULO DE DURACIÓN (MÉTODO EC0366)

### 6.1 Estimación de actividades
| Módulo | Lectura (min) | Video (min) | Quiz (min) | Foro (min) | Caso/Reto (min) | Proyecto (min) | Subtotal (min) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1. IA & Prompts | 30 | 60 | 15 | 20 | 45 | 0 | 170 |
| 2. Arquitectura | 20 | 90 | 0 | 20 | 60 | 60 | 250 |
| 3. Integración | 20 | 120 | 15 | 20 | 90 | 120 | 385 |
| 4. Despliegue | 15 | 60 | 15 | 30 | 60 | 120 | 300 |
| **TOTAL** | **85** | **330** | **45** | **90** | **255** | **300** | **1,105 min** |

**Total base:** 1,105 minutos = **18.4 horas**

### 6.2 Ajuste por perfil de ingreso
* **Perfil del alumno:** Conocimiento de lógica de programación + Bachillerato (F2).
* **Factor aplicado:** **1.0 (Perfil estándar)**. Al ya tener lógica, el tiempo de comprensión es el base.
* **Total ajustado:** **18.4 horas**.

### 6.3 Distribución en semanas
* **Horas por semana:** 6 horas/semana (según disponibilidad sugerida en F2).
* **Duración sugerida:** **3 semanas**.
* **Carga semanal:** **6.1 horas/semana**.

### 6.4 Validación con reporteo
* **Frecuencia de reporteo:** Semanal.
* **Coherencia:** **Sí**, ya que los cortes de reporte coinciden con el cierre de los módulos de mayor carga (M2 y M3), permitiendo detectar alumnos rezagados a mitad del curso.

## 7. RESUMEN DE ESPECIFICACIONES
| Categoría | Decisión |
| :--- | :--- |
| **Plataforma LMS** | Teachable (recomendada) |
| **Modalidad** | 100% En línea Asincrónico |
| **Interactividad** | Alto (Basado en Proyectos) |
| **Duración total** | 18 horas |
| **Duración en semanas** | 3 semanas |
| **Carga semanal** | ~6 horas |
| **Reporteo** | Semanal automatizado |

---