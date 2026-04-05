# Guía de Debug — KnowTo

## Arquitectura de desarrollo

```
Browser (localhost:5173)
    ↓ fetch http://localhost:8787/api/...
Node.js + Hono (server.dev.ts, puerto 8787)   ← debuggable con VS Code
    ↓ fetch http://ollama:11434
Ollama Docker (llama3.2:3b)
```

> En desarrollo se usa **Node.js puro** (`server.dev.ts`), no wrangler/workerd.
> workerd bloquea conexiones a IPs privadas (RFC-1918), lo que impediría llegar a Ollama.
> Para producción el deploy sigue siendo `wrangler deploy` → Cloudflare Workers AI.

---

## Opción A — Debug con Docker (recomendado)

### 1. Arrancar los contenedores

```bash
docker compose up -d
```

El backend tarda ~20s en estar listo (npm install + arranque de Node.js).

### 2. Verificar que el backend está corriendo

```bash
curl http://localhost:8787/api/health
# → {"success":true,"service":"knowto-backend",...}
```

### 3. Adjuntar VS Code

1. Abre la paleta de comandos: `Ctrl+Shift+P` → **Debug: Select and Start Debugging**
2. Selecciona **"Backend: Attach (Docker)"**
3. VS Code se conecta al inspector en `localhost:9229`
4. Pon un breakpoint en cualquier archivo de `backend/src/`
5. Haz una petición desde el navegador o con curl — el breakpoint se activará

> Si VS Code dice "could not connect" espera 5 segundos más y vuelve a intentarlo.
> El parámetro `"restart": true` hace que VS Code reintente automáticamente.

### 4. Debug de frontend + backend simultáneo

1. `Ctrl+Shift+P` → **Debug: Select and Start Debugging**
2. Selecciona el compound **"Full Stack (Docker)"**
3. Se abre Chrome en `:5173` y VS Code adjunta el debugger al backend

---

## Opción B — Debug sin Docker (desarrollo nativo)

### Prerrequisitos

```bash
# Ollama corriendo en el host con algún modelo disponible
ollama list   # ver modelos instalados
```

Si no tienes `llama3.2:3b`:
```bash
ollama pull llama3.2:3b
# o bien edita backend/.dev.vars y cambia OLLAMA_MODEL a uno que ya tengas
```

### Arrancar el backend

```bash
cd backend
npm install
npm run dev          # sin debugger, puerto 8787
# o bien:
npm run dev:debug    # con debugger en puerto 9229
```

### Adjuntar VS Code

1. **`Ctrl+Shift+P`** → **"Backend: Launch (Host)"**  
   Esto lanza `server.dev.ts` directamente con el inspector activo.
2. Pon breakpoints en `backend/src/`
3. Haz peticiones al API — los breakpoints se activan

---

## Script de prueba funcional (consola del navegador)

Abre las DevTools en `http://localhost:5173` y pega este script en la consola:

```javascript
// ─────────────────────────────────────────────────────────────────
// KnowTo — Script de prueba funcional
// Ejecutar en la consola del navegador con el frontend en :5173
// ─────────────────────────────────────────────────────────────────

const API  = 'http://localhost:8787';
const AUTH = { Authorization: 'Bearer dev-local-bypass', 'Content-Type': 'application/json' };

async function check(label, fn) {
  process?.stdout?.write?.(`\n${label}... `);
  try {
    const r = await fn();
    console.log(`✅ ${label}`, r);
    return r;
  } catch (e) {
    console.error(`❌ ${label}`, e.message ?? e);
    return null;
  }
}

(async () => {
  console.group('KnowTo API — prueba funcional');

  // 1. Health check
  const health = await check('GET /api/health', async () => {
    const r = await fetch(`${API}/api/health`);
    return r.json();
  });
  if (!health?.success) { console.groupEnd(); return; }

  // 2. Crear proyecto
  const proj = await check('POST /api/wizard/project', async () => {
    const r = await fetch(`${API}/api/wizard/project`, {
      method: 'POST', headers: AUTH,
      body: JSON.stringify({ name: 'Curso Test Debug', clientName: 'Ana García', industry: 'Manufactura' })
    });
    return r.json();
  });
  if (!proj?.data?.projectId) { console.groupEnd(); return; }
  const projectId = proj.data.projectId;
  console.log('  → projectId:', projectId);

  // 3. Listar proyectos
  await check('GET /api/wizard/projects', async () => {
    const r = await fetch(`${API}/api/wizard/projects`, { headers: AUTH });
    return r.json();
  });

  // 4. Guardar paso
  const step = await check('POST /api/wizard/step', async () => {
    const r = await fetch(`${API}/api/wizard/step`, {
      method: 'POST', headers: AUTH,
      body: JSON.stringify({ projectId, stepNumber: 0, inputData: { courseTopic: 'Seguridad' } })
    });
    return r.json();
  });
  if (!step?.data?.stepId) { console.groupEnd(); return; }
  const stepId = step.data.stepId;
  console.log('  → stepId:', stepId);

  // 5. Contexto del proyecto
  await check(`GET /api/wizard/project/${projectId}`, async () => {
    const r = await fetch(`${API}/api/wizard/project/${projectId}`, { headers: AUTH });
    return r.json();
  });

  // 6. Generar documento — puede tardar 30-120s en dev (CPU Ollama sin GPU)
  console.log('\n⏳ Generando documento con Ollama (puede tardar ~60s en CPU)...');
  const gen = await check('POST /api/wizard/generate', async () => {
    const r = await fetch(`${API}/api/wizard/generate`, {
      method: 'POST', headers: AUTH,
      body: JSON.stringify({
        projectId, stepId,
        phaseId: 'F0', promptId: 'F0',
        context: { projectName: 'Curso Test Debug', clientName: 'Ana García', industry: 'Manufactura' },
        userInputs: { courseTopic: 'Seguridad industrial' }
      })
    });
    return r.json();
  });

  if (gen?.data?.content) {
    console.log('\n📄 Documento generado (primeras 300 chars):');
    console.log(gen.data.content.substring(0, 300) + '...');

    // 7. Verificar que el documento F0 contiene las preguntas para el cliente
    //    (el frontend las extraerá y las mostrará como campos en F1)
    const hasQuestions = gen.data.content.includes('Preguntas para el cliente');
    console.log(hasQuestions
      ? '✅ F0 contiene sección "Preguntas para el cliente" → Step 1 las mostrará como inputs'
      : '⚠️  F0 no generó "Preguntas para el cliente" — Step 1 mostrará mensaje de advertencia');
  }

  // 8. Generar formulario dinámico (F6_FORM) — valida el endpoint generate-form
  const form = await check('POST /api/wizard/generate-form', async () => {
    const r = await fetch(`${API}/api/wizard/generate-form`, {
      method: 'POST', headers: AUTH,
      body: JSON.stringify({
        projectId,
        promptId: 'F6_FORM',
        context: { projectName: 'Curso Test Debug', clientName: 'Ana García', industry: 'Manufactura' }
      })
    });
    return r.json();
  });
  if (form?.data?.formSchema) {
    console.log('\n📋 Esquema de formulario generado:');
    console.log('  formTitle:', form.data.formSchema.formTitle);
    console.log('  campos:', form.data.formSchema.fields?.length ?? 0);
  }

  console.groupEnd();
  console.log('\n✅ Prueba completa. Todos los endpoints respondieron correctamente.');
  console.log('\nℹ️  Nota: el Step 1 (F1) depende de que F0 esté generado.');
  console.log('   Las preguntas de F0 se muestran automáticamente como campos en F1.');
  console.log('   Las brechas se pre-rellenan con los gaps del Marco de Referencia.');
  console.log('\nℹ️  generate-form (paso 8 / F6) genera el esquema JSON del formulario dinámico.');
  console.log('   El usuario llena el formulario y luego genera el documento de ajustes.');
})();
```

---

## Verificar conectividad Ollama

```bash
# Ver modelos disponibles
curl http://localhost:11434/api/tags

# Prueba rápida de generación (debe responder en <30s)
curl -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{"model":"llama3.2:3b","prompt":"Di hola en español","stream":false}'
```

---

## Tiempos esperados en desarrollo (CPU, sin GPU)

| Operación | Tiempo esperado |
|---|---|
| Health check | < 50ms |
| Crear/listar proyecto | < 100ms |
| Generar documento (llama3.2:3b, CPU) | 60–180s |
| Generar documento (producción, Workers AI) | 5–15s |

> El tiempo largo en dev es normal — Ollama corre en CPU dentro de Docker.
> Si tienes GPU NVIDIA, descomenta la sección `deploy.resources` en `docker-compose.yml`.

---

## Problemas comunes

| Error | Causa | Solución |
|---|---|---|
| `Network connection lost` | workerd bloqueando IPs privadas | Asegurarse de usar `npm run dev:debug` (Node.js), no `npm run dev:wrangler` |
| `AI generation failed: model not found` | Modelo no descargado | Cambiar `OLLAMA_MODEL` en `.dev.vars` a uno disponible (`ollama list`) |
| `Cannot attach: port 9229 not open` | Backend aún arrancando | Esperar 15s y reintentar; el config tiene `"restart": true` |
| `EADDRINUSE 8787` | Otra instancia corriendo | `pkill -f server.dev` o reiniciar Docker |
| `Unauthorized` | Token incorrecto | Usar exactamente `Bearer dev-local-bypass` |
