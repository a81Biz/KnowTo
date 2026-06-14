import { describe, it, expect, vi } from 'vitest';
import { pickWinnerOutput, validateUnitCoverage, validateSemanticAnchor } from '../../dcfl/helpers/assembler-utils.helper';
import { enforceModalidad, sanitizeProductDocument } from '../../dcfl/helpers/doc-sanitizer.helper';

describe('p5-assembler utils', () => {
  it('pickWinnerOutput — selects A when juez returns seleccion A', async () => {
    const outputs: Record<string, string> = {
      juez: '{"seleccion": "A", "razon": "mejor"}',
      agente_A: 'Contenido de agente A',
      agente_B: 'Contenido de agente B',
    };
    const getOutput = (name: string) => Promise.resolve(outputs[name] ?? '');
    const result = await pickWinnerOutput(getOutput, 'juez', 'agente_A', 'agente_B');
    expect(result.seleccion).toBe('A');
    expect(result.output).toBe('Contenido de agente A');
  });

  it('pickWinnerOutput — selects B when juez returns seleccion B', async () => {
    const outputs: Record<string, string> = {
      juez: '{"seleccion": "B", "razon": "más detallado"}',
      agente_A: 'Contenido A',
      agente_B: 'Contenido B',
    };
    const getOutput = (name: string) => Promise.resolve(outputs[name] ?? '');
    const result = await pickWinnerOutput(getOutput, 'juez', 'agente_A', 'agente_B');
    expect(result.seleccion).toBe('B');
    expect(result.output).toBe('Contenido B');
  });

  it('pickWinnerOutput — fallback to A on invalid juez JSON', async () => {
    const outputs: Record<string, string> = {
      juez: 'respuesta no estructurada del juez',
      agente_A: 'Fallback A',
      agente_B: 'Fallback B',
    };
    const getOutput = (name: string) => Promise.resolve(outputs[name] ?? '');
    const result = await pickWinnerOutput(getOutput, 'juez', 'agente_A', 'agente_B');
    expect(result.seleccion).toBe('A');
    expect(result.output).toBe('Fallback A');
  });

  it('validateUnitCoverage — returns valid when all units appear', () => {
    const doc = '# Guía\n\nManejo de extintores\nEvacuación de emergencias\nUso de EPP';
    const units = ['Manejo de extintores', 'Evacuación de emergencias', 'Uso de EPP'];
    const result = validateUnitCoverage(doc, units);
    expect(result.valido).toBe(true);
    expect(result.faltantes).toHaveLength(0);
  });

  it('validateSemanticAnchor — warns when coverage is below 60%', () => {
    const doc = 'Documento sobre normas generales de trabajo.';
    const dominio = 'soldadura oxiacetilénica industrial certificación';
    const result = validateSemanticAnchor(doc, dominio);
    expect(result.valido).toBe(false);
    expect(result.ausentes.length).toBeGreaterThan(0);
  });
});
