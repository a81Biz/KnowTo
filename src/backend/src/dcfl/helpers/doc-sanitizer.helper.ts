/**
 * doc-sanitizer.helper.ts
 * Post-processing invariants applied to every F4 product document after assembly.
 * All functions are pure — no side effects, no DB calls.
 */

// Patterns that indicate a placeholder was not resolved
const PLACEHOLDER_PATTERNS = [
  /\{\{[^}]+\}\}/g,                                     // {{variable}} — pre-LLM substitution not applied
  /\[PENDIENTE[^\]]*\]/gi,                              // [PENDIENTE...]
  /\[INSERTAR[^\]]*\]/gi,                               // [INSERTAR...]
  /\[TODO[^\]]*\]/gi,                                   // [TODO...]
  /\bTBD\b/g,                                           // TBD
  /\bXXX\b/g,                                           // XXX
  /\[COMPLETAR[^\]]*\]/gi,                              // [COMPLETAR...]
  /(ver )?(cap[ií]tulo)\s+x\b/gi,                       // "Ver Capítulo X" sin resolver
  // H8: additional patterns for variables copied verbatim by the LLM
  /\{_frozen\.[a-zA-Z_]+(?:\s*\|\|[^}]*)?\}/g,         // {_frozen.campo} or {_frozen.campo || fallback}
  /\[(?:[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ\s_]{2,})\]/g, // [INSTRUCCION_EN_MAYUSCULAS] — unresolved LLM directive
  /\([a-z_][a-z_]*\.[a-z_][a-z_]*\)/g,                 // (modulo.campo) — object-access notation copied verbatim
];

const ISO_DATE_PATTERN = /\b(\d{4})-(\d{2})-(\d{2})\b/g;

/**
 * Main entry point. Apply all sanitizations to a final product document.
 * Returns { doc, warnings } where warnings is an array of non-fatal issues found.
 */
export function sanitizeProductDocument(doc: string, productCode: string): {
  doc: string;
  warnings: string[];
} {
  const warnings: string[] = [];
  let result = doc;

  // 1. Detect unresolved placeholders (log but do not remove — keep content for human review)
  const PATTERN_LABELS = [
    '{{variable}}', '[PENDIENTE]', '[INSERTAR]', '[TODO]', 'TBD', 'XXX',
    '[COMPLETAR]', 'Capítulo X',
    '{_frozen.*}', '[INSTRUCCION_MAYUS]', '(modulo.campo)',
  ];
  for (let i = 0; i < PLACEHOLDER_PATTERNS.length; i++) {
    const pattern = PLACEHOLDER_PATTERNS[i]!;
    const matches = result.match(pattern);
    if (matches) {
      const label = PATTERN_LABELS[i] ?? 'unknown';
      warnings.push(`[${productCode}] Unresolved placeholder (${label}): ${[...new Set(matches)].slice(0, 5).join(', ')}`);
    }
  }

  // 2. Convert ISO 8601 dates (YYYY-MM-DD) to DD/MM/YYYY in the final document
  result = result.replace(ISO_DATE_PATTERN, (_match, year, month, day) => {
    return `${day}/${month}/${year}`;
  });
  if (ISO_DATE_PATTERN.test(doc)) {
    warnings.push(`[${productCode}] ISO dates (YYYY-MM-DD) were converted to DD/MM/YYYY`);
  }

  return { doc: result, warnings };
}

/**
 * Deduplicate a glossary represented as a markdown table.
 * Keeps the first occurrence of each term (case-insensitive).
 * Input: full document markdown string. Returns the document with deduplicated glossary.
 */
export function deduplicarGlosario(doc: string): string {
  const glossaryStart = doc.indexOf('## Glosario');
  if (glossaryStart === -1) return doc;

  const beforeGlossary = doc.slice(0, glossaryStart);
  const afterGlossaryStart = doc.slice(glossaryStart);

  // Find the end of the glossary section (next ## heading or end of document)
  const nextSectionMatch = afterGlossaryStart.match(/\n## /);
  const glossaryBody = nextSectionMatch
    ? afterGlossaryStart.slice(0, nextSectionMatch.index ?? undefined)
    : afterGlossaryStart;
  const afterGlossary = nextSectionMatch
    ? afterGlossaryStart.slice(nextSectionMatch.index!)
    : '';

  const lines = glossaryBody.split('\n');
  const seenTerms = new Set<string>();
  const deduped: string[] = [];

  for (const line of lines) {
    // Table row pattern: | Término | ...
    const rowMatch = line.match(/^\|\s*([^|]+?)\s*\|/);
    if (rowMatch) {
      const term = (rowMatch[1] ?? '').trim().toLowerCase();
      // Skip header and separator rows
      if (term === 'término' || term.startsWith('---') || term === '') {
        deduped.push(line);
        continue;
      }
      if (!seenTerms.has(term)) {
        seenTerms.add(term);
        deduped.push(line);
      }
      // Duplicate silently dropped
    } else {
      deduped.push(line);
    }
  }

  return beforeGlossary + deduped.join('\n') + afterGlossary;
}

/**
 * Enforce modality consistency across a product document.
 * If the canonical modality from F3 is provided, replaces inconsistent occurrences.
 * Only replaces explicit contradictions — does not add modality where absent.
 */
export function enforceModalidad(doc: string, canonicalModalidad: string | null): {
  doc: string;
  changed: boolean;
} {
  if (!canonicalModalidad) return { doc, changed: false };

  const modalityMap: Record<string, string[]> = {
    'Presencial': ['Virtual', 'Híbrido', 'En línea', 'Online', 'e-learning'],
    'Virtual':    ['Presencial', 'Híbrido'],
    'Híbrido':    [],
  };

  const canonical = canonicalModalidad.trim();
  const contradictions = modalityMap[canonical] ?? [];
  if (contradictions.length === 0) return { doc, changed: false };

  let result = doc;
  let changed = false;

  for (const contradiction of contradictions) {
    // Only replace in explicit "Modalidad: [X]" or "Modalidad [X]" contexts
    const pattern = new RegExp(`(\\*\\*Modalidad[^:*]*:\\*\\*\\s*)${contradiction}`, 'gi');
    if (pattern.test(result)) {
      result = result.replace(pattern, `$1${canonical}`);
      changed = true;
    }
  }

  return { doc: result, changed };
}
