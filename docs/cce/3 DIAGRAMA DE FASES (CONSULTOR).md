
# DIAGRAMA DE FASES - CONSULTOR

## DIAGRAMA DE FLUJO DE FASES COMPLETO (ARQUITECTURA DE ORQUESTADOR)

*(El flujo visual para el usuario se mantiene, pero la lógica de fondo se reemplaza por el mapeo JSON estructurado sin Regex).*

```text
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                              EJECUCIÓN DEL WIZARD ROUTER                             │
│                                                                                      │
│ 1. INTAKE (F0): Router captura form -> Dispara Crawler -> Ejecuta Pipeline F0        │
│ 2. F1_P1: Consume F0 -> Ejecuta Pipeline F1_P1 -> Genera JSON de Instrumentos        │
│ 3. F1_P2: Captura Fieldwork -> Extractor limpia -> Pipeline F1_P2 (5 Porqués)        │
│ 4. F2_P1 / F2_P2: Ejecución secuencial de priorización y pedagogía                   │
│ 5. F3: Cálculo matemático y calendarización estructurada                             │
│ 6. F4 (PRODUCCIÓN): Router orquesta en cascada. F4_P1 debe terminar exitosamente     │
│    antes de disparar F4_P2 a F4_P6.                                                  │
│ 7. F5 / F6: Generación de controles y procesamiento del Test Report final            │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

## TABLA DE FASES CON ENTRADAS Y CADENAS DE IA

| Fase / Nodo (`flow-map`) | Entradas (`contexto`) | Proceso IA (Cadena de Agentes en Backend) | Salidas (Esquemas Estructurados) |
|:---|:---|:---|:---|
| **F0 (Marco Ref.)** | Formulario + URL | Crawler -> Extractor -> Especialistas -> Juez | Objeto JSON con 8 secciones validadas |
| **F1_P1 (Instrum.)** | F0 | Especialista -> Juez | Objeto JSON con 6 instrumentos |
| **F1_P2 (Diagnós.)** | Hallazgos manuales + F0 | Extractor -> Especialista (5 porqués) -> Juez | Informe diagnóstico estructurado |
| **F2_P1 (Alcance)** | F0 + F1_P2 | Especialistas A/B -> Sintetizador -> Juez | JSON: Cursos priorizados |
| **F2_P2 (Pedagog.)** | F2_P1 | Especialista -> Juez Anti-Alucinación | JSON: Recomendaciones |
| **F3 (Especific.)** | F0 a F2_P2 | Especialista Matemático -> Juez | JSON: Especificaciones + PAC |
| **F4 (Producción)** | Contexto total consolidado | Orquestación Múltiple (Cascada a partir de P1) | 7 Documentos Markdown listos |
| **F5 (Verificac.)** | F4 | Especialista -> Juez | Plantillas de reporte estructuradas |
| **F6 (Cierre)** | Reporte lleno por consultor | Extractor -> Especialista -> Juez | Documento final de cierre |

## RELACIÓN DE PRODUCTOS POR FASE (PARA EL APLICATIVO)

| Fase | Producto generado | ¿Quién lo genera? | ¿Qué hace el usuario? |
|:---|:---|:---|:---|
| F0 | Marco de referencia + preguntas | WIZARD (Pipeline) | Llena form inicial y URLs |
| F1_P1 | 6 instrumentos | WIZARD (Pipeline) | Los imprime/descarga |
| - | Aplicar instrumentos | USUARIO | Aplica en campo |
| F1_P2 | Informe de diagnóstico | WIZARD (Pipeline) | Captura hallazgos manuales |
| F2_P1 | Tabla de cursos priorizados | WIZARD (Pipeline) | Confirma o corrige |
| F2_P2 | Recomendaciones pedagógicas | WIZARD (Pipeline) | Confirma o corrige |
| F3 | Especificaciones técnicas + PAC | WIZARD (Pipeline) | Confirma o corrige |
| F4 | 7 productos (Prod 1-7) | WIZARD (Cascada) | Revisa y ajusta cada uno |
| - | Revisar y probar productos | USUARIO | Sube a LMS / Prueba |
| F5 | Checklists + plantilla | WIZARD (Pipeline) | Usa para probar |
| - | Llenar reporte de pruebas | USUARIO | Llena form dinámico |
| F6 | Ajustes + control + firmas | WIZARD (Pipeline) | Firma los documentos |