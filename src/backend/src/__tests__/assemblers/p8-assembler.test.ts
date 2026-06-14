import { describe, it, expect } from 'vitest';
import { pickWinnerOutput, validateUnitCoverage, validateSemanticAnchor } from '../../dcfl/helpers/assembler-utils.helper';
import { enforceModalidad, sanitizeProductDocument } from '../../dcfl/helpers/doc-sanitizer.helper';

describe('p8-assembler utils', () => {
  it('pickWinnerOutput — all outputs empty returns empty string without throwing', async () => {
    const getOutput = (_name: string) => Promise.resolve('');
    const result = await pickWinnerOutput(getOutput, 'juez', 'agente_A', 'agente_B');
    expect(typeof result.output).toBe('string');
    expect(['A', 'B']).toContain(result.seleccion);
  });

  it('enforceModalidad — handles null canonical gracefully', () => {
    const doc = 'El curso es presencial.';
    const { changed } = enforceModalidad(doc, null);
    expect(changed).toBe(false);
  });

  it('validateUnitCoverage — case-insensitive matching', () => {
    const doc = '## MANEJO DE HERRAMIENTAS Y EQUIPOS\n\nContenido.';
    const units = ['Manejo de herramientas y equipos'];
    const result = validateUnitCoverage(doc, units);
    expect(result.valido).toBe(true);
  });

  it('validateSemanticAnchor — cobertura between 0 and 1', () => {
    const doc = 'Documento sobre mantenimiento industrial.';
    const dominio = 'mantenimiento industrial predictivo correctivo equipos herramientas';
    const result = validateSemanticAnchor(doc, dominio);
    expect(result.cobertura).toBeGreaterThanOrEqual(0);
    expect(result.cobertura).toBeLessThanOrEqual(1);
  });

  it('sanitizeProductDocument — leaves clean doc unchanged', () => {
    const doc = '# Cronograma\n\nSemana 1: Introducción al tema.\nSemana 2: Práctica supervisada.';
    const { doc: fixed, warnings } = sanitizeProductDocument(doc, 'P8');
    expect(fixed).toContain('Cronograma');
    expect(warnings).toHaveLength(0);
  });
});
