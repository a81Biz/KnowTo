import { ProductContext } from './product.types';
import { sanitizeProductDocument, enforceModalidad } from '../../../helpers/doc-sanitizer.helper';
import { pickWinnerOutput, extractAny, validateUnitCoverage, validateSemanticAnchor } from '../../../helpers/assembler-utils.helper';
import { parseP6Output } from '../../../helpers/renderers/p6.renderer';
import { CertificationEngineFactory } from '../../../helpers/certification-engine.factory';
import type {
  F3Artifact, ModalidadCanonica, ISO639LanguageCode,
  CertificationContext, ArtifactStatus, CertificationScore,
} from '../../../types/certification.types';

// ── Tipos ──────────────────────────────────────────────────────────────────

interface Horario {
  horas_teoricas: number;
  horas_practicas: number;
  total_horas: number;
  modalidad: string;
  distribucion_minutos?: {
    apertura: number;
    desarrollo: number;
    cierre: number;
  };
}

interface ActividadCalendario {
  hora: string;
  actividad: string;
  duracion: string;
  tipo: string;
  responsable?: string;
}

interface PlanLogistico {
  actividades: ActividadCalendario[];
  recursos: string[];
}

interface Entregables {
  producto: string;
  instrumento: string;
  criterio_aceptacion: string;
  fecha_entrega?: string;
}

interface ParteCalendario {
  horario: Horario | null;
  plan: PlanLogistico | null;
  entregables: Entregables | null;
}

const SECCIONES = ['horas', 'plan', 'entrega'] as const;
type Seccion = typeof SECCIONES[number];

const CLAVE_PARTE: Record<Seccion, keyof ParteCalendario> = {
  horas: 'horario',
  plan: 'plan',
  entrega: 'entregables',
};

// ── Formateadores ──────────────────────────────────────────────────────────

// Parsea strings de duración como "30 min", "1 hora", "1h30", "45 minutos" → minutos enteros.
function parseDuracionMinutos(duracion: string): number {
  if (!duracion) return 0;
  const minMatch = duracion.match(/(\d+(?:\.\d+)?)\s*min/i);
  if (minMatch) return Math.round(parseFloat(minMatch[1]));
  const horaMatch = duracion.match(/(\d+(?:\.\d+)?)\s*h(?:ora[s]?)?/i);
  if (horaMatch) {
    const mins = parseFloat(horaMatch[1]) * 60;
    const extraMin = duracion.match(/h\s*(\d+)/i);
    return Math.round(extraMin ? mins + parseInt(extraMin[1]) : mins);
  }
  const numOnly = duracion.match(/^(\d+)$/);
  return numOnly ? parseInt(numOnly[1]) : 0;
}

// Usa ht+hp como total determinista — nunca h.total_horas (puede ser incorrecto de la IA).
function formatearHoras(h: Horario): string {
  const ht = Number(h.horas_teoricas) || 0;
  const hp = Number(h.horas_practicas) || 0;
  const totalDeterminista = ht + hp;
  let md = '| Tipo de Horas | Cantidad |\n|---|---|\n';
  md += `| **Horas Teóricas** | ${ht.toFixed(1)} h |\n`;
  md += `| **Horas Prácticas** | ${hp.toFixed(1)} h |\n`;
  md += `| **Total de la Sesión** | **${totalDeterminista.toFixed(1)} h** |\n`;
  md += `| **Modalidad** | ${h.modalidad} |\n`;
  if (h.distribucion_minutos) {
    md += `\n*Distribución estimada: Apertura (${h.distribucion_minutos.apertura}m), Desarrollo (${h.distribucion_minutos.desarrollo}m), Cierre (${h.distribucion_minutos.cierre}m)*\n`;
  }
  return md;
}

// Devuelve el markdown y la suma de minutos de las actividades para validación cruzada.
function formatearPlan(p: PlanLogistico): { md: string; sumaMinutos: number } {
  let md = '#### Cronograma de Actividades\n\n';
  md += '| Hora | Actividad | Duración | Tipo | Responsable |\n|---|---|---|---|---|\n';
  let sumaMinutos = 0;
  for (const a of p.actividades) {
    md += `| ${a.hora} | ${a.actividad} | ${a.duracion} | ${a.tipo} | ${a.responsable || 'Facilitador'} |\n`;
    sumaMinutos += parseDuracionMinutos(a.duracion);
  }
  md += `\n**Recursos necesarios:** ${p.recursos.join(', ')}\n\n`;
  return { md, sumaMinutos };
}

function traducirFechaEntrega(raw: string): string {
  return raw
    .replace(/Same\s+day/gi, 'El mismo día')
    .replace(/Next\s+day/gi, 'Al día siguiente')
    .replace(/End\s+of\s+session/gi, 'Al finalizar la sesión')
    .replace(/One\s+week/gi, 'Una semana');
}

function formatearEntrega(e: Entregables): string {
  let md = '#### Entregables y Evaluación\n\n';
  md += `**Producto:** ${e.producto}\n`;
  md += `**Instrumento de Evaluación:** ${e.instrumento}\n`;
  md += `**Criterio de Aceptación:** ${e.criterio_aceptacion}\n`;
  if (e.fecha_entrega) md += `**Fecha Sugerida:** ${traducirFechaEntrega(e.fecha_entrega)}\n`;
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

function normalizarActividades(items: any[]): ActividadCalendario[] {
  const HORA_KEYS      = ['hora', 'time', 'horario', 'hora_inicio', 'start_time'];
  const ACTIVIDAD_KEYS = ['actividad', 'activity', 'nombre', 'name', 'tarea', 'task', 'descripcion'];
  const DURACION_KEYS  = ['duracion', 'duration', 'tiempo', 'duration_time', 'minutos'];
  const TIPO_KEYS      = ['tipo', 'type', 'categoria', 'category', 'modalidad'];
  const RESP_KEYS      = ['responsable', 'responsible', 'facilitador', 'instructor'];
  return (items || []).map((item: any): ActividadCalendario | null => {
    if (typeof item !== 'object' || item === null) return null;
    const actividad = ACTIVIDAD_KEYS.map(k => item[k]).find(v => v && typeof v === 'string') || '';
    if (!actividad) return null;
    return {
      hora:        HORA_KEYS.map(k => item[k]).find(v => v && typeof v === 'string') || '',
      actividad,
      duracion:    DURACION_KEYS.map(k => item[k]).find(v => v && typeof v === 'string') || '',
      tipo:        TIPO_KEYS.map(k => item[k]).find(v => v && typeof v === 'string') || '',
      responsable: RESP_KEYS.map(k => item[k]).find(v => v && typeof v === 'string') || 'Facilitador',
    };
  }).filter((a): a is ActividadCalendario => a !== null);
}

// ── Ensamblador principal ──────────────────────────────────────────────────

export async function handleDocumentP6Assembler(context: ProductContext): Promise<string> {
  const { jobId, projectId, services, event } = context;
  console.log(`[p6-assembler] ── Ensamblando calendario de la sesión (job: ${jobId}) ──`);

  const moduloActual = Number(event?.body?.userInputs?._modulo_actual || 1);
  const nombreSesion = event?.body?.userInputs?._nombre_sesion || `Sesión ${moduloActual}`;

  const partes: ParteCalendario = {
    horario: null,
    plan: null,
    entregables: null,
  };

  const getOutput = (name: string): Promise<string> =>
    services.pipelineService.getAgentOutput(jobId, name).then((r: string | null) => r ?? '');

  for (const seccion of SECCIONES) {
    const parteClave = CLAVE_PARTE[seccion];
    const { output: rawGanador, seleccion } = await pickWinnerOutput(
      getOutput, `juez_${seccion}`, `agente_${seccion}_A`, `agente_${seccion}_B`,
    );
    (partes as any)[parteClave] = extractAny(rawGanador, parteClave) ?? ((partes as any)[parteClave]);
    console.log(`[p6-assembler] Sección ${seccion}: juez=${seleccion}`);
  }

  // Override instrumento with exact P1 type to avoid LLM paraphrase inconsistency (6.3)
  try {
    const instrumentosP1: Array<{unidad: number, tipo: string}> =
      event?.body?.userInputs?.productos_previos?.P1?.instrumentos || [];
    const instrP1 = instrumentosP1.find((i: any) => Number(i.unidad) === moduloActual);
    if (partes.entregables && instrP1?.tipo) {
      partes.entregables.instrumento = instrP1.tipo;
      console.log(`[p6-assembler] Instrumento de P1 inyectado: "${instrP1.tipo}" para unidad ${moduloActual}`);
    }
  } catch {}

  if (partes.plan) {
    partes.plan.actividades = normalizarActividades(partes.plan.actividades);
    partes.plan.recursos = normalizarStringArray(partes.plan.recursos);
  }

  // Formatear a markdown
  const horasMd = partes.horario ? formatearHoras(partes.horario) : '';
  const { md: planMd, sumaMinutos: planSumaMinutos } = partes.plan
    ? formatearPlan(partes.plan)
    : { md: '', sumaMinutos: 0 };
  const entregaMd = partes.entregables ? formatearEntrega(partes.entregables) : '';

  // Acumular en BD
  let partesAcumuladas: Record<string, any> = {};
  try {
    const { data } = await services.supabase.client!
      .from('fase4_productos')
      .select('datos_producto')
      .eq('project_id', projectId)
      .eq('producto', 'P6')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.datos_producto?.partes) partesAcumuladas = data.datos_producto.partes;
  } catch {}

  // Extract raw plan fecha so P8 can read session dates from P6 partes
  const fechaSesionRaw: string = (partes.plan as any)?.fecha || '';

  partesAcumuladas[`modulo_${moduloActual}`] = {
    nombre: nombreSesion,
    horas: horasMd,
    plan: planMd,
    entrega: entregaMd,
    horario_raw: partes.horario,
    fecha_sesion: fechaSesionRaw,
    plan_suma_minutos: planSumaMinutos,
  };

  // Inject lugar_imparticion from P8 if available (6-E: location per calendar)
  const lugarImparticion: string =
    event?.body?.userInputs?.productos_previos?.P8?.ficha_formacion?.lugar ||
    event?.body?.userInputs?.lugar_imparticion || '';

  const validacionWarningsP6: string[] = [];

  // Validación cruzada actividades vs total de sesión — guardada en warnings (no inline en doc).
  if (partes.horario && planSumaMinutos > 0) {
    const ht = Number(partes.horario.horas_teoricas) || 0;
    const hp = Number(partes.horario.horas_practicas) || 0;
    const sesionMin = (ht + hp) * 60;
    if (Math.abs(planSumaMinutos - sesionMin) > 10) {
      const w = `Sesión "${nombreSesion}": actividades suman ${planSumaMinutos}min vs total de sesión ${sesionMin}min. Verificar con diseñador instruccional.`;
      console.warn(`[p6-assembler] ⚠️ ${w}`);
      validacionWarningsP6.push(w);
    }
  }
  const modulosOrdenados = Object.keys(partesAcumuladas).sort();
  let documentoFinal = '# Calendario General del Curso\n\n';
  if (lugarImparticion) {
    documentoFinal += `**Lugar de impartición:** ${lugarImparticion}\n\n`;
  }

  // Tabla resumen poblada desde horario_raw acumulado — LÓGICA DETERMINISTA
  // La IA solo propone duraciones en minutos; las sumas y totales se calculan aquí.
  documentoFinal += '## Resumen de Distribución Horaria\n\n';
  documentoFinal += '| Sesión | Horas Teóricas | Horas Prácticas | Total |\n|---|---|---|---|\n';
  let totalT = 0, totalP = 0, totalG = 0;
  for (const key of modulosOrdenados) {
    const m = partesAcumuladas[key];
    const h = m.horario_raw as typeof partes.horario;
    if (h) {
      // Recalcular aritméticamente — nunca confiar en total_horas de la IA
      const ht = Number(h.horas_teoricas) || 0;
      const hp = Number(h.horas_practicas) || 0;
      const sessionHours = ht + hp;

      // sessionHours es la fuente de verdad (ht+hp); h.total_horas de la IA ya fue ignorado en formatearHoras.

      documentoFinal += `| ${m.nombre} | ${ht.toFixed(1)} h | ${hp.toFixed(1)} h | ${sessionHours.toFixed(1)} h |\n`;
      totalT += ht;
      totalP += hp;
      totalG += sessionHours;

      // Validar distribución de minutos si existe
      if (h.distribucion_minutos) {
        const distTotal = (Number(h.distribucion_minutos.apertura) || 0)
          + (Number(h.distribucion_minutos.desarrollo) || 0)
          + (Number(h.distribucion_minutos.cierre) || 0);
        const sessionMinutos = sessionHours * 60;
        if (distTotal > 0 && Math.abs(distTotal - sessionMinutos) > 5) {
          console.warn(`[p6-assembler] ⚠️ Distribución inconsistente en "${m.nombre}": apertura+desarrollo+cierre=${distTotal}min vs sesión=${sessionMinutos}min`);
        }
      }

      // Check max session length (6.2)
      if (sessionHours > 10) {
        console.warn(`[p6-assembler] ⚠️ AVISO PEDAGÓGICO: "${m.nombre}" tiene ${sessionHours}h — excede el máximo recomendado de 10h por jornada`);
      }
    } else {
      documentoFinal += `| ${m.nombre} | — | — | — |\n`;
    }
  }
  documentoFinal += `| **Total del Curso** | **${totalT.toFixed(1)} h** | **${totalP.toFixed(1)} h** | **${totalG.toFixed(1)} h** |\n\n`;

  // F3 alignment check (6.4)
  try {
    const durF3Raw = event?.body?.userInputs?.productos_previos?.F3?.calculo_duracion?.duracion_total_horas;
    if (durF3Raw && totalG > 0) {
      const durF3 = Number(durF3Raw);
      const diff = Math.abs(totalG - durF3) / durF3;
      if (diff > 0.1) {
        console.warn(`[p6-assembler] ⚠️ Desviación de horas: calendario acumula ${totalG.toFixed(1)}h vs F3 declara ${durF3}h (${(diff * 100).toFixed(1)}% de diferencia)`);
        validacionWarningsP6.push(`Desviación de horas: calendario acumula ${totalG.toFixed(1)}h vs F3 declara ${durF3}h (>${(diff * 100).toFixed(1)}% diferencia). Revisar con diseñador instruccional.`);
      }
    }
  } catch {}

  documentoFinal += '---\n\n';

  for (const key of modulosOrdenados) {
    const m = partesAcumuladas[key];
    documentoFinal += `## ${key.replace('modulo_', 'Sesión ')}: ${m.nombre}\n\n`;
    documentoFinal += `### Distribución Horaria\n\n`;
    documentoFinal += m.horas;
    documentoFinal += `\n### Plan de la Sesión\n\n`;
    documentoFinal += m.plan;
    documentoFinal += `### Entregables\n\n`;
    documentoFinal += m.entrega;
    documentoFinal += '\n\n---\n\n';
  }

  let _coberturaP6: { valido: boolean; faltantes: string[] } = { valido: true, faltantes: [] };
  try {
    const _mods: any[] = event?.body?.userInputs?.previousData?.temario_base?.temario?.modulos ?? [];
    const _unis = _mods.flatMap((m: any) => (m.unidades ?? []).map((u: any) => String(u.nombre ?? '')).filter(Boolean));
    _coberturaP6 = validateUnitCoverage(documentoFinal, _unis);
    if (!_coberturaP6.valido && _coberturaP6.faltantes.length > 0) {
      documentoFinal = documentoFinal.trimEnd() + `\n\n> ⚠️ **Unidades sin cobertura:** ${_coberturaP6.faltantes.join(', ')} — estas unidades del Temario Base no fueron referenciadas en este documento.`;
    }
  } catch {}

  // Enforce canonical modality from F2 (source of truth — modalidad lives in fase2_analisis_alcance)
  const f2Data = await services.supabase.getF2Analisis(projectId);
  const _modalidadRecord: Record<string, string> | null = (f2Data?.modalidad ?? null) as Record<string, string> | null;
  const canonicalModalidad: string | null = _modalidadRecord ? (Object.values(_modalidadRecord)[0] ?? null) : null;
  const { doc: _p6modal } = enforceModalidad(documentoFinal, canonicalModalidad);
  documentoFinal = _p6modal;

  let _anchorP6: { valido: boolean; ausentes: string[]; cobertura: number } = { valido: true, ausentes: [], cobertura: 1 };
  try {
    const briefP6 = await services.supabase.getProjectBrief(projectId);
    _anchorP6 = validateSemanticAnchor(documentoFinal, briefP6?.dominioTecnico ?? '');
    if (!_anchorP6.valido) console.warn(`[p6-assembler] ⚠ Ancla semántica: cobertura=${_anchorP6.cobertura}, ausentes=${_anchorP6.ausentes.join(', ')}`);
  } catch {}

  const { doc: _p6clean, warnings: _p6sw } = sanitizeProductDocument(documentoFinal, 'P6');
  if (_p6sw.length > 0) console.warn('[p6-assembler] Sanitizer:', _p6sw);
  documentoFinal = _p6clean;

  await services.supabase.saveF4Producto({
    projectId,
    producto: 'P6',
    documentoFinal,
    borradorA: '',
    borradorB: '',
    validacionEstado: 'aprobado',
    jobId,
    validacionErrores: { passed: true },
    datosProducto: { partes: partesAcumuladas, total_sesiones: modulosOrdenados.length, validacion_cobertura: _coberturaP6, validacion_anchor: _anchorP6, validacion_warnings: validacionWarningsP6 },
  });

  console.log(`[p6-assembler] Sesión ${moduloActual} ensamblada. Total: ${modulosOrdenados.length}`);

  // ── CCM: Certification Artifact Layer (non-critical) ─────────────────────
  try {
    const frozen = (event?.body?.context as any)?._frozen ?? {};
    const estandarNorma: string | null = frozen.estandar_norma ?? null;
    const idiomaReq: ISO639LanguageCode = (frozen.idioma_requerido ?? 'es') as ISO639LanguageCode;
    const modalidadFrozen: ModalidadCanonica = (frozen.modalidad ?? 'presencial') as ModalidadCanonica;

    const p6Artifact = parseP6Output(JSON.stringify(partes), nombreSesion, moduloActual, modalidadFrozen, idiomaReq);

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
    const certResult = engine.runCertificationCheck(p6Artifact, certCtx);
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
      productCode: 'P6',
      artifact: p6Artifact,
      documentoMd: documentoFinal,
      certScore,
      status: certStatus,
      promptTemplateId: 'F4_P6_GENERATE_DOCUMENT',
      promptTemplateVersion: '1.0',
      model: frozen.model ?? 'llama-3.1-8b',
      generatedBy: 'ensamblador_doc_p6',
    });

    console.log(`[p6-assembler] CCM: ${errorCount === 0 ? 'P6 sesión certificable ✅' : `${errorCount} error(es)`}`);
  } catch (ccmErr) {
    console.warn('[p6-assembler] CCM saveArtifactVersion falló (no crítico):', ccmErr instanceof Error ? ccmErr.message : ccmErr);
  }

  return documentoFinal;
}
