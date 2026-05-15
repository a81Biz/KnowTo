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

  const moduloActual = Number(event?.body?.userInputs?._modulo_actual || 1);
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

  // Extract raw plan fecha so P8 can read session dates from P6 partes
  const fechaSesionRaw: string = (partes.plan as any)?.fecha || '';

  partesAcumuladas[`modulo_${moduloActual}`] = {
    nombre: nombreSesion,
    horas: horasMd,
    plan: planMd,
    entrega: entregaMd,
    horario_raw: partes.horario,
    fecha_sesion: fechaSesionRaw,
  };

  // Inject lugar_imparticion from P8 if available (6-E: location per calendar)
  const lugarImparticion: string =
    event?.body?.userInputs?.productos_previos?.P8?.ficha_formacion?.lugar ||
    event?.body?.userInputs?.lugar_imparticion || '';

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

      // Sobreescribir el total calculado por la IA con la suma real
      if (Math.abs(sessionHours - (Number(h.total_horas) || 0)) > 0.01) {
        console.warn(`[p6-assembler] ⚠️ Corrección aritmética: "${m.nombre}" — IA declaró ${h.total_horas}h pero ${ht}+${hp}=${sessionHours}h`);
      }

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
        documentoFinal += `> ⚠️ **Nota de alineación:** Las horas acumuladas en este calendario (${totalG.toFixed(1)} h) difieren en más del 10% de las horas declaradas en el programa F3 (${durF3} h). Revisar con el diseñador instruccional antes de presentar a CONOCER.\n\n`;
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
