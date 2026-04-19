// src/dcfl/services/informe.parser.f2.ts
//
// Convierte el Markdown del sintetizador_final_f2 en campos estructurados
// listos para insertar en la tabla fase2_analisis_alcance.
// Usa regex sobre la estructura fija del FORMATO DE SALIDA OBLIGATORIO de F2.

export interface AnalisisF2Parsed {
  modalidad:              Record<string, string> | null;   // { modalidad, plataforma, distribucion, justificacion }
  interactividad:         Record<string, unknown> | null;  // { nivel, descripcion, elementos: [...] }
  estructura_tematica:    Array<{ modulo: string; nombre: string; objetivo: string; horas: string }> | null;
  perfil_ingreso:         Array<{ categoria: string; requisito: string; fuente: string }> | null;
  estrategias:            Array<{ estrategia: string; descripcion: string; modulos: string; bloom: string }> | null;
  supuestos_restricciones: { supuestos: string[]; restricciones: string[] } | null;
}

// ── Helpers (idénticos a informe.parser.ts) ───────────────────────────────────

function _extractSection(markdown: string, headerPattern: RegExp): string {
  const match = markdown.match(
    new RegExp(`${headerPattern.source}([\\s\\S]*?)(?=\\n## |\\n# |$)`, 'i'),
  );
  return match?.[1]?.trim() ?? '';
}

function _parseMarkdownTable(block: string): Array<Record<string, string>> {
  const lines = block.split('\n').filter((l) => l.trim().startsWith('|'));
  if (lines.length < 2 || !lines[0]) return [];

  const headers = lines[0]
    .split('|')
    .map((h) => h.trim().toLowerCase().replace(/[\s_*]+/g, '_').replace(/[()]/g, ''))
    .filter(Boolean);

  return lines
    .slice(2)
    .map((line) => {
      const cols = line.split('|').map((c) => c.trim()).filter((_, i, a) => i > 0 && i < a.length - 1);
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { if (h) row[h] = cols[i] ?? ''; });
      return row;
    })
    .filter((r) => Object.values(r).some((v) => v.length > 0));
}

function _parseBulletList(block: string): string[] {
  return block
    .split('\n')
    .map((l) => l.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '').trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));
}

// ── Parser principal ──────────────────────────────────────────────────────────

export function parseAnalisisF2(markdown: string): AnalisisF2Parsed {
  // ── 1. Modalidad ────────────────────────────────────────────────────────────
  const modalidadBlock = _extractSection(markdown, /## 1\. DECISI[ÓO]N DE MODALIDAD/);
  const modalidadRaw = _parseMarkdownTable(modalidadBlock);
  let modalidad: Record<string, string> | null = null;
  if (modalidadRaw.length > 0) {
    modalidad = {};
    for (const row of modalidadRaw) {
      const key = (row['par[aá]metro'] ?? row['parametro'] ?? '').toLowerCase().replace(/\s+/g, '_');
      const val = row['decisi[oó]n'] ?? row['decision'] ?? '';
      const just = row['justificaci[oó]n'] ?? row['justificacion'] ?? '';
      if (key) {
        modalidad[key] = val;
        if (just) modalidad[`${key}_justificacion`] = just;
      }
    }
  }

  // ── 2. Interactividad ───────────────────────────────────────────────────────
  const interactBlock = _extractSection(markdown, /## 2\. NIVEL DE INTERACTIVIDAD/);
  // Extract nivel from bold line: "**Nivel seleccionado:** 3 — Moderado"
  const nivelMatch = interactBlock.match(/\*\*Nivel seleccionado:\*\*\s*([^\n]+)/i);
  const nivelRaw = nivelMatch?.[1]?.trim() ?? '';
  const nivelNum = nivelRaw.match(/(\d)/)?.[1] ?? '';
  const nivelDesc = nivelRaw.replace(/^\d\s*[—–-]\s*/, '').trim();

  const elementosRaw = _parseMarkdownTable(interactBlock);
  const elementos = elementosRaw.map((r) => ({
    elemento:   r['elemento_interactivo'] ?? r['elemento'] ?? '',
    incluido:   r['incluido'] ?? '',
    frecuencia: r['frecuencia_concreta'] ?? r['frecuencia'] ?? r['frecuencia_sugerida'] ?? '',
  })).filter((e) => e.elemento.length > 0);

  const interactividad: Record<string, unknown> | null = nivelNum
    ? { nivel: parseInt(nivelNum), descripcion: nivelDesc, elementos }
    : null;

  // ── 3. Estructura temática ──────────────────────────────────────────────────
  const estructuraBlock = _extractSection(markdown, /## 3\. ESTRUCTURA TEM[ÁA]TICA/);
  const estructuraRaw = _parseMarkdownTable(estructuraBlock);
  const estructura_tematica = estructuraRaw.length > 0
    ? estructuraRaw
        .filter((r) => {
          const mod = r['m[oó]dulo'] ?? r['modulo'] ?? '';
          return mod && !mod.toLowerCase().includes('total');
        })
        .map((r) => ({
          modulo:   r['m[oó]dulo'] ?? r['modulo'] ?? '',
          nombre:   r['nombre'] ?? '',
          objetivo: r['objetivo_del_m[oó]dulo'] ?? r['objetivo'] ?? '',
          horas:    r['duraci[oó]n_estimada_horas'] ?? r['duracion_estimada_horas'] ?? r['horas'] ?? '',
        }))
    : null;

  // ── 4. Perfil de ingreso ────────────────────────────────────────────────────
  const perfilBlock = _extractSection(markdown, /## 4\. PERFIL DE INGRESO/);
  const perfilRaw = _parseMarkdownTable(perfilBlock);
  const perfil_ingreso = perfilRaw.length > 0
    ? perfilRaw.map((r) => ({
        categoria: r['categor[ií]a'] ?? r['categoria'] ?? '',
        requisito: r['requisito'] ?? '',
        fuente:    r['fuente'] ?? '',
      })).filter((r) => r.categoria.length > 0)
    : null;

  // ── 5. Estrategias instruccionales ──────────────────────────────────────────
  const estrategiasBlock = _extractSection(markdown, /## 5\. ESTRATEGIAS INSTRUCCIONALES/);
  const estrategiasRaw = _parseMarkdownTable(estrategiasBlock);
  const estrategias = estrategiasRaw.length > 0
    ? estrategiasRaw.map((r) => ({
        estrategia:  r['estrategia'] ?? '',
        descripcion: r['descripci[oó]n'] ?? r['descripcion'] ?? '',
        modulos:     r['m[oó]dulos_donde_aplica'] ?? r['modulos'] ?? '',
        bloom:       r['nivel_bloom_que_atiende'] ?? r['nivel_bloom'] ?? r['bloom'] ?? '',
      })).filter((r) => r.estrategia.length > 0)
    : null;

  // ── 6. Supuestos y restricciones ────────────────────────────────────────────
  const supRestBlock = _extractSection(markdown, /## 6\. SUPUESTOS Y RESTRICCIONES/);
  const supuestosBlock = supRestBlock.match(/###\s*Supuestos([\s\S]*?)(?=###|$)/i)?.[1] ?? '';
  const restriccionesBlock = supRestBlock.match(/###\s*Restricciones([\s\S]*?)(?=###|$)/i)?.[1] ?? '';

  const supuestos = _parseBulletList(supuestosBlock);
  const restricciones = _parseBulletList(restriccionesBlock);
  const supuestos_restricciones =
    supuestos.length > 0 || restricciones.length > 0
      ? { supuestos, restricciones }
      : null;

  return {
    modalidad,
    interactividad,
    estructura_tematica,
    perfil_ingreso,
    estrategias,
    supuestos_restricciones,
  };
}
