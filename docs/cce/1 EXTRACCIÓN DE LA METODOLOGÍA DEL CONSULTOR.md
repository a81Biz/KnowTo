# EXTRACCIÓN DE LA METODOLOGÍA DEL CONSULTOR (EC0249 + EC0301 + EC0581 + STPS)

## 1. Identificación del estándar principal (EC0249)
| Campo | Información | Fuente |
|:---|:---|:---|
| **Clave y nombre** | EC0249. Proporcionar servicios de consultoría en general. | CONOCER |
| **Propósito general** | Servir como referente para la evaluación y certificación de personas que se desempeñan como consultores. | CONOCER |
| **Perfil del candidato** | Personas que brindan servicios de consultoría a organizaciones para identificar problemas y proponer soluciones. | CONOCER |

## 2. Estándares complementarios
| Estándar | Nombre | Propósito en el flujo del consultor |
|:---|:---|:---|
| **EC0301** | Diseño de cursos de formación del capital humano... | Diseño de la solución de capacitación (carta descriptiva, manual, etc.) |
| **EC0581** | Integración y operación de comisiones mixtas... | Soporte para empresas >50 trabajadores |
| **STPS** | Acuerdo 14/jun/2013 + Formatos DC | Cumplimiento normativo (PAC, constancias DC-3) |

## 3. Elementos de competencia del EC0249
| Elemento | Propósito / Descripción | Criterios de desempeño |
|:---|:---|:---|
| **Elemento 1** | Establecer acuerdos con el cliente | Entrevista inicial, definición de alcance, marco de referencia |
| **Elemento 2** | Recabar información del área de oportunidad | Entrevistas, cuestionarios, observación, análisis documental |
| **Elemento 3** | Identificar la causa raíz del área de oportunidad | Análisis de información, técnica de 5 porqués, brechas |
| **Elemento 4** | Desarrollar opciones de solución | Propuesta de solución, diseño de intervención, plan de acción |

## 4. Evidencias requeridas para la evaluación (EC0249 + EC0301 + EC0581)
| Tipo de Evidencia | Contenido | Estándar de origen |
|:---|:---|:---|
| **Conocimiento** | Metodologías de diagnóstico, diseño instruccional, normativa | EC0249, EC0301 |
| **Producto** | Informe de diagnóstico, propuesta, PAC (DC-2), carta descriptiva... | EC0249, EC0301, STPS |
| **Desempeño** | Aplicación de instrumentos, presentación al cliente | EC0249 |

## 5. Metodología del consultor (8 FASES REFACTORIZADAS)

Basado en EC0249 + EC0301 + STPS, operando bajo arquitectura de **Prompt Chaining (Micro-agentes)**:

### DIAGRAMA DE FASES
```text
FASE 0: CONOCIMIENTO DEL CLIENTE (ENTRY)
│
├──→ Entrada: Formulario de datos básicos + Smart Mini-Crawler (URL Cliente)
├──→ Proceso IA (Chaining): Extractor (Limpia web) → Especialistas A/B (Sector/Digital) → Juez (Valida NOMs)
├──→ Salida (Estructurada): Marco de referencia + preguntas específicas
│
↓
FASE 1: DIAGNÓSTICO (Unificación de Instrumentos y Respuestas)
│
├──→ PARTE 1 (F1_P1): GENERACIÓN DE INSTRUMENTOS
│    ├──→ Entrada: Marco de referencia + respuestas del cliente
│    ├──→ Proceso IA: Especialista (Diseño) → Juez (Verifica cantidades)
│    ├──→ Salida: 6 instrumentos de diagnóstico
│
├──→ [ACCIÓN MANUAL: Consultor aplica instrumentos en campo]
│
├──→ PARTE 2 (F1_P2): ANÁLISIS DE RESPUESTAS
│    ├──→ Entrada: Hallazgos reales capturados
│    ├──→ Proceso IA: Extractor (Síntomas) → Especialista (5 porqués) → Juez (Lógica)
│    ├──→ Salida: Informe de diagnóstico validado
│
↓
FASE 2: ANÁLISIS, ALCANCE Y PEDAGOGÍA
│
├──→ PARTE 1 (F2_P1): PRIORIZACIÓN
│    ├──→ Entrada: Causa raíz + brechas
│    ├──→ Proceso IA: Doble Especialista (Urgente/Crítico) → Sintetizador → Juez
│    ├──→ Salida: Tabla de cursos priorizados + estructura temática
│
├──→ PARTE 2 (F2_P2): RECOMENDACIONES PEDAGÓGICAS
│    ├──→ Entrada: Estructura temática
│    ├──→ Proceso IA: Especialista → Juez (Filtro estricto autores: Mayer/Bloom/Knowles/Gagné)
│    ├──→ Salida: Recomendaciones pedagógicas justificadas
│
↓
FASE 3: ESPECIFICACIONES TÉCNICAS
│
├──→ Entrada: Cursos priorizados + recomendaciones
├──→ Proceso IA (Chaining): Especialista Matemático → Juez (Valida sumatorias y LFT)
├──→ Salida: PAC completo + especificaciones técnicas
│
↓
FASE 4: PRODUCCIÓN (SUB-WIZARD EN CASCADA)
│
├──→ Entrada: Contexto acumulado (F0 a F3)
├──→ Proceso IA:
│    1. Especialista F4_P1 (Carta Descriptiva)
│    2. Paralelo: F4_P2 (Manual), F4_P3 (Instrumentos), F4_P4 (Materiales)
│    3. Paralelo: F4_P0 (PAC), F4_P5 (DC-5), F4_P6 (Reporte)
├──→ Salida: 7 productos de producción validados transversalmente
│
↓
FASE 5 Y 6: VERIFICACIÓN Y CIERRE
│
├──→ Entrada: Productos F4 + Reporte de pruebas del consultor
├──→ Proceso IA: Extractor (Lee reporte) → Especialista (Clasifica) → Juez (Valida firmas)
├──→ Salida: Reportes, checklists e inventario final
│
↓
PROYECTO COMPLETO PARA EL CLIENTE
```
### 5.1. ESPECIFICACIONES TÉCNICAS DE LA CAPA DE INGESTA (CRAWLER FASE 0)

Para procesar la presencia digital del cliente sin agotar la ventana de contexto de los modelos locales (ej. Llama 3.2 3b) ni sobrecargar el entorno de Cloudflare Workers, el sistema no utiliza navegadores pesados (Puppeteer/JSDOM), sino un proceso de extracción asíncrono basado en **Cheerio**.

**1. Proceso de Limpieza (Sanitización del DOM):**
Al realizar el *fetch* de la URL proporcionada en el INTAKE, el Crawler ejecuta una limpieza agresiva antes de leer el texto.
- **Se eliminan elementos no semánticos y de diseño:** `<script>`, `<style>`, `<noscript>`, `<iframe>`, `<svg>`, `<canvas>`, `<nav>`, `<footer>`, `<header>`, `<aside>`, `.menu`, `.sidebar`, `.ad`.
- **Se preserva:** `<title>`, `<meta name="description">` y el texto legible del `<body>`.

**2. Límite de Seguridad (Token Limit):**
Para evitar errores de "Context Window Exceeded" en la IA:
- Se colapsan los saltos de línea y espacios múltiples en espacios simples.
- Se establece un límite de **6,000 caracteres** (aprox. 1,500 tokens). Si el sitio web excede esta longitud, el texto se corta y se añade el sufijo `... [CONTENIDO TRUNCADO]`.

**3. Formato de Inyección (Output):**
El Crawler no interactúa directamente con el *Especialista*. Transforma el HTML limpio en un string estructurado que se inyecta en la variable `{{context}}` del **Agente Extractor de la Fase 0**.

El esquema estricto de salida es:
```text
### TÍTULO: [Texto extraído del title]
### DESCRIPCIÓN: [Texto extraído de meta description]
### CONTENIDO WEB:
[Texto limpio y truncado del body]
```

## 6. Productos por fase (totales)

| Fase | Productos | Cantidad | Estándar de referencia |
|:---|:---|:---|:---|
| **F0** | Marco de referencia + preguntas | 2 | EC0249 (Elemento 1) |
| **F1.1** | 6 instrumentos (entrevistas, cuestionario, observación, checklist) | 6 | EC0249 (Elemento 2) |
| **F1.2** | Informe de diagnóstico (5 secciones) | 1 | EC0249 (Elemento 3) |
| **F2** | Tabla de cursos priorizados + estructura temática | 2 | EC0249 (Elemento 4) + EC0301 |
| **F2.5** | Recomendaciones pedagógicas | 1 | EC0301 + S5 |
| **F3** | Especificaciones técnicas + PAC | 2 | EC0301 + STPS |
| **F4** | 7 productos (PAC DC-2, carta, manual, instrumentos, materiales, DC-5, reporte) | 7 | EC0301 + STPS |
| **F5** | Checklists + plantilla de reporte | 2 | EC0301 |
| **F6** | Ajustes + control de versiones + firmas | 2 | EC0249 (Elemento 4) |
| **TOTAL** | | **25** | |

## 7. Checklist de productos por fase para el consultor

| Fase | Producto | Estándar | Estado |
|:---|:---|:---|:---|
| **F0** | Marco de referencia del cliente | EC0249 - E1 | ☐ |
| **F0** | Preguntas para el cliente | EC0249 - E1 | ☐ |
| **F1.1** | Guía de entrevista - Director | EC0249 - E2 | ☐ |
| **F1.1** | Guía de entrevista - Jefes | EC0249 - E2 | ☐ |
| **F1.1** | Guía de entrevista - Colaboradores | EC0249 - E2 | ☐ |
| **F1.1** | Cuestionario anónimo para empleados | EC0249 - E2 | ☐ |
| **F1.1** | Guía de observación de campo | EC0249 - E2 | ☐ |
| **F1.1** | Checklist de documentos a solicitar | EC0249 - E2 | ☐ |
| **F1.2** | Informe de diagnóstico (causa raíz + brechas) | EC0249 - E3 | ☐ |
| **F2** | Tabla de cursos priorizados (urgente/necesario/crítico) | EC0249 - E4 | ☐ |
| **F2** | Estructura temática preliminar | EC0301 - E1 | ☐ |
| **F2.5** | Recomendaciones pedagógicas | EC0301 - E2 | ☐ |
| **F3** | Especificaciones técnicas + duración | EC0301 - E3 | ☐ |
| **F3** | Calendarización por trimestre | STPS - DC-2 | ☐ |
| **F4** | PRODUCTO 1: PAC (Formato DC-2) | STPS | ☐ |
| **F4** | PRODUCTO 2: Carta descriptiva | EC0301 - E1/E2 | ☐ |
| **F4** | PRODUCTO 3: Manual del instructor | EC0301 - E3 | ☐ |
| **F4** | PRODUCTO 4: Instrumentos de evaluación (cuestionario + lista de cotejo + rúbrica) | EC0301 - E4 | ☐ |
| **F4** | PRODUCTO 5: Materiales didácticos | EC0301 | ☐ |
| **F4** | PRODUCTO 6: Formato DC-5 llenado | STPS | ☐ |
| **F4** | PRODUCTO 7: Reporte ejecutivo para el cliente | EC0249 - E4 | ☐ |
| **F5** | Checklist de verificación técnica | EC0301 | ☐ |
| **F5** | Checklist de verificación pedagógica | S5 | ☐ |
| **F5** | Plantilla de reporte de pruebas | EC0301 | ☐ |
| **F6** | Documento de ajustes + control de versiones | EC0249 - E4 | ☐ |
| **F6** | Inventario de documentos + firmas | Transversal | ☐ |

**Total de productos para el proyecto completo:** 26