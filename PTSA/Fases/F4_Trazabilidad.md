---
ptsa_version: 2.0
motor_version: 4.1
fase: F4
estado: COMPLETADA
ultima_actualizacion: 2026-06-13
confidence: 88
---

# F4 — Trazabilidad de Productos

## Update U-001 | Timestamp: 2026-06-13 23:30

---

## Cadena completa de trazabilidad: Producto ← Transformación ← Servicio ← Regla ← Fuente ← Acción

### Cadena 1: Manual del Participante (P-011 / F4-P4)

```
Producto: Manual del Participante (fase4_productos.producto='P4')
  ← Transformación: p4-document.assembler.ts / handleDocumentP4Assembler
      - Lee outputs de agentes A+B+juez desde pipeline_agent_outputs
      - Aplica doc-sanitizer.helper.ts (fechas, placeholders, glosario)
      - Llama saveF4Produto() → DELETE aprobado + INSERT nuevo
  ← Servicio: AIService._runPipeline() + PipelineOrchestratorService
      - Template: F4_P4_GENERATE_DOCUMENT.md (qwen2.5:14b)
      - Sub-pipeline por capítulo: F4_P4_GENERATE_CHAPTER.md
  ← Regla de Negocio: 
      - P4 es la FUENTE DE VERDAD, se genera PRIMERO (EC0366 E1220)
      - Estructura: introducción + módulos + objetivos de Bloom
      - Sin placeholders, sin fechas YYYY-MM-DD
  ← Fuente de Datos:
      - temario_base (módulos, unidades, objetivos canónicos)
      - fase3_especificaciones (horas, modalidad, plataforma)
      - enrichedContext._projectBrief (ancla semántica: nombre, dominio, audiencia)
  ← Acción del Usuario: completar formulario F4-P4 en wizard
```

### Cadena 2: Instrumentos de Evaluación (P-008 / F4-P1)

```
Producto: Instrumentos de Evaluación (fase4_productos.producto='P1')
  ← Transformación: p1-document.assembler.ts / handleDocumentP1Assembler
      - Lee P4 previo desde fase4_productos (productos_previos.P4)
      - Juez selecciona best-of-A-or-B (con try-catch para JSON malformado)
      - validacion_estado: 'aprobado' o 'aprobado_por_fallback'
  ← Servicio: AIService → F4_P1_GENERATE_DOCUMENT.md pipeline
  ← Regla de Negocio:
      - Ponderaciones deben sumar 100% (enforced en validador TS)
      - Número mínimo de ítems por tipo (ec0366-rules.test.ts)
      - Reactivos en verbos de Bloom medibles
      - Lee productos_previos.P4 para alinear unidades evaluadas
  ← Fuente de Datos:
      - fase4_productos WHERE producto='P4' (Manual Participante previo)
      - wizard_steps (inputs usuario sobre tipos de evaluación)
      - enrichedContext._frozen.estandar_norma
  ← Acción del Usuario: completar formulario F4-P1 + click Generar
```

### Cadena 3: Informe de Necesidades (P-002 / F1)

```
Producto: Informe de Necesidades (fase1_informe_necesidades)
  ← Transformación: wizard.route.ts onAgentOutput('sintetizador_final')
      - Carga JSON del extractor desde BD
      - Guarda en fase1_informe_necesidades: qa_completo + perfil_participante (6 campos)
  ← Servicio: AIService._runPipeline() con F1 template
  ← Regla de Negocio:
      - Q&A completo (todos los pares respuestos)
      - Brecha identificada
      - Objetivo SMART
      - Perfil_participante con 6 campos obligatorios
  ← Fuente de Datos:
      - wizard_steps.input_data (respuestas del wizard F1)
      - fase0_componentes (Marco de Referencia para contexto)
      - enrichedContext._projectBrief (ancla semántica)
  ← Acción del Usuario: completar Q&A del wizard F1 con el cliente
```

### Cadena 4: Temario Base (P-007)

```
Producto: Temario Base (temario_base)
  ← Transformación: temario.phase.ts
      - Extrae estructura modular de F2 (estructura_tematica)
      - Genera temario con objetivos Bloom
      - Guarda en temario_base: modulos_json + temario_texto
  ← Servicio: AIService con TEMARIO_BASE.md (qwen2.5:14b)
  ← Regla de Negocio:
      - Módulos coherentes con estructura_tematica de F2
      - Objetivos en verbos de Bloom
      - Horas estimadas coherentes con F3 specs
  ← Fuente de Datos:
      - fase2_analisis_alcance (estructura_tematica, modalidad)
      - fase3_especificaciones (horas_totales, criterios_aceptacion)
  ← Acción del Usuario: aprobar paso F3 del wizard
```

---

## Verificación del registro de assemblers F4

Registro en `f4.phase.ts` (productHandlers):

| Template prompt | agent name | Handler | ¿Coincide? |
|:---|:---|:---|:---:|
| F4_P1_GENERATE_DOCUMENT | `ensamblador_doc_p1` | `handleDocumentP1Assembler` | ✅ |
| F4_P2_GENERATE_DOCUMENT | `ensamblador_doc_p2` | `handleDocumentP2Assembler` | ✅ |
| F4_P3_GENERATE_DOCUMENT | `ensamblador_doc_p3` | `handleDocumentP3Assembler` | ✅ |
| F4_P4_GENERATE_DOCUMENT | `ensamblador_doc_generic` | `handleDocumentP4Assembler` | ✅ |
| F4_P5_GENERATE_DOCUMENT | `ensamblador_doc_p5` | `handleDocumentP5Assembler` | ✅ |
| F4_P6_GENERATE_DOCUMENT | `ensamblador_doc_p6` | `handleDocumentP6Assembler` | ✅ |
| F4_P7_GENERATE_DOCUMENT | `ensamblador_doc_p7` | `handleDocumentP7Assembler` | ✅ |
| F4_P8_GENERATE_DOCUMENT | `ensamblador_doc_p8` | `handleDocumentP8Assembler` | ✅ |

Todos los registros coinciden. El bug original de P5-P8 (documentado en CLAUDE.md) está corregido.

---

## Cadenas incompletas detectadas

Ninguna cadena está rota. La cadena P-007 (Temario Base) está correctamente trazada a través de `temario.phase.ts` y la tabla `temario_base`. Verificación formal de los datos reales en BD se hace en F5.

**Confidence F4:** 88
