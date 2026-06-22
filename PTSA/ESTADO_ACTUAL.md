# ESTADO ACTUAL — Puntero de seguimiento PTSA
**Motor v4.1 | Sobreescribir completo en cada cambio de puntero**
**Timestamp:** 2026-06-21 (sesión S-015 — FPGE-003 PT-208→PT-211)

---

## Estado de la auditoría

**COMPLETADA** — Audit original cerrada 2026-06-14. Delta syncs S-004 → S-015 completados.

**Score Global: 92.5 / 100 — Clasificación A** ✅ (Potable-Water Rule DESACTIVADA: D1=75 ≥ 60)

Cálculo S-015:
- D1: 100 − 15(H-008/Alta) − 5(H-009/Med) − 5(H-031/Med) = **75**
- H-010 → VERIFICADA (+5), H-029 → VERIFICADA (+15), H-030 → VERIFICADA (+1), H-032 → VERIFICADA (+1)
- D2: 100 | D3: 100 | D4: 100
- Health_raw = 75×0.30 + 100×0.30 + 100×0.30 + 100×0.10 = 22.5 + 30 + 30 + 10 = **92.5**
- **Potable-Water Rule: D1 = 75 ≥ 60 → DESACTIVADA → Health = 92.5 → Clasificación A** ✅

---

## Hallazgos activos (3)

| ID | Dim | Sev | Estado | Penalización | Descripción |
|:---:|:---:|:---:|:---:|:---:|:---|
| H-008 | D1 | ALTA | ABIERTA | −15 | P1 Instrumentos: locuciones adverbiales. Fix en prompt (PT-203). Regeneración en curso (job 406b3722). |
| H-009 | D1 | MEDIA | ABIERTA | −5 | P3 módulo drift: nombre LLM ≠ temario_base. Prompt MÓDULO_EXACTO añadido (PT-210). Regeneración pendiente. |
| H-031 | D1 | MEDIA | CORREGIDA | −5 | F6_2a: inventario 16 filas (necesita ≥17). BD-fallback condicional insuficiente. Requiere PT-212. |

## Hallazgos VERIFICADOS (sin penalización activa)

| ID | Dim | Sev | Estado | Verificado en |
|:---:|:---:|:---:|:---:|:---:|
| H-010 | D1 | MEDIA | VERIFICADA ✅ | PT-211 (2026-06-21) |
| H-029 | D1 | ALTA | VERIFICADA ✅ | PT-208 (2026-06-21) |
| H-030 | D1 | BAJA | VERIFICADA ✅ | PT-208 (2026-06-21) |
| H-032 | D1 | BAJA | VERIFICADA ✅ | PT-208 (2026-06-21) |

---

## Resumen sesión S-015 (2026-06-21) — FPGE-003 PT-208→PT-211

### PT-208 — Validación regeneraciones H-029/H-030/H-031/H-032

| Hallazgo | Resultado | Estado nuevo |
|:---:|:---:|:---|
| H-029 | ✅ PASS — EC0366 en ítems 3 y 5 de F6_2b | CORREGIDA → **VERIFICADA** |
| H-030 | ✅ PASS — fecha_inicio 28/03 < fecha_cierre 21/06 (85 días) | CORREGIDA → **VERIFICADA** |
| H-031 | ❌ FAIL — 16 filas < 17 requeridas (BD-fallback no activa en lista parcial) | CORREGIDA (confidence 95→60) |
| H-032 | ✅ PASS — "EC0366" en conclusión F7 | CORREGIDA → **VERIFICADA** |

Bug C (PT-203): #btn-regenerate guarda `disabled=true` antes del primer `await` — verificado en código.

### PT-209 — Regenerar P1 con fix locuciones (H-008)

PT-209.1 ✅: `grep -n "de manera adecuada"` → 4 matches en F4_P1_GENERATE_DOCUMENT.md (locuciones en VOCABULARIO_MEDIBLE).
PT-209.2 IN_PROGRESS: job 406b3722 corriendo (Step 2/5: agente_doc_A, 16:59 UTC).

### PT-210 — Fix prompt F4_P3 MÓDULO_EXACTO (H-009)

PT-210.1 ✅: F4_P3_GENERATE_DOCUMENT.md editado:
  - Extractor: añadida extracción canonical desde `productos_previos.temario_base.temario.modulos[n-1].nombre`
  - RESTRICCIONES_OBLIGATORIAS: regla MÓDULO_EXACTO en agente_ficha_A y agente_ficha_B
PT-210.2 ✅: Backend reiniciado (`GET /health` → 200).
PT-210.3 PENDING: Regeneración P3 pendiente (esperando P1 job).

### PT-211 — Verificación empírica H-010 guardrail TEMARIO_BASE

PT-211.1 ✅: Proyecto `bced68d5-1132-40fa-aa72-bc946867affa` creado (sin F4 products).
PT-211.3 ✅: TEMARIO_BASE generado — job `b13fd751` completado (2026-06-21 16:53).
PT-211.4 ✅: 8 objetivos extraídos — todos con verbos observables.
PT-211.5 ✅: LIMPIO — ningún objetivo contiene vocabulario prohibido.
PT-211.6 ✅: `validarVerbosObservables()` corrió sin emitir warnings → 0 violaciones.
PT-211.7 ✅: H-010 → **VERIFICADA** ✅

---

## Resumen sesión S-014 (2026-06-21) — FDGE PT-202→PT-207 correcciones aplicadas

| PT | Fix | Hallazgo |
|:---:|:---|:---:|
| PT-202 | f6.phase.ts: estandarNorma fallback='EC0366' | H-029 CORREGIDA |
| PT-203 Bug A | F4_P1 prompt: locuciones adverbiales en VOCABULARIO_MEDIBLE | H-008 CORREGIDA (parcial) |
| PT-203 Bug C | step4.production.ts: super._bindEvents() | — VALIDATION_PENDING |
| PT-205 | f6.phase.ts: BD queries + PHASE_DOCUMENT_MAP en F6_2a assembler | H-031 CORREGIDA |
| PT-206 | F6_2b prompt: restricción de fechas CRÍTICA | H-030 CORREGIDA |
| PT-207 | F7 prompt: TRAZABILIDAD NORMATIVA EC0366 | H-032 CORREGIDA |

---

## Próximas acciones (post S-015)

1. **PT-209 pendiente:** job 406b3722 → al completar: verificar `validacion_estado='aprobado'` en BD
   - Branch A (aprobado): H-008 → CORREGIDA_VERIFICADA; delta sync PTSA → D1=90, Health=96.5
   - Branch B (falla): abrir PT-212 con nuevo error específico
2. **PT-210 pendiente:** regenerar P3 (módulo 1) → comparar nombre BD vs. temario_base
   - Si igual: H-009 → CORREGIDA; verificar en siguiente run
3. **PT-212 (nuevo):** refactor `handleF6InventarioAssembler` — BD-list SIEMPRE como base (no condicional)
   - Recupera H-031 → VERIFICADA → D1: 95→100, Health: 100/A+
