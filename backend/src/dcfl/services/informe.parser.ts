// src/dcfl/services/informe.parser.ts
//
// Convierte el Markdown del informe F1 (sintetizador_final) en campos estructurados
// listos para insertar en la tabla fase1_informe_necesidades.
// Usa regex sobre la estructura fija del FORMATO DE SALIDA OBLIGATORIO de F1.

export interface InformeF1Parsed {
  sintesis_contexto:      string | null;
  preguntas_respuestas:   Array<{ pregunta: string; respuesta: string }> | null;
  brechas_competencia:    Array<{ tipo: string; descripcion: string; capacitable: string }> | null;
  declaracion_problema:   string | null;
  objetivos_aprendizaje:  Array<{ objetivo: string; nivel_bloom: string; tipo: string }> | null;
  perfil_participante:    Record<string, string> | null;
  resultados_esperados:   string[] | null;
  recomendaciones_diseno: string[] | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _extractSection(markdown: string, headerPattern: RegExp): string {
  const match = markdown.match(
    new RegExp(`${headerPattern.source}([\\s\\S]*?)(?=\\n## |\\n# |$)`, 'i'),
  );
  return match?.[1]?.trim() ?? '';
}

/** Normalizes a table-header string to a plain snake_case ASCII key. */
function _normalizeHeader(h: string): string {
  return h.trim()
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accent combining marks
    .replace(/[^a-z0-9\s_]/g, ' ')                    // non-alphanum → space
    .replace(/[\s_]+/g, '_')                          // collapse spaces/underscores
    .replace(/^_+|_+$/g, '');                         // trim edge underscores
}

/** Returns the value for the first candidate key found in `row`.
 *  Also tries prefix matching (key starts with candidate + '_'). */
function _findKey(row: Record<string, string>, ...candidates: string[]): string {
  for (const c of candidates) {
    if (c in row) return row[c] ?? '';
    const entry = Object.entries(row).find(([k]) => k === c || k.startsWith(c + '_'));
    if (entry) return entry[1] ?? '';
  }
  return '';
}

function _parseMarkdownTable(
  block: string,
): Array<Record<string, string>> {
  const lines = block.split('\n').filter((l) => l.trim().startsWith('|'));
  if (lines.length < 2 || !lines[0]) return [];

  const headers = lines[0]
    .split('|')
    .map((h) => _normalizeHeader(h))
    .filter(Boolean);

  return lines
    .slice(2) // skip header + separator
    .map((line) => {
      const cols = line.split('|').map((c) => c.trim()).filter((_, i, a) => i > 0 && i < a.length - 1);
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { if (h) row[h] = cols[i] ?? ''; });
      return row;
    })
    .filter((r) => Object.values(r).some((v) => v.length > 0));
}

function _parseNumberedList(block: string): string[] {
  return block
    .split('\n')
    .map((l) => l.replace(/^\d+\.\s*/, '').trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));
}

// ── Exportación principal ─────────────────────────────────────────────────────

export function parseInformeNecesidades(markdown: string): InformeF1Parsed {
  // ── 1. Síntesis del contexto ──────────────────────────────────────────────
  const sintesisRaw = _extractSection(markdown, /## 1\. S[ÍI]NTESIS DEL CONTEXTO/);
  // Quitar la sub-tabla de preguntas y respuestas de la síntesis
  const sintesis_contexto = sintesisRaw.replace(/### Preguntas[\s\S]*$/, '').trim() || null;

  // ── Tabla de preguntas y respuestas del cliente ───────────────────────────
  const qaBlock = _extractSection(markdown, /### Preguntas y respuestas del cliente/);
  const qaRaw = _parseMarkdownTable(qaBlock);
  const preguntas_respuestas = qaRaw.length > 0
    ? qaRaw.map((r) => ({
        pregunta:  r['pregunta'] ?? r['#'] ?? '',
        respuesta: r['respuesta_del_cliente'] ?? r['respuesta'] ?? '',
      })).filter((r) => r.pregunta.length > 0)
    : null;

  // ── 2. Análisis de brechas ────────────────────────────────────────────────
  const brechasBlock = _extractSection(markdown, /## 2\. AN[ÁA]LISIS DE BRECHAS/);
  const brechasRaw = _parseMarkdownTable(brechasBlock);
  const brechas_competencia = brechasRaw.length > 0
    ? brechasRaw.map((r) => ({
        tipo:        _findKey(r, 'tipo_de_brecha', 'tipo'),
        descripcion: _findKey(r, 'descripcion'),
        capacitable: r['capacitable'] ?? '',
      }))
    : null;

  // ── 3. Declaración del problema ───────────────────────────────────────────
  const probBlock = _extractSection(markdown, /## 3\. DECLARACI[ÓO]N DEL PROBLEMA/);
  const declaracion_problema = probBlock.replace(/\[.*?\]/g, '').trim() || null;

  // ── 4. Objetivos de aprendizaje ───────────────────────────────────────────
  const objBlock = _extractSection(markdown, /## 4\. OBJETIVOS DE APRENDIZAJE/);
  const objRaw = _parseMarkdownTable(objBlock);
  const objetivos_aprendizaje = objRaw.length > 0
    ? objRaw.map((r) => ({
        objetivo:    _findKey(r, 'objetivo'),
        nivel_bloom: _findKey(r, 'nivel_bloom', 'nivel'),
        tipo:        r['tipo'] ?? '',
      })).filter((r) => r.objetivo.length > 0)
    : null;

  // ── 5. Perfil del participante ────────────────────────────────────────────
  const perfilBlock = _extractSection(markdown, /## 5\. PERFIL DEL PARTICIPANTE/);
  const perfilRaw = _parseMarkdownTable(perfilBlock);
  let perfil_participante: Record<string, string> | null = null;
  if (perfilRaw.length > 0) {
    perfil_participante = {};
    for (const row of perfilRaw) {
      const key = _findKey(row, 'caracteristica')
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_');
      const val = _findKey(row, 'descripcion');
      if (key) perfil_participante[key] = val;
    }
  }

  // ── 6. Resultados esperados ───────────────────────────────────────────────
  const resBlock = _extractSection(markdown, /## 6\. RESULTADOS ESPERADOS/);
  const resultados = _parseNumberedList(resBlock);
  const resultados_esperados = resultados.length > 0 ? resultados : null;

  // ── 7. Recomendaciones para el diseño ─────────────────────────────────────
  const recBlock = _extractSection(markdown, /## 7\. RECOMENDACIONES/);
  const recs = _parseNumberedList(recBlock);
  const recomendaciones_diseno = recs.length > 0 ? recs : null;

  return {
    sintesis_contexto,
    preguntas_respuestas,
    brechas_competencia,
    declaracion_problema,
    objetivos_aprendizaje,
    perfil_participante,
    resultados_esperados,
    recomendaciones_diseno,
  };
}
