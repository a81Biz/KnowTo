import { ProductContext } from './product.types';

// ── Tipos ──────────────────────────────────────────────────────────────────

interface Hito {
  tarea: string;
  inicio: string;
  entrega: string;
  responsable: string;
  dependencia?: string;
}

interface Riesgo {
  riesgo: string;
  mitigacion: string;
  impacto?: string;
  probabilidad?: string;
}

interface RiesgosCalidad {
  riesgos: Riesgo[];
  compuertas_calidad: string[];
}

interface ParteCronograma {
  hitos: Hito[];
  riesgos_calidad: RiesgosCalidad | null;
}

const SECCIONES = ['hitos', 'riesgos'] as const;
type Seccion = typeof SECCIONES[number];

const CLAVE_PARTE: Record<Seccion, keyof ParteCronograma> = {
  hitos: 'hitos',
  riesgos: 'riesgos_calidad',
};

// ── Formateadores ──────────────────────────────────────────────────────────

function formatearHitos(hitos: Hito[]): string {
  let md = '#### Plan de Producción del Módulo\n\n';
  md += '| Tarea | Inicio | Entrega | Responsable | Dependencia |\n|---|---|---|---|---|\n';
  for (const h of hitos) {
    md += `| ${h.tarea} | ${h.inicio} | ${h.entrega} | ${h.responsable} | ${h.dependencia || 'N/A'} |\n`;
  }
  return md;
}

function formatearRiesgos(r: RiesgosCalidad): string {
  let md = '#### Gestión de Riesgos y Calidad\n\n';
  md += '**Riesgos Identificados:**\n\n| Riesgo | Mitigación | Impacto |\n|---|---|---|\n';
  for (const item of r.riesgos) {
    md += `| ${item.riesgo} | ${item.mitigacion} | ${item.impacto || 'Medio'} |\n`;
  }
  md += `\n**Compuertas de Calidad (Hitos de Validación):**\n${r.compuertas_calidad.map(c => `- ${c}`).join('\n')}\n\n`;
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

// ── Ensamblador principal ──────────────────────────────────────────────────

export async function handleDocumentP8Assembler(context: ProductContext): Promise<string> {
  const { jobId, projectId, services, event } = context;
  console.log(`[p8-assembler] ── Ensamblando cronograma del módulo (job: ${jobId}) ──`);

  const moduloActual = event?.body?.userInputs?._modulo_actual || 1;
  const nombreModulo = event?.body?.userInputs?._nombre_modulo || `Módulo ${moduloActual}`;

  const partes: ParteCronograma = {
    hitos: [],
    riesgos_calidad: null,
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
    console.log(`[p8-assembler] Sección ${seccion}: juez=${seleccion}`);
  }

  if (partes.riesgos_calidad) {
    partes.riesgos_calidad.compuertas_calidad = normalizarStringArray(partes.riesgos_calidad.compuertas_calidad);
  }

  // Formatear a markdown
  const hitosMd = formatearHitos(partes.hitos);
  const riesgosMd = partes.riesgos_calidad ? formatearRiesgos(partes.riesgos_calidad) : '';

  // Acumular en BD
  let partesAcumuladas: Record<string, any> = {};
  try {
    const { data } = await services.supabase.client!
      .from('fase4_productos')
      .select('datos_producto')
      .eq('project_id', projectId)
      .eq('producto', 'P8')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.datos_producto?.partes) partesAcumuladas = data.datos_producto.partes;
  } catch {}

  partesAcumuladas[`modulo_${moduloActual}`] = {
    nombre: nombreModulo,
    hitos: hitosMd,
    riesgos: riesgosMd,
  };

  const modulosOrdenados = Object.keys(partesAcumuladas).sort();
  let documentoFinal = '# Cronograma de Desarrollo del Proyecto\n\n';
  
  documentoFinal += '## Ruta Crítica y Dependencias Generales\n\n';
  documentoFinal += '- **P3 → P4:** Los guiones deben terminarse antes de finalizar el manual.\n';
  documentoFinal += '- **P1 → P5:** Los instrumentos deben aprobarse antes de redactar las guías de actividades.\n\n';
  documentoFinal += '---\n\n';

  for (const key of modulosOrdenados) {
    const m = partesAcumuladas[key];
    documentoFinal += `## ${key.replace('modulo_', 'Módulo ')}: ${m.nombre}\n\n`;
    documentoFinal += m.hitos;
    documentoFinal += m.riesgos;
    documentoFinal += '\n\n---\n\n';
  }

  await services.supabase.saveF4Producto({
    projectId,
    producto: 'P8',
    documentoFinal,
    borradorA: '',
    borradorB: '',
    validacionEstado: 'aprobado',
    jobId,
    validacionErrores: { passed: true },
    datosProducto: { partes: partesAcumuladas, total_modulos: modulosOrdenados.length },
  });

  console.log(`[p8-assembler] Módulo ${moduloActual} ensamblado. Total: ${modulosOrdenados.length}`);
  return documentoFinal;
}
