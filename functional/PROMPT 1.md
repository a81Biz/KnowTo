# CONTEXTO GENERAL

Eres un ingeniero de software senior especializado en arquitecturas serverless, TypeScript, y diseño instruccional. Vas a construir **KNOWTO**, una aplicación web completa para la certificación en el estándar EC0366 "Desarrollo de cursos de formación en línea" del CONOCER.

## DOCUMENTOS BASE (LEER OBLIGATORIAMENTE)

A continuación se listan los documentos que definen TODO el sistema. No inventes nada. No te saltes nada. Cada documento es una especificación vinculante.

### Documentos de Negocio y Metodología

1. **`1 EXTRACCIÓN DE LA METODOLOGÍA DEL EC0366.md`**
   - Define las 6 fases del proceso de certificación
   - Define los 3 elementos de competencia (E1219, E1220, E1221)
   - Define los 16 productos requeridos para certificación
   - Contiene las decisiones metodológicas validadas

2. **`2 BATERÍA DE PROMPTS ESPECÍFICOS PARA EC0366.md`**
   - Define la estructura de cada prompt de IA (F0 a F6.2)
   - Define el formato estándar que debe seguir cada respuesta
   - Contiene las instrucciones de calidad (qué no hacer)

3. **`3 DIAGRAMA DE FASES.md`**
   - Define el flujo completo de fases con entradas y salidas
   - Define el diagrama entidad-relación para la base de datos
   - Define la tabla de relaciones entre fases

4. **`FASE 0.md` a `FASE 6.md`**
   - Cada archivo contiene el prompt específico para esa fase
   - Define qué debe generar la IA en cada paso del wizard
   - Define los formatos de salida obligatorios

### Documentos Técnicos (Arquitectura)

5. **`BACKEND ARQUITECTURE DOCUMENT.md`**
   - Stack: Cloudflare Workers + Hono + Workers AI + Supabase
   - Estructura de carpetas del backend
   - Servicios: AI Service (con prompt registry), Supabase Service, Validation Service (Zod)
   - API Routes definidas
   - Stored procedures requeridos en Supabase
   - **CRÍTICO:** Los prompts de IA están externalizados en `/prompts/templates/*.md`

6. **`FRONTEND ARCHITECTURE DOCUMENT.md`**
   - Stack: TypeScript + Vite + Vanilla JS (sin frameworks)
   - Estructura de 7 secciones por controlador
   - Templates HTML puros en `/templates/` con `<template>` tags
   - Store singleton para estado global
   - HTTP client centralizado con endpoints SSOT
   - Despliegue en Cloudflare Pages

7. **`DEVELOPMENT & PRODUCTION WORKFLOW.md`**
   - Docker Compose para desarrollo local
   - GitHub Actions para CI/CD
   - Variables de entorno para cada entorno
   - Flujo de trabajo diario

### Prototipo

8. **`code.html`**
   - Prototipo funcional del wizard de 10 pasos
   - Úsalo como referencia visual para la interfaz de usuario
   - La lógica real debe implementarse según los documentos técnicos, no copiar el prototipo directamente

---

## REQUERIMIENTOS DEL APLICATIVO

### Funcionalidad Principal

KNOWTO es un wizard de 10 pasos que guía al usuario a través de las fases F0 a F6.2 del EC0366. Cada paso:

1. **Recibe entrada del usuario** (formularios específicos para cada fase)
2. **Envía datos al backend** (API call a Cloudflare Worker)
3. **El backend genera documentos usando Workers AI** (con prompts externalizados)
4. **El frontend muestra la vista previa del documento generado**

### Características Técnicas Obligatorias

| Componente | Requisito |
|:---|:---|
| **Backend** | Cloudflare Worker con Hono, TypeScript, Workers AI, Supabase client |
| **Frontend** | TypeScript + Vite, Vanilla JS (NO React/Vue/Angular), Tailwind CSS |
| **Templates** | Archivos `.html` separados con `<template>` tags |
| **Controladores** | Estructura de 7 secciones exactamente como en el documento |
| **Prompts IA** | Externalizados en archivos `.md` en `/prompts/templates/` |
| **Base de datos** | Supabase PostgreSQL con stored procedures (`sp_*`) y views (`vw_*`) |
| **Autenticación** | Google OAuth vía Supabase Auth |
| **Despliegue** | Cloudflare Pages (frontend) + Cloudflare Workers (backend) |

### Los 10 Pasos del Wizard

| Paso | Fase | Nombre | Entrada del usuario | Salida IA |
|:---|:---|:---|:---|:---|
| 0 | F0 | Marco de Referencia | Datos del cliente (nombre, proyecto, industria, email) | Documento de marco de referencia |
| 1 | F1 | Necesidades | Confirmación de brechas, objetivos SMART | Informe de necesidades |
| 2 | F2 | Análisis | Modalidad, interactividad, perfil de ingreso | Especificaciones de análisis |
| 3 | F3 | Especificaciones | LMS, reporteo, duración | Especificaciones técnicas |
| 4 | F4 | Producción | Confirmación de estructura | 8 productos de producción |
| 5 | F5.1 | Verificación | Resultados de pruebas | Checklist + plantilla |
| 6 | F5.2 | Evidencias | URLs de capturas | Anexo de evidencias |
| 7 | F6.1 | Ajustes | Observaciones del usuario | Documento de ajustes |
| 8 | F6.2 | Firmas | Nombres para firmas | Lista de verificación de firmas |
| 9 | Cierre | Finalización | Confirmación | Resumen ejecutivo |

---

## INSTRUCCIONES DE IMPLEMENTACIÓN

### Fase 1: Configuración Inicial (Hacer primero)

1. **Crear estructura de carpetas** exactamente como se define en los documentos técnicos
2. **Configurar TypeScript** con `tsconfig.json` para backend y frontend
3. **Configurar Vite** para el frontend con proxy a backend local
4. **Configurar Docker Compose** con todos los servicios (postgres, backend, frontend, ollama)
5. **Configurar Supabase local** con las migraciones SQL (stored procedures)

### Fase 2: Backend (Hacer segundo)

1. **Implementar el Worker** con Hono y las rutas definidas en el documento
2. **Implementar el Prompt Registry** que carga prompts desde archivos `.md`
3. **Implementar el AI Service** que usa Workers AI con los prompts externalizados
4. **Implementar el Supabase Service** con las funciones RPC para stored procedures
5. **Implementar validación Zod** para todas las entradas de API
6. **Escribir pruebas** con Vitest para cada endpoint

### Fase 3: Frontend (Hacer tercero)

1. **Crear los templates HTML** para cada paso (10 templates)
2. **Implementar el Template Loader** con caché
3. **Implementar el HTTP Client** con endpoints centralizados
4. **Implementar el Wizard Store** (singleton) con persistencia en localStorage
5. **Implementar los 10 controladores** (cada uno con las 7 secciones)
6. **Implementar el orquestador principal** (`main.ts`) que maneja la navegación
7. **Implementar autenticación** con Supabase (Google OAuth)

### Fase 4: Integración y Pruebas (Hacer cuarto)

1. **Conectar frontend con backend** (las API calls deben funcionar)
2. **Probar el flujo completo** de un proyecto desde F0 hasta F6.2
3. **Verificar que los documentos generados por IA** tengan el formato correcto
4. **Asegurar que el estado persista** al recargar la página

---

## RESTRICCIONES ABSOLUTAS (NO VIOLAR)

| # | Restricción | Consecuencia si se viola |
|:---|:---|:---|
| 1 | **NO usar React, Vue, Angular, Svelte o cualquier framework frontend** | El frontend debe ser Vanilla JS + TypeScript + Vite |
| 2 | **NO embebir HTML en JavaScript/TypeScript** | Todo HTML debe estar en `/templates/*.html` con `<template>` |
| 3 | **NO escribir lógica de negocio en los controladores** | La lógica de negocio va en helpers o servicios |
| 4 | **NO usar `dangerouslySetInnerHTML` o `innerHTML` para contenido dinámico** | Usar templates y `cloneNode` |
| 5 | **NO escribir URLs de API directamente en el código** | Usar `ENDPOINTS` centralizado (SSOT) |
| 6 | **NO inventar prompts de IA** | Los prompts deben estar en archivos `.md` en `/prompts/templates/` |
| 7 | **NO saltarse ninguna fase** | El wizard debe tener exactamente 10 pasos (F0 a F6.2 + cierre) |
| 8 | **NO omitir stored procedures** | Toda mutación a BD debe pasar por `sp_*` procedures |

---

## FORMATO DE ENTREGA

Genera el aplicativo completo con la siguiente estructura de archivos:

```
knowto/
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── src/
│   │   ├── index.ts
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── prompts/
│   │   │   ├── index.ts
│   │   │   └── templates/
│   │   │       ├── F0-marco-referencia.md
│   │   │       ├── F1-informe-necesidades.md
│   │   │       ├── F2-especificaciones-analisis.md
│   │   │       ├── F3-especificaciones-tecnicas.md
│   │   │       ├── F4-produccion.md
│   │   │       ├── F5-verificacion.md
│   │   │       └── F6-cierre.md
│   │   ├── types/
│   │   └── __tests__/
│   ├── wrangler.toml
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── index.html
│   ├── src/
│   │   ├── main.ts
│   │   ├── controllers/
│   │   │   ├── step0.clientdata.ts
│   │   │   ├── step1.needs.ts
│   │   │   ├── step2.analysis.ts
│   │   │   ├── step3.specs.ts
│   │   │   ├── step4.production.ts
│   │   │   ├── step5.checklist.ts
│   │   │   ├── step6.evidence.ts
│   │   │   ├── step7.adjustments.ts
│   │   │   ├── step8.payment.ts
│   │   │   └── step9.closing.ts
│   │   ├── shared/
│   │   │   ├── http.client.ts
│   │   │   ├── endpoints.ts
│   │   │   ├── ui.ts
│   │   │   ├── template.loader.ts
│   │   │   ├── supabase.client.ts
│   │   │   └── auth.ts
│   │   ├── stores/
│   │   │   └── wizard.store.ts
│   │   └── types/
│   │       └── wizard.types.ts
│   ├── templates/
│   │   ├── tpl-step0-clientdata.html
│   │   ├── tpl-step1-needs.html
│   │   ├── tpl-step2-analysis.html
│   │   ├── tpl-step3-specs.html
│   │   ├── tpl-step4-production.html
│   │   ├── tpl-step5-checklist.html
│   │   ├── tpl-step6-evidence.html
│   │   ├── tpl-step7-adjustments.html
│   │   ├── tpl-step8-payment.html
│   │   ├── tpl-step9-closing.html
│   │   ├── tpl-document-preview.html
│   │   └── tpl-loading.html
│   ├── css/
│   │   └── styles.css
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql
│       ├── 002_auth_tables.sql
│       └── 003_stored_procedures.sql
└── .github/
    └── workflows/
        ├── test.yml
        ├── deploy-backend.yml
        └── deploy-frontend.yml
```

**Genera cada archivo con su contenido completo.** No dejes placeholders. No digas "aquí va el código". Escribe el código real.

---

## EJECUCIÓN

Comienza generando los archivos en este orden:

1. Archivos de configuración raíz (`docker-compose.yml`, `.env.example`)
2. Base de datos (`supabase/migrations/`)
3. Backend (desde `package.json` hasta cada `.ts`)
4. Frontend (desde `package.json` hasta cada `.ts`, `.html`, `.css`)
5. GitHub Actions workflows

No pares hasta que todos los archivos estén generados. Si algo no está especificado en los documentos, usa las mejores prácticas de la industria y documenta tu decisión.

**¡Comienza la Fase 1!**
