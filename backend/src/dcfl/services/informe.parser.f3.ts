// src/dcfl/services/informe.parser.f3.ts
//
// Convierte el Markdown del sintetizador_final_f3 en campos estructurados
// listos para insertar en la tabla fase3_especificaciones.
// Usa regex sobre la estructura fija del FORMATO DE SALIDA OBLIGATORIO de F3.

export interface PlataformaNavegador {
  plataforma_nombre: string;
  plataforma_version?: string;
  plataforma_justificacion?: string;
  version_scorm?: string;
  navegadores_soportados: string[];
  navegadores_no_soportados?: string[];
  dispositivos_soportados: string[];
}

export interface MetricaReporteo {
  metrica: string;
  formato: string;
  frecuencia: string;
}

export interface Reporteo {
  metricas_a_reportar: MetricaReporteo[];
  frecuencia_reporte_automatico: string;
  formato_reporte: string;
  destinatarios: string[];
  justificacion?: string;
}

export interface FormatoMultimedia {
  numero_total_recomendado?: number;
  duracion_optima_por_video_minutos?: number;
  tipo?: string[];
  justificacion?: string;
  referencia?: string;
  numero_recomendado?: number;
  por_modulo?: number;
  incluir?: boolean;
  contenido?: string[];
  resolucion?: string;
  peso_max?: string;
  herramienta?: string;
}

export interface FormatosMultimedia {
  videos: FormatoMultimedia;
  infografias: FormatoMultimedia;
  pdfs_descargables: FormatoMultimedia;
  audios: FormatoMultimedia;
}

export interface NodoNavegacion {
  modulo: number;
  actividades: number;
  evaluacion: boolean;
}

export interface NavegacionIdentidad {
  navegacion: {
    tipo: string;
    permite_saltar_modulos: boolean;
    marca_progreso_visible: boolean;
    botones_principales: string[];
    mapa_navegacion: NodoNavegacion[];
  };
  identidad_grafica: {
    paleta_colores_sugerida?: string[];
    tipografia_sugerida?: string;
    requiere_logo_cliente?: boolean;
    justificacion?: string;
  };
}

export interface CriteriosAceptacion {
  criterios_contenido: string[];
  criterios_tecnico: string[];
  criterios_pedagogico: string[];
  criterios_accesibilidad: string[];
  justificacion?: string;
}

export interface DetalleModulo {
  modulo: number;
  horas: number;
  actividades: number;
  evaluacion: number;
}

export interface CalculoDuracion {
  duracion_total_horas: number;
  distribucion_semanal: {
    numero_semanas: number;
    horas_por_semana: number;
  };
  detalle_por_modulo: DetalleModulo[];
  tiempo_estimado_por_actividad_minutos: number;
  tiempo_estimado_por_evaluacion_minutos: number;
  formula_utilizada: string;
  justificacion?: string;
}

export interface EspecificacionesF3Parsed {
  plataforma_navegador: PlataformaNavegador | null;
  reporteo: Reporteo | null;
  formatos_multimedia: FormatosMultimedia | null;
  navegacion_identidad: NavegacionIdentidad | null;
  criterios_aceptacion: CriteriosAceptacion | null;
  calculo_duracion: CalculoDuracion | null;
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
    .map((h) => h.trim().toLowerCase().replace(/[\s_*¿?:]+/g, '_').replace(/[()áéíóú]/g, (c) => ({ á:'a',é:'e',í:'i',ó:'o',ú:'u' }[c] ?? c)))
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
    .filter((l) => l.length > 0 && !l.startsWith('#') && !l.startsWith('|'));
}

function _extractBoldValue(block: string, key: RegExp): string {
  const m = block.match(new RegExp(`\\*\\*${key.source}\\*\\*[:\\s]+([^\\n]+)`, 'i'));
  return m?.[1]?.trim() ?? '';
}

// ── Parser principal ──────────────────────────────────────────────────────────

export function parseEspecificacionesF3(markdown: string): EspecificacionesF3Parsed {
  // ── 1. Plataforma y navegadores ───────────────────────────────────────────────
  // El agente_plataforma_navegador genera pares clave-valor en negrita (**Plataforma:** X),
  // no tablas — se usa _extractBoldValue en lugar del parser de tablas.
  const platBlock = _extractSection(markdown, /## 1\. PLATAFORMA/);
  let plataforma_navegador: PlataformaNavegador | null = null;
  if (platBlock) {
    const navegadoresBlock = _extractSection(platBlock, /navegadores?\s+soportados?/);
    const navegadoresList = _parseBulletList(navegadoresBlock).filter((l) => /chrome|firefox|edge|safari/i.test(l));

    const dispositivosBlock = _extractSection(platBlock, /dispositivos?/);
    const dispositivosList = _parseBulletList(dispositivosBlock);

    const _platVersion = _extractBoldValue(platBlock, /[Vv]ersi[oó]n\s+(?:m[ií]nima|SCORM|del?\s+LMS)/) || undefined;
    const _platJustif  = _extractBoldValue(platBlock, /[Jj]ustificaci[oó]n/) || undefined;
    const _scorm       = _extractBoldValue(platBlock, /SCORM/) ||
                         platBlock.match(/SCORM\s*(1\.2|2004|xAPI|Tin\s*Can)/i)?.[0] ||
                         undefined;
    plataforma_navegador = {
      plataforma_nombre:
        _extractBoldValue(platBlock, /[Pp]lataforma/) ||
        _extractBoldValue(platBlock, /LMS/) ||
        'No especificado',
      ...(_platVersion !== undefined && { plataforma_version: _platVersion }),
      ...(_platJustif  !== undefined && { plataforma_justificacion: _platJustif }),
      ...(_scorm       !== undefined && { version_scorm: _scorm }),
      navegadores_soportados: navegadoresList.length > 0
        ? navegadoresList
        : ['Chrome 90+', 'Firefox 88+', 'Edge 90+'],
      dispositivos_soportados: dispositivosList.length > 0
        ? dispositivosList
        : ['Desktop', 'Tablet', 'Móvil'],
    };
  }

  // ── 2. Reporteo ───────────────────────────────────────────────────────────────
  const reporteoBlock = _extractSection(markdown, /## 2\. REPORTEO|## 2\. REQUISITOS DE REPORTEO/);
  let reporteo: Reporteo | null = null;
  if (reporteoBlock) {
    const rows = _parseMarkdownTable(reporteoBlock);
    const metricas: MetricaReporteo[] = rows.map((r) => ({
      metrica:    r['m_trica'] ?? r['metrica'] ?? r['actividad'] ?? '',
      formato:    r['herramienta'] ?? r['formato'] ?? r['_se_rastrea_'] ?? '',
      frecuencia: r['frecuencia'] ?? 'Por sesión',
    })).filter((m) => m.metrica.length > 0);

    const frecMatch = reporteoBlock.match(/frecuencia[^:]*:\s*([^\n.]+)/i);
    const freqAuto = frecMatch?.[1]?.trim() ?? 'Semanal';

    reporteo = {
      metricas_a_reportar: metricas,
      frecuencia_reporte_automatico: freqAuto,
      formato_reporte: _extractBoldValue(reporteoBlock, /formato/) || 'PDF + Dashboard',
      destinatarios: ['Participante', 'Instructor', 'Administrador'],
    };
  }

  // ── 3. Formatos multimedia ────────────────────────────────────────────────────
  const multBlock = _extractSection(markdown, /## 3\. (?:FORMATOS? MULTIMEDIA|ESPECIFICACIONES? MULTIMEDIA|DURACI)/);
  let formatos_multimedia: FormatosMultimedia | null = null;
  if (multBlock) {
    const rows = _parseMarkdownTable(multBlock);
    const getFormatRow = (type: string): Record<string, string> =>
      rows.find((r) => Object.values(r).some((v) => new RegExp(type, 'i').test(v))) ?? {};

    const videoRow = getFormatRow('video');
    const audioRow = getFormatRow('audio');
    const imgRow   = getFormatRow('imagen|img|png|jpeg');
    const pdfRow   = getFormatRow('pdf');

    const videoCountMatch = multBlock.match(/(\d+)\s*videos?/i);
    const videoDurMatch   = multBlock.match(/(\d+)\s*min(?:utos?)?\s*(?:por|c\/u|por video)/i);

    const videoCount = videoCountMatch?.[1] ? parseInt(videoCountMatch[1]) : null;
    const videoDur   = videoDurMatch?.[1] ? parseInt(videoDurMatch[1]) : null;

    formatos_multimedia = {
      videos: {
        ...(videoCount !== null ? { numero_total_recomendado: videoCount } : {}),
        duracion_optima_por_video_minutos: videoDur ?? 5,
        resolucion: videoRow['resoluci_n'] ?? videoRow['resolucion'] ?? videoRow['calidad'] ?? '1920×1080',
        peso_max: videoRow['peso_m_ximo'] ?? videoRow['peso'] ?? '500 MB',
        herramienta: videoRow['herramienta'] ?? 'Camtasia / OBS',
      },
      infografias: {
        justificacion: 'Apoya aprendizaje visual',
      },
      pdfs_descargables: {
        incluir: true,
        peso_max: pdfRow['peso_m_ximo'] ?? pdfRow['peso'] ?? '5 MB',
        herramienta: pdfRow['herramienta'] ?? 'Adobe Acrobat / LibreOffice',
      },
      audios: {
        incluir: !!audioRow && Object.keys(audioRow).length > 0,
        herramienta: audioRow['herramienta'] ?? '',
      },
    };
  }

  // ── 4. Navegación e identidad gráfica ─────────────────────────────────────────
  const navBlock = _extractSection(markdown, /## 4\. NAVEGACI/);
  let navegacion_identidad: NavegacionIdentidad | null = null;
  if (navBlock) {
    const tipoMatch = navBlock.match(/tipo[^:]*:\s*([^\n.]+)/i);
    navegacion_identidad = {
      navegacion: {
        tipo: tipoMatch?.[1]?.trim() ?? 'Lineal con ramificaciones controladas',
        permite_saltar_modulos: /no.*salt|sin.*acceso.*libre|lineal/i.test(navBlock),
        marca_progreso_visible: !/sin.*progreso/i.test(navBlock),
        botones_principales: ['Anterior', 'Siguiente', 'Índice', 'Ayuda'],
        mapa_navegacion: [],
      },
      identidad_grafica: {
        requiere_logo_cliente: /logo/i.test(navBlock),
        justificacion: 'Basado en principios de usabilidad para el contexto del curso',
      },
    };
  }

  // ── 5. Criterios de aceptación ────────────────────────────────────────────────
  const critBlock = _extractSection(markdown, /## 5\. CRITERIOS/);
  let criterios_aceptacion: CriteriosAceptacion | null = null;
  if (critBlock) {
    const contenidoBlock = _extractSection(critBlock, /contenido/);
    const tecnicoBlock   = _extractSection(critBlock, /t[eé]cnico/);
    const pedagBlock     = _extractSection(critBlock, /pedag[oó]gico/);
    const accesBlock     = _extractSection(critBlock, /accesibilidad/);

    criterios_aceptacion = {
      criterios_contenido:     _parseBulletList(contenidoBlock || critBlock).slice(0, 5),
      criterios_tecnico:       _parseBulletList(tecnicoBlock).slice(0, 5),
      criterios_pedagogico:    _parseBulletList(pedagBlock).slice(0, 4),
      criterios_accesibilidad: _parseBulletList(accesBlock).slice(0, 3),
    };
  }

  // ── 6. Cálculo de duración ────────────────────────────────────────────────────
  const durBlock = _extractSection(markdown, /## 6\. C[ÁA]LCULO DE DURACI/);
  let calculo_duracion: CalculoDuracion | null = null;
  if (durBlock) {
    const totalMatch   = durBlock.match(/(\d+(?:\.\d+)?)\s*horas?\s*(?:totales?|en total|del curso)/i);
    const semanasMatch = durBlock.match(/(\d+)\s*semanas?/i);
    const hxsMatch     = durBlock.match(/(\d+(?:\.\d+)?)\s*horas?\s*(?:por semana|\/semana)/i);
    const formulaMatch = durBlock.match(/f[oó]rmula[^:]*:\s*([^\n]+)/i);

    const rows = _parseMarkdownTable(durBlock);
    const detalle: DetalleModulo[] = rows
      .filter((r) => /m[oó]dulo|module/i.test(Object.values(r).join(' ')))
      .map((r, idx) => {
        const horas = parseFloat(r['horas'] ?? r['duraci_n'] ?? '0') || 0;
        const acts  = parseInt(r['actividades'] ?? '0') || 0;
        return { modulo: idx + 1, horas, actividades: acts, evaluacion: 0.5 };
      });

    calculo_duracion = {
      duracion_total_horas: totalMatch?.[1] ? parseFloat(totalMatch[1]) : 0,
      distribucion_semanal: {
        numero_semanas:  semanasMatch?.[1] ? parseInt(semanasMatch[1]) : 4,
        horas_por_semana: hxsMatch?.[1] ? parseFloat(hxsMatch[1]) : 0,
      },
      detalle_por_modulo: detalle,
      tiempo_estimado_por_actividad_minutos: 30,
      tiempo_estimado_por_evaluacion_minutos: 30,
      formula_utilizada: formulaMatch?.[1]?.trim() ?? '(actividades × 30min) + (evaluaciones × 30min)',
    };
  }

  return {
    plataforma_navegador,
    reporteo,
    formatos_multimedia,
    navegacion_identidad,
    criterios_aceptacion,
    calculo_duracion,
  };
}
