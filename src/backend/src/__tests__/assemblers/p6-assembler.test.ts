import { describe, it, expect } from 'vitest';
import { pickWinnerOutput, validateUnitCoverage, validateSemanticAnchor } from '../../dcfl/helpers/assembler-utils.helper';
import { enforceModalidad, sanitizeProductDocument } from '../../dcfl/helpers/doc-sanitizer.helper';

describe('p6-assembler utils', () => {
  it('pickWinnerOutput — falls back to loser when winner output is empty', async () => {
    const outputs: Record<string, string> = {
      juez: '{"seleccion": "A"}',
      agente_A: '',
      agente_B: 'Contenido de respaldo B',
    };
    const getOutput = (name: string) => Promise.resolve(outputs[name] ?? '');
    const result = await pickWinnerOutput(getOutput, 'juez', 'agente_A', 'agente_B');
    expect(result.seleccion).toBe('A');
    expect(result.output).toBe('Contenido de respaldo B');
  });

  it('enforceModalidad — replaces Presencial with Virtual in structured field', () => {
    const doc = '**Modalidad:** Presencial';
    const { doc: fixed, changed } = enforceModalidad(doc, 'Virtual');
    expect(changed).toBe(true);
    expect(fixed).toContain('Virtual');
  });

  it('enforceModalidad — no change when doc already matches canonical', () => {
    const doc = 'El curso es en modalidad virtual.';
    const { changed } = enforceModalidad(doc, 'virtual');
    expect(changed).toBe(false);
  });

  it('validateUnitCoverage — flags missing unit', () => {
    const doc = '## Módulo 1: Introducción\n\nContenido básico';
    const units = ['Introducción', 'Mantenimiento preventivo'];
    const result = validateUnitCoverage(doc, units);
    expect(result.valido).toBe(false);
    expect(result.faltantes).toContain('Mantenimiento preventivo');
  });

  it('sanitizeProductDocument — converts YYYY-MM-DD to DD/MM/YYYY', () => {
    const doc = 'Fecha de entrega: 2026-06-15.';
    const { doc: fixed } = sanitizeProductDocument(doc, 'P6');
    expect(fixed).toContain('15/06/2026');
  });
});
