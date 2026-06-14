// src/__tests__/helpers/doc-sanitizer-h8.test.ts
//
// PT-106 — Tests for the H8 placeholder patterns added to doc-sanitizer.helper.ts.
//
// Coverage:
//   7. {_frozen.campo} detected as unresolved placeholder
//   8. {_frozen.campo || fallback} detected
//   9. [INSTRUCCION_EN_MAYUSCULAS] detected
//   10. (modulo.campo) detected
//   11. Existing {{variable}} pattern still works
//   12. Detect-and-log: document content is preserved (patterns don't remove text)

import { describe, it, expect } from 'vitest';
import { sanitizeProductDocument } from '../../dcfl/helpers/doc-sanitizer.helper';

describe('sanitizeProductDocument — H8 new placeholder patterns', () => {

  it('Test 7: detects {_frozen.estandar_norma} as unresolved placeholder', () => {
    const doc = `# Documento\n\nFolio: {_frozen.estandar_norma}-2026-1234\n\nContenido normal.`;
    const { warnings } = sanitizeProductDocument(doc, 'P6');
    expect(warnings.some(w => w.includes('{_frozen.*}'))).toBe(true);
  });

  it('Test 8: detects {_frozen.campo || FORM} as unresolved placeholder', () => {
    const doc = `Folio: {_frozen.estandar_norma || FORM}-2026-9999`;
    const { warnings } = sanitizeProductDocument(doc, 'P6');
    expect(warnings.some(w => w.includes('{_frozen.*}'))).toBe(true);
  });

  it('Test 9: detects [INSTRUCCION_EN_MAYUSCULAS] as unresolved LLM directive', () => {
    const doc = `**Nombre del candidato:** [CLIENTE DEL CONTEXTO]\n\n**Fecha:** 15/06/2026`;
    const { warnings } = sanitizeProductDocument(doc, 'P6');
    expect(warnings.some(w => w.includes('[INSTRUCCION_MAYUS]'))).toBe(true);
  });

  it('Test 10: detects (resumen_datos.folio_sugerido) as unresolved object-access notation', () => {
    const doc = `Folio de expediente: (resumen_datos.folio_sugerido)\n\nContenido.`;
    const { warnings } = sanitizeProductDocument(doc, 'P6');
    expect(warnings.some(w => w.includes('(modulo.campo)'))).toBe(true);
  });

  it('Test 11: existing {{variable}} pattern still detected', () => {
    const doc = `Proyecto: {{projectName}}\n\nContenido del documento.`;
    const { warnings } = sanitizeProductDocument(doc, 'P1');
    expect(warnings.some(w => w.includes('{{variable}}'))).toBe(true);
  });

  it('Test 12: document content is preserved (patterns are detect-only, not destructive)', () => {
    const original = `# Inventario\n\n{_frozen.estandar_norma} {{clientName}} [DATOS DEL CONTEXTO]\n\nTexto normal.`;
    const { doc } = sanitizeProductDocument(original, 'P1');
    // The unresolved placeholders remain in the output — they are NOT stripped
    expect(doc).toContain('{_frozen.estandar_norma}');
    expect(doc).toContain('{{clientName}}');
    expect(doc).toContain('[DATOS DEL CONTEXTO]');
  });

  it('does not false-positive on normal markdown brackets like [link text](url)', () => {
    const doc = `Ver [documentación completa](https://example.com) para más detalles.`;
    const { warnings } = sanitizeProductDocument(doc, 'P2');
    // Normal markdown links should not trigger [INSTRUCCION_MAYUS] pattern
    // The pattern requires uppercase-dominant content
    expect(warnings.some(w => w.includes('[INSTRUCCION_MAYUS]'))).toBe(false);
  });

  it('does not false-positive on normal ISO date conversion', () => {
    const doc = `Fecha: 2026-06-13\n\nContenido sin problemas.`;
    const { doc: result, warnings } = sanitizeProductDocument(doc, 'P3');
    // ISO date should be converted — this tests the side effect too
    expect(result).toContain('13/06/2026');
    expect(warnings.some(w => w.includes('ISO dates'))).toBe(true);
  });
});
