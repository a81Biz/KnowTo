// __tests__/prompts/prompt-registry.test.ts
// TDD: Validación del Prompt Registry (BACKEND ARCHITECTURE DOCUMENT sección 8)
import { describe, it, expect, beforeEach } from 'vitest';
import { getPromptRegistry } from '../../dcfl/prompts';
import type { PromptId } from '../../dcfl/types/wizard.types';

const ALL_PROMPT_IDS: PromptId[] = [
  'F0', 'F1', 'F2', 'F2_5', 'F3',
  'F5', 'F5_2',
  'F6', 'F6_FORM', 'F6_2a', 'F6_2b',
];

describe('PromptRegistry', () => {
  let registry: ReturnType<typeof getPromptRegistry>;

  beforeEach(() => {
    registry = getPromptRegistry();
  });

  it('debe cargar todos los prompts requeridos', () => {
    for (const id of ALL_PROMPT_IDS) {
      expect(() => registry.get(id)).not.toThrow();
    }
  });

  it('cada prompt debe tener metadata válida', () => {
    for (const id of ALL_PROMPT_IDS) {
      const entry = registry.get(id);
      expect(entry.metadata.id).toBeTruthy();
      expect(entry.metadata.name).toBeTruthy();
      expect(entry.metadata.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(Array.isArray(entry.metadata.tags)).toBe(true);
      expect((entry.metadata.tags ?? []).length).toBeGreaterThan(0);
    }
  });

  it('cada prompt tiene pipeline_steps o contiene {{context}} en el body', () => {
    for (const id of ALL_PROMPT_IDS) {
      const entry = registry.get(id);
      const hasPipeline = (entry.metadata.pipeline_steps?.length ?? 0) > 0;
      const hasContext = entry.content.includes('{{context}}');
      expect(hasPipeline || hasContext, `${id}: debe tener pipeline_steps o {{context}}`).toBe(true);
    }
  });

  it('renderById no lanza excepción', () => {
    expect(() => registry.renderById('F0', {
      context: '{"projectName":"Test","clientName":"Juan"}',
      userInputs: '{}',
    })).not.toThrow();
  });

  it('debe lanzar error para un ID inexistente', () => {
    expect(() => registry.get('INVALID' as PromptId)).toThrow();
  });

  it('cada prompt tiene pipeline_steps extensos o body > 200 chars', () => {
    for (const id of ALL_PROMPT_IDS) {
      const entry = registry.get(id);
      const hasPipeline = (entry.metadata.pipeline_steps?.length ?? 0) > 0;
      const hasBody = entry.content.length > 200;
      expect(hasPipeline || hasBody, `${id}: debe tener pipeline_steps o body extenso`).toBe(true);
    }
  });
});
