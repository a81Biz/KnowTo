import { describe, it, expect } from 'vitest';
import {
  validateBloomInstrumentAlignment,
  validateSemanticAnchor,
} from '../../dcfl/helpers/assembler-utils.helper';

describe('validateBloomInstrumentAlignment', () => {
  // Nivel 1 – Recordar
  it('Nivel 1: "identifica" + Cuestionario → válido', () => {
    const r = validateBloomInstrumentAlignment('identifica', 'Cuestionario');
    expect(r.valido).toBe(true);
  });

  it('Nivel 1: "identifica" + Guía de Observación → inválido', () => {
    const r = validateBloomInstrumentAlignment('identifica', 'Guía de Observación');
    expect(r.valido).toBe(false);
    expect(r.instrumentosPermitidos).toContain('Cuestionario');
  });

  it('Nivel 1: "enumera" + Cuestionario → válido', () => {
    const r = validateBloomInstrumentAlignment('enumera', 'Cuestionario');
    expect(r.valido).toBe(true);
  });

  // Nivel 2 – Comprender
  it('Nivel 2: "explica" + Guía de Entrevista → válido', () => {
    const r = validateBloomInstrumentAlignment('explica', 'Guía de Entrevista');
    expect(r.valido).toBe(true);
  });

  it('Nivel 2: "describe" + Guía de Observación → inválido', () => {
    const r = validateBloomInstrumentAlignment('describe', 'Guía de Observación');
    expect(r.valido).toBe(false);
    expect(r.instrumentosPermitidos).not.toContain('Guía de Observación');
  });

  it('Nivel 2: "comprende" + Cuestionario → válido', () => {
    const r = validateBloomInstrumentAlignment('comprende', 'Cuestionario');
    expect(r.valido).toBe(true);
  });

  // Nivel 3 – Aplicar
  it('Nivel 3: "aplica" + Lista de Cotejo → válido', () => {
    const r = validateBloomInstrumentAlignment('aplica', 'Lista de Cotejo');
    expect(r.valido).toBe(true);
  });

  it('Nivel 3: "aplica" + Cuestionario → inválido', () => {
    const r = validateBloomInstrumentAlignment('aplica', 'Cuestionario');
    expect(r.valido).toBe(false);
  });

  it('Nivel 3: "ejecuta" + Guía de Observación → válido', () => {
    const r = validateBloomInstrumentAlignment('ejecuta', 'Guía de Observación');
    expect(r.valido).toBe(true);
  });

  // Nivel 4 – Analizar
  it('Nivel 4: "analiza" + Cuestionario → válido', () => {
    const r = validateBloomInstrumentAlignment('analiza', 'Cuestionario');
    expect(r.valido).toBe(true);
  });

  it('Nivel 4: "analiza" + Lista de Cotejo → inválido', () => {
    const r = validateBloomInstrumentAlignment('analiza', 'Lista de Cotejo');
    expect(r.valido).toBe(false);
  });

  // Nivel 5 – Evaluar
  it('Nivel 5: "evalua" + Rúbrica → válido', () => {
    const r = validateBloomInstrumentAlignment('evalua', 'Rúbrica');
    expect(r.valido).toBe(true);
  });

  it('Nivel 5: "evalua" + Cuestionario → inválido', () => {
    const r = validateBloomInstrumentAlignment('evalua', 'Cuestionario');
    expect(r.valido).toBe(false);
  });

  it('Nivel 5: "evalúa" con tilde + Rúbrica → válido (normalización)', () => {
    const r = validateBloomInstrumentAlignment('evalúa', 'Rúbrica');
    expect(r.valido).toBe(true);
  });

  // Nivel 6 – Crear
  it('Nivel 6: "disena" + Evidencia de Producto → válido', () => {
    const r = validateBloomInstrumentAlignment('disena', 'Evidencia de Producto');
    expect(r.valido).toBe(true);
  });

  it('Nivel 6: "diseña" con tilde + Portafolio → válido (normalización)', () => {
    const r = validateBloomInstrumentAlignment('diseña', 'Portafolio');
    expect(r.valido).toBe(true);
  });

  it('Nivel 6: "propone" + Cuestionario → inválido', () => {
    const r = validateBloomInstrumentAlignment('propone', 'Cuestionario');
    expect(r.valido).toBe(false);
  });

  // Verbo desconocido → no bloquea
  it('verbo desconocido → valido=true, instrumentosPermitidos vacío', () => {
    const r = validateBloomInstrumentAlignment('foo_verbo_inventado', 'Cuestionario');
    expect(r.valido).toBe(true);
    expect(r.instrumentosPermitidos).toHaveLength(0);
  });
});

// ── validateSemanticAnchor — denylist (PT-152) ────────────────────────────────

describe('validateSemanticAnchor — denylist hallucination detection', () => {
  const DOMAIN = 'soldadura eléctrica metales electrodo arco';

  it('valido=true when doc matches domain and no denylist hit', () => {
    const doc = 'El proceso de soldadura con electrodo requiere preparar los metales correctamente.';
    const r = validateSemanticAnchor(doc, DOMAIN);
    expect(r.valido).toBe(true);
    expect(r.denylistHit).toBeUndefined();
  });

  it('valido=false + denylistHit when "miniatura pintada" appears (warn mode)', () => {
    const doc = 'Observe la miniatura pintada al óleo del maestro mientras suelda el arco.';
    const r = validateSemanticAnchor(doc, DOMAIN);
    expect(r.valido).toBe(false);
    expect(r.denylistHit).toBeDefined();
    expect(r.denylistHit!.toLowerCase()).toContain('miniatura pintada');
  });

  it('blockOnDenylistHit returns valido=false immediately with cobertura=0', () => {
    const doc = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';
    const r = validateSemanticAnchor(doc, DOMAIN, { blockOnDenylistHit: true });
    expect(r.valido).toBe(false);
    expect(r.cobertura).toBe(0);
    expect(r.denylistHit).toBeDefined();
  });

  it('valido=false by coverage (< 60%) when no denylist hit and domain absent', () => {
    const doc = 'Este documento habla de marketing digital y redes sociales.';
    const r = validateSemanticAnchor(doc, DOMAIN);
    expect(r.valido).toBe(false);
    expect(r.denylistHit).toBeUndefined();
    expect(r.cobertura).toBeLessThan(0.6);
  });

  it('empty dominioTecnico → valido=true regardless of doc content', () => {
    const doc = 'miniatura pintada óleos pincel';
    const r = validateSemanticAnchor(doc, '');
    expect(r.valido).toBe(true);
  });
});
