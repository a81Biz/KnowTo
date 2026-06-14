---
ptsa_version: 2.0
motor_version: 4.1
fase: F7
estado: COMPLETADA
ultima_actualizacion: 2026-06-14
confidence: 88
---

# F7 — Fidelidad Documental

## Update U-001 | Timestamp: 2026-06-14 05:15

---

## 1. Documentos auditados

| Documento | Ubicación |
|:---|:---|
| README.md | `c:\DevOps\Desarrollos\KnowTo\README.md` |
| PROYECTO.md | `c:\DevOps\Desarrollos\KnowTo\PROYECTO.md` |
| CLAUDE.md | `c:\DevOps\Desarrollos\KnowTo\CLAUDE.md` |
| AI_ARCHITECTURE_RULES.md | `c:\DevOps\Desarrollos\KnowTo\docs\AI_ARCHITECTURE_RULES.md` |
| docker-compose.yml | `c:\DevOps\Desarrollos\KnowTo\docker-compose.yml` |

---

## 2. Matriz de coherencia documentación vs realidad

### README.md

| Afirmación documentada | Estado real | Veredicto |
|:---|:---|:---:|
| Stack: `Ollama llama3.2:3b` | `qwen2.5:14b` + `gemma2:27b` | ❌ |
| Estructura: `backend/`, `frontend/` en raíz | `src/backend/`, `src/frontend/` | ❌ |
| 152 tests en ~13 suites | 270 tests en 29 suites | ❌ |
| Migraciones hasta 010 (tabla README) | 48 migraciones (000–047) | ❌ |
| ~10 tablas en BD | 29 tablas | ❌ |
| Wizard F0–F6, 12 pasos | F0–F7 + TEMARIO_BASE | ❌ |
| API endpoints listados | Faltan `/fase1/informe`, `/f4-productos`, test routes | ❌ |
| `dev-local-bypass` funciona | Correcto ✅ | ✅ |
| CORS dinámico sin dominios hardcodeados | Verificado en `index.ts` | ✅ |
| Supabase Studio unhealthy (bug cosmético) | Confirmado, Studio funciona | ✅ |
| Docker compose up -d levanta todo | Verificado, 13 contenedores healthy | ✅ |

### CLAUDE.md

| Afirmación documentada | Estado real | Veredicto |
|:---|:---|:---:|
| `cd src/backend` en Commands | Ruta correcta post-reorganización | ✅ |
| `backend/src/` en "Backend structure" | Debe ser `src/backend/src/` | ⚠️ |
| Rutas de archivos en ejemplos | Mezcla de rutas viejas y nuevas | ⚠️ |
| Estados `validacion_estado`: aprobado, aprobado_por_fallback, revision_humana | Falta `rejected`, `aprobado_con_errores` | ❌ |
| `_reglas_globales` inyectadas en enrichedContext | Verificado en `document.handlers.ts:218` | ✅ |
| `project_brief` en migration 040 | Confirmado en BD real | ✅ |
| `saveF4Produto` hace DELETE + INSERT | Sin verificar (no auditado directamente) | ❓ |
| `validacion_estado VARCHAR(30)` migration 035 | Confirmado en schema real | ✅ |

### AI_ARCHITECTURE_RULES.md

| Afirmación documentada | Estado real | Veredicto |
|:---|:---|:---:|
| "REORG 2026-06-12: código vive bajo `src/`" | Correcto — reorganización aplicada | ✅ |
| Phase Gateway en `pipeline-router.helper.ts` | Confirmado, no tiene lógica de negocio | ✅ |
| Prompts en `.md` con YAML frontmatter | Confirmado, 33 templates | ✅ |
| Patrón batalla A+B+juez | Confirmado en todos los pipelines F4 | ✅ |
| Ensambladores deben `return finalDoc` | Verificado en f4.phase.ts | ✅ |

### PROYECTO.md

| Afirmación documentada | Estado real | Veredicto |
|:---|:---|:---:|
| Wizard 12 pasos F0–F6 | F0–F7 + TEMARIO_BASE (14+ pasos) | ❌ |
| P5 = "Plan de Evaluación del Aprendizaje" | Handler: `p5-guias-actividades.handler.ts`; documento: "Guías de Actividades" | ⚠️ |
| Archivos clave: `backend/src/...` | Ahora en `src/backend/src/...` | ❌ |
| Orden generación F4: `P4→P1→P3→P2→P5→P7→P6→P8` | Tests confirman este orden (wizard.async.e2e) | ✅ |

---

## 3. Hallazgos D4 identificados

| ID | Descripción | Severidad |
|:---|:---|:---:|
| H-001 | README/CLAUDE.md referencian rutas pre-reorganización | MEDIA |
| H-002 | TEMARIO_BASE y F7 no documentados en PROYECTO.md | MEDIA |
| H-003 | Modelo Ollama obsoleto en README (`llama3.2:3b` vs `qwen2.5:14b`) | MEDIA |
| H-004 | Test count desactualizado en README (152 vs 270) | BAJA |
| H-007 | Estados validacion_estado incompletos en CLAUDE.md | BAJA |

**Total penalización D4:** H-001(5) + H-002(5) + H-003(5) + H-004(1) + H-007(1) = **17 puntos**

---

## 4. Documentos coherentes con realidad (positivos)

- `AI_ARCHITECTURE_RULES.md`: coherente con el código real, incluye nota de reorganización
- `docker-compose.yml`: correctamente actualizado a `./src/`
- Implementación del auth middleware: coherente con documentación
- Patrón de pipelines (YAML frontmatter, battle pattern): coherente

**Confidence F7:** 88
