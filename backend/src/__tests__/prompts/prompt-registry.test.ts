// __tests__/prompts/prompt-registry.test.ts
// TDD: Validación del Prompt Registry (BACKEND ARCHITECTURE DOCUMENT sección 8)
import { describe, it, expect, beforeEach } from 'vitest';
import { getPromptRegistry } from '../../dcfl/prompts';
import type { PromptId } from '../../dcfl/types/wizard.types';

const ALL_PROMPT_IDS: PromptId[] = [
  'F0', 'F1', 'F2', 'F2_5', 'F3',
  'F4_P0', 'F4_P1', 'F4_P2', 'F4_P3', 'F4_P4', 'F4_P5', 'F4_P6', 'F4_P7',
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
      expect(entry.metadata.tags.length).toBeGreaterThan(0);
    }
  });

  it('cada prompt debe contener la variable {{context}}', () => {
    for (const id of ALL_PROMPT_IDS) {
      const entry = registry.get(id);
      expect(entry.content).toContain('{{context}}');
    }
  });

  it('debe renderizar variables correctamente', () => {
    const rendered = registry.render('F0', {
      context: '{"projectName":"Test","clientName":"Juan"}',
      userInputs: '{}',
    });
    expect(rendered).toContain('{"projectName":"Test","clientName":"Juan"}');
    expect(rendered).not.toContain('{{context}}');
  });

  it('debe lanzar error para un ID inexistente', () => {
    expect(() => registry.get('INVALID' as PromptId)).toThrow();
  });

  it('cada prompt debe tener más de 200 caracteres (externalización obligatoria)', () => {
    for (const id of ALL_PROMPT_IDS) {
      const entry = registry.get(id);
      expect(entry.content.length).toBeGreaterThan(200);
    }
  });
});
