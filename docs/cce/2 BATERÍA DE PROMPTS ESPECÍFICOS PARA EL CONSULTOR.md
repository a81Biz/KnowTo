# BATERÍA DE PROMPTS PARA EL CONSULTOR

## ESTRUCTURA GENERAL

| Fase | Identificador Backend | Propósito |
|:---|:---|:---|
| **F0** | `F0-marco-referencia` | Investigar sector, NOMs, ECs, benchmarking |
| **F1** | `F1_P1-instrumentos` | Crear entrevistas, cuestionarios, guías, checklist |
| **F1** | `F1_P2-diagnostico` | 5 porqués, causa raíz, brechas |
| **F2** | `F2_P1-analisis-alcance` | Priorizar cursos (urgente/necesario/crítico) |
| **F2** | `F2_P2-pedagogia` | Técnicas instruccionales + bibliografía |
| **F3** | `F3-especificaciones` | Duración, recursos, calendarización |
| **F4** | `F4_P0` a `F4_P6` | Sub-wizard de 7 productos (Carta descriptiva rige al resto) |
| **F5** | `F5-verificacion` | Checklists + plantilla de reporte |
| **F6** | `F6-cierre` | Clasificación de ajustes, versiones, firmas |

## FORMATO ESTÁNDAR PARA CADA TEMPLATE (FRONTMATTER + MARKDOWN)

Los archivos `.md` en `/templates` dejan de ser monolíticos. Se elimina el particionado por expresiones regulares (Regex) del frontend. Ahora, cada archivo consta de un **Frontmatter YAML** que configura la cadena de micro-agentes, seguido del **Cuerpo de Instrucciones**.

### Estructura del Archivo Template

```yaml
---
id: [IDENTIFICADOR_FASE]
type: pipeline
pipeline_steps:
  - agent: extractor
    model: [MODELO_LOCAL_LIGERO]
    task: "Extrae [datos específicos] de {{userInputs}} y {{contexto}}"
    output_schema: json
  - agent: specialist
    model: [MODELO_MAYOR_CAPACIDAD]
    task: "Aplica la norma EC0249 para resolver [objetivo]"
    output_schema: markdown_section
  - agent: judge
    model: [MODELO_VALIDADOR]
    rules: 
      - "No inventar links (usar dof.gob.mx o conocer.gob.mx)"
      - "Validar estructura exacta de headers"
    output_schema: final_markdown
---
```
### Cuerpo de Instrucciones
```markdown
## PROPÓSITO
[Objetivo de negocio de la fase]

## REGLAS OBLIGATORIAS (Para el Especialista)
1. [Regla 1]
2. [Regla 2]

## FORMATO DE SALIDA ESPERADO
[Estructura base que el Juez auditará antes de devolver la respuesta al router]
```

## DIAGRAMA DE FLUJO DE PROMPTS
*(Se mantiene el diagrama ASCII enfocado al flujo del usuario).*

## LISTA DE VERIFICACIÓN FINAL PARA EL USUARIO
*(Se mantienen los checkboxes de validación del consultor).*
```

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              FLUJO COMPLETO DE PROMPTS CONSULTOR                     │
└─────────────────────────────────────────────────────────────────────────────────────┘

                    ┌──────────────────────────────────────┐
                    │   INPUT USUARIO:                     │
                    │   DATOS BÁSICOS DE LA EMPRESA        │
                    │   (Formato estándar)                 │
                    └─────────────────┬────────────────────┘
                                      │
                                      ▼
                              ┌───────────────┐
                              │     F0        │
                              │ Marco de      │
                              │ referencia    │
                              └───────┬───────┘
                                      │
                                      ▼
                              ┌───────────────┐
                              │    F1.1       │
                              │ Generación de │
                              │ instrumentos  │
                              └───────┬───────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
            ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
            │ ACCIÓN MANUAL │ │    F1.2       │ │    F2         │
            │ Aplicar       │ │ Análisis de   │ │ Análisis y    │
            │ instrumentos  │ │ respuestas    │ │ alcance       │
            │ en campo      │ │               │ │               │
            └───────┬───────┘ └───────┬───────┘ └───────┬───────┘
                    │                 │                 │
                    └─────────────────┼─────────────────┘
                                      │
                                      ▼
                              ┌───────────────┐
                              │    F2.5       │
                              │ Recomendac.   │
                              │ pedagógicas   │
                              └───────┬───────┘
                                      │
                                      ▼
                              ┌───────────────┐
                              │    F3         │
                              │ Especificac.  │
                              │ técnicas      │
                              └───────┬───────┘
                                      │
                                      ▼
                              ┌───────────────┐
                              │    F4         │
                              │ PRODUCCIÓN    │
                              │ (UNIFICADO)   │
                              │               │
                              │ Genera 7      │
                              │ productos     │
                              └───────┬───────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
            ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
            │ ACCIÓN MANUAL │ │    F5         │ │    F6         │
            │ Revisar y     │ │ Verificación  │ │ Ajustes y     │
            │ ajustar       │ │ (checklists)  │ │ cierre        │
            │ productos     │ │               │ │               │
            └───────┬───────┘ └───────┬───────┘ └───────┬───────┘
                    │                 │                 │
                    └─────────────────┼─────────────────┘
                                      │
                                      ▼
                    ┌───────────────────────────────────────┐
                    │   PROYECTO COMPLETO PARA EL CLIENTE   │
                    │   (PAC + Cursos + Instrumentos)       │
                    └───────────────────────────────────────┘
```

## FORMATO ESTÁNDAR PARA CADA PROMPT

Cada prompt en `cce.sitio` sigue esta estructura (análoga a `dcfl.sitio`):

1. **Rol de la IA**
2. **Entrada que recibe** (del usuario o de fases anteriores)
3. **Proceso que debe seguir** (pasos específicos, con reglas de no invención)
4. **Formato de salida** (estructura obligatoria con headers exactos para extractores)
5. **Instrucción de calidad** (qué no hacer, qué fuentes usar)

## LISTA DE PROMPTS POR FASE

| PromptId | Fase | Propósito |
|:---|:---|:---|
| FASE 0 | F0 | Marco de referencia (sector, NOMs, ECs, benchmarking, preguntas) |
| FASE 1 | F1.1 | Generar 6 instrumentos de diagnóstico |
| FASE 1.2 | F1.2 | Analizar respuestas, 5 porqués, causa raíz, brechas |
| FASE 2 | F2 | Priorizar cursos (urgente/necesario/crítico), perfil de ingreso |
| FASE 2.5 | F2.5 | Recomendaciones pedagógicas + bibliografía |
| FASE 3 | F3 | Especificaciones técnicas, duración, recursos, calendarización |
| FASE 4 | F4 | Sub-wizard de 7 productos (PAC, carta, manual, instrumentos, materiales, DC-5, reporte) |
| FASE 5 | F5 | Checklists de verificación + plantilla de reporte |
| FASE 6 | F6 | Ajustes, control de versiones, inventario de firmas |

## LISTA DE VERIFICACIÓN FINAL PARA EL USUARIO

### Antes de comenzar F0
- [ ] Tengo los **datos básicos de la empresa** listos (formulario de entrada)
- [ ] Tengo acceso a internet para que la IA investigue el sector, NOMs y ECs

### Antes de F1.1
- [ ] Recibí el **Marco de referencia (F0)** de la IA
- [ ] El cliente respondió las preguntas específicas

### Antes de F1.2
- [ ] Apliqué los **6 instrumentos** en la empresa real
- [ ] Tengo los hallazgos de entrevistas, cuestionarios, observación y documentos

### Antes de F2
- [ ] Confirmé el **Informe de diagnóstico (F1.2)** : causa raíz y brechas

### Antes de F2.5
- [ ] Confirmé la **tabla de cursos priorizados (F2)**

### Antes de F3
- [ ] Confirmé las **recomendaciones pedagógicas (F2.5)**

### Antes de F4
- [ ] Confirmé las **especificaciones técnicas (F3)**

### Antes de F5
- [ ] Recibí los **7 productos de F4**
- [ ] Revisé y ajusté los productos según sea necesario

### Antes de F6
- [ ] Realicé las **pruebas funcionales** usando los checklists de F5
- [ ] Llené el **reporte de pruebas** con observaciones reales
- [ ] Corregí observaciones críticas y mayores

### Final
- [ ] Tengo mi **proyecto completo** con todos los productos listos para el cliente
