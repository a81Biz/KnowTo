---
producto_id: P-002
nombre: Informe de Necesidades de Capacitación (F1)
criticidad: ALTA
estado: VALIDADO
dimension_primaria: D1
confidence: 72
domain_validation:
  semantic_drift_detected: false
  rubric_compliance_score: 85
  cross_coherence_verified: false
hallazgos_relacionados: []
---

# P-002 — Informe de Necesidades de Capacitación (F1)

## Descripción

El informe de necesidades diagnostica las brechas de capacitación del cliente, define los objetivos SMART y perfila al participante. Es la base de todo el diseño instruccional; errores aquí se propagan a todas las fases posteriores.

## Fuente de generación

- **Template:** `src/backend/src/dcfl/prompts/templates/F1-informe-necesidades.md`
- **Tabla BD:** `fase1_informe_necesidades` (Q&A parseado, brechas, objetivos, perfil participante)
- **Flujo post-job:** El sintetizador_final guarda en `fase1_informe_necesidades` via `wizard.route.ts`

## Cadena de trazabilidad

```
P-002 Informe de Necesidades
  ← sintetizador_final (F1 pipeline)
  ← juez (evalúa coherencia con EC0249 / diseño instruccional)
  ← agente_A + agente_B (perspectivas paralelas)
  ← extractor (JSON estructurado del Q&A del cliente)
  ← fase0_componentes + wizard_steps (inputs del usuario)
  ← Acción usuario: responder preguntas del wizard F1
```

## Invariantes de dominio (D1 — EC0366)

- [x] Q&A completo incluido (verificado en BD: `fase1_informe_necesidades`)
- [x] Al menos 1 brecha de capacitación identificada
- [x] Al menos 1 objetivo documentado
- [x] Perfil del participante presente
- [x] Sin Prompt Bleeding detectado en muestra
- [ ] Cross-coherencia con P-007/P-008 no verificada explícitamente en F6

## Estado de validación

**Estado:** VALIDADO (condicional) — F6 no detectó violaciones de dominio directas. La coherencia
inter-producto con downstream (P-007, P-008) no fue verificada en profundidad dado que P-007 tiene
drift semántico que puede haberse originado en F1 o F2 (indeterminado sin trazabilidad inversa
completa a texto).

**confidence:** 72 — validación parcial, coherencia inter-producto no verificada
