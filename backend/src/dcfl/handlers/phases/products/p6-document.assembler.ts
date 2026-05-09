import { ProductContext } from './product.types';

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

function formatearHoras(h: Horario): string {
  let md = '| Tipo de Horas | Cantidad |\n|---|---|\n';
  md += `| **Horas Teóricas** | ${h.horas_teoricas} h |\n`;
  md += `| **Horas Prácticas** | ${h.horas_practicas} h |\n`;
  md += `| **Total de la Sesión** | **${h.total_horas} h** |\n`;
  md += `| **Modalidad** | ${h.modalidad} |\n`;
  if (h.distribucion_minutos) {
    md += `\n*Distribución estimada: Apertura (${h.distribucion_minutos.apertura}m), Desarrollo (${h.distribucion_minutos.desarrollo}m), Cierre (${h.distribucion_minutos.cierre}m)*\n`;
  }
  return md;
}

function formatearPlan(p: PlanLogistico): string {
  let md = '#### Cronograma de Actividades\n\n';
  md += '| Hora | Actividad | Duración | Tipo | Responsable |\n|---|---|---|---|---|\n';
  for (const a of p.actividades) {
    md += `| ${a.hora} | ${a.actividad} | ${a.duracion} | ${a.tipo} | ${a.responsable || 'Facilitador'} |\n`;
  }
  md += `\n**Recursos necesarios:** ${p.recursos.join(', ')}\n\n`;
  return md;
}

function formatearEntrega(e: Entregables): string {
  let md = '#### Entregables y Evaluación\n\n';
  md += `**Producto:** ${e.producto}\n`;
  md += `**Instrumento de Evaluación:** ${e.instrumento}\n`;
  md += `**Criterio de Aceptación:** ${e.criterio_aceptacion}\n`;
  if (e.fecha_entrega) md += `**Fecha Sugerida:** ${e.fecha_entrega}\n`;
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

  const moduloActual = event?.body?.userInputs?._modulo_actual || 1;
  const nombreSesion = event?.body?.userInputs?._nombre_sesion || `Sesión ${moduloActual}`;

  const partes: ParteCalendario = {
    horario: null,
    plan: null,
    entregables: null,
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
    console.log(`[p6-assembler] Sección ${seccion}: juez=${seleccion}`);
  }

  if (partes.plan) {
    partes.plan.actividades = normalizarActividades(partes.plan.actividades);
    partes.plan.recursos = normalizarStringArray(partes.plan.recursos);
  }

  // Formatear a markdown
  const horasMd = partes.horario ? formatearHoras(partes.horario) : '';
  const planMd = partes.plan ? formatearPlan(partes.plan) : '';
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

  partesAcumuladas[`modulo_${moduloActual}`] = {
    nombre: nombreSesion,
    horas: horasMd,
    plan: planMd,
    entrega: entregaMd,
    horario_raw: partes.horario,
  };

  const modulosOrdenados = Object.keys(partesAcumuladas).sort();
  let documentoFinal = '# Calendario General del Curso\n\n';

  // Tabla resumen poblada desde horario_raw acumulado
  documentoFinal += '## Resumen de Distribución Horaria\n\n';
  documentoFinal += '| Sesión | Horas Teóricas | Horas Prácticas | Total |\n|---|---|---|---|\n';
  let totalT = 0, totalP = 0, totalG = 0;
  for (const key of modulosOrdenados) {
    const m = partesAcumuladas[key];
    const h = m.horario_raw as typeof partes.horario;
    if (h) {
      documentoFinal += `| ${m.nombre} | ${h.horas_teoricas ?? '—'} h | ${h.horas_practicas ?? '—'} h | ${h.total_horas ?? '—'} h |\n`;
      totalT += Number(h.horas_teoricas) || 0;
      totalP += Number(h.horas_practicas) || 0;
      totalG += Number(h.total_horas) || 0;
    } else {
      documentoFinal += `| ${m.nombre} | — | — | — |\n`;
    }
  }
  documentoFinal += `| **Total del Curso** | **${totalT.toFixed(1)} h** | **${totalP.toFixed(1)} h** | **${totalG.toFixed(1)} h** |\n\n`;
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

  await services.supabase.saveF4Producto({
    projectId,
    producto: 'P6',
    documentoFinal,
    borradorA: '',
    borradorB: '',
    validacionEstado: 'aprobado',
    jobId,
    validacionErrores: { passed: true },
    datosProducto: { partes: partesAcumuladas, total_sesiones: modulosOrdenados.length },
  });

  console.log(`[p6-assembler] Sesión ${moduloActual} ensamblada. Total: ${modulosOrdenados.length}`);
  return documentoFinal;
}
