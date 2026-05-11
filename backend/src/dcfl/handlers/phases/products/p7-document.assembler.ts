import { ProductContext } from './product.types';

// ── Tipos ──────────────────────────────────────────────────────────────────

interface DescripcionTema {
  que_es: string;
  para_que_sirve: string;
  relacion_puesto: string;
  errores_evitar?: string;
}

interface Concepto {
  termino: string;
  definicion: string;
  ejemplo: string;
}

interface Tecnico {
  conceptos: Concepto[];
  normativa: string[];
  indicador_dominio?: string;
}

interface ParteInformacion {
  descripcion: DescripcionTema | null;
  tecnico: Tecnico | null;
}

const SECCIONES = ['descripcion', 'conceptos'] as const;
type Seccion = typeof SECCIONES[number];

const CLAVE_PARTE: Record<Seccion, keyof ParteInformacion> = {
  descripcion: 'descripcion',
  conceptos: 'tecnico',
};

// ── Formateadores ──────────────────────────────────────────────────────────

// Campos de F2 fase2_analisis_alcance.perfil_ingreso en el formato JSONB real de la BD
const PERFIL_LABEL: Record<string, string> = {
  conocimientos_previos: 'Conocimientos previos',
  habilidades_digitales: 'Habilidades digitales',
  escolaridad_minima: 'Escolaridad mínima',
  equipo_computo: 'Equipo de cómputo',
  conexion_internet: 'Conexión a internet',
  software_requerido: 'Software requerido',
  disponibilidad_sugerida: 'Disponibilidad sugerida',
};

function formatearPerfilIngreso(raw: any): string {
  if (!raw) return '';

  // Formato objeto {clave: {requisito, justificacion}} — estructura real de la BD
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return Object.entries(raw)
      .map(([key, val]: [string, any]) => {
        const label = PERFIL_LABEL[key] || key.replace(/_/g, ' ');
        const requisito = typeof val === 'object' ? (val.requisito || val.requirement || '') : String(val);
        const justif = typeof val === 'object' ? (val.justificacion || val.justification || '') : '';
        if (!requisito) return '';
        return justif
          ? `- **${label}**: ${requisito} *(${justif})*`
          : `- **${label}**: ${requisito}`;
      })
      .filter(Boolean)
      .join('\n');
  }

  // Formato array [{categoria, requisito, fuente}] — tipo declarado en supabase.service.ts
  if (Array.isArray(raw)) {
    return (raw as Array<any>)
      .map(item => {
        const label = item.categoria || item.category || '';
        const req = item.requisito || item.requirement || '';
        return label && req ? `- **${label}**: ${req}` : req ? `- ${req}` : '';
      })
      .filter(Boolean)
      .join('\n');
  }

  return String(raw);
}

function formatearDescripcion(d: DescripcionTema): string {
  let md = '#### Descripción y Utilidad Práctica\n\n';
  md += `**¿Qué es?**\n${d.que_es}\n\n`;
  md += `**¿Para qué sirve?**\n${d.para_que_sirve}\n\n`;
  md += `**Relación con el puesto:**\n${d.relacion_puesto}\n\n`;
  if (d.errores_evitar) md += `> ⚠️ **Errores a evitar:** ${d.errores_evitar}\n\n`;
  return md;
}

function formatearTecnico(t: Tecnico): string {
  let md = '#### Fundamentos Técnicos\n\n';
  md += '**Conceptos Clave:**\n\n| Término | Definición | Ejemplo |\n|---|---|---|\n';
  for (const c of t.conceptos) {
    md += `| ${c.termino} | ${c.definicion} | ${c.ejemplo} |\n`;
  }
  // P7-C: Legal notice BEFORE the normativa table so the auditor sees the caveat first
  md += `\n> **Aviso de verificación normativa:** Las referencias normativas (NOM, ISO, NMX, etc.) que siguen fueron generadas con asistencia de IA. Requieren validación por un experto en la materia (SME) antes de su uso oficial.\n\n`;
  md += `**Normativa Aplicable:**\n${t.normativa.map(n => `- ${n}`).join('\n')}\n\n`;
  if (t.indicador_dominio) md += `**Indicador de Dominio:** ${t.indicador_dominio}\n\n`;
  return md;
}

// ── Extractor genérico ─────────────────────────────────────────────────────

function extractAny(raw: string, key: string): any {
  try {
    const objMatch = raw.match(/\{[\s\S]*\}/);
    if (objMatch) {
      const obj = JSON.parse(objMatch[0]);
      return obj[key];
    }
  } catch {}
  return null;
}

// ── Normalizadores ─────────────────────────────────────────────────────────

function normalizarStringArray(items: any[]): string[] {
  const TEXT_KEYS = ['texto', 'text', 'nombre', 'name', 'valor', 'value', 'descripcion', 'description', 'item', 'content', 'contenido'];
  return (items || []).map((item: any) => {
    if (typeof item === 'string') return item.trim();
    if (typeof item === 'object' && item !== null) {
      for (const k of TEXT_KEYS) {
        if (item[k] && typeof item[k] === 'string' && item[k].trim()) return item[k].trim();
      }
      return Object.values(item).filter((v): v is string => typeof v === 'string' && v.trim().length > 0).join(' — ') || '';
    }
    return String(item).trim();
  }).filter((s: string) => s.length > 0);
}

function normalizarConceptos(items: any[]): Concepto[] {
  const TERMINO_KEYS   = ['termino', 'term', 'nombre', 'name', 'concepto', 'concept', 'keyword'];
  const DEFINICION_KEYS = ['definicion', 'definition', 'descripcion', 'description', 'significado', 'meaning'];
  const EJEMPLO_KEYS   = ['ejemplo', 'example', 'caso', 'case', 'aplicacion', 'application', 'uso'];
  return (items || []).map((item: any): Concepto | null => {
    if (typeof item !== 'object' || item === null) return null;
    const termino = TERMINO_KEYS.map(k => item[k]).find(v => v && typeof v === 'string') || '';
    if (!termino) return null;
    return {
      termino,
      definicion: DEFINICION_KEYS.map(k => item[k]).find(v => v && typeof v === 'string') || '',
      ejemplo:    EJEMPLO_KEYS.map(k => item[k]).find(v => v && typeof v === 'string') || '',
    };
  }).filter((c): c is Concepto => c !== null);
}

// ── Ensamblador principal ──────────────────────────────────────────────────

export async function handleDocumentP7Assembler(context: ProductContext): Promise<string> {
  const { jobId, projectId, services, event } = context;
  console.log(`[p7-assembler] ── Ensamblando información del tema (job: ${jobId}) ──`);

  const moduloActual = Number(event?.body?.userInputs?._modulo_actual || 1);
  const nombreTema = event?.body?.userInputs?._nombre_tema || `Tema ${moduloActual}`;

  // Program-level fields from the form (fallback if F2 is unavailable)
  const perfilIngresoForm: string = event?.body?.userInputs?.perfil_ingreso || '';
  const perfilEgreso: string = event?.body?.userInputs?.perfil_egreso || '';
  const requisitosCertificacion: string = event?.body?.userInputs?.requisitos_certificacion || '';

  // Extract perfil_ingreso directly from F2 (authoritative source — overrides form suggestion)
  let perfilIngreso = perfilIngresoForm;
  let duracionTotalPrograma = '';
  let perfilEgresoDerivado = '';
  try {
    const f2 = await services.supabase.getF2Analisis(projectId);
    if (f2?.perfil_ingreso) {
      const f2Md = formatearPerfilIngreso(f2.perfil_ingreso);
      if (f2Md) {
        perfilIngreso = f2Md;
        console.log(`[p7-assembler] Perfil de ingreso obtenido de F2 (${f2Md.length} chars)`);
      }
    }
    // Also extract supuestos_restricciones if available — useful context
    if (f2?.supuestos_restricciones?.restricciones?.length) {
      perfilIngreso += '\n\n**Restricciones del programa:**\n' +
        f2.supuestos_restricciones.restricciones.map(r => `- ${r}`).join('\n');
    }
  } catch (err) {
    console.warn('[p7-assembler] No se pudo leer perfil_ingreso de F2, usando valor del formulario:', err);
  }

  // P7-E: Read F3 total duration for Ficha Técnica
  try {
    const f3Raw = event?.body?.userInputs?.productos_previos?.F3?.calculo_duracion;
    if (f3Raw?.duracion_total_horas_aprox || f3Raw?.duracion_total_horas) {
      const horas = f3Raw.duracion_total_horas_aprox || f3Raw.duracion_total_horas;
      const desglose = f3Raw.desglose_horas || f3Raw.desglose;
      duracionTotalPrograma = `${horas} horas totales`;
      if (desglose && typeof desglose === 'object') {
        const t = desglose.teoricas || desglose.teoria || 0;
        const p = desglose.practicas || desglose.practica || 0;
        if (t || p) duracionTotalPrograma += ` (${t}h teóricas + ${p}h prácticas)`;
      }
      console.log(`[p7-assembler] Duración total del programa desde F3: ${duracionTotalPrograma}`);
    }
  } catch {}

  // P7-A: Derive perfil_egreso from F3 unit objectives (authoritative over LLM suggestion)
  try {
    const f3Unidades: any[] = event?.body?.userInputs?.productos_previos?.F3?.unidades || [];
    if (f3Unidades.length > 0) {
      const objetivos = f3Unidades
        .filter((u: any) => u.objetivo)
        .map((u: any) => `- Al finalizar la unidad "${u.nombre}", el participante será capaz de: ${u.objetivo}`);
      if (objetivos.length > 0) {
        perfilEgresoDerivado = objetivos.join('\n');
        console.log(`[p7-assembler] Perfil de egreso derivado de ${objetivos.length} objetivos F3`);
      }
    }
  } catch {}

  const partes: ParteInformacion = {
    descripcion: null,
    tecnico: null,
  };

  for (const seccion of SECCIONES) {
    const juezNombre = `juez_${seccion}`;
    const parteClave = CLAVE_PARTE[seccion];

    const rawJuez = await services.pipelineService.getAgentOutput(jobId, juezNombre) || '';
    const juezMatch = rawJuez.match(/\{[\s\S]*\}/);
    let decision: { seleccion?: string } = { seleccion: 'A' };
    try { if (juezMatch) decision = JSON.parse(juezMatch[0]); } catch {}
    const seleccion: 'A' | 'B' = decision?.seleccion === 'B' ? 'B' : 'A';

    const agenteGanador = seleccion === 'A' ? `agente_${seccion}_A` : `agente_${seccion}_B`;
    const rawGanador = await services.pipelineService.getAgentOutput(jobId, agenteGanador) || '';

    (partes as any)[parteClave] = extractAny(rawGanador, parteClave) ?? ((partes as any)[parteClave]);
    console.log(`[p7-assembler] Sección ${seccion}: juez=${seleccion}`);
  }

  if (partes.tecnico) {
    partes.tecnico.conceptos = normalizarConceptos(partes.tecnico.conceptos);
    partes.tecnico.normativa = normalizarStringArray(partes.tecnico.normativa);
  }

  // P7-B: Validate relacion_puesto depth — if < 80 chars, try loser agent for better description
  if (partes.descripcion?.relacion_puesto) {
    const rp = partes.descripcion.relacion_puesto.trim();
    if (rp.length < 80) {
      console.warn(`[p7-assembler] ⚠️ "relacion_puesto" demasiado superficial (${rp.length} chars) para tema ${moduloActual}: "${rp}" — intentando agente perdedor`);
      try {
        const seccionDescripcion = 'descripcion';
        const juezDescRaw = await services.pipelineService.getAgentOutput(jobId, `juez_${seccionDescripcion}`) || '';
        const juezDescMatch = juezDescRaw.match(/\{[\s\S]*\}/);
        let decDesc: { seleccion?: string } = { seleccion: 'A' };
        try { if (juezDescMatch) decDesc = JSON.parse(juezDescMatch[0]); } catch {}
        const seleccionGanador: 'A' | 'B' = decDesc?.seleccion === 'B' ? 'B' : 'A';
        const agentePerded = seleccionGanador === 'A' ? 'agente_descripcion_B' : 'agente_descripcion_A';
        const rawPerded = await services.pipelineService.getAgentOutput(jobId, agentePerded) || '';
        const perdedorDescripcion = extractAny(rawPerded, 'descripcion');
        if (perdedorDescripcion?.relacion_puesto && perdedorDescripcion.relacion_puesto.trim().length >= 80) {
          partes.descripcion.relacion_puesto = perdedorDescripcion.relacion_puesto;
          console.log(`[p7-assembler] "relacion_puesto" del agente perdedor (${perdedorDescripcion.relacion_puesto.length} chars) — mejor que el ganador`);
        }
      } catch (err) {
        console.warn('[p7-assembler] No se pudo leer agente perdedor para relacion_puesto:', err);
      }
    }
  }

  // Formatear a markdown
  const descMd = partes.descripcion ? formatearDescripcion(partes.descripcion) : '';
  const tecnicoMd = partes.tecnico ? formatearTecnico(partes.tecnico) : '';

  // Acumular en BD
  let partesAcumuladas: Record<string, any> = {};
  let fichaPrograma: Record<string, string> = {};
  try {
    const { data } = await services.supabase.client!
      .from('fase4_productos')
      .select('datos_producto')
      .eq('project_id', projectId)
      .eq('producto', 'P7')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.datos_producto?.partes) partesAcumuladas = data.datos_producto.partes;
    if (data?.datos_producto?.ficha_programa) fichaPrograma = data.datos_producto.ficha_programa;
  } catch {}

  // Persist program-level fields from the first module that provides them
  if (perfilIngreso) fichaPrograma.perfil_ingreso = perfilIngreso;
  // P7-A: prefer F3-derived egreso over LLM suggestion
  if (perfilEgresoDerivado) fichaPrograma.perfil_egreso = perfilEgresoDerivado;
  else if (perfilEgreso) fichaPrograma.perfil_egreso = perfilEgreso;
  if (requisitosCertificacion) fichaPrograma.requisitos_certificacion = requisitosCertificacion;
  // P7-E: persist F3 duration
  if (duracionTotalPrograma) fichaPrograma.duracion_total = duracionTotalPrograma;

  partesAcumuladas[`tema_${moduloActual}`] = {
    nombre: nombreTema,
    descripcion: descMd,
    tecnico: tecnicoMd,
    tecnico_raw: partes.tecnico,
  };

  const modulosOrdenados = Object.keys(partesAcumuladas).sort();
  let documentoFinal = '# Ficha Técnica del Programa\n\n';

  // ── Sección 1: Ficha del Programa (program-level header) ──
  if (fichaPrograma.perfil_ingreso || fichaPrograma.perfil_egreso || fichaPrograma.requisitos_certificacion || fichaPrograma.duracion_total) {
    documentoFinal += '## Datos del Programa\n\n';
    if (fichaPrograma.duracion_total) {
      documentoFinal += `### Duración Total del Programa\n\n**${fichaPrograma.duracion_total}**\n\n`;
    }
    if (fichaPrograma.perfil_ingreso) {
      documentoFinal += `### Perfil de Ingreso\n\n${fichaPrograma.perfil_ingreso}\n\n`;
    }
    if (fichaPrograma.perfil_egreso) {
      documentoFinal += `### Perfil de Egreso y Competencias\n\n${fichaPrograma.perfil_egreso}\n\n`;
    }
    if (fichaPrograma.requisitos_certificacion) {
      documentoFinal += `### Requisitos de Certificación EC0366\n\n${fichaPrograma.requisitos_certificacion}\n\n`;
    }
    documentoFinal += '---\n\n';
  }

  // Load P4 glossary terms to mark cross-references and avoid duplicate definitions (7.3)
  const p4GlosarioTerms = new Set<string>();
  try {
    const p4Capitulos: any[] = event?.body?.userInputs?.productos_previos?.P4?.capitulos || [];
    for (const cap of p4Capitulos) {
      for (const concepto of cap?.secciones_json?.conceptos_clave || []) {
        if (concepto?.termino) {
          p4GlosarioTerms.add(concepto.termino.toLowerCase().trim().replace(/\*\*/g, ''));
        }
      }
    }
    if (p4GlosarioTerms.size > 0) {
      console.log(`[p7-assembler] ${p4GlosarioTerms.size} términos del glosario P4 cargados para deduplicación`);
    }
  } catch {}

  // ── Sección 2: Glosario Consolidado ──
  documentoFinal += '## Glosario Consolidado del Curso\n\n| Término | Definición |\n|---|---|\n';
  const glosario: Record<string, string> = {};
  for (const key of modulosOrdenados) {
    const m = partesAcumuladas[key];
    const tRaw = m.tecnico_raw as typeof partes.tecnico;
    if (tRaw?.conceptos && Array.isArray(tRaw.conceptos)) {
      for (const c of tRaw.conceptos) {
        if (c?.termino && c?.definicion && !glosario[c.termino]) {
          glosario[c.termino] = c.definicion;
        }
      }
    }
  }
  const glosarioEntries = Object.entries(glosario).sort(([a], [b]) => a.localeCompare(b, 'es'));
  if (glosarioEntries.length > 0) {
    for (const [termino, definicion] of glosarioEntries) {
      const termNorm = termino.toLowerCase().trim().replace(/\*\*/g, '');
      if (p4GlosarioTerms.size > 0 && p4GlosarioTerms.has(termNorm)) {
        documentoFinal += `| ${termino} | ${definicion} *(ver también: Manual P4)* |\n`;
      } else {
        documentoFinal += `| ${termino} | ${definicion} |\n`;
      }
    }
  } else {
    documentoFinal += '| (Sin términos aún) | — |\n';
  }
  documentoFinal += '\n---\n\n';

  // ── Sección 3: Información por Tema ──
  for (const key of modulosOrdenados) {
    const m = partesAcumuladas[key];
    documentoFinal += `## Tema ${key.replace('tema_', '')}: ${m.nombre}\n\n`;
    documentoFinal += `### Descripción y Utilidad\n\n`;
    documentoFinal += m.descripcion;
    documentoFinal += `### Fundamentos Técnicos\n\n`;
    documentoFinal += m.tecnico;
    documentoFinal += '\n\n---\n\n';
  }

  await services.supabase.saveF4Producto({
    projectId,
    producto: 'P7',
    documentoFinal,
    borradorA: '',
    borradorB: '',
    validacionEstado: 'aprobado',
    jobId,
    validacionErrores: { passed: true },
    datosProducto: { partes: partesAcumuladas, ficha_programa: fichaPrograma, total_temas: modulosOrdenados.length },
  });

  console.log(`[p7-assembler] Tema ${moduloActual} ensamblado. Total: ${modulosOrdenados.length}`);
  return documentoFinal;
}
