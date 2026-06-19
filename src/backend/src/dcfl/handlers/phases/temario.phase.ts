import { PipelineEvent } from '../../types/pipeline-event.types';
import { validateBloomInstrumentAlignment, BloomAlignmentResult } from '../../helpers/assembler-utils.helper';

// Verbos Bloom no observables — rechazados en invariante pedagógica
const VERBOS_NO_OBSERVABLES = ['conocer', 'entender', 'saber', 'comprender', 'aprender', 'familiarizar'];

// Tipos de evaluación válidos para EC0366 — exportado para uso en assemblers
export const TIPOS_EVALUACION_VALIDOS = [
  'Lista de Cotejo',
  'Guía de Observación',
  'Cuestionario',
  'Evidencia de Producto',
  'Portafolio',
] as const;
export type TipoEvaluacion = typeof TIPOS_EVALUACION_VALIDOS[number];

interface UnidadTemario {
  nombre: string;
  objetivo_bloom: string;
  duracion_minutos: number;
  tipo_evaluacion: string;
}

interface ModuloTemario {
  numero: number;
  nombre: string;
  unidades: UnidadTemario[];
}

interface ModuloTiempos {
  numero: number;
  nombre: string;
  duracion_total_minutos: number;
  justificacion: string;
  unidades: Array<{ nombre: string; duracion_minutos: number }>;
}

function parseJsonSafe(raw: string): any {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch {}
  return null;
}

function getWinner(rawJuez: string, rawA: string, rawB: string): any {
  const decision = parseJsonSafe(rawJuez) ?? {};
  const usaB = decision?.seleccion === 'B';
  const rawGanador = usaB ? rawB : rawA;
  return parseJsonSafe(rawGanador);
}

function contarUnidades(modulos: ModuloTemario[]): number {
  return modulos.reduce((acc, m) => acc + (m.unidades?.length ?? 0), 0);
}

function sumMinutos(modulos: ModuloTiempos[]): number {
  return modulos.reduce((acc, m) => {
    const modTotal = (m.unidades ?? []).reduce((s, u) => s + (Number(u.duracion_minutos) || 0), 0);
    return acc + modTotal;
  }, 0);
}

function fusionarTemario(estructura: ModuloTemario[], tiempos: ModuloTiempos[]): ModuloTemario[] {
  return estructura.map(modEst => {
    const modTiempo = tiempos.find(t => t.numero === modEst.numero || t.nombre === modEst.nombre);
    const unidadesFusionadas = modEst.unidades.map((unidad, idx) => {
      const uTiempo = modTiempo?.unidades?.[idx];
      return {
        ...unidad,
        duracion_minutos: uTiempo?.duracion_minutos ?? 60,
      };
    });
    return { ...modEst, unidades: unidadesFusionadas };
  });
}

function similitudNombre(a: string, b: string): number {
  // Ratio de palabras compartidas (case-insensitive, ignora stopwords cortas)
  const stopwords = new Set(['de', 'del', 'el', 'la', 'los', 'las', 'un', 'una', 'y', 'al', 'en', 'a']);
  const tokenize = (s: string) => s.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !stopwords.has(w));
  const tokensA = tokenize(a);
  const tokensB = new Set(tokenize(b));
  if (tokensA.length === 0 || tokensB.size === 0) return 0;
  const comunes = tokensA.filter(t => tokensB.has(t)).length;
  return comunes / Math.max(tokensA.length, tokensB.size);
}

function validarNombresModulos(modulos: ModuloTemario[], courseName: string): string[] {
  const advertencias: string[] = [];
  for (const modulo of modulos) {
    const ratio = similitudNombre(modulo.nombre, courseName);
    if (ratio >= 0.7) {
      advertencias.push(`Módulo "${modulo.nombre}" es ≥70% similar al nombre del curso ("${courseName}") — debe describir un sub-dominio técnico específico`);
    }
  }
  return advertencias;
}

function validarVerbosObservables(modulos: ModuloTemario[]): string[] {
  const advertencias: string[] = [];
  for (const modulo of modulos) {
    for (const unidad of modulo.unidades ?? []) {
      const objetivo = (unidad.objetivo_bloom ?? '').toLowerCase();
      const verboProhibido = VERBOS_NO_OBSERVABLES.find(v => objetivo.startsWith(v));
      if (verboProhibido) {
        advertencias.push(`[temario] ⚠️ Objetivo no observable en "${unidad.nombre}": "${unidad.objetivo_bloom}" (verbo: ${verboProhibido})`);
      }
    }
  }
  return advertencias;
}

export async function handleTemarioEvents(event: PipelineEvent): Promise<string | void> {
  const { jobId, projectId, agentName, services } = event;

  if (agentName !== 'ensamblador_temario') return;

  console.log(`[temario-assembler] ── Ensamblando Temario Base (job: ${jobId}) ──`);

  // Leer outputs de los jueces y los agentes ganadores
  const rawExtractor      = await services.pipelineService.getAgentOutput(jobId, 'extractor_temario') || '';
  const rawJuezEstructura = await services.pipelineService.getAgentOutput(jobId, 'juez_estructura') || '';
  const rawJuezTiempos    = await services.pipelineService.getAgentOutput(jobId, 'juez_tiempos')    || '';
  const rawEstA = await services.pipelineService.getAgentOutput(jobId, 'agente_estructura_A') || '';
  const rawEstB = await services.pipelineService.getAgentOutput(jobId, 'agente_estructura_B') || '';
  const rawTmpA = await services.pipelineService.getAgentOutput(jobId, 'agente_tiempos_A')    || '';
  const rawTmpB = await services.pipelineService.getAgentOutput(jobId, 'agente_tiempos_B')    || '';

  const estructuraGanadora = getWinner(rawJuezEstructura, rawEstA, rawEstB);
  const tiemposGanadores   = getWinner(rawJuezTiempos,   rawTmpA, rawTmpB);

  const modulosEstructura: ModuloTemario[] = estructuraGanadora?.modulos ?? [];
  const modulosTiempos: ModuloTiempos[]   = tiemposGanadores?.modulos   ?? [];

  if (modulosEstructura.length === 0) {
    console.error(`[temario-assembler] ❌ No se pudo parsear la estructura ganadora para job ${jobId}`);
    return JSON.stringify({ error: 'estructura_vacia', modulos: [] });
  }

  const modulosFinal = fusionarTemario(modulosEstructura, modulosTiempos);
  const totalUnidades = contarUnidades(modulosFinal);
  const duracionTotal = sumMinutos(modulosTiempos.length > 0 ? modulosTiempos : modulosFinal.map(m => ({
    numero: m.numero,
    nombre: m.nombre,
    duracion_total_minutos: m.unidades.reduce((s, u) => s + (u.duracion_minutos || 0), 0),
    justificacion: '',
    unidades: m.unidades.map(u => ({ nombre: u.nombre, duracion_minutos: u.duracion_minutos })),
  })));

  // Invariante semántica: nombres de módulos no deben repetir el nombre del curso
  const courseName: string = (event.body?.context?._frozen?.nombre_oficial_curso as string)
    || (event.body?.context?.projectName as string)
    || '';
  const advertenciasNombres = courseName ? validarNombresModulos(modulosFinal, courseName) : [];
  for (const warn of advertenciasNombres) console.warn(`[temario-assembler] ⚠️ PT-111 ${warn}`);

  // Invariante pedagógica: verbos observables (warn-not-block)
  const violaciones = validarVerbosObservables(modulosFinal);
  const validacionBloom = { valido: violaciones.length === 0, violaciones };
  for (const warn of violaciones) console.warn(warn);
  if (violaciones.length > 0) {
    console.warn(`[temario-assembler] ⚠️ ${violaciones.length} objetivo(s) con verbos no observables — se guardará con advertencias`);
  }

  // Validar alineación Bloom-Instrumento por unidad (warn-not-block)
  const validacionBloomInstrument: BloomAlignmentResult[] = [];
  for (const modulo of modulosFinal) {
    for (const unidad of modulo.unidades ?? []) {
      const verboPrimero = (unidad.objetivo_bloom ?? '').split(/\s+/)[0] ?? '';
      const result = validateBloomInstrumentAlignment(verboPrimero, unidad.tipo_evaluacion ?? '');
      validacionBloomInstrument.push({
        unidad: unidad.nombre,
        verboPrimero,
        tipoInstrumento: unidad.tipo_evaluacion ?? '',
        ...result,
      });
      if (!result.valido && result.instrumentosPermitidos.length > 0) {
        console.warn(`[temario-assembler] ⚠️ Bloom-Instrumento: "${unidad.nombre}" — verbo "${verboPrimero}" requiere [${result.instrumentosPermitidos.join('/')}] pero tiene "${unidad.tipo_evaluacion}"`);
      }
    }
  }

  // Invariante aritmética: duración total
  const duracionEsperada = (tiemposGanadores?.duracion_total_minutos ?? 0) || duracionTotal;
  const diff = Math.abs(duracionTotal - duracionEsperada);
  if (duracionEsperada > 0 && diff > 30) {
    console.warn(`[temario-assembler] ⚠️ Desviación de tiempo: calculado ${duracionTotal}min vs esperado ${duracionEsperada}min (±${diff}min)`);
  }

  // Advertencia de duración: comparar contra courseDuration declarado (28.4)
  let advertenciaDuracion: string | undefined;
  try {
    const extractorData = parseJsonSafe(rawExtractor);
    const courseHours = Number(extractorData?.courseHours || event.body?.userInputs?.courseDuration || 0);
    if (courseHours > 0 && duracionTotal > courseHours * 60 * 1.15) {
      advertenciaDuracion = `Duración calculada (${Math.round(duracionTotal / 60 * 10) / 10}h) excede en más del 15% la duración declarada (${courseHours}h). Revisar distribución de tiempos.`;
      console.warn(`[temario-assembler] ⚠️ ${advertenciaDuracion}`);
    }
  } catch {}

  // Persistir en base de datos (UPSERT por project_id)
  await services.supabase.saveTemarioBase({
    projectId,
    temario: modulosFinal,
    tiempos: modulosTiempos,
    duracionTotal,
    totalUnidades,
    validacionBloom,
    advertenciaDuracion,
    validacionBloomInstrument,
    ...(advertenciasNombres.length > 0 ? { advertenciasNombres } : {}),
  });

  const resultado = JSON.stringify({
    modulos: modulosFinal,
    duracion_total_minutos: duracionTotal,
    total_unidades: totalUnidades,
    validacion_bloom: validacionBloom,
  });

  console.log(`[temario-assembler] ✅ Temario guardado: ${modulosFinal.length} módulo(s), ${totalUnidades} unidad(es), ${duracionTotal} min total`);
  return resultado;
}
