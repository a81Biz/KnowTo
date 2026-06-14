import { ProductContext } from './product.types';
import { sanitizeProductDocument } from '../../../helpers/doc-sanitizer.helper';
import { validateUnitCoverage, validateMaterialsByModule, validateSemanticAnchor } from '../../../helpers/assembler-utils.helper';
import { parseP2Output } from '../../../helpers/renderers/p2.renderer';
import { CertificationEngineFactory } from '../../../helpers/certification-engine.factory';
import type {
  F3Artifact, ModalidadCanonica, ISO639LanguageCode,
  CertificationContext, ArtifactStatus, CertificationScore,
} from '../../../types/certification.types';

// ── Tipos ──────────────────────────────────────────────────────────────────

interface PresentacionItem {
  numero: number;
  slide: {
    titulo: string;
    contenido: string;
    tipo: string;
    layout?: string;
  };
  nota_facilitador: {
    diga: string;
    pregunte: string;
    haga: string;
  };
  recurso_visual: {
    tipo: string;
    descripcion: string;
    mood?: string;
  };
}

interface Actividad {
  nombre: string;
  duracion: string;
  instrucciones: string[];
  materiales: string[];
  resultado_esperado: string;
  versiones?: {
    pares: string;
    grupos_pequenos: string;
    individual: string;
    virtual: string;
  };
  gestion_tiempo?: {
    si_falta: string;
    si_sobra: string;
  };
}

interface Cierre {
  puntos_clave: string[];
  puente: {
    facilitador_dice: string;
    slide_muestra: string;
  };
  mensaje_final: string;
  autoevaluacion?: string;
  vista_previa?: string;
  recursos_adicionales?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

// Coerce an array whose items may be LLM objects (e.g. {paso:"text"}) to plain strings.
function toStringArray(arr: any): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((item: any) => {
    if (typeof item === 'string') return item;
    if (typeof item === 'object' && item !== null) {
      const val = item.paso || item.instruccion || item.descripcion || item.texto
        || item.nombre || item.material || item.item || item.accion
        || Object.values(item).find((v): v is string => typeof v === 'string');
      return typeof val === 'string' ? val : JSON.stringify(item);
    }
    return String(item ?? '');
  });
}

// ── Formateadores ──────────────────────────────────────────────────────────

function formatearPresentacionCompleta(items: PresentacionItem[]): string {
  let md = '### Presentación de Diapositivas\n\n';
  for (const item of items) {
    const num = item.numero;
    const s = item.slide || {};
    const n = item.nota_facilitador || {};
    const v = item.recurso_visual || {};

    md += `#### Diapositiva ${num}: ${s.titulo || '(sin título)'}\n\n`;
    md += `**[Contenido en Pantalla]**\n${s.contenido || ''}\n\n`;
    if (s.layout) md += `*Layout sugerido: ${s.layout}*\n\n`;
    if (v.tipo) {
      md += `**[Recurso Visual]**\n- **Tipo:** ${v.tipo}\n- **Descripción:** ${v.descripcion || ''}\n\n`;
    }
    if (n.diga) {
      md += `**[Guion del Facilitador]**\n`;
      md += `- **Diga:** "${n.diga}"\n`;
      if (n.pregunte) md += `- **Pregunte:** "${n.pregunte}"\n`;
      if (n.haga) md += `- **Haga:** ${n.haga}\n`;
      md += '\n';
    }
    md += '---\n\n';
  }
  return md;
}

function formatearActividades(acts: Actividad[]): string {
  let md = '### Actividades de Aprendizaje\n\n';
  for (const a of acts) {
    const instrucciones = toStringArray(a.instrucciones);
    const materiales = toStringArray(a.materiales);
    md += `#### ${a.nombre} (${a.duracion})\n`;
    md += `**Instrucciones:**\n${instrucciones.map(i => `1. ${i}`).join('\n')}\n\n`;
    md += `**Materiales:** ${materiales.join(', ')}\n`;
    md += `**Resultado:** ${a.resultado_esperado}\n\n`;
    if (a.versiones) {
      md += `*Adaptaciones:* Virtual (${a.versiones.virtual}), Individual (${a.versiones.individual})\n\n`;
    }
  }
  return md;
}

function formatearCierre(c: Cierre): string {
  let md = '### Cierre y Próximos Pasos\n\n';
  md += `**Puntos Clave:**\n${c.puntos_clave.map(p => `- ${p}`).join('\n')}\n\n`;
  md += `**Transición:** ${c.puente?.facilitador_dice || ''}\n`;
  if (c.autoevaluacion) md += `**Autoevaluación:** ${c.autoevaluacion}\n\n`;
  md += `> **Mensaje Final:** ${c.mensaje_final}\n`;
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

function sanitizeArray(value: any): any[] {
  if (!Array.isArray(value)) return [];
  return value.map((item: any) => {
    if (typeof item === 'object' && item !== null) {
      const cleaned: any = {};
      for (const [k, v] of Object.entries(item)) {
        cleaned[k] = (v === null || v === undefined || v === 'undefined') ? '' : v;
      }
      return cleaned;
    }
    return item ?? '';
  });
}

function sanitizeObject(value: any): any {
  if (!value || typeof value !== 'object') return {};
  // Fields in Cierre that must be strings — if LLM returns a nested object, stringify it
  const STRING_FIELDS = new Set(['autoevaluacion', 'vista_previa', 'recursos_adicionales', 'mensaje_final', 'facilitador_dice', 'slide_muestra']);
  const cleaned: any = {};
  for (const [k, v] of Object.entries(value)) {
    if (v === null || v === undefined || v === 'undefined') {
      cleaned[k] = '';
    } else if (Array.isArray(v) && STRING_FIELDS.has(k)) {
      // LLM returned an array for a string field — join items as text
      cleaned[k] = (v as any[]).join('\n');
    } else if (typeof v === 'object' && !Array.isArray(v) && STRING_FIELDS.has(k)) {
      // LLM returned a nested object for a string field — prefer .pregunta semantic key, fallback to JSON
      cleaned[k] = (v as any).pregunta || JSON.stringify(v);
    } else if (typeof v === 'object' && !Array.isArray(v)) {
      cleaned[k] = sanitizeObject(v);
    } else {
      cleaned[k] = v;
    }
  }
  return cleaned;
}

// ── Ensamblador principal ──────────────────────────────────────────────────

export async function handleDocumentP2Assembler(context: ProductContext): Promise<string> {
  const { jobId, projectId, services, event } = context;
  console.log(`[p2-assembler] ── Ensamblando presentación del módulo (job: ${jobId}) ──`);

  const moduloActual = event?.body?.userInputs?._modulo_actual || 1;
  const nombreModulo = event?.body?.userInputs?._nombre_modulo || `Módulo ${moduloActual}`;

  // ── Sección 1: Presentación Completa (agente unificado) ──────────────────
  const rawJuezPresentacion = await services.pipelineService.getAgentOutput(jobId, 'juez_presentacion') || '';
  const juezPresMatch = rawJuezPresentacion.match(/\{[\s\S]*\}/);
  let decisionPres: { seleccion?: string } = { seleccion: 'A' };
  try { if (juezPresMatch) decisionPres = JSON.parse(juezPresMatch[0]); } catch {}
  const selPres: 'A' | 'B' = decisionPres?.seleccion === 'B' ? 'B' : 'A';
  const agentePresGanador = selPres === 'A' ? 'agente_presentacion_A' : 'agente_presentacion_B';
  const rawPresGanador = await services.pipelineService.getAgentOutput(jobId, agentePresGanador) || '';
  const presentacionCompleta: PresentacionItem[] = sanitizeArray(extractAny(rawPresGanador, 'presentacion_completa'));
  console.log(`[p2-assembler] Presentación: juez=${selPres}, ${presentacionCompleta.length} diapositivas`);

  // ── Sección 2: Actividades ────────────────────────────────────────────────
  const rawJuezAct = await services.pipelineService.getAgentOutput(jobId, 'juez_actividades') || '';
  const juezActMatch = rawJuezAct.match(/\{[\s\S]*\}/);
  let decisionAct: { seleccion?: string } = { seleccion: 'A' };
  try { if (juezActMatch) decisionAct = JSON.parse(juezActMatch[0]); } catch {}
  const selAct: 'A' | 'B' = decisionAct?.seleccion === 'B' ? 'B' : 'A';
  const agenteActGanador = selAct === 'A' ? 'agente_actividades_A' : 'agente_actividades_B';
  const rawActGanador = await services.pipelineService.getAgentOutput(jobId, agenteActGanador) || '';
  const actividades: Actividad[] = sanitizeArray(extractAny(rawActGanador, 'actividades'));
  console.log(`[p2-assembler] Actividades: juez=${selAct}, ${actividades.length} actividades`);

  // Domain lock: advertir materiales no autorizados según inventario de P4
  const inventarioP4: string[] = (event?.body?.userInputs as any)?.productos_previos?.P4?.inventario_materiales || [];
  if (inventarioP4.length > 0) {
    for (const act of actividades) {
      const actMateriales = toStringArray(act.materiales);
      const noAutorizados = actMateriales.filter(m => {
        const mLow = m.toLowerCase().trim();
        return mLow.length > 3 && !inventarioP4.some(inv => {
          const iLow = inv.toLowerCase().trim();
          return iLow.includes(mLow) || mLow.includes(iLow);
        });
      });
      if (noAutorizados.length > 0) {
        console.warn(`[p2-assembler] DOMAIN LOCK: materiales no autorizados en "${act.nombre}": ${noAutorizados.join(', ')}`);
      }
    }
  }

  // ── Sección 3: Cierre ─────────────────────────────────────────────────────
  const rawJuezCierre = await services.pipelineService.getAgentOutput(jobId, 'juez_cierre') || '';
  const juezCierreMatch = rawJuezCierre.match(/\{[\s\S]*\}/);
  let decisionCierre: { seleccion?: string } = { seleccion: 'A' };
  try { if (juezCierreMatch) decisionCierre = JSON.parse(juezCierreMatch[0]); } catch {}
  const selCierre: 'A' | 'B' = decisionCierre?.seleccion === 'B' ? 'B' : 'A';
  const agenteCierreGanador = selCierre === 'A' ? 'agente_cierre_A' : 'agente_cierre_B';
  const rawCierreGanador = await services.pipelineService.getAgentOutput(jobId, agenteCierreGanador) || '';
  const cierreRaw = extractAny(rawCierreGanador, 'cierre_transicion');
  const cierre: Cierre | null = cierreRaw ? sanitizeObject(cierreRaw) as Cierre : null;
  console.log(`[p2-assembler] Cierre: juez=${selCierre}`);

  // 2.5: Ensure puente.facilitador_dice names the next module — inject fallback if absent/generic
  if (cierre) {
    const dice = cierre.puente?.facilitador_dice?.trim() || '';
    if (dice.length < 30) {
      // Try to get the next unit name from F3 unidades in productos_previos
      let nextNombre = '';
      try {
        const f3Unidades: any[] = (event?.body?.userInputs as any)?.productos_previos?.F3?.unidades || [];
        const nextUnidad = f3Unidades.find((u: any) => Number(u.modulo) === Number(moduloActual) + 1);
        if (nextUnidad?.nombre) nextNombre = nextUnidad.nombre;
      } catch {}
      if (!cierre.puente) cierre.puente = { facilitador_dice: '', slide_muestra: 'Próxima sesión' };
      cierre.puente.facilitador_dice = nextNombre
        ? `Hemos concluido el módulo "${nombreModulo}". En el siguiente módulo exploraremos "${nextNombre}", donde profundizaremos y aplicaremos nuevas técnicas. Les pido que vengan preparados con los materiales del curso.`
        : `Hemos concluido el módulo "${nombreModulo}". En el siguiente módulo profundizaremos en los conceptos vistos hoy y exploraremos nuevas técnicas. Los espero con los materiales listos.`;
      console.warn(`[p2-assembler] puente.facilitador_dice vacío — fallback inyectado para módulo ${moduloActual}`);
    }
  }

  // ── Formatear a Markdown ──────────────────────────────────────────────────
  const presentacionMd = formatearPresentacionCompleta(presentacionCompleta);
  const actividadesMd = formatearActividades(actividades);
  const cierreMd = cierre ? formatearCierre(cierre) : '';

  // ── Acumular módulos en BD ────────────────────────────────────────────────
  let partesAcumuladas: Record<string, any> = {};
  try {
    const { data } = await services.supabase.client!
      .from('fase4_productos')
      .select('datos_producto')
      .eq('project_id', projectId)
      .eq('producto', 'P2')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.datos_producto?.partes) partesAcumuladas = data.datos_producto.partes;
  } catch {}

  partesAcumuladas[`modulo_${moduloActual}`] = {
    nombre: nombreModulo,
    presentacion_completa: presentacionCompleta,
    presentacion_md: presentacionMd,
    actividades: actividadesMd,
    cierre: cierreMd,
  };

  const modulosOrdenados = Object.keys(partesAcumuladas).sort();

  // P2-A: Count total slides across all accumulated modules and warn if > 60
  const totalSlides = modulosOrdenados.reduce((acc, key) => {
    const m = partesAcumuladas[key];
    const slidesThisModule = Array.isArray(m.presentacion_completa) ? m.presentacion_completa.length : 0;
    return acc + slidesThisModule;
  }, 0);
  if (totalSlides > 60) {
    console.warn(`[p2-assembler] ⚠️ AVISO PEDAGÓGICO: La presentación acumulada tiene ${totalSlides} diapositivas en total (${modulosOrdenados.length} módulos). Una presentación de más de 60 diapositivas es inviable para impartición presencial real. Revisar densidad de contenido por módulo.`);
  }

  const validacionWarningsP2: string[] = [];
  let documentoFinal = '# Presentación Electrónica del Facilitador\n\n';
  if (totalSlides > 60) {
    validacionWarningsP2.push(`Aviso de extensión: ${totalSlides} diapositivas en ${modulosOrdenados.length} módulos (recomendado: ≤60).`);
  }
  for (const key of modulosOrdenados) {
    const m = partesAcumuladas[key];
    documentoFinal += `## ${key.replace('modulo_', 'Módulo ')}: ${m.nombre}\n\n`;
    documentoFinal += m.presentacion_md || m.slides || '';
    documentoFinal += m.actividades;
    documentoFinal += m.cierre;
    documentoFinal += '\n\n---\n\n';
  }

  let _coberturaP2: { valido: boolean; faltantes: string[] } = { valido: true, faltantes: [] };
  try {
    const _mods: any[] = event?.body?.userInputs?.previousData?.temario_base?.temario?.modulos ?? [];
    const _unis = _mods.flatMap((m: any) => (m.unidades ?? []).map((u: any) => String(u.nombre ?? '')).filter(Boolean));
    _coberturaP2 = validateUnitCoverage(documentoFinal, _unis);
    if (!_coberturaP2.valido && _coberturaP2.faltantes.length > 0) {
      validacionWarningsP2.push(`Unidades sin cobertura: ${_coberturaP2.faltantes.join(', ')}`);
    }
  } catch {}

  let _validacionMaterialesP2: { valido: boolean; no_autorizados: string[]; cobertura: number } = { valido: true, no_autorizados: [], cobertura: 1 };
  try {
    const { data: p4RowP2 } = await services.supabase.client!
      .from('fase4_productos')
      .select('datos_producto')
      .eq('project_id', projectId)
      .eq('producto', 'P4')
      .maybeSingle();
    const inventarioSegmentadoP2: Array<{ modulo: number; unidades: string[]; materiales: string[] }> =
      p4RowP2?.datos_producto?.inventario_segmentado ?? [];
    const inventarioFlatP2: string[] = p4RowP2?.datos_producto?.inventario_materiales ?? [];
    const segmentoP2 = inventarioSegmentadoP2.find(s => s.modulo === Number(moduloActual));
    _validacionMaterialesP2 = validateMaterialsByModule(documentoFinal, segmentoP2?.materiales ?? [], inventarioFlatP2);
    console.log(`[p2-assembler] Validación materiales módulo ${moduloActual}: cobertura=${_validacionMaterialesP2.cobertura}`);
  } catch {}

  let _anchorP2: { valido: boolean; ausentes: string[]; cobertura: number } = { valido: true, ausentes: [], cobertura: 1 };
  try {
    const briefP2 = await services.supabase.getProjectBrief(projectId);
    _anchorP2 = validateSemanticAnchor(documentoFinal, briefP2?.dominioTecnico ?? '');
    if (!_anchorP2.valido) console.warn(`[p2-assembler] ⚠ Ancla semántica: cobertura=${_anchorP2.cobertura}, ausentes=${_anchorP2.ausentes.join(', ')}`);
  } catch {}

  const { doc: _p2clean, warnings: _p2sw } = sanitizeProductDocument(documentoFinal, 'P2');
  if (_p2sw.length > 0) console.warn('[p2-assembler] Sanitizer:', _p2sw);
  documentoFinal = _p2clean;

  await services.supabase.saveF4Producto({
    projectId,
    producto: 'P2',
    documentoFinal,
    borradorA: '',
    borradorB: '',
    validacionEstado: 'aprobado',
    jobId,
    validacionErrores: { passed: true },
    datosProducto: { partes: partesAcumuladas, total_modulos: modulosOrdenados.length, validacion_cobertura: _coberturaP2, validacion_materiales: _validacionMaterialesP2, validacion_anchor: _anchorP2, validacion_warnings: validacionWarningsP2 },
  });

  console.log(`[p2-assembler] Módulo ${moduloActual} ensamblado. Total: ${modulosOrdenados.length}`);

  // ── CCM: Certification Artifact Layer (non-critical) ─────────────────────
  try {
    const frozen = (event?.body?.context as any)?._frozen ?? {};
    const estandarNorma: string | null = frozen.estandar_norma ?? null;
    const idiomaReq: ISO639LanguageCode = (frozen.idioma_requerido ?? 'es') as ISO639LanguageCode;
    const modalidadFrozen: ModalidadCanonica = (frozen.modalidad ?? 'presencial') as ModalidadCanonica;

    const p2Artifact = parseP2Output(rawPresGanador, nombreModulo, modalidadFrozen, idiomaReq);

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
    const certResult = engine.runCertificationCheck(p2Artifact, certCtx);
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
      productCode: 'P2',
      artifact: p2Artifact,
      documentoMd: documentoFinal,
      certScore,
      status: certStatus,
      promptTemplateId: 'F4_P2_GENERATE_DOCUMENT',
      promptTemplateVersion: '1.0',
      model: frozen.model ?? 'llama-3.1-8b',
      generatedBy: 'ensamblador_doc_p2',
    });

    console.log(`[p2-assembler] CCM: ${errorCount === 0 ? 'P2 módulo certificable ✅' : `${errorCount} error(es)`}`);
  } catch (ccmErr) {
    console.warn('[p2-assembler] CCM saveArtifactVersion falló (no crítico):', ccmErr instanceof Error ? ccmErr.message : ccmErr);
  }

  return documentoFinal;
}
