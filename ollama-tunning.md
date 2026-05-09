# Plan de Correcciones F4 — Enfoque Agnóstico de Dominio
> Estándar: **EC0366** | Fecha: 2026-05-09 | Commit de implementación: pendiente tras esta sesión

---

## Principio Rector

Las correcciones NO deben mencionar dominios específicos (miniaturas, soldadura, programación). El sistema debe funcionar para cualquier curso técnico sin cambios en el código. Todo el conocimiento del dominio lo aporta el `productos_previos` (heredado de P1, P4, etc.), nunca el prompt.

---

## Corrección 1 — Protocolo de Inventario Dual (agente_materiales)

### Problema

El prompt anterior creaba una contradicción irresoluble:
- Si `inventario_p4` estaba vacío → el agente hacía fallback a `contenido_form`
- Pero el MANDATORY FINAL CHECK exigía eliminar todo ítem no verbatim en `inventario_p4`
- Resultado: cuando P4 estaba vacío, TODOS los materiales del fallback se eliminaban → sección vacía

### Solución implementada

Reemplazado por **INVENTORY PROTOCOL con dos modos mutuamente excluyentes**:

**MODE A — INHERITANCE** (cuando `inventario_p4` tiene ítems):
- Verbatim check: solo ítems presentes literalmente en el inventario autorizado
- Elimina accesorios plausibles que no estén declarados explícitamente

**MODE B — INFERENCE** (cuando `inventario_p4` está vacío):
- Derivar materiales mínimos de `contenido_form` y `nombre` de la actividad
- Sin verbatim check — inferencia lógica por verbos de acción
- Máximo 5 ítems, genéricos y directamente ligados a las acciones descritas
- NO inventa marcas ni materiales de nicho

**Fallback defensivo en assembler** (`p5-document.assembler.ts`):
Si el agente produjo texto libre en lugar de JSON y `partes.logistica === null`, el assembler genera una entrada mínima con referencia al manual P4 en lugar de dejar la sección vacía.

### Impacto de la corrección en futuros dominios

Un curso de soldadura con `inventario_p4.materiales: ["varilla de electrodo 6013", "careta de soldar"]` aplicará MODE A y solo listará esos materiales. Un curso nuevo sin P4 generado aplicará MODE B e inferirá materiales del nombre de la actividad. Ninguna mención a soldadura, pinceles ni otro dominio en el prompt.

---

## Corrección 2 — Mínimo de Pasos por Tipo de Actividad (agente_procedimiento)

### Problema

El prompt no tenía mínimos de pasos. Para actividades de 120 min con tipo PRÁCTICA se generaban solo 2 pasos de ejecución — insuficiente para EC0366 y para que el instructor pueda facilitar la sesión.

### Solución implementada

**STEP 6 — MINIMUM STEP COUNT** (en agente_procedimiento_A y B):
| Tipo | preparacion | ejecucion | cierre_limpieza |
|---|---|---|---|
| PRÁCTICA / hands-on | ≥ 2 | ≥ 4 | ≥ 2 |
| DEMOSTRACIÓN | ≥ 2 | ≥ 3 | ≥ 1 |

Cada paso de ejecución debe especificar: WHAT action + WITH WHICH tool/material + ON WHICH part of the work object.

**STEP 7 — PROHIBITION OF CIRCULAR STEPS**:
Prohibición explícita de pasos tautológicos ("según sea necesario", "ajusta lo que corresponda"). Todo paso debe especificar la condición, la herramienta y el objeto.

### Por qué es agnóstico

Las reglas son sobre ESTRUCTURA (número de pasos, especificidad de verbos), no sobre CONTENIDO. Aplican igual a una actividad de torno CNC que a una de cocina o de atención al cliente.

---

## Corrección 3 — Rúbricas por Tipo de Actividad, sin dependencia de duración (agente_evaluacion)

### Problema raíz

La regla anterior usaba `{ficha.duracion}` para calcular el mínimo de criterios. Pero `agente_evaluacion` tiene `inputs_from: [extractor_p5]` — nunca ve la salida de `agente_ficha`. La variable `{ficha.duracion}` no existe en su contexto, por lo que el modelo ignoraba la regla y generaba 1 criterio.

### Solución implementada

La regla ya no depende de duración (que el agente no puede ver). Depende del **tipo de actividad** que SÍ está en `contenido_form`:

| Tipo | Mínimo | Total pts | Dimensiones obligatorias |
|---|---|---|---|
| PRÁCTICA / hands-on | 3 criterios | ≥ 15 pts | Técnica + Resultado + Proceso |
| DEMOSTRACIÓN | 2 criterios | ≥ 10 pts | Técnica + Resultado |
| Tipo desconocido | Default PRÁCTICA | ≥ 15 pts | — |

Las 3 dimensiones son agnósticas: "Técnica" es cómo aplica el método (válido en soldadura, cocina, software), "Resultado" es el producto observable, "Proceso" es orden y cuidado de materiales.

### Impacto en el juez

`juez_evaluacion` ya tiene RUBRICA MINIMUM CHECK que penaliza opciones con criterios insuficientes. Ahora el criterio mínimo es consistente entre agente y juez.

---

## Corrección 4 — Inyección Universal de Predecesores (step4.production.ts)

### Problema

P2 y P3 cargaban predecesores con lógica específica:
- P3: extraía `p4Capitulos` y pasaba `p4_secciones` (formato específico)
- P2: extraía `p3Partes` y `p4Capitulos`, pasaba `p3_escaleta`, `p3_guion_literario`, `p4_secciones`

Esta lógica de extracción vivía en el controller, era frágil y no escalaba.

### Solución implementada

**`_cargarProductosPrevios()`** ahora se usa universalmente para P2, P3, P5, P6, P7 y P8.

```typescript
// ANTES (P3) — extracción específica de P4:
const p4CapituloData = p4Capitulos.find(c => c.unidad === moduloNum)?.secciones_json || {};
userInputs: { p4_secciones: p4CapituloData }

// DESPUÉS (P3) — predecesores universales:
const productosPreviosP3 = await this._cargarProductosPrevios();
userInputs: { productos_previos: productosPreviosP3 }
```

`_cargarProductosPrevios()` retorna `{ P1: datos_producto, P3: datos_producto, P4: datos_producto, ... }` — todos los productos aprobados con sus datos. Los templates acceden a `productos_previos.P4.capitulos` para P4, o a `productos_previos.P3.partes` para P3, sin código adicional en el controller.

### Nota: templates P2 y P3 requieren actualización

Los templates `F4_P2_GENERATE_DOCUMENT.md` y `F4_P3_GENERATE_DOCUMENT.md` actualmente usan variables `{p4_secciones}`, `{p3_escaleta}`, `{p3_guion_literario}`. Con la estandarización, deben leer de `productos_previos.P4.capitulos[N].secciones_json` etc. **Esta es la siguiente tarea después de validar P5.**

---

## Estado de Implementación

| Corrección | Archivo | Estado |
|---|---|---|
| Protocolo dual de inventario | `F4_P5_GENERATE_DOCUMENT.md` — agente_materiales | ✅ Implementado |
| Fallback defensivo de logística | `p5-document.assembler.ts` | ✅ Implementado |
| Mínimo de pasos + anti-circulares | `F4_P5_GENERATE_DOCUMENT.md` — agente_procedimiento | ✅ Implementado |
| Rúbricas por tipo (no por duración) | `F4_P5_GENERATE_DOCUMENT.md` — agente_evaluacion | ✅ Implementado |
| Predecesores universales en controller | `step4.production.ts` — P3, P2 | ✅ Implementado |
| Templates P2 y P3 usando productos_previos | `F4_P2_GENERATE_DOCUMENT.md`, `F4_P3_GENERATE_DOCUMENT.md` | ⏳ Pendiente |

---

## Reglas de Calidad Generales (para cualquier producto F4)

Estas reglas se aplican a todos los agentes de procedimiento y evaluación de cualquier producto:

1. **Verbos de acción físicos** — cada paso usa un verbo observable (aplica, conecta, mide, coloca). Nunca verbos mentales (analiza, comprende, reflexiona).

2. **Objeto de trabajo explícito** — el receptor del verbo es siempre el objeto que produce el alumno (la pieza, el ensamble, el documento generado), nunca la superficie de trabajo, el manual o el instructor.

3. **Heredar antes de inventar** — materiales de `inventario_p4` tienen prioridad absoluta. Solo en ausencia total de inventario se usa inferencia por verbos de acción.

4. **Tres dimensiones en rúbrica** — para PRÁCTICA: Técnica (cómo) + Resultado (qué produce) + Proceso (orden y cuidado). Son agnósticas: aplican a cualquier disciplina.

5. **Sin referencias académicas** — ningún paso menciona capítulos, manuales, temas o el nombre del instructor. Cada paso es autónomo.
