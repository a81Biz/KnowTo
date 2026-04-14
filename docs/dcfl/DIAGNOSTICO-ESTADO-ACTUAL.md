# DIAGNÓSTICO DEL ESTADO ACTUAL — DCFL (EC0366)

**Fecha:** 2026-04-14  
**Versión del sistema investigada:** rama `feat/unified-core`

---

## Resumen ejecutivo

El sistema DCFL tiene una arquitectura de pipeline multi-agente que, en teoría, es correcta: el juez está definido y se ejecuta. Sin embargo, existen **cuatro problemas críticos** que corrompen la calidad del output antes de que llegue al usuario:

1. Las instrucciones de IA (secciones como `## INSTRUCCIONES DE CALIDAD`) **no se filtran** en ningún punto del stack, por lo que aparecen en los PDFs finales.
2. El template de F2.5 **permite rangos** (`5-7 videos`) en lugar de números concretos porque no tiene etapa de juez.
3. El formulario F3 se prellena **parcialmente** (3 de 5 campos coinciden; `activitiesCount` no tiene campo correspondiente).
4. Los tests **no verifican** la ausencia de placeholders ni de instrucciones de IA, por lo que pasan aunque el output sea de baja calidad.

Los problemas 1 y 3 (botón de Producción, extracción de preguntas F0→F1) quedan **resueltos** en el código actual de esta rama, aunque el usuario todavía los experimenta en producción/desarrollo porque el backend no ha sido redesplegado.

---

## P1 — ¿Se está ejecutando el juez?

### Hallazgo
**SÍ, el juez se ejecuta.** Está definido en el frontmatter YAML de cada template como un `pipeline_step` de tipo `judge`, y `_runPipeline()` en el AI service lo ejecuta como último paso.

### Evidencia

**Frontmatter de F0** — [backend/src/dcfl/prompts/templates/F0-marco-referencia.md](backend/src/dcfl/prompts/templates/F0-marco-referencia.md) líneas 18-25:
```yaml
  - agent: judge
    rules:
      - "CRÍTICO: La sección '### Preguntas para el cliente (máximo 10)' DEBE existir..."
      - "Confirma que cada celda de tabla contiene datos reales..."
      - "Reemplaza cualquier placeholder restante [X], [nombre], [texto]..."
      - "Devuelve el documento completo en Markdown válido."
```

**AI service — caso judge** — [backend/src/core/services/ai.service.ts](backend/src/core/services/ai.service.ts) líneas 171-188:
```typescript
case 'judge': {
  const rulesText = step.rules
    ? step.rules.map((r) => `- ${r}`).join('\n')
    : 'Valida el documento y emite la redacción final en el esquema previsto.';
  const docToReview =
    out.synthesizer || out.specialist_b || out.specialist_a || ...;
  promptText =
    `ERES EL JUEZ (VALIDADOR FINAL). Revisa, audita y emite el Markdown o JSON final.\n\n` +
    `REGLAS DE AUDITORÍA:\n${rulesText}\n\n` +
    `DOCUMENTO A EVALUAR:\n${docToReview}\n\n` +
    `ESQUEMA DE SALIDA ESPERADO:\n${template}`;
  break;
}
```

**Prioridad del output** — línea 206-209:
```typescript
return (
  out['judge'] || out['synthesizer'] || out['specialist_b'] || ...
);
```

### Diagnóstico
El juez **se ejecuta correctamente** para F0, F1, F2, F3 y los 8 productos F4. F2.5 es el único prompt sin `pipeline_steps` (usa `_runLegacy`) y por tanto **no tiene juez**.

**Problema real:** El juez recibe las instrucciones del prompt como su "ESQUEMA DE SALIDA ESPERADO" — esto incluye secciones como `## INSTRUCCIONES DE CALIDAD` que están en la plantilla. Los modelos a veces copian el esquema de salida en lugar de solo producir el documento. Ver P4.

### Recomendación
- F2.5 necesita urgentemente una etapa de juez.
- Separar las instrucciones de IA del esquema de salida en los templates (ver P4).

---

## P2 — ¿El extractor F0 → F1 está configurado correctamente?

### Hallazgo
**La regex coincide con el heading del template.** Si F0 genera la sección correctamente, F1 la debería encontrar. El problema reportado por el usuario (F1 no encontraba preguntas) se debía a que los modelos omitían la sección o la generaban con formato incorrecto.

### Evidencia

**Regex en step1.needs.ts** — [frontend/dcfl/src/controllers/step1.needs.ts](frontend/dcfl/src/controllers/step1.needs.ts) líneas 18-19:
```typescript
const sectionMatch = content.match(
  /###\s+Preguntas para el cliente[^\n]*\n([\s\S]*?)(?=\n---|\n##|\n###|$)/i,
);
```

**Heading en el template F0** — [backend/src/dcfl/prompts/templates/F0-marco-referencia.md](backend/src/dcfl/prompts/templates/F0-marco-referencia.md) línea 115:
```markdown
### Preguntas para el cliente (máximo 10)
```

Ambos usan exactamente `###` + `Preguntas para el cliente`. La regex es case-insensitive y acepta texto adicional (`(máximo 10)`). **El formato coincide.**

### Diagnóstico
El fallo no es de código sino de **calidad del modelo**: el synthesizer eliminaba o resumía las preguntas, y el juez no las regeneraba porque su instrucción era vaga. Los cambios en esta rama (specialist_b más explícito, synthesizer con instrucción de NO eliminar preguntas, juez con regla crítica de regenerarlas) **corrigen este problema** cuando el backend se redespliegue.

### Recomendación
No requiere cambios de código adicionales. Verificar tras redespliegue.

---

## P3 — ¿Por qué no funciona el botón "Generar Producto"?

### Hallazgo
**El botón SÍ funciona en el código actual** (esta rama). El bug fue identificado y corregido en la sesión anterior. En versiones anteriores, `_bindEvents()` se ejecutaba antes que `_cacheSubDom()`, dejando `_subDom.btnApproveProduct` como `undefined`.

### Evidencia

**Código anterior (bug):**
```typescript
// super.mount() llamaba _bindEvents() internamente
// _cacheSubDom() se llamaba DESPUÉS → _subDom era undefined al bindear
override async mount(container: HTMLElement): Promise<void> {
  await super.mount(container);  // _bindEvents() se ejecuta aquí
  this._cacheSubDom();           // DEMASIADO TARDE
```

**Código actual (corregido)** — [frontend/dcfl/src/controllers/step4.production.ts](frontend/dcfl/src/controllers/step4.production.ts) líneas 235-249:
```typescript
override async mount(container: HTMLElement): Promise<void> {
  await super.mount(container);
  this._cacheSubDom();           // línea 237 — ANTES de bindSubDomEvents
  // ...
  this._bindSubDomEvents();      // línea 245 — DESPUÉS de cacheSubDom ✓
  this._updateProductHeader();
  this._renderProductIndicators();
  this._showGenerateArea();
}
```

**Formulario HTML** — [frontend/dcfl/templates/tpl-step4-production.html](frontend/dcfl/templates/tpl-step4-production.html):
- `id="form-step5"` presente ✓
- Botón submit presente ✓
- `_cacheDOM()` de BaseStep busca `#form-step${stepNumber}` = `#form-step5` ✓

### Diagnóstico
El bug está **corregido en esta rama**. Si el usuario aún lo experimenta, es porque trabaja con una versión anterior del código que no ha recargado en el navegador (puede requerir hard-refresh o borrar caché).

### Recomendación
Verificar en el navegador con Ctrl+Shift+R (hard refresh) tras redespliegue.

---

## P4 — ¿Por qué aparecen instrucciones de IA en los PDFs? ⚠️ CRÍTICO

### Hallazgo
**No existe ningún filtro** que elimine secciones de instrucciones (`## INSTRUCCIONES DE CALIDAD`, blockquotes con `> Criterio:`, etc.) entre la respuesta del modelo y el PDF final.

### Evidencia

**Template F2.5 con instrucciones internas** — [backend/src/dcfl/prompts/templates/F2_5-recomendaciones.md](backend/src/dcfl/prompts/templates/F2_5-recomendaciones.md) líneas 125-129:
```markdown
## INSTRUCCIONES DE CALIDAD
- Las referencias bibliográficas DEBEN ser reales...
- Si no tienes certeza de un dato bibliográfico...
- Adapta TODO al contexto específico del curso...
- Responde SOLO en español.
```
Esta sección está en el cuerpo del template, NO en el frontmatter. Los modelos la ven como parte del "esquema de salida esperado" y a veces la incluyen en su respuesta.

**AI service `_clean()` — filtros actuales** — [backend/src/core/services/ai.service.ts](backend/src/core/services/ai.service.ts) líneas 238-243:
```typescript
private _clean(text: string): string {
  return text
    .replace(/^```(?:markdown|md)?\s*\n?/i, '')  // elimina apertura de bloque de código
    .replace(/\n?```\s*$/i, '')                    // elimina cierre de bloque de código
    .trim();
}
```
Solo elimina marcadores de código. **No filtra instrucciones.**

**Frontend `cleanMarkdownForPDF()`** — [frontend/core/src/ui.ts](frontend/core/src/ui.ts) líneas 253-262:
```typescript
export function cleanMarkdownForPDF(content: string): string {
  return content
    .replace(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```\s*$/i, '$1')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')   // elimina tags <think>
    .replace(/^-{10,}\s*$/gm, '')                // elimina líneas de guiones
    .trim();
}
```
Solo elimina bloques de código, tags `<think>`, y líneas de guiones. **No filtra `## INSTRUCCIONES DE CALIDAD`.**

**Sin post-procesamiento en la ruta** — [backend/src/dcfl/routes/wizard.route.ts](backend/src/dcfl/routes/wizard.route.ts): el content devuelto por `ai.generate()` se guarda directamente en Supabase y se devuelve al cliente sin ningún filtro adicional.

### Diagnóstico
El problema tiene **dos causas** a corregir:

1. Las instrucciones están en el cuerpo del template mezcladas con el esquema de salida. El modelo las confunde con contenido a generar.
2. No hay post-procesamiento que elimine estas secciones aunque el modelo las incluya.

### Recomendación — ALTA PRIORIDAD
**Corrección inmediata en `ai.service.ts`** — agregar filtro en `_clean()`:
```typescript
private _clean(text: string): string {
  return text
    .replace(/^```(?:markdown|md)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    // Eliminar secciones de instrucciones internas que el modelo copió:
    .replace(/\n## INSTRUCCIONES DE CALIDAD[\s\S]*?(?=\n## |\n# |$)/gi, '')
    .replace(/\n## INSTRUCCIONES[\s\S]*?(?=\n## |\n# |$)/gi, '')
    .replace(/\n> \*\*Instrucciones[\s\S]*?(?=\n[^>]|\n$|$)/gm, '')
    // Eliminar texto de presentación del modelo ("Aquí te presento..."):
    .replace(/^(Aquí te presento|A continuación|He generado|El siguiente es)[^\n]*\n/gim, '')
    .trim();
}
```

**Corrección estructural en templates** — mover `## INSTRUCCIONES DE CALIDAD` al frontmatter (como `notes:`) o a un separador explícito que el juez no copie.

---

## P5 — ¿Por qué aparecen rangos (`5-7`) en F2.5?

### Hallazgo
El template F2.5 **permite rangos explícitamente** en su sección de salida, y F2.5 **no tiene juez** que los rechace.

### Evidencia

**Template F2.5 usa rangos** — [backend/src/dcfl/prompts/templates/F2_5-recomendaciones.md](backend/src/dcfl/prompts/templates/F2_5-recomendaciones.md) líneas 91-98:
```markdown
| Tipo | Tiempo estimado | Cantidad sugerida |
|:---|:---|:---|
| Video explicativo | 2–3 min | [N] |
| Actividad práctica | 4–7 min | [N] |
| Lectura/PDF | 5–10 min | [N] |
```
Los rangos como `2–3 min`, `4–7 min` son parte del **formato de salida** del template.

**F2.5 no tiene pipeline_steps** — el frontmatter de F2_5-recomendaciones.md no contiene `pipeline_steps:`, confirmando que usa `_runLegacy()` sin juez.

**Impacto en la extracción del frontend** — [frontend/dcfl/src/controllers/step3.specs.ts](frontend/dcfl/src/controllers/step3.specs.ts) líneas 21-22:
```typescript
const videosMatch = f25Content.match(/(\d+)\s*video[s]?\b/i);
// Con "5-7 videos", captura solo "5"
```
El regex captura el primer número de un rango. Para `"5-7 videos"` → `videosCount = "5"`. El valor es parcialmente correcto pero pierde la intención del rango.

### Diagnóstico
Doble origen: (a) el template permite rangos por diseño, (b) no hay validación que fuerce números concretos. La extracción del frontend captura el primer número del rango, lo cual es un workaround funcional pero no ideal.

### Recomendación
**En el template F2.5** — cambiar los rangos del formato de salida a valores concretos con nota:
```markdown
| Video explicativo | 3 min (ajustable 2–5 min) | [N] |
```
**Agregar pipeline_steps con juez a F2.5** que rechace rangos sin valor único.

---

## P6 — ¿Por qué no se prellena el formulario F3?

### Hallazgo
**Tres campos se prellenan correctamente. Dos no**, por discrepancia de nombres entre lo que extrae el controlador y los atributos `name` del HTML.

### Evidencia

**Campos que extrae `_prefillFromF25()`** — [frontend/dcfl/src/controllers/step3.specs.ts](frontend/dcfl/src/controllers/step3.specs.ts):
```
videosCount      ← extrae
videoDuration    ← extrae
activitiesCount  ← extrae (¡nombre incorrecto!)
reportFrequency  ← extrae
totalHours       ← extrae (¡no existe en el form!)
```

**Atributos `name` en el HTML** — [frontend/dcfl/templates/tpl-step3-specs.html](frontend/dcfl/templates/tpl-step3-specs.html):
```html
name="platform"              <!-- no se extrae de F2.5 -->
name="platformReason"        <!-- no se extrae de F2.5 -->
name="reportingActivities"   <!-- ← nombre diferente al extraído -->
name="reportFrequency"       ✓ coincide
name="videosCount"           ✓ coincide
name="videoDuration"         ✓ coincide
<!-- totalHours: NO existe en el form -->
```

**Mapa de coincidencias:**

| Clave extraída | Campo HTML | Resultado |
|:---|:---|:---|
| `videosCount` | `name="videosCount"` | ✅ Se prellena |
| `videoDuration` | `name="videoDuration"` | ✅ Se prellena |
| `reportFrequency` | `name="reportFrequency"` | ✅ Se prellena |
| `activitiesCount` | `name="reportingActivities"` | ❌ No coincide |
| `totalHours` | (no existe) | ❌ Sin campo destino |

### Diagnóstico
El método `_prefillFromF25()` fue creado sin verificar los `name` del HTML. El campo `activitiesCount` necesita renombrarse a `reportingActivities` en la extracción.

### Recomendación
**Corrección simple en `step3.specs.ts`** — [frontend/dcfl/src/controllers/step3.specs.ts](frontend/dcfl/src/controllers/step3.specs.ts) línea 31:
```typescript
// Cambiar:
if (actMatch?.[1]) suggestions['activitiesCount'] = actMatch[1];
// Por:
if (actMatch?.[1]) suggestions['reportingActivities'] = actMatch[1];
```
Y eliminar la extracción de `totalHours` que no tiene campo destino.

---

## P7 — ¿Por qué pasan los tests si el sistema falla?

### Hallazgo
Los tests cubren **routing e integración de endpoints** pero NO la calidad del contenido generado. El `AIService` está completamente mockeado, por lo que ningún test verifica el output real del pipeline.

### Evidencia

**Mock de AIService** — [backend/src/__tests__/routes/wizard.e2e.test.ts](backend/src/__tests__/routes/wizard.e2e.test.ts) líneas 40-44:
```typescript
vi.mock('../../core/services/ai.service', () => ({
  AIService: vi.fn().mockImplementation(() => ({
    generate: mockAiGenerate,
  })),
}));
```
```typescript
const mockAiGenerate = vi.fn().mockResolvedValue('# Documento generado\nContenido de prueba.');
```

**Lo que NO se prueba:**
- Ausencia de `[N]`, `[X]`, `[texto]` en output
- Ausencia de `## INSTRUCCIONES DE CALIDAD` en output
- Existencia de `### Preguntas para el cliente` en F0
- Calidad del documento según EC0366
- Comportamiento real del juez

**No existen tests DCFL-específicos.** No hay directorio `backend/src/__tests__/dcfl/`. Las rutas DCFL se prueban en el mismo `wizard.e2e.test.ts` que también cubre lógica compartida.

### Diagnóstico
Los tests son de **smoke testing** — verifican que el sistema no explota, no que produce output de calidad. Esto es un gap de cobertura intencional o no abordado.

### Recomendación
Agregar tests de calidad de contenido en `backend/src/__tests__/dcfl/content-quality.test.ts`:
```typescript
it('F0 output does not contain AI instruction sections', async () => {
  const content = await runRealPipeline('F0', testContext);
  expect(content).not.toMatch(/## INSTRUCCIONES DE CALIDAD/);
  expect(content).not.toMatch(/\[N\]|\[X\]|\[texto\]/);
  expect(content).toMatch(/### Preguntas para el cliente/);
});
```

---

## Lista de prioridades

### 🔴 Prioridad 1 — Crítico (corregir esta semana)

| # | Problema | Archivo | Corrección |
|:---|:---|:---|:---|
| 1 | Instrucciones de IA en PDFs | `backend/src/core/services/ai.service.ts` | Agregar filtros en `_clean()` |
| 2 | F2.5 sin juez — rangos en output | `backend/src/dcfl/prompts/templates/F2_5-recomendaciones.md` | Agregar `pipeline_steps` con juez |

### 🟡 Prioridad 2 — Importante (corregir próxima semana)

| # | Problema | Archivo | Corrección |
|:---|:---|:---|:---|
| 3 | Campo `activitiesCount` ≠ `reportingActivities` | `frontend/dcfl/src/controllers/step3.specs.ts` línea 31 | Renombrar clave extraída |
| 4 | F3 no prellena `reportingActivities` ni `totalHours` | Mismo archivo | Eliminar `totalHours`, corregir nombre |
| 5 | Instrucciones de IA en template F2.5 | Template F2.5 | Mover `## INSTRUCCIONES` al frontmatter |

### 🟢 Prioridad 3 — Mejora de calidad

| # | Problema | Archivo | Corrección |
|:---|:---|:---|:---|
| 6 | Tests no verifican calidad de contenido | `backend/src/__tests__/` | Crear `dcfl/content-quality.test.ts` |
| 7 | `cleanMarkdownForPDF` no filtra instrucciones | `frontend/core/src/ui.ts` | Agregar regex de limpieza |

---

## Archivos críticos que requieren modificación inmediata

1. **[backend/src/core/services/ai.service.ts](backend/src/core/services/ai.service.ts)** — Agregar filtros en `_clean()` para eliminar secciones de instrucciones de IA del output
2. **[backend/src/dcfl/prompts/templates/F2_5-recomendaciones.md](backend/src/dcfl/prompts/templates/F2_5-recomendaciones.md)** — Agregar `pipeline_steps` con juez que rechace rangos y requiera valores concretos
3. **[frontend/dcfl/src/controllers/step3.specs.ts](frontend/dcfl/src/controllers/step3.specs.ts)** línea 31 — Cambiar `activitiesCount` → `reportingActivities`

---

## Archivos que YA están corregidos en esta rama

- [backend/src/dcfl/prompts/templates/F0-marco-referencia.md](backend/src/dcfl/prompts/templates/F0-marco-referencia.md) — Juez reforzado para garantizar preguntas
- [frontend/dcfl/src/controllers/step4.production.ts](frontend/dcfl/src/controllers/step4.production.ts) — Orden de binding corregido
- Todos los templates F0–F6 — Placeholders `{{projectName}}`, `{{clientName}}`, `{{fechaActual}}` sustituidos
- [backend/src/core/services/ai.service.ts](backend/src/core/services/ai.service.ts) — Parámetros `projectName`/`clientName` añadidos al render
