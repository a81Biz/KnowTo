# Auditoría P5 v2 — Análisis de Segunda Pasada

> Fecha: 2026-05-08 | Estado: Post-implementación de Factibility Matrix y Heritage Lock v1

---

## Veredicto General

La versión regenerada representa un salto cualitativo real respecto a la versión anterior:

| Dimensión | v1 (antes) | v2 (actual) |
|---|---|---|
| Contaminación de dominio grave | "lienzo de malla", "aplastador", "Corta una capa base" | Eliminados |
| Coherencia verbo-material | "Corta el pegamento", "Abre el aplastador" | Aplica, Extiende, Mezcla, Diluye ✓ |
| Herencia de materiales desde P4 | 0% (inventado) | ~70% (Pinturas, Barnices, Pinceles) |
| Evidencia EC0366-válida | Documento académico | Mixto — 1 unidad correcta, 1 con leakage |

Sin embargo, persisten **dos clases de defectos estructurales** con raíces distintas.

---

## Defecto 1: Evidence Leakage (Crítico — Unidad 2)

### Qué ocurre

El campo `evidencia_producto` de Unidad 2 contiene:

> *"El contenido del curso incluye tres capítulos que abordan las técnicas de pintura para miniaturas desde una perspectiva teórica y práctica. Cada capítulo tiene estructuras claramente definidas con introducciones, marcos teóricos, conceptos clave, desarrollos prácticos, ejemplos y ejercicios."*

Y la rúbrica tiene un único criterio:

> *"Estructura del contenido — El curso contiene tres capítulos bien estructurados..."* → 5 pts

Esto NO es evidencia de aprendizaje. Es una descripción del Manual P4.

### Cadena causal

```
extractor_p5 expone {inventario_p4} (capítulos, secciones_json)
    ↓
agente_evaluacion recibe {instrumentos_p1} pero ve TODO el contexto del extractor
    ↓
El agente confunde "P4 tiene 3 capítulos" con "la evidencia que entrega el learner"
    ↓
evidencia_producto ← descripción curricular del manual, no producto físico del alumno
    ↓
juez_evaluacion pasa el integrity check (tiene "criterio"/"puntos"/"indicador_exito")
    porque los campos existen estructuralmente — el juez no valida el CONTENIDO semántico
```

### Por qué el juez no lo atrapó

El `juez_evaluacion` tiene un INTEGRITY PRE-CHECK sobre nombres de claves y un VETO si `rubrica` está vacía. Pero NO tiene:
- Filtro de palabras que indican fuga semántica ("curso", "capítulo", "contenido")
- Límite de longitud en `evidencia_producto`
- Verificación de que la evidencia sea un producto físico del alumno y no una descripción del curso

### Fix requerido

**En agente_evaluacion_A y agente_evaluacion_B:**
- `evidencia_producto` ← máximo 8 palabras, sustantivo + adjetivo que describe lo que el alumno entrega físicamente
- Lista de palabras PROHIBIDAS en evidencia: "curso", "capítulo", "contenido", "abordan", "incluye", "estructura", "marco teórico", "perspectiva"
- MÍNIMO DE CRITERIOS proporcional a la duración de la actividad: ≤30 min → 1, 31-60 min → 2, >60 min → mínimo 3 criterios con suma ≥ 15 pts
- Los criterios evalúan LA CONDUCTA DEL ALUMNO durante la actividad — no la calidad del curso

**En juez_evaluacion:**
- LEAKAGE FILTER pre-check: si `evidencia_producto` contiene "curso", "capítulo", "contenido", "abordan" → esa opción FALLA automáticamente
- Si ambas opciones fallan el leakage filter → RECHAZADO

---

## Defecto 2: Domain Infiltration Residual (Menor — Materiales Atípicos)

### Qué ocurre

En Unidad 2, Herramientas/Consumibles aparecen:
- "**Cinta adhesiva para crear líneas rectas**" — técnica de enmascaramiento (masking tape), legítima en modelismo pero NO declarada en P4
- "**Bolsitas de plástico para guardar pinturas**" — solución de almacenamiento, lógica pero sin herencia P4

### Cadena causal

```
agente_materiales recibe {inventario_p4.materiales} con pinturas, pinceles, barnices
    ↓
DOMAIN LOCK dice "PRIORITY SOURCE: inventario_p4" y "STEP 3: verify and remove"
    ↓
El modelo razona: "Cinta adhesiva se usa CON pinturas" → plausibilidad alta
    ↓
"Verify each item appears in the chosen source" → modelo hace soft-check (¿compatible?) en lugar de hard-check (¿presente exactamente?)
    ↓
juez_materiales solo recibe salidas de A y B, no tiene acceso a inventario_p4
    → no puede detectar la violación de herencia
```

### Diferencia con v1

En v1 el problema era GRAVE (lienzo de malla, aplastador — objetos de dominio completamente diferente).  
En v2 es RESIDUAL (cinta adhesiva, bolsitas — objetos plausibles en el contexto pero no heredados).

La diferencia es que el modelo ahora aplica razonamiento de plausibilidad de nicho en lugar de conocimiento enciclopédico general. El DOMAIN LOCK redujo la severidad pero no eliminó la filtración porque la instrucción "verify each item" permite al modelo hacer verificación de compatibilidad en lugar de verificación de presencia exacta.

### Fix requerido

**En agente_materiales_A y agente_materiales_B:**
- Cambiar la verificación de "soft" a "hard": "Para cada ítem en tu output, pregunta: ¿Estas palabras exactas aparecen en {inventario_p4.materiales} o {inventario_p4.herramientas}? Si la respuesta es NO → ELIMINA el ítem. Lista vacía es aceptable. Esto no es negociable."
- El ejemplo de violación debe actualizarse para reflejar el nuevo patrón: no solo objetos de dominio ajeno sino también accesorios plausibles sin herencia

**En juez_materiales:**
- Agregar `extractor_p5` a `inputs_from` para que el juez pueda ver `{inventario_p4}`
- HERITAGE CHECK: antes de seleccionar, el juez lista los ítems no-heredados y los descarta de ambas opciones antes de emitir su selección

---

## Defecto 3: Chapter-Reference Leakage en Procedimientos (Unidad 3)

### Qué ocurre (no mencionado por el usuario, detectado en auditoría)

Los pasos de ejecución de Unidad 3 contienen referencias académicas a capítulos:
- "siguiendo las técnicas del pincel seco y veladura **del capítulo 1**"
- "como se describe **en el Capítulo 2**"
- Preparación: "**Revisar los conceptos claves del Capítulo 1**" — verbo mental + referencia académica

EC0366 exige que cada paso sea una ACCIÓN FÍSICA observable. "Revisa el Capítulo 1" es una instrucción de estudio, no de ejecución laboral.

### Fix requerido

**En agente_procedimiento_A y agente_procedimiento_B:**
- Agregar prohibición explícita: NINGÚN paso puede contener referencias a capítulos, manuales, libros o material de estudio ("Capítulo N", "el manual", "el libro", "como se vio en")
- El paso debe describir la acción física completa sin depender de referencia externa

---

## Tabla de Fixes y Archivos Afectados

| Defecto | Agente(s) a modificar | Tipo de cambio | Prioridad |
|---|---|---|---|
| Evidence Leakage | agente_evaluacion_A, agente_evaluacion_B | Constraint longitud + palabras prohibidas + mínimo criterios | CRÍTICA |
| Evidence Leakage | juez_evaluacion | LEAKAGE FILTER pre-check | CRÍTICA |
| Domain Infiltration | agente_materiales_A, agente_materiales_B | Hard-check replace soft-check | ALTA |
| Domain Infiltration | juez_materiales | inputs_from + HERITAGE CHECK | ALTA |
| Chapter References | agente_procedimiento_A, agente_procedimiento_B | Prohibición de referencias a capítulos | MEDIA |

---

## Estado del Documento v2 por Unidad

| Unidad | Ficha | Materiales | Procedimiento | Evaluación | Veredicto |
|---|---|---|---|---|---|
| 2 — Dilución | ✓ objetivo físico, 90 min | ⚠ 2 ítems sin herencia P4 | ✓ verbos coherentes | ✗ evidencia = descripción P4, 1 criterio/5pts insuficiente | Rechazable |
| 3 — Técnicas avanzadas | ✓ | ✓ pinceles, tintas (herencia P4) | ⚠ referencias a capítulos en pasos | ✓ "Miniatura pintada", 2 criterios | Aceptable con ajuste |
