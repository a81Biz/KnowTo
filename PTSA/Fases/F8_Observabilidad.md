---
ptsa_version: 2.0
motor_version: 4.1
fase: F8
estado: COMPLETADA
ultima_actualizacion: 2026-06-14
confidence: 90
---

# F8 — Observabilidad y Trazabilidad Operativa

## Update U-001 | Timestamp: 2026-06-14 05:15

**Fuente:** `docker logs knowto-backend 2>&1` — logs en vivo del backend productivo

---

## 1. Logs en vivo — Hallazgos críticos

### CRÍTICO: `saveArtifactVersion` falla repetidamente (→ H-012)

```
[p2-assembler] CCM saveArtifactVersion falló (no crítico):
  saveArtifactVersion insert failed: invalid input syntax for type uuid: "ensamblador_doc_p2"
[p5-assembler] CCM saveArtifactVersion falló (no crítico): ... "ensamblador_doc_p5"
[p6-assembler] CCM saveArtifactVersion falló (no crítico): ... "ensamblador_doc_p6"
[p7-assembler] CCM saveArtifactVersion falló (no crítico): ... "ensamblador_doc_p7"
[p8-assembler] CCM saveArtifactVersion falló (no crítico): ... "ensamblador_doc_p8"
```

**Patrón:** Repetido 3–5 veces por job para cada producto. El sistema de versionado de artefactos CCM está completamente roto pero silenciado como "no crítico".

### CRÍTICO: Columna `status` no existe en `artifact_versions` (→ H-013)

```
[certification-route] error: artifact_versions query failed:
  column artifact_versions.status does not exist
    at async <anonymous> (/app/src/core/middleware/error.middleware.ts:6:5)
```

La ruta de certificación falla con error 500 en producción.

### Positivo: Project Soul y Project Brief inyectados correctamente

```
[pipeline] Project Soul inyectado (1565 chars)
[pipeline] Project Brief inyectado (anclas semánticas: dominioTecnico, resultadoCentral,
           audienciaPrimaria, nombreOficialCurso)
```

El Semantic Anchor Layer funciona correctamente en producción (contrariamente al fallo en tests).

### Positivo: Fallback de contexto activo

```
[context-compressor] Budget exceeded — omitting P8 from productos_previos (12242 → target 8000)
```

El `context-compressor` detecta cuando el contexto supera el presupuesto de tokens y omite productos de menor prioridad. Esto es un comportamiento de degradación controlada, no un error.

### Advertencia: `[FLOW-BE] Iniciando Pipeline para Desconocido. Contexto Fase 3 cargado: 0 unidades.`

Un pipeline arrancó con el proyecto marcado como "Desconocido" y 0 unidades de F3. Esto puede producir outputs de baja calidad. Puede ser un proyecto de prueba o un error en la lectura del contexto.

### Positivo: Juez funcionando correctamente

```
[PIPELINE] Respuesta preview: {"seleccion": "B", "razon": "Ambas descripciones cumplen
con los criterios de accesibilidad y enfoque práctico para el trabajo. Sin embargo,
la opción B proporciona un detalle adicional sobre cómo evitar errores comunes..."}
```

El juez produce decisiones razonadas y coherentes con el dominio.

---

## 2. Pipeline — Trazabilidad de jobs

| Aspecto | Estado |
|:---|:---|
| `pipeline_jobs.status` tracking | ✅ START → running → SUCCESS/failed |
| `pipeline_agent_outputs` por agente | ✅ Cada agente guarda su output |
| Notificación WebSocket en dev | ✅ `createWsNotifier()` + EventEmitter |
| Notificación Supabase Realtime en prod | ✅ Vía CDC en `pipeline_jobs` |
| Logs `[pipeline] START job=...` y `[pipeline] SUCCESS job=...` | ✅ |
| Error capturado en `pipeline_jobs.error` | ✅ |

---

## 3. Fallbacks documentados y verificados

| Fallback | Verificado |
|:---|:---|
| `enrichContextWithOSINT` → catch → continúa sin OSINT | ✅ Logs lo confirman |
| `getProjectSoul` → catch → continúa sin soul | ✅ En prod funciona; en tests falla (mock) |
| `JSON.parse(juezMatch)` → try-catch → fallback a `{ seleccion: 'A' }` | ✅ Documentado en CLAUDE.md |
| `saveArtifactVersion` → "no crítico" → continúa | ✅ Logs confirman — pero el artefacto NO se guarda |
| `context-compressor` → omite productos de baja prioridad | ✅ Logs confirman |

---

## 4. Errores silenciosos que deberían ser visibles

| Error | Marcado como | Debería ser |
|:---|:---|:---|
| `saveArtifactVersion` falla (UUID inválido) | "no crítico" | WARNING monitoreable |
| `artifact_versions.status` no existe | Error HTTP 500 | Error documentado + migración faltante |
| `Desconocido` como nombre de proyecto | Solo log | Validación en endpoint de entrada |

---

## 5. Seguridad del WebSocket

El WebSocket en `/ws?token=<bearer>` **solo se activa en desarrollo** (`ENVIRONMENT !== 'production'`). En producción, el frontend usa Supabase Realtime. El token en la query string es aceptable en dev ya que:
- Solo acepta `dev-local-bypass`
- Solo corre en la red Docker interna
- En producción el módulo no se registra

**Veredicto:** No es un problema de seguridad en producción.

---

## 6. Vulnerabilidades npm (→ H-014)

```
9 vulnerabilities (5 moderate, 3 high, 1 critical)
- esbuild ≤0.28.0: RCE via NPM_CONFIG_REGISTRY, arbitrary file read (Windows dev server)
- miniflare: via undici, ws
```

Todas en dependencias de build/dev (`tsx`, `wrangler`). No afectan el runtime de producción en Cloudflare Workers.

**Confidence F8:** 90
