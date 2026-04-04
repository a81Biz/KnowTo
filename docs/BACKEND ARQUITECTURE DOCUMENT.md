## BACKEND ARQUITECTURE DOCUMENT (V2)

---

# KNOWTO - BACKEND ARQUITECTURE DOCUMENT
**Version:** 2.0
**Date:** 2026-04-02
**Status:** STANDARD - CONVENTION - DO NOT DEVIATE

---

## 1. PRINCIPIOS FUNDAMENTALES (NO NEGOCIABLES)

| Principio | Regla |
|:---|:---|
| **Externalización de Prompts** | Todo prompt de IA > 200 caracteres DEBE estar en `/prompts/*.md` |
| **SSOT (Single Source of Truth)** | Los schemas Zod son la única fuente de verdad para validación |
| **Convención sobre Configuración** | Los nombres de archivos determinan su propósito |
| **Cero Spanglish** | Todo código, variables, comentarios en inglés |
| **TDD** | No se escribe código sin test primero |

---

## 2. ESTRUCTURA DE PROMPTS (EXTERNALIZADOS)

```
src/prompts/
├── index.ts                    # Prompt loader y registry
├── schemas/                    # JSON schemas para validar prompts
│   └── prompt.schema.json
├── templates/                  # Los prompts en markdown
│   ├── F0-marco-referencia.md
│   ├── F1-informe-necesidades.md
│   ├── F2-especificaciones-analisis.md
│   ├── F3-especificaciones-tecnicas.md
│   ├── F4-produccion.md
│   ├── F5-evaluacion.md
│   └── F6-cierre.md
└── variables/                  # Variables reutilizables
    ├── section-industria.md
    ├── section-competencia.md
    └── section-metodologia.md
```

---

## 3. FORMATO DE ARCHIVO DE PROMPT (.MD)

Cada archivo de prompt sigue esta estructura estandarizada:

```markdown
---
id: F0
name: Marco de Referencia del Cliente
version: 1.0.0
author: KnowTo Team
last_updated: 2026-04-02
tags: [certificacion, EC0366, diagnostico]
---

# SISTEMA
Eres un experto en diseño instruccional certificado en el estándar EC0366 del CONOCER.

# OBJETIVO
Generar el documento de MARCO DE REFERENCIA DEL CLIENTE para un proceso de certificación de cursos en línea.

# CONTEXTO
{{context}}

# INSTRUCCIONES
1. Analiza el contexto proporcionado
2. Investiga o infiere datos faltantes basados en mejores prácticas del sector
3. Genera el documento siguiendo la estructura exacta que se detalla abajo

# ESTRUCTURA OBLIGATORIA DEL DOCUMENTO

## 1. ANÁLISIS DEL SECTOR/INDUSTRIA
- Tamaño del mercado
- Tendencias principales
- Regulaciones aplicables
- Certificaciones obligatorias

## 2. MEJORES PRÁCTICAS PARA CURSOS EN LÍNEA EN ESTE SECTOR
- Formato/duración típica
- Modalidad predominante
- Estrategias de enseñanza
- Nivel de interactividad esperado

## 3. COMPETENCIA IDENTIFICADA
Tabla con: Curso, Plataforma, Precio, Alumnos, Enfoque, Oportunidad

## 4. ESTÁNDARES EC RELACIONADOS
- Código y nombre
- Propósito
- Aplicabilidad

## 5. ANÁLISIS DE GAPS INICIALES
- Gap vs mejores prácticas
- Gap vs competencia
- Información faltante

## 6. RECOMENDACIONES INICIALES

## 7. REFERENCIAS

# FORMATO DE SALIDA
Markdown estricto. Usa tablas para datos comparativos. Usa listas para items.

# RESTRICCIONES
- No inventes información. Si no hay datos, indica "No especificado"
- No uses información posterior a 2025 (el contexto ya está actualizado)
- Mantén un tono profesional y objetivo
```

---

## 4. PROMPT LOADER (REGISTRY)

```typescript
// src/prompts/index.ts
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

export type PromptId = 'F0' | 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6';

interface PromptMetadata {
  id: PromptId;
  name: string;
  version: string;
  author: string;
  last_updated: string;
  tags: string[];
}

interface PromptFile {
  metadata: PromptMetadata;
  content: string;
  raw: string;
}

class PromptRegistry {
  private prompts: Map<PromptId, PromptFile> = new Map();
  private basePath: string;

  constructor(basePath: string = join(__dirname, 'templates')) {
    this.basePath = basePath;
    this.loadAllPrompts();
  }

  private loadAllPrompts(): void {
    const files = readdirSync(this.basePath).filter(f => f.endsWith('.md'));
    
    for (const file of files) {
      const fullPath = join(this.basePath, file);
      const raw = readFileSync(fullPath, 'utf-8');
      const parsed = this.parsePromptFile(raw);
      
      if (parsed) {
        this.prompts.set(parsed.metadata.id, parsed);
      }
    }
  }

  private parsePromptFile(raw: string): PromptFile | null {
    // Extraer frontmatter (--- ... ---)
    const frontmatterMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    
    if (!frontmatterMatch) {
      console.error('Invalid prompt file: missing frontmatter');
      return null;
    }

    const frontmatter = frontmatterMatch[1];
    const content = frontmatterMatch[2].trim();

    // Parse YAML-like frontmatter (simplificado, podrías usar yaml parser)
    const metadata: Partial<PromptMetadata> = {};
    frontmatter.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length) {
        const value = valueParts.join(':').trim();
        if (key === 'tags') {
          metadata.tags = value.replace(/[\[\]]/g, '').split(',').map(t => t.trim());
        } else if (key === 'id') {
          metadata.id = value as PromptId;
        } else if (key === 'name') {
          metadata.name = value;
        } else if (key === 'version') {
          metadata.version = value;
        } else if (key === 'author') {
          metadata.author = value;
        } else if (key === 'last_updated') {
          metadata.last_updated = value;
        }
      }
    });

    if (!metadata.id) {
      console.error(`Prompt file ${file} missing required 'id' field`);
      return null;
    }

    return {
      metadata: metadata as PromptMetadata,
      content,
      raw
    };
  }

  getPrompt(id: PromptId): string {
    const prompt = this.prompts.get(id);
    if (!prompt) {
      throw new Error(`Prompt ${id} not found`);
    }
    return prompt.content;
  }

  getMetadata(id: PromptId): PromptMetadata {
    const prompt = this.prompts.get(id);
    if (!prompt) {
      throw new Error(`Prompt ${id} not found`);
    }
    return prompt.metadata;
  }

  renderPrompt(id: PromptId, variables: Record<string, string>): string {
    let content = this.getPrompt(id);
    
    // Reemplazar {{variable}} con valores
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(regex, value);
    }
    
    return content;
  }

  listPrompts(): PromptId[] {
    return Array.from(this.prompts.keys());
  }
}

// Singleton instance
let registryInstance: PromptRegistry | null = null;

export function getPromptRegistry(): PromptRegistry {
  if (!registryInstance) {
    registryInstance = new PromptRegistry();
  }
  return registryInstance;
}

// Convenience exports
export const PROMPTS = {
  get: (id: PromptId) => getPromptRegistry().getPrompt(id),
  render: (id: PromptId, vars: Record<string, string>) => getPromptRegistry().renderPrompt(id, vars),
  list: () => getPromptRegistry().listPrompts()
};
```

---

## 5. AI SERVICE (USANDO PROMPT REGISTRY)

```typescript
// src/services/ai.service.ts
import { getPromptRegistry, PromptId } from '../prompts';

export interface Env {
  AI: any;
}

export interface GenerateDocumentOptions {
  documentType: PromptId;
  context: {
    projectName: string;
    clientName: string;
    industry?: string;
    previousData?: Record<string, any>;
  };
}

export class AIService {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  async generateDocument(options: GenerateDocumentOptions): Promise<string> {
    // 1. Obtener el prompt desde el registry (externalizado)
    const promptRegistry = getPromptRegistry();
    
    // 2. Renderizar el prompt con las variables del contexto
    const userPrompt = promptRegistry.render(options.documentType, {
      context: JSON.stringify(options.context, null, 2)
    });
    
    // 3. Obtener el system prompt (opcional, se puede externalizar también)
    const systemPrompt = this.getSystemPrompt(options.documentType);

    try {
      const response = await this.env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
        prompt: userPrompt,
        system_prompt: systemPrompt,
        max_tokens: 4096,
        temperature: 0.3,
        stream: false
      });

      return response.response || response;
    } catch (error) {
      console.error('AI generation failed:', error);
      throw new Error('Failed to generate document with Workers AI');
    }
  }

  private getSystemPrompt(documentType: PromptId): string {
    // System prompt es corto, puede ir aquí o también externalizarse
    const basePrompt = `Eres un experto en diseño instruccional certificado en EC0366.
    Genera documentos profesionales en español.
    Usa formato Markdown con tablas y listas.
    No inventes información.`;

    return basePrompt;
  }
}
```

---

## 6. EJEMPLO DE ARCHIVO DE PROMPT EXTERNO (F4-produccion.md)

```markdown
---
id: F4
name: Producción de Contenidos EC0366
version: 1.0.0
author: KnowTo Team
last_updated: 2026-04-02
tags: [produccion, EC0366, E1219, E1220]
---

# SISTEMA
Eres un diseñador instruccional certificable en el estándar EC0366 "Desarrollo de cursos de formación en línea" del CONOCER.

# OBJETIVO
Generar los 8 productos de producción requeridos por los Elementos E1219 y E1220 del EC0366.

# CONTEXTO DEL PROYECTO
{{context}}

# ESTRUCTURA OBLIGATORIA DE SALIDA

## PRODUCTO 0: CRONOGRAMA DE DESARROLLO (E1219 - producto #1)

**Curso:** {{projectName}}
**Objetivo general:** [del contexto]
**Fecha de elaboración:** [fecha actual]
**Desarrollador:** {{clientName}}

### Tabla de actividades
| # | Actividad | Tiempo estimado | Fecha inicio | Fecha fin | Responsable |
|:---|:---|:---|:---|:---|:---|
| 1 | Elaborar estructura temática | [N] días | [fecha] | [fecha] | {{clientName}} |
| 2 | Desarrollar información general | [N] días | [fecha] | [fecha] | {{clientName}} |
| 3 | Diseñar guía de actividades | [N] días | [fecha] | [fecha] | {{clientName}} |
| 4 | Desarrollar materiales | [N] días | [fecha] | [fecha] | {{clientName}} |
| 5 | Desarrollar instrumentos de evaluación | [N] días | [fecha] | [fecha] | {{clientName}} |
| 6 | Configurar curso en LMS | [N] días | [fecha] | [fecha] | {{clientName}} |
| 7 | Verificar funcionamiento | [N] días | [fecha] | [fecha] | {{clientName}} |

### Firmas
| Rol | Nombre | Firma | Fecha |
|:---|:---|:---|:---|
| Elaboró | {{clientName}} | _________________ | [fecha] |
| Revisó | [nombre] | _________________ | [fecha] |

---

## PRODUCTO 1: DOCUMENTO DE INFORMACIÓN GENERAL (E1219 - producto #2)

### 1.1 Título del curso
[Basado en el contexto]

### 1.2 Objetivo general del curso
El participante, al terminar el curso, **[verbo cognitivo]**... **[verbo psicomotor]**... y **[verbo afectivo]**... con la finalidad de [beneficio].

### 1.3 Temario del curso
**Módulo 1:** [nombre]
  1.1 [subtema]
  1.2 [subtema]
  1.3 [subtema]

**Módulo 2:** [nombre]
  ...

### 1.4 Objetivos particulares
- **Cognitivo:** [verbo]... [qué]... a través de [cómo]...
- **Psicomotor:** [verbo]... [qué]... a través de [cómo]...
- **Afectivo:** [verbo]... [qué]... a través de [cómo]...

### 1.5 Introducción
[2-3 párrafos]

### 1.6 Guía visual
[Descripción de la estructura gráfica del curso]

### 1.7 Metodología de trabajo
**A. Cómo se va a enseñar:** [técnicas instruccionales, secuencia didáctica]
**B. Cómo se trabaja con el participante:** [rol del instructor, tipo de interacción]
**C. Cómo se logra el aprendizaje:** [práctica, demostración, retroalimentación]

### 1.8 Perfil de ingreso
[Del análisis previo o inferido del contexto]

### 1.9 Requisitos tecnológicos
[Hardware, software, conectividad]

### 1.10 Forma de evaluación
[Ponderación, criterios de aprobación]

### 1.11 Duración del curso
[Del análisis previo o inferido del contexto]

---

## PRODUCTO 2: GUÍAS DE ACTIVIDADES (E1220 - producto #1)

### MÓDULO 1: [nombre]
**Objetivo específico:** [texto]

| Título | Instrucciones | Materiales | Participación | Entrega | Periodo | Ponderación | Criterios |
|:---|:---|:---|:---|:---|:---|:---|:---|
| ... | ... | ... | ... | ... | ... | ... | ... |

---

## PRODUCTO 3: CALENDARIO GENERAL (E1220 - producto #2)

| Semana | Unidad | Actividades | Ponderación | Apertura | Cierre |
|:---|:---|:---|:---|:---|:---|
| 1 | Módulo 1 | ... | [%] | [fecha] | [fecha] |

---

## PRODUCTO 4: DOCUMENTOS DE TEXTO (E1220 - producto #3)

[Generar al menos 5 páginas de contenido por tema principal]

---

## PRODUCTO 5: PRESENTACIÓN ELECTRÓNICA (E1220 - producto #4)

[Estructura de diapositivas]

---

## PRODUCTO 6: MATERIAL MULTIMEDIA (E1220 - producto #5)

[Guión de video]

---

## PRODUCTO 7: INSTRUMENTOS DE EVALUACIÓN (E1220 - producto #6)

### Cuestionario (obligatorio)
### Rúbrica (obligatorio, 4+ criterios, 3+ niveles)
### Lista de cotejo (obligatorio)

# RESTRICCIONES
- Genera TODOS los 8 productos en orden
- No omitas ningún producto
- Usa la información del contexto para personalizar
- Mantén formato Markdown consistente
```

---

## 7. CONVENCIÓN DE NOMBRAMIENTO PARA PROMPTS

| Tipo | Patrón | Ejemplo |
|:---|:---|:---|
| Archivo de prompt | `{Fase}-{nombre-corto}.md` | `F4-produccion.md` |
| Variable en prompt | `{{snake_case}}` | `{{project_name}}`, `{{client_name}}` |
| Sección dentro del prompt | `# NOMBRE_SECCION` | `# OBJETIVO`, `# ESTRUCTURA OBLIGATORIA` |

---

## 8. VALIDACIÓN DE PROMPTS (TEST)

```typescript
// __tests__/prompts/prompt-registry.test.ts
import { describe, it, expect } from 'vitest';
import { getPromptRegistry, PROMPTS } from '../../src/prompts';

describe('Prompt Registry', () => {
  it('debe cargar todos los prompts', () => {
    const registry = getPromptRegistry();
    const list = registry.listPrompts();
    
    expect(list).toContain('F0');
    expect(list).toContain('F1');
    expect(list).toContain('F2');
    expect(list).toContain('F3');
    expect(list).toContain('F4');
    expect(list).toContain('F5');
    expect(list).toContain('F6');
  });

  it('debe renderizar un prompt con variables', () => {
    const result = PROMPTS.render('F0', { context: '{"test": "value"}' });
    expect(result).toContain('{{context}}');
    // Nota: la variable se reemplaza, pero el contenido debe existir
  });

  it('debe tener metadata válida para cada prompt', () => {
    const registry = getPromptRegistry();
    
    for (const id of registry.listPrompts()) {
      const metadata = registry.getMetadata(id);
      expect(metadata.id).toBe(id);
      expect(metadata.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(metadata.author).toBe('KnowTo Team');
    }
  });
});
```

---

## 9. FLUJO DE TRABAJO CON PROMPTS EXTERNOS

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DESARROLLO DE PROMPTS                                │
│                                                                              │
│  1. Experto en EC0366 escribe/edita archivo .md en /prompts/templates/       │
│  2. Se valida el formato (frontmatter + secciones)                           │
│  3. Se prueba con `npm run test:prompts`                                     │
│  4. Se versiona en git                                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BUILD TIME (wrangler)                                │
│                                                                              │
│  1. Los archivos .md se empaquetan con el Worker                            │
│  2. Se genera un bundle que incluye los prompts                             │
│  3. Se valida que todos los prompts existan                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RUNTIME (Cloudflare Worker)                          │
│                                                                              │
│  1. AI Service solicita prompt F4                                            │
│  2. PromptRegistry carga el archivo (desde el bundle)                        │
│  3. Se renderiza con las variables del contexto                              │
│  4. Se envía a Workers AI                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 10. PREGUNTAS PARA VALIDAR

| Pregunta | Respuesta actual |
|:---|:---|
| ¿Los prompts son editables sin recompilar código? | No, se empaquetan con el Worker. Para editar prompts hay que redeployar |
| ¿Se puede versionar prompts independientemente? | Sí, cada archivo .md tiene su propio version en frontmatter |
| ¿Se pueden reutilizar secciones entre prompts? | Sí, usando variables `{{include:section-xxx}}` (requiere extensión) |
| ¿Se pueden testear prompts unitariamente? | Sí, con Vitest se puede validar que no falten variables |

