// src/dcfl/services/informe.parser.f2_5.ts
//
// Convierte el Markdown del sintetizador_final_f2_5 en campos estructurados
// listos para insertar en la tabla fase2_5_recomendaciones.
// Usa regex sobre la estructura fija del FORMATO DE SALIDA OBLIGATORIO de F2.5.

export interface ActividadAprendizaje {
  tipo: string;
  proposito: string;
  frecuencia: string;
  justificacion: string;
}

export interface MetricaSeguimiento {
  metrica: string;
  descripcion: string;
  frecuencia: string;
}

export interface RecomendacionesF2_5Parsed {
  actividades: ActividadAprendizaje[] | null;
  metricas: MetricaSeguimiento[] | null;
  frecuencia_revision: string | null;
  total_videos: number | null;
  duracion_promedio_minutos: number | null;
  duracion_total_videos_horas: number | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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
    .map((h) =>
      h
        .trim()
        .toLowerCase()
        .replace(/[\s_*¿?:]+/g, '_')
        .replace(/[#()áéíóú]/g, (c) => ({ á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u' }[c] ?? c)),
    )
    .filter(Boolean);

  return lines
    .slice(2)
    .map((line) => {
      const cols = line
        .split('|')
        .map((c) => c.trim())
        .filter((_, i, a) => i > 0 && i < a.length - 1);
      const row: Record<string, string> = {};
      headers.forEach((h, i) => {
        if (h) row[h] = cols[i] ?? '';
      });
      return row;
    })
    .filter((r) => Object.values(r).some((v) => v.length > 0));
}

// ── Parser principal ──────────────────────────────────────────────────────────

export function parseRecomendacionesF2_5(markdown: string): RecomendacionesF2_5Parsed {
  // ── 1. Actividades de aprendizaje ─────────────────────────────────────────────
  const actBlock = _extractSection(markdown, /## 1\. ACTIVIDADES/);
  let actividades: ActividadAprendizaje[] | null = null;
  if (actBlock) {
    const rows = _parseMarkdownTable(actBlock);
    const parsed: ActividadAprendizaje[] = rows
      .map((r) => ({
        tipo:         r['tipo_de_actividad'] ?? r['tipo'] ?? r['actividad'] ?? '',
        proposito:    r['prop_sito_pedag_gico'] ?? r['proposito'] ?? r['prop_sito'] ?? '',
        frecuencia:   r['frecuencia_sugerida'] ?? r['frecuencia'] ?? '',
        justificacion: r['justificaci_n'] ?? r['justificacion'] ?? '',
      }))
      .filter((a) => a.tipo.length > 0);
    if (parsed.length > 0) actividades = parsed;
  }

  // ── 2. Métricas de seguimiento ────────────────────────────────────────────────
  const metBlock = _extractSection(markdown, /## 2\. M[ÉE]TRICAS/);
  let metricas: MetricaSeguimiento[] | null = null;
  let frecuencia_revision: string | null = null;
  if (metBlock) {
    const rows = _parseMarkdownTable(metBlock);
    const parsed: MetricaSeguimiento[] = rows
      .map((r) => ({
        metrica:     r['m_trica'] ?? r['metrica'] ?? '',
        descripcion: r['descripci_n'] ?? r['descripcion'] ?? '',
        frecuencia:  r['frecuencia_de_revisi_n'] ?? r['frecuencia'] ?? '',
      }))
      .filter((m) => m.metrica.length > 0);
    if (parsed.length > 0) metricas = parsed;

    // Extraer frecuencia_revision del texto libre
    const frecMatch = metBlock.match(/frecuencia de revisi[oó]n recomendada[^:]*:\s*([^\n.]+)/i);
    if (frecMatch?.[1]) {
      frecuencia_revision = frecMatch[1].trim().replace(/\*\*/g, '');
    } else if (parsed.length > 0 && parsed[0]?.frecuencia) {
      frecuencia_revision = parsed[0].frecuencia;
    }
  }

  // ── 3. Videos — tabla 3.3 ─────────────────────────────────────────────────────
  const sec3Block = _extractSection(markdown, /## 3\. ESTRUCTURA DE VIDEOS/);
  let total_videos: number | null = null;
  let duracion_promedio_minutos: number | null = null;
  let duracion_total_videos_horas: number | null = null;

  if (sec3Block) {
    // Buscar tabla 3.3 (Resumen ejecutivo)
    const resumenBlock = _extractSection(sec3Block, /### 3\.3/);
    const targetBlock = resumenBlock || sec3Block;
    const rows = _parseMarkdownTable(targetBlock);

    for (const row of rows) {
      const values = Object.values(row).map((v) => v.toLowerCase());
      const key = Object.keys(row)[0] ?? '';
      const val = Object.values(row)[1] ?? '';

      if (/total.*videos?/i.test(key) || values.some((v) => /total.*videos?/i.test(v))) {
        const numMatch = val.match(/(\d+)/);
        if (numMatch?.[1]) total_videos = parseInt(numMatch[1]);
      }
      if (/duraci[oó]n.*promedio/i.test(key) || values.some((v) => /duraci[oó]n.*promedio/i.test(v))) {
        const numMatch = val.match(/(\d+)/);
        if (numMatch?.[1]) duracion_promedio_minutos = parseInt(numMatch[1]);
      }
      if (/duraci[oó]n.*total/i.test(key) || values.some((v) => /duraci[oó]n.*total/i.test(v))) {
        const numMatch = val.match(/(\d+(?:\.\d+)?)/);
        if (numMatch?.[1]) duracion_total_videos_horas = parseFloat(numMatch[1]);
      }
    }

    // Fallback: buscar totales en texto libre de la sección
    if (total_videos === null) {
      const totalMatch = sec3Block.match(/total.*?(\d+)\s*videos?/i) ??
                         sec3Block.match(/(\d+)\s*videos?\s*(?:en total|sugeridos?)/i);
      if (totalMatch?.[1]) total_videos = parseInt(totalMatch[1]);
    }
    if (duracion_promedio_minutos === null) {
      // Default según la plantilla: 6 minutos
      duracion_promedio_minutos = 6;
    }
    if (duracion_total_videos_horas === null && total_videos !== null && duracion_promedio_minutos !== null) {
      duracion_total_videos_horas = parseFloat(((total_videos * duracion_promedio_minutos) / 60).toFixed(2));
    }
  }

  return {
    actividades,
    metricas,
    frecuencia_revision,
    total_videos,
    duracion_promedio_minutos,
    duracion_total_videos_horas,
  };
}
