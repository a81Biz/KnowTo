// Shared utilities for F4 product assemblers

// ── Bloom–Instrument Alignment ────────────────────────────────────────────

// Mapa por nivel Bloom. Clave = verbo normalizado (sin tildes, minúsculas).
// Nivel 1 – Recordar: instrumentos cognitivos (solo medición de conocimiento declarativo).
// Nivel 2 – Comprender: también cognitivos; Guía de Entrevista para demostración oral.
// Nivel 3 – Aplicar: instrumentos de desempeño.
// Nivel 4 – Analizar: mezcla cognitiva-desempeño.
// Nivel 5 – Evaluar: requiere Rúbrica o Guía de Observación (juicio de calidad).
// Nivel 6 – Crear: Evidencia de Producto o Portafolio (producto observable).
const BLOOM_INSTRUMENT_MAP: Record<string, string[]> = {
  // ── Nivel 1 (Recordar) ──────────────────────────────────────────────────
  recordar:    ['Cuestionario'],
  recuerda:    ['Cuestionario'],
  listar:      ['Cuestionario', 'Lista de Cotejo'],
  lista:       ['Cuestionario', 'Lista de Cotejo'],
  nombrar:     ['Cuestionario'],
  nombra:      ['Cuestionario'],
  enumerar:    ['Cuestionario'],
  enumera:     ['Cuestionario'],
  reconocer:   ['Cuestionario', 'Lista de Cotejo'],
  reconoce:    ['Cuestionario', 'Lista de Cotejo'],
  identificar: ['Cuestionario', 'Lista de Cotejo'],
  identifica:  ['Cuestionario', 'Lista de Cotejo'],
  mencionar:   ['Cuestionario'],
  menciona:    ['Cuestionario'],
  // ── Nivel 2 (Comprender) ────────────────────────────────────────────────
  comprender:  ['Cuestionario', 'Guía de Entrevista'],
  comprende:   ['Cuestionario', 'Guía de Entrevista'],
  explicar:    ['Cuestionario', 'Guía de Entrevista'],
  explica:     ['Cuestionario', 'Guía de Entrevista'],
  describir:   ['Cuestionario', 'Guía de Entrevista'],
  describe:    ['Cuestionario', 'Guía de Entrevista'],
  interpretar: ['Cuestionario', 'Guía de Entrevista'],
  interpreta:  ['Cuestionario', 'Guía de Entrevista'],
  resumir:     ['Cuestionario'],
  resume:      ['Cuestionario'],
  clasificar:  ['Cuestionario', 'Lista de Cotejo'],
  clasifica:   ['Cuestionario', 'Lista de Cotejo'],
  // ── Nivel 3 (Aplicar) ────────────────────────────────────────────────────
  aplicar:     ['Lista de Cotejo', 'Guía de Observación', 'Evidencia de Producto'],
  aplica:      ['Lista de Cotejo', 'Guía de Observación', 'Evidencia de Producto'],
  ejecutar:    ['Lista de Cotejo', 'Guía de Observación'],
  ejecuta:     ['Lista de Cotejo', 'Guía de Observación'],
  demostrar:   ['Lista de Cotejo', 'Guía de Observación'],
  demuestra:   ['Lista de Cotejo', 'Guía de Observación'],
  usar:        ['Lista de Cotejo', 'Guía de Observación'],
  usa:         ['Lista de Cotejo', 'Guía de Observación'],
  resolver:    ['Lista de Cotejo', 'Evidencia de Producto'],
  resuelve:    ['Lista de Cotejo', 'Evidencia de Producto'],
  construir:   ['Lista de Cotejo', 'Evidencia de Producto'],
  construye:   ['Lista de Cotejo', 'Evidencia de Producto'],
  elaborar:    ['Evidencia de Producto'],
  elabora:     ['Evidencia de Producto'],
  // ── Nivel 4 (Analizar) ─────────────────────────────────────────────────
  analizar:    ['Guía de Observación', 'Cuestionario', 'Evidencia de Producto'],
  analiza:     ['Guía de Observación', 'Cuestionario', 'Evidencia de Producto'],
  comparar:    ['Cuestionario', 'Evidencia de Producto'],
  compara:     ['Cuestionario', 'Evidencia de Producto'],
  diferenciar: ['Cuestionario', 'Evidencia de Producto'],
  diferencia:  ['Cuestionario', 'Evidencia de Producto'],
  examinar:    ['Guía de Observación', 'Cuestionario'],
  examina:     ['Guía de Observación', 'Cuestionario'],
  // ── Nivel 5 (Evaluar) ──────────────────────────────────────────────────
  evaluar:     ['Guía de Observación', 'Rúbrica'],
  evalua:      ['Guía de Observación', 'Rúbrica'],
  juzgar:      ['Guía de Observación', 'Rúbrica'],
  juzga:       ['Guía de Observación', 'Rúbrica'],
  valorar:     ['Guía de Observación', 'Rúbrica'],
  valora:      ['Guía de Observación', 'Rúbrica'],
  criticar:    ['Guía de Observación', 'Rúbrica'],
  critica:     ['Guía de Observación', 'Rúbrica'],
  // ── Nivel 6 (Crear) ────────────────────────────────────────────────────
  crear:       ['Evidencia de Producto', 'Portafolio'],
  crea:        ['Evidencia de Producto', 'Portafolio'],
  disenar:     ['Evidencia de Producto', 'Portafolio'],
  disena:      ['Evidencia de Producto', 'Portafolio'],
  planear:     ['Evidencia de Producto', 'Portafolio'],
  planea:      ['Evidencia de Producto', 'Portafolio'],
  producir:    ['Evidencia de Producto'],
  produce:     ['Evidencia de Producto'],
  proponer:    ['Evidencia de Producto', 'Portafolio'],
  propone:     ['Evidencia de Producto', 'Portafolio'],
};

export interface BloomAlignmentResult {
  unidad: string;
  verboPrimero: string;
  tipoInstrumento: string;
  valido: boolean;
  instrumentosPermitidos: string[];
}

/** Normalizes Spanish accented characters for BLOOM_INSTRUMENT_MAP lookup */
function normVerb(v: string): string {
  return v.toLowerCase().trim()
    .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i').replace(/ó/g, 'o').replace(/ú/g, 'u');
}

/**
 * Validates that a Bloom verb aligns with its chosen instrument type.
 * Returns valido=true for unknown verbs (no restriction).
 */
export function validateBloomInstrumentAlignment(
  verboPrimero: string,
  tipoInstrumento: string,
): { valido: boolean; instrumentosPermitidos: string[] } {
  const norm = normVerb(verboPrimero);
  const permitidos = BLOOM_INSTRUMENT_MAP[norm];
  if (!permitidos) return { valido: true, instrumentosPermitidos: [] };
  return { valido: permitidos.includes(tipoInstrumento), instrumentosPermitidos: permitidos };
}

// ── Unit Coverage Validation ──────────────────────────────────────────────

/**
 * Validates that a product document mentions all temario units by name.
 * Returns faltantes=[] when all units are covered.
 */
export function validateUnitCoverage(
  documentoMd: string,
  temarioUnidades: string[],
): { valido: boolean; faltantes: string[] } {
  if (!temarioUnidades.length) return { valido: true, faltantes: [] };
  const docLower = documentoMd.toLowerCase();
  const faltantes = temarioUnidades.filter(
    u => !docLower.includes(u.toLowerCase().trim()),
  );
  return { valido: faltantes.length === 0, faltantes };
}

// ── Materials by Module Validation ───────────────────────────────────────

/**
 * Checks what fraction of the permitted materials for a module appear in the document.
 * Prefers module-specific list; falls back to course-wide inventory when empty.
 * Always warn-not-fail: valido field reserved for future stricter enforcement.
 */
export function validateMaterialsByModule(
  documentoMd: string,
  materialesPermitidos: string[],
  todoElInventario: string[],
): { valido: boolean; no_autorizados: string[]; cobertura: number } {
  const inventario = materialesPermitidos.length > 0 ? materialesPermitidos : todoElInventario;
  if (inventario.length === 0) return { valido: true, no_autorizados: [], cobertura: 1 };
  const docLower = documentoMd.toLowerCase();
  const cubiertos = inventario.filter(m => {
    const term = m.toLowerCase().replace(/\*\*/g, '').trim();
    return term.length >= 4 && docLower.includes(term.slice(0, 30));
  });
  const cobertura = Math.round((cubiertos.length / inventario.length) * 100) / 100;
  return { valido: true, no_autorizados: [], cobertura };
}

// ── Semantic Anchor Validation ────────────────────────────────────────────

/**
 * Validates that a product document reflects ≥60% of keywords from dominioTecnico.
 * Keywords: words ≥4 chars extracted from the domain string.
 * Warn-not-fail: valido=false only when coverage is below threshold.
 */
export function validateSemanticAnchor(
  documentoMd: string,
  dominioTecnico: string,
): { valido: boolean; ausentes: string[]; cobertura: number } {
  if (!dominioTecnico || !dominioTecnico.trim()) return { valido: true, ausentes: [], cobertura: 1 };
  const keywords = dominioTecnico
    .toLowerCase()
    .split(/[\s,;/()]+/)
    .map(w => w.replace(/[^a-záéíóúüñ]/gi, '').trim())
    .filter(w => w.length >= 4);
  const unique = [...new Set(keywords)];
  if (unique.length === 0) return { valido: true, ausentes: [], cobertura: 1 };
  const docLower = documentoMd.toLowerCase();
  const ausentes = unique.filter(kw => !docLower.includes(kw));
  const cobertura = Math.round(((unique.length - ausentes.length) / unique.length) * 100) / 100;
  return { valido: cobertura >= 0.6, ausentes, cobertura };
}

// ── Winner Selection ──────────────────────────────────────────────────────

/**
 * Resolves judge output → picks winner agent → returns raw output string.
 * Fallback chain: winner → loser → '' (never throws).
 */
export async function pickWinnerOutput(
  getOutput: (agentName: string) => Promise<string>,
  juezKey: string,
  aKey: string,
  bKey: string,
): Promise<{ output: string; seleccion: 'A' | 'B' }> {
  const rawJuez = await getOutput(juezKey);
  const juezMatch = rawJuez.match(/\{[\s\S]*\}/);
  let decision: { seleccion?: string } = { seleccion: 'A' };
  try { if (juezMatch) decision = JSON.parse(juezMatch[0]); } catch {}
  const seleccion: 'A' | 'B' = decision?.seleccion === 'B' ? 'B' : 'A';
  const winnerKey = seleccion === 'A' ? aKey : bKey;
  const loserKey = seleccion === 'A' ? bKey : aKey;
  const winnerOutput = await getOutput(winnerKey);
  if (winnerOutput) return { output: winnerOutput, seleccion };
  const loserOutput = await getOutput(loserKey);
  return { output: loserOutput, seleccion };
}

/**
 * Extracts a typed value from a raw LLM output string by JSON key.
 * Handles malformed JSON (unquoted keys, trailing commas) silently.
 */
export function extractAny(raw: string, key: string): any {
  try {
    const objMatch = raw.match(/\{[\s\S]*\}/);
    if (objMatch) {
      const obj = JSON.parse(objMatch[0]);
      return obj[key];
    }
  } catch {}
  return null;
}
