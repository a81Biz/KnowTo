import { ProductContext } from './product.types';

// ── Tipos ──────────────────────────────────────────────────────────────────

interface FichaActividad {
  objetivo: string;
  duracion: string;
  modalidad: string;
  tipo: string;
  pre_requisitos?: string;
  complejidad?: string;
}

interface Logistica {
  materiales: string[];
  herramientas: string[];
  consumibles: string[];
  especificaciones_tecnicas?: string;
}

interface Procedimiento {
  preparacion: string[];
  ejecucion: string[];
  cierre_limpieza: string[];
  medidas_seguridad?: string[];
}

interface RubricaItem {
  criterio: string;
  puntos: number;
  indicador_exito: string;
}

interface Evaluacion {
  evidencia_producto: string;
  rubrica: RubricaItem[];
  errores_comunes?: string[];
}

interface ParteActividad {
  ficha: FichaActividad | null;
  logistica: Logistica | null;
  procedimiento: Procedimiento | null;
  evaluacion: Evaluacion | null;
}

const SECCIONES = ['ficha', 'materiales', 'procedimiento', 'evaluacion'] as const;
type Seccion = typeof SECCIONES[number];

const CLAVE_PARTE: Record<Seccion, keyof ParteActividad> = {
  ficha: 'ficha',
  materiales: 'logistica',
  procedimiento: 'procedimiento',
  evaluacion: 'evaluacion',
};

// ── Formateadores ──────────────────────────────────────────────────────────

function formatearFicha(f: FichaActividad): string {
  let md = '| Campo | Valor |\n|---|---|\n';
  md += `| **Objetivo** | ${f.objetivo} |\n`;
  md += `| **Duración** | ${f.duracion} |\n`;
  md += `| **Modalidad** | ${f.modalidad} |\n`;
  md += `| **Tipo** | ${f.tipo} |\n`;
  if (f.complejidad) md += `| **Complejidad** | ${f.complejidad} |\n`;
  if (f.pre_requisitos) md += `| **Pre-requisitos** | ${f.pre_requisitos} |\n`;
  return md;
}

function formatearLogistica(l: Logistica): string {
  let md = '#### Requerimientos\n\n';
  if (l.materiales.length) md += `**Materiales:**\n${l.materiales.map(m => `- ${m}`).join('\n')}\n\n`;
  if (l.herramientas.length) md += `**Herramientas:**\n${l.herramientas.map(h => `- ${h}`).join('\n')}\n\n`;
  if (l.consumibles.length) md += `**Consumibles:**\n${l.consumibles.map(c => `- ${c}`).join('\n')}\n\n`;
  if (l.especificaciones_tecnicas) md += `**Especificaciones Técnicas:** ${l.especificaciones_tecnicas}\n\n`;
  return md;
}

function formatearProcedimiento(p: Procedimiento): string {
  let md = '#### Procedimiento Paso a Paso\n\n';
  md += `**1. Preparación:**\n${p.preparacion.map(s => `- ${s}`).join('\n')}\n\n`;
  md += `**2. Ejecución:**\n${p.ejecucion.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n`;
  md += `**3. Cierre y Limpieza:**\n${p.cierre_limpieza.map(s => `- ${s}`).join('\n')}\n\n`;
  if (p.medidas_seguridad?.length) {
    md += `> ⚠️ **Medidas de Seguridad:**\n${p.medidas_seguridad.map(s => `> - ${s}`).join('\n')}\n\n`;
  }
  return md;
}

function formatearEvaluacion(e: Evaluacion): string {
  let md = '#### Evaluación de la Actividad\n\n';
  md += `**Evidencia a entregar:** ${e.evidencia_producto}\n\n`;
  md += '**Rúbrica de Desempeño:**\n\n';
  md += '| Criterio | Indicador de Éxito | Puntos |\n|---|---|---|\n';
  for (const item of e.rubrica) {
    md += `| ${item.criterio} | ${item.indicador_exito} | ${item.puntos} |\n`;
  }
  if (e.errores_comunes?.length) {
    md += `\n**Errores comunes a observar:**\n${e.errores_comunes.map(err => `- ${err}`).join('\n')}\n`;
  }
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

// ── Ensamblador principal ──────────────────────────────────────────────────

export async function handleDocumentP5Assembler(context: ProductContext): Promise<string> {
  const { jobId, projectId, services, event } = context;
  console.log(`[p5-assembler] ── Ensamblando actividad del módulo (job: ${jobId}) ──`);

  const moduloActual = event?.body?.userInputs?._modulo_actual || 1;
  const nombreActividad = event?.body?.userInputs?._nombre_actividad || `Actividad ${moduloActual}`;

  const partes: ParteActividad = {
    ficha: null,
    logistica: null,
    procedimiento: null,
    evaluacion: null,
  };

  for (const seccion of SECCIONES) {
    const juezNombre = `juez_${seccion}`;
    const parteClave = CLAVE_PARTE[seccion];

    const rawJuez = await services.pipelineService.getAgentOutput(jobId, juezNombre) || '';
    const juezMatch = rawJuez.match(/\{[\s\S]*\}/);
    const decision = juezMatch ? JSON.parse(juezMatch[0]) : { seleccion: 'A' };
    const seleccion: 'A' | 'B' = decision?.seleccion === 'B' ? 'B' : 'A';

    const agenteGanador = seleccion === 'A' ? `agente_${seccion}_A` : `agente_${seccion}_B`;
    const rawGanador = await services.pipelineService.getAgentOutput(jobId, agenteGanador) || '';

    (partes as any)[parteClave] = extractAny(rawGanador, parteClave) ?? ((partes as any)[parteClave]);
    console.log(`[p5-assembler] Sección ${seccion}: juez=${seleccion}`);
  }

  // Formatear a markdown
  const fichaMd = partes.ficha ? formatearFicha(partes.ficha) : '';
  const logisticaMd = partes.logistica ? formatearLogistica(partes.logistica) : '';
  const procedimientoMd = partes.procedimiento ? formatearProcedimiento(partes.procedimiento) : '';
  const evaluacionMd = partes.evaluacion ? formatearEvaluacion(partes.evaluacion) : '';

  // Acumular en BD
  let partesAcumuladas: Record<string, any> = {};
  try {
    const { data } = await services.supabase.client!
      .from('fase4_productos')
      .select('datos_producto')
      .eq('project_id', projectId)
      .eq('producto', 'P5')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.datos_producto?.partes) partesAcumuladas = data.datos_producto.partes;
  } catch {}

  partesAcumuladas[`modulo_${moduloActual}`] = {
    nombre: nombreActividad,
    ficha: fichaMd,
    logistica: logisticaMd,
    procedimiento: procedimientoMd,
    evaluacion: evaluacionMd,
  };

  const modulosOrdenados = Object.keys(partesAcumuladas).sort();
  let documentoFinal = '# Guías de Actividades (Manual del Instructor)\n\n';
  for (const key of modulosOrdenados) {
    const m = partesAcumuladas[key];
    documentoFinal += `## ${key.replace('modulo_', 'Unidad ')}: ${m.nombre}\n\n`;
    documentoFinal += m.ficha;
    documentoFinal += '\n';
    documentoFinal += m.logistica;
    documentoFinal += m.procedimiento;
    documentoFinal += m.evaluacion;
    documentoFinal += '\n\n---\n\n';
  }

  await services.supabase.saveF4Producto({
    projectId,
    producto: 'P5',
    documentoFinal,
    borradorA: '',
    borradorB: '',
    validacionEstado: 'aprobado',
    jobId,
    validacionErrores: { passed: true },
    datosProducto: { partes: partesAcumuladas, total_unidades: modulosOrdenados.length },
  });

  console.log(`[p5-assembler] Unidad ${moduloActual} ensamblada. Total: ${modulosOrdenados.length}`);
  return documentoFinal;
}
