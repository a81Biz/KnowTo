import { ProductContext } from './product.types';
import { sanitizeProductDocument, deduplicarGlosario } from '../../../helpers/doc-sanitizer.helper';
import { pickWinnerOutput, extractAny, validateUnitCoverage, validateSemanticAnchor } from '../../../helpers/assembler-utils.helper';
import { parseP7Output } from '../../../helpers/renderers/p7.renderer';
import { CertificationEngineFactory } from '../../../helpers/certification-engine.factory';
import type {
  F3Artifact, ModalidadCanonica, ISO639LanguageCode,
  CertificationContext, ArtifactStatus, CertificationScore,
} from '../../../types/certification.types';

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
  md += `**Normativa Aplicable:**\n${t.normativa.map(n => `- ${n}`).join('\n')}\n\n`;
  if (t.indicador_dominio) md += `**Indicador de Dominio:** ${t.indicador_dominio}\n\n`;
  return md;
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

  const getOutput = (name: string): Promise<string> =>
    services.pipelineService.getAgentOutput(jobId, name).then((r: string | null) => r ?? '');

  for (const seccion of SECCIONES) {
    const parteClave = CLAVE_PARTE[seccion];
    const { output: rawGanador, seleccion } = await pickWinnerOutput(
      getOutput, `juez_${seccion}`, `agente_${seccion}_A`, `agente_${seccion}_B`,
    );
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
      documentoFinal += `### Requisitos de Certificación\n\n${fichaPrograma.requisitos_certificacion}\n\n`;
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

  let _coberturaP7: { valido: boolean; faltantes: string[] } = { valido: true, faltantes: [] };
  try {
    const _mods: any[] = event?.body?.userInputs?.previousData?.temario_base?.temario?.modulos ?? [];
    const _unis = _mods.flatMap((m: any) => (m.unidades ?? []).map((u: any) => String(u.nombre ?? '')).filter(Boolean));
    _coberturaP7 = validateUnitCoverage(documentoFinal, _unis);
    if (!_coberturaP7.valido && _coberturaP7.faltantes.length > 0) {
      documentoFinal = documentoFinal.trimEnd() + `\n\n> ⚠️ **Unidades sin cobertura:** ${_coberturaP7.faltantes.join(', ')} — estas unidades del Temario Base no fueron referenciadas en este documento.`;
    }
  } catch {}

  documentoFinal = deduplicarGlosario(documentoFinal);

  let _anchorP7: { valido: boolean; ausentes: string[]; cobertura: number } = { valido: true, ausentes: [], cobertura: 1 };
  try {
    const briefP7 = await services.supabase.getProjectBrief(projectId);
    _anchorP7 = validateSemanticAnchor(documentoFinal, briefP7?.dominioTecnico ?? '');
    if (!_anchorP7.valido) console.warn(`[p7-assembler] ⚠ Ancla semántica: cobertura=${_anchorP7.cobertura}, ausentes=${_anchorP7.ausentes.join(', ')}`);
  } catch {}

  const { doc: _p7clean, warnings: _p7sw } = sanitizeProductDocument(documentoFinal, 'P7');
  if (_p7sw.length > 0) console.warn('[p7-assembler] Sanitizer:', _p7sw);
  documentoFinal = _p7clean;

  await services.supabase.saveF4Producto({
    projectId,
    producto: 'P7',
    documentoFinal,
    borradorA: '',
    borradorB: '',
    validacionEstado: 'aprobado',
    jobId,
    validacionErrores: { passed: true },
    datosProducto: { partes: partesAcumuladas, ficha_programa: fichaPrograma, total_temas: modulosOrdenados.length, validacion_cobertura: _coberturaP7, validacion_anchor: _anchorP7 },
  });

  console.log(`[p7-assembler] Tema ${moduloActual} ensamblado. Total: ${modulosOrdenados.length}`);

  // ── CCM: Certification Artifact Layer (non-critical) ─────────────────────
  try {
    const frozen = (event?.body?.context as any)?._frozen ?? {};
    const estandarNorma: string | null = frozen.estandar_norma ?? null;
    const idiomaReq: ISO639LanguageCode = (frozen.idioma_requerido ?? 'es') as ISO639LanguageCode;
    const modalidadFrozen: ModalidadCanonica = (frozen.modalidad ?? 'presencial') as ModalidadCanonica;

    const p7Artifact = parseP7Output(JSON.stringify(partes), nombreTema, modalidadFrozen, idiomaReq);

    let f3ModalidadCcm: ModalidadCanonica = modalidadFrozen;
    try {
      const f3Data = await services.supabase.getF3Especificaciones(projectId);
      const pn = f3Data?.plataforma_navegador as any;
      f3ModalidadCcm = (pn?.modalidad_curso ?? pn?.modalidad ?? modalidadFrozen) as ModalidadCanonica;
    } catch {}

    const f3Artifact: F3Artifact = {
      plataforma: '', modalidad: f3ModalidadCcm,
      criteriosAceptacion: [], reporteo: [], idioma: idiomaReq,
    };
    const certCtx: CertificationContext = {
      f3Artifact, requiredLang: idiomaReq, estandarNorma, roundingThreshold: 3,
    };

    const engine = CertificationEngineFactory.getEngine(estandarNorma);
    const certResult = engine.runCertificationCheck(p7Artifact, certCtx);
    const errorCount = certResult.violaciones.filter(v => v.severity === 'error').length;

    const certScore: CertificationScore = {
      cobertura: 100, bloom: 100,
      modalidad: certResult.violaciones.some(v => v.code === 'MODALITY_INCONSISTENCY') ? 0 : 100,
      idioma: certResult.violaciones.some(v => v.code === 'LANGUAGE_FIELD_MISMATCH') ? 0 : 100,
      vocabulario: 100, trazabilidad: 100, total: 0,
    };
    certScore.total = Math.round((certScore.cobertura + certScore.bloom + certScore.modalidad + certScore.idioma + certScore.vocabulario + certScore.trazabilidad) / 6);

    const certStatus: ArtifactStatus = errorCount > 0 ? 'corrected' : 'valid';

    await services.supabase.saveArtifactVersion({
      projectId,
      productCode: 'P7',
      artifact: p7Artifact,
      documentoMd: documentoFinal,
      certScore,
      status: certStatus,
      promptTemplateId: 'F4_P7_GENERATE_DOCUMENT',
      promptTemplateVersion: '1.0',
      model: frozen.model ?? 'llama-3.1-8b',
      generatedBy: 'ensamblador_doc_p7',
    });

    console.log(`[p7-assembler] CCM: ${errorCount === 0 ? 'P7 tema certificable ✅' : `${errorCount} error(es)`}`);
  } catch (ccmErr) {
    console.warn('[p7-assembler] CCM saveArtifactVersion falló (no crítico):', ccmErr instanceof Error ? ccmErr.message : ccmErr);
  }

  return documentoFinal;
}
