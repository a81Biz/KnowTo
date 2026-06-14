---
ptsa_version: 2.0
motor_version: 4.1
fase: F9
estado: COMPLETADA
ultima_actualizacion: 2026-06-14
confidence: 91
---

# F9 — Consolidación de Hallazgos y Cálculo de Scores por Dimensión

## Update U-001 | Timestamp: 2026-06-14 06:00

---

## 1. Inventario completo de hallazgos

| ID | Dimensión | Severidad | Penalización | Estado | Descripción breve |
|:---|:---:|:---:|:---:|:---:|:---|
| H-001 | D4 | MEDIA | -5 | ABIERTA | README/CLAUDE.md rutas pre-reorganización |
| H-002 | D4 | MEDIA | -5 | ABIERTA | TEMARIO_BASE y F7 no documentados en PROYECTO.md |
| H-003 | D4 | MEDIA | -5 | ABIERTA | Modelo Ollama obsoleto en README (`llama3.2:3b` vs `qwen2.5:14b`) |
| H-004 | D4 | BAJA | -1 | ABIERTA | Test count desactualizado en README (152 vs 270) |
| H-005 | D2 | MEDIA | -5 | ABIERTA | Mocks de tests no exponen `getProjectSoul` / `getProjectBrief` |
| H-006 | D2 | BAJA | -1 | ABIERTA | `graphify-out/` contaminando árbol de fuentes en `src/backend/src/` |
| H-007 | D4 | BAJA | -1 | ABIERTA | Estados `validacion_estado` incompletos en CLAUDE.md |
| H-008 | D1 | ALTA | -15 | ABIERTA | P1 Instrumentos rechazado — instrumento mixto + verbo prohibido |
| H-009 | D1 | MEDIA | -5 | ABIERTA | Nombre de módulo en Temario Base inconsistente con productos F4 |
| H-010 | D1 | MEDIA | -5 | ABIERTA | Verbo prohibido "Identificar" en Temario propagado a P-008 y P-011 |
| H-011 | D3 | BAJA | -1 | ABIERTA | TAVILY_API_KEY ausente en `.dev.vars` — OSINT silenciado en dev |
| H-012 | D2 | ALTA | -15 | ABIERTA | `saveArtifactVersion` pasa agent_name como UUID — CCM roto P2–P8 |
| H-013 | D2 | ALTA | -15 | ABIERTA | Columna `artifact_versions.status` no existe — certification-route HTTP 500 |
| H-014 | D2 | MEDIA | -5 | ABIERTA | 9 vulns npm (1 crítica esbuild) en dependencias de build |

**Total hallazgos: 14**
**Severidad crítica: 0 | Alta: 3 | Media: 6 | Baja: 5**

---

## 2. Cálculo de scores por dimensión

### D1 — Alineación de Dominio (peso 30%)

Hallazgos D1: H-008 (-15), H-009 (-5), H-010 (-5)

```
Score_D1 = 100 - 15 - 5 - 5 = 75
```

**Score D1: 75**

Productos afectados:
- P-008 (Instrumentos): RECHAZADO_DOMINIO
- P-007 (Temario): REQUIERE_REVISION
- P-011 (Manual P4): REQUIERE_REVISION
- P-002 (Informe Necesidades): VALIDADO (sin hallazgos directos)

Nota de aplicación del Multiplicador Global: D1 = 75 > 60. La regla de techo NO aplica.

---

### D2 — Integridad Arquitectónica (peso 30%)

Hallazgos D2: H-005 (-5), H-006 (-1), H-012 (-15), H-013 (-15), H-014 (-5)

```
Score_D2 = 100 - 5 - 1 - 15 - 15 - 5 = 59
```

**Score D2: 59**

Notas:
- H-012 y H-013 juntos representan el colapso del sistema CCM (Gestión de Versiones de Artefactos).
- H-005 indica que el 100% de los tests de integración que dependen de `getProjectSoul` / `getProjectBrief` tienen mocks incorrectos y no prueban el comportamiento real.
- H-014 (vulnerabilidad crítica de esbuild) afecta solo al entorno de desarrollo.

---

### D3 — Trazabilidad y Observabilidad (peso 30%)

Hallazgos D3: H-011 (-1)

```
Score_D3 = 100 - 1 = 99
```

**Score D3: 99**

Positivos verificados:
- Pipeline tracking completo (`pipeline_jobs` + `pipeline_agent_outputs`) ✅
- Project Soul y Project Brief inyectados correctamente en prod ✅
- Juez produce decisiones razonadas ✅
- Fallbacks documentados y activos ✅
- Logs estructurados con prefijos identificables ✅
- WebSocket dev-only (no riesgo en producción) ✅
- context-compressor activo y trazable ✅

---

### D4 — Fidelidad Documental (peso 10%)

Hallazgos D4: H-001 (-5), H-002 (-5), H-003 (-5), H-004 (-1), H-007 (-1)

```
Score_D4 = 100 - 5 - 5 - 5 - 1 - 1 = 83
```

**Score D4: 83**

Notas:
- La reorganización estructural (`backend/` → `src/backend/`) es real y el código funciona,
  pero la documentación (README, PROYECTO.md) no fue actualizada en sincronía.
- `AI_ARCHITECTURE_RULES.md` es el documento más actualizado y coherente con el código.

---

## 3. Resumen de scores por dimensión

| Dimensión | Score | Peso | Contribución al Score Global |
|:---:|:---:|:---:|:---:|
| D1 — Alineación de Dominio | 75 | 30% | 22.5 |
| D2 — Integridad Arquitectónica | 59 | 30% | 17.7 |
| D3 — Trazabilidad/Observabilidad | 99 | 30% | 29.7 |
| D4 — Fidelidad Documental | 83 | 10% | 8.3 |

---

## 4. Cálculo del Score Global

```
Score_Global = (D1 × 0.30) + (D2 × 0.30) + (D3 × 0.30) + (D4 × 0.10)
Score_Global = (75 × 0.30) + (59 × 0.30) + (99 × 0.30) + (83 × 0.10)
Score_Global = 22.5 + 17.7 + 29.7 + 8.3
Score_Global = 78.2
```

**Verificación del Multiplicador Global (Regla del Agua Potable):**
- D1 = 75 ≥ 60 → La regla de techo NO aplica
- Score Global = Score Global Calculado = **78.2**

**Clasificación ejecutiva:**
- A: 90–100 — Sistema de Excelencia
- **B: 70–89 — Sistema Funcional con Deuda Técnica**
- C: 50–69 — Sistema en Riesgo
- F: <50 — Sistema Inviable

**→ Clasificación: B (78.2 / 100)**

---

## 5. Prioridad de corrección

### Inmediato (bloquean funcionalidad crítica)

1. **H-013** — Columna `artifact_versions.status`: La ruta de certificación falla con HTTP 500. Corrección: usar `is_active = true` o añadir migración 048. Estimación: 30 min.
2. **H-012** — `saveArtifactVersion` UUID inválido: El CCM está completamente roto. Corrección: pasar `userId` en lugar del nombre del agente. Estimación: 1 hora.

### Crítico para el dominio (bloquean certificación EC0366)

3. **H-009 + H-010** — Temario Base (P-007): Corregir nombre del módulo y verbo del objetivo. **Desencadenará la regeneración en cascada de P-008 y P-011**. Estimación: regenerar 1 proyecto de prueba = 15 min de processing.
4. **H-008** — P1 Instrumentos: Consecuencia de H-009/H-010. Se resolverá automáticamente al regenerar con temario corregido.

### Deuda técnica (no urgente)

5. **H-005** — Actualizar mocks de tests para incluir `getProjectSoul` y `getProjectBrief`.
6. **H-014** — Actualizar `wrangler` a v4+ para eliminar vulnerabilidades de esbuild.
7. **H-001 / H-002 / H-003 / H-004 / H-007** — Actualización documental (README, CLAUDE.md, PROYECTO.md).
8. **H-006** — Mover/excluir `graphify-out/` del árbol de fuentes.
9. **H-011** — Añadir `TAVILY_API_KEY` en `.dev.vars.example` con instrucciones de obtención.

**Confidence F9:** 91
