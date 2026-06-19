// src/__tests__/helpers/template-models.test.ts
//
// Smoke test estructural: valida que todos los campos `model:` en los templates
// de pipeline usen únicamente modelos reconocidos en el entorno local de Ollama.
// No requiere Ollama en ejecución — es una validación de archivos fuente.
//
// Por qué existe: en PT-136 se detectó que 6 templates (F5/F5.2/F6/F6.2a/F6.2b/F7)
// tenían `llama3.3:70b-instruct-q4_K_M` hardcodeado en el agente B, causando
// Ollama 404 en runtime. Los tests E2E no capturaban esto porque mockean AIService.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';

const TEMPLATES_DIR = join(__dirname, '../../dcfl/prompts/templates');

const KNOWN_LOCAL_MODELS = new Set(['qwen2.5:14b']);
const CF_MODEL_PREFIX = '@cf/';

interface ModelViolation {
  file: string;
  agent: string;
  model: string;
}

function extractModelViolations(): ModelViolation[] {
  const violations: ModelViolation[] = [];
  const files = readdirSync(TEMPLATES_DIR).filter((f) => f.endsWith('.md'));

  for (const file of files) {
    const content = readFileSync(join(TEMPLATES_DIR, file), 'utf-8');
    let parsed: matter.GrayMatterFile<string>;
    try {
      parsed = matter(content);
    } catch {
      continue;
    }

    const steps: Array<{ agent?: string; model?: string | null }> =
      parsed.data?.pipeline_steps ?? [];

    for (const step of steps) {
      const model = step.model;
      if (model == null) continue;
      if (model.startsWith(CF_MODEL_PREFIX)) continue;
      if (KNOWN_LOCAL_MODELS.has(model)) continue;
      violations.push({ file, agent: step.agent ?? '(unknown)', model });
    }
  }

  return violations;
}

describe('Template model fields', () => {
  it('all pipeline_steps.model values must be null, @cf/ prefix, or a known local Ollama model', () => {
    const violations = extractModelViolations();

    if (violations.length > 0) {
      const detail = violations
        .map((v) => `  • ${v.file} / agente "${v.agent}": model = "${v.model}"`)
        .join('\n');
      expect.fail(
        `Se encontraron ${violations.length} modelo(s) desconocido(s) en los templates:\n${detail}\n` +
          `Modelos locales reconocidos: ${[...KNOWN_LOCAL_MODELS].join(', ')}\n` +
          `Para agregar un modelo: añadirlo a KNOWN_LOCAL_MODELS en este test Y asegurarse de que esté en Ollama.`
      );
    }

    expect(violations).toHaveLength(0);
  });
});
