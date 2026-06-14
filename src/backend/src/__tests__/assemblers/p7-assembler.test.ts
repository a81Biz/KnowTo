import { describe, it, expect } from 'vitest';
import { pickWinnerOutput, validateUnitCoverage, validateSemanticAnchor } from '../../dcfl/helpers/assembler-utils.helper';
import { sanitizeProductDocument } from '../../dcfl/helpers/doc-sanitizer.helper';

describe('p7-assembler utils', () => {
  it('pickWinnerOutput — handles malformed juez JSON gracefully (unquoted keys)', async () => {
    const outputs: Record<string, string> = {
      juez: '{seleccion: "A", razon: "mejor estructurado"}',
      agente_A: 'Documento A completo',
      agente_B: 'Documento B',
    };
    const getOutput = (name: string) => Promise.resolve(outputs[name] ?? '');
    const result = await pickWinnerOutput(getOutput, 'juez', 'agente_A', 'agente_B');
    expect(result.output).toBeTruthy();
  });

  it('validateUnitCoverage — returns valid for empty unit list', () => {
    const result = validateUnitCoverage('cualquier documento', []);
    expect(result.valido).toBe(true);
    expect(result.faltantes).toHaveLength(0);
  });

  it('validateSemanticAnchor — returns valid for empty dominio', () => {
    const result = validateSemanticAnchor('cualquier documento', '');
    expect(result.valido).toBe(true);
    expect(result.cobertura).toBe(1);
  });

  it('validateSemanticAnchor — passes when all keywords present', () => {
    const doc = 'Este documento cubre soldadura industrial con certificación CONOCER en norma vigente.';
    const dominio = 'soldadura industrial certificación CONOCER';
    const result = validateSemanticAnchor(doc, dominio);
    expect(result.valido).toBe(true);
    expect(result.ausentes).toHaveLength(0);
  });

  it('sanitizeProductDocument — flags {{placeholder}} patterns', () => {
    const doc = '# Glosario\n\nConcepto: {{insertar definición aquí}}.';
    const { warnings } = sanitizeProductDocument(doc, 'P7');
    expect(warnings.some(w => /placeholder/i.test(w) || w.includes('{{'))).toBe(true);
  });
});
