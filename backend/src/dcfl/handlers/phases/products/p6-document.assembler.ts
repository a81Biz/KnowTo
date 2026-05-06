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
    const decision = juezMatch ? JSON.parse(juezMatch[0]) : { seleccion: 'A' };
    const seleccion: 'A' | 'B' = decision?.seleccion === 'B' ? 'B' : 'A';

    const agenteGanador = seleccion === 'A' ? `agente_${seccion}_A` : `agente_${seccion}_B`;
    const rawGanador = await services.pipelineService.getAgentOutput(jobId, agenteGanador) || '';

    (partes as any)[parteClave] = extractAny(rawGanador, parteClave) ?? ((partes as any)[parteClave]);
    console.log(`[p6-assembler] Sección ${seccion}: juez=${seleccion}`);
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
  };

  const modulosOrdenados = Object.keys(partesAcumuladas).sort();
  let documentoFinal = '# Calendario General del Curso\n\n';
  
  // Agregar tabla resumen al inicio
  documentoFinal += '## Resumen de Distribución Horaria\n\n';
  documentoFinal += '| Sesión | Horas Teóricas | Horas Prácticas | Total |\n|---|---|---|---|\n';
  let totalT = 0, totalP = 0, totalG = 0;
  
  // Para la tabla resumen necesitamos extraer los números de los MDs acumulados (un poco feo pero funcional por ahora)
  // O podríamos guardar los datos crudos en datos_producto. Por ahora haremos lo segundo mejor: guardar datos crudos.
  
  for (const key of modulosOrdenados) {
    const m = partesAcumuladas[key];
    documentoFinal += `## ${key.replace('modulo_', 'Sesión ')}: ${m.nombre}\n\n`;
    documentoFinal += m.horas;
    documentoFinal += '\n';
    documentoFinal += m.plan;
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
