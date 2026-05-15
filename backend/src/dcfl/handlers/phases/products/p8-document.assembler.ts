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

interface CompuertaCalidad {
  compuerta: string;
  responsable: string;
  criterio: string;
  fecha_limite?: string;
}

interface RiesgosCalidad {
  riesgos: Riesgo[];
  compuertas_calidad: (string | CompuertaCalidad)[];
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

// ── Motor de Fechas Gantt (Determinista) ───────────────────────────────────

/**
 * Parsea una fecha en formato DD/MM/YYYY o ISO y devuelve un Date válido.
 * Retorna null si no puede parsear.
 */
function parseDateFlexible(raw: string): Date | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();

  // DD/MM/YYYY
  const dmy = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const d = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
    if (!isNaN(d.getTime())) return d;
  }

  // ISO
  const iso = new Date(trimmed);
  if (!isNaN(iso.getTime())) return iso;

  return null;
}

/**
 * Formatea un Date a DD/MM/YYYY en locale es-MX.
 */
function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Suma días laborables (lun-vie) a una fecha base.
 */
function addBusinessDays(base: Date, days: number): Date {
  const result = new Date(base);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return result;
}

// ── Formateadores ──────────────────────────────────────────────────────────

/**
 * Formatea los hitos a Markdown. Si se proporciona una fecha base de producción,
 * las fechas de los hitos se calculan determinísticamente (Gantt), ignorando
 * cualquier fecha propuesta por el LLM.
 */
function formatearHitos(hitos: Hito[], fechaBaseProduccion?: Date | null): string {
  let md = '#### Plan de Producción del Módulo\n\n';
  md += '| Tarea | Inicio | Entrega | Responsable | Dependencia |\n|---|---|---|---|---|\n';

  if (fechaBaseProduccion) {
    // Motor Gantt: calcular fechas secuenciales ignorando las del LLM
    let cursor = new Date(fechaBaseProduccion);
    for (const h of hitos) {
      const inicio = formatDate(cursor);
      // Estimar duración: 3 días laborables por hito (heurística EC0366)
      const entrega = formatDate(addBusinessDays(cursor, 3));
      md += `| ${h.tarea} | ${inicio} | ${entrega} | ${h.responsable} | ${h.dependencia || 'N/A'} |\n`;
      cursor = addBusinessDays(cursor, 4); // siguiente hito empieza 1 día después
    }
  } else {
    // Sin fecha base: usar las fechas relativas del LLM (legacy)
    for (const h of hitos) {
      md += `| ${h.tarea} | ${h.inicio} | ${h.entrega} | ${h.responsable} | ${h.dependencia || 'N/A'} |\n`;
    }
  }
  return md;
}

function formatearRiesgos(r: RiesgosCalidad): string {
  let md = '#### Gestión de Riesgos y Calidad\n\n';
  md += '**Riesgos Identificados:**\n\n| Riesgo | Mitigación | Impacto | Probabilidad |\n|---|---|---|---|\n';
  for (const item of r.riesgos) {
    md += `| ${item.riesgo} | ${item.mitigacion} | ${item.impacto || 'Medio'} | ${item.probabilidad || 'Media'} |\n`;
  }
  md += '\n**Compuertas de Calidad (Hitos de Validación):**\n\n';
  md += '| Compuerta | Responsable | Criterio de Aprobación | Fecha Límite |\n|---|---|---|---|\n';
  for (const raw of r.compuertas_calidad) {
    const c = normalizarCompuerta(raw);
    md += `| ${c.compuerta} | ${c.responsable} | ${c.criterio} | ${c.fecha_limite || 'Por definir'} |\n`;
  }
  md += '\n';
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

function normalizarCompuerta(raw: any): CompuertaCalidad {
  if (typeof raw === 'string') {
    return {
      compuerta: raw.trim(),
      responsable: 'Diseñador Instruccional',
      criterio: 'Entregable completo y aprobado por SME',
    };
  }
  if (typeof raw === 'object' && raw !== null) {
    const compuerta = String(
      raw.compuerta || raw.gate || raw.nombre || raw.name ||
      Object.values(raw).find((v) => typeof v === 'string') || ''
    ).trim();
    return {
      compuerta,
      responsable: String(raw.responsable || raw.responsible || 'Diseñador Instruccional').trim(),
      criterio: String(raw.criterio || raw.criterion || raw.criteria || 'Entregable completo y aprobado por SME').trim(),
      fecha_limite: raw.fecha_limite || raw.deadline || undefined,
    };
  }
  return { compuerta: String(raw), responsable: 'Diseñador Instruccional', criterio: 'Aprobado por SME' };
}

// ── Ensamblador principal ──────────────────────────────────────────────────

export async function handleDocumentP8Assembler(context: ProductContext): Promise<string> {
  const { jobId, projectId, services, event } = context;
  console.log(`[p8-assembler] ── Ensamblando cronograma del módulo (job: ${jobId}) ──`);

  const moduloActual = Number(event?.body?.userInputs?._modulo_actual || 1);
  const nombreModulo = event?.body?.userInputs?._nombre_modulo || `Módulo ${moduloActual}`;

  // Programa de Formación fields (8.1)
  const fechaInicioFormacion: string = event?.body?.userInputs?.fecha_inicio_formacion || '';
  const lugarImparticion: string = event?.body?.userInputs?.lugar_imparticion || 'Por definir';
  const modalidadImparticion: string = event?.body?.userInputs?.modalidad_imparticion || 'Por definir';
  const numeroGrupos: string = String(event?.body?.userInputs?.numero_grupos || '1');

  // P8-C: Read real team member names for quality gate accountability
  const nombreDI: string = event?.body?.userInputs?.nombre_di || 'Diseñador Instruccional';
  const nombreSME: string = event?.body?.userInputs?.nombre_sme || 'Experto en la Materia (SME)';
  const nombreCoord: string = event?.body?.userInputs?.nombre_coordinador || 'Coordinador del Proyecto';

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

  // Normalizar compuertas (now structured) and replace generic roles with real names
  if (partes.riesgos_calidad) {
    if (!Array.isArray(partes.riesgos_calidad.riesgos)) {
      partes.riesgos_calidad.riesgos = [];
    }
    if (!Array.isArray(partes.riesgos_calidad.compuertas_calidad)) {
      partes.riesgos_calidad.compuertas_calidad = [];
    }
    // P8-C: Replace generic role labels with real team member names
    partes.riesgos_calidad.compuertas_calidad = partes.riesgos_calidad.compuertas_calidad.map(raw => {
      const c = normalizarCompuerta(raw);
      const respLower = c.responsable.toLowerCase();
      if (/diseñador instruccional|instructional designer|di\b/.test(respLower)) c.responsable = nombreDI;
      else if (/experto|sme|materia|expert/.test(respLower)) c.responsable = nombreSME;
      else if (/coordinador|coordinator/.test(respLower)) c.responsable = nombreCoord;
      return c;
    });
  }

  // Formatear a markdown — Motor Gantt determinista
  // Derivar fecha base de producción: userInputs > fichaFormacion > null (legacy)
  const fechaProduccionRaw: string =
    event?.body?.userInputs?.fecha_inicio_produccion ||
    fichaFormacion?.fecha_inicio || '';
  const fechaBaseProduccion = parseDateFlexible(fechaProduccionRaw);
  if (fechaBaseProduccion) {
    console.log(`[p8-assembler] Motor Gantt activado con fecha base: ${formatDate(fechaBaseProduccion)}`);
  }

  const hitosMd = partes.hitos?.length ? formatearHitos(partes.hitos, fechaBaseProduccion) : '';
  const riesgosMd = partes.riesgos_calidad ? formatearRiesgos(partes.riesgos_calidad) : '';

  // Acumular en BD
  let partesAcumuladas: Record<string, any> = {};
  let fichaFormacion: Record<string, string> = {};
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
    if (data?.datos_producto?.ficha_formacion) fichaFormacion = data.datos_producto.ficha_formacion;
  } catch {}

  // Persist Programa de Formación fields from first module that provides them
  if (fechaInicioFormacion) fichaFormacion.fecha_inicio = fechaInicioFormacion;
  if (lugarImparticion && lugarImparticion !== 'Por definir') fichaFormacion.lugar = lugarImparticion;
  if (modalidadImparticion && modalidadImparticion !== 'Por definir') fichaFormacion.modalidad = modalidadImparticion;
  if (numeroGrupos) fichaFormacion.numero_grupos = numeroGrupos;

  partesAcumuladas[`modulo_${moduloActual}`] = {
    nombre: nombreModulo,
    hitos: hitosMd,
    riesgos: riesgosMd,
  };

  const modulosOrdenados = Object.keys(partesAcumuladas).sort();

  // ── Sección 1: Programa de Formación para Candidatos (8.1) ──
  let documentoFinal = '# Cronograma de Desarrollo del Proyecto\n\n';
  documentoFinal += '> *Nota: Este documento contiene dos secciones: (A) Programa de Formación — calendario de impartición para candidatos; (B) Cronograma de Producción — plan interno de desarrollo de materiales.*\n\n';
  documentoFinal += '---\n\n';

  documentoFinal += '## A. Programa de Formación para Candidatos\n\n';
  if (fichaFormacion.fecha_inicio || fichaFormacion.lugar || fichaFormacion.modalidad) {
    documentoFinal += '| Campo | Valor |\n|---|---|\n';
    if (fichaFormacion.fecha_inicio) documentoFinal += `| **Fecha de inicio** | ${fichaFormacion.fecha_inicio} |\n`;
    if (fichaFormacion.lugar) documentoFinal += `| **Lugar de impartición** | ${fichaFormacion.lugar} |\n`;
    if (fichaFormacion.modalidad) documentoFinal += `| **Modalidad** | ${fichaFormacion.modalidad} |\n`;
    if (fichaFormacion.numero_grupos) documentoFinal += `| **Grupos / candidatos** | ${fichaFormacion.numero_grupos} |\n`;
    documentoFinal += '\n';
    // P8-E: Alert if fecha_inicio_produccion is missing — document has formation date but no production start
    if (!fichaFormacion.fecha_inicio_produccion && !event?.body?.userInputs?.fecha_inicio_produccion) {
      documentoFinal += `> ⚠️ **Campo incompleto:** La fecha de inicio de producción de materiales no fue ingresada. Las fechas del Cronograma de Producción (Sección B) son relativas ("Semana 1", "Día 1") y no muestran fechas reales hasta que se ingrese este campo.\n\n`;
    }
  } else {
    documentoFinal += `> ⚠️ **Sección incompleta:** No se ingresaron datos del Programa de Formación (fecha de inicio, lugar, modalidad, número de grupos). Este documento no puede presentarse a CONOCER sin completar estos campos.\n\n`;
  }
  documentoFinal += '| Módulo | Nombre | Fecha de Sesión |\n|---|---|---|\n';
  for (const key of modulosOrdenados) {
    const m = partesAcumuladas[key];
    // Read session date from P6 partes — stored as fecha_sesion by p6-document.assembler.ts
    const p6Partes = event?.body?.userInputs?.productos_previos?.P6?.partes || {};
    const sesionP6 = p6Partes[key];
    const fechaSesion = sesionP6?.fecha_sesion || '';
    documentoFinal += `| ${key.replace('modulo_', '')} | ${m.nombre} | ${fechaSesion || 'Pendiente — completar P6'} |\n`;
  }
  documentoFinal += '\n*Ver Calendario General (P6) para detalle de actividades, horarios y recursos por sesión.*\n\n';
  documentoFinal += '---\n\n';

  // ── Sección 2: Ruta Crítica — dinámica según productos existentes (8.5) ──
  documentoFinal += '## B. Cronograma de Producción\n\n';
  documentoFinal += '### Ruta Crítica y Dependencias\n\n';

  const productosExistentes: string[] = Object.keys(event?.body?.userInputs?.productos_previos || {});
  const dependencias: string[] = [];
  if (productosExistentes.includes('P3') && productosExistentes.includes('P4')) {
    dependencias.push('- **P3 → P4:** Los guiones deben terminarse antes de finalizar el manual del participante.');
  }
  if (productosExistentes.includes('P2') && productosExistentes.includes('P4')) {
    dependencias.push('- **P2 → P4:** La presentación debe revisarse en paralelo con el manual para garantizar coherencia.');
  }
  if (productosExistentes.includes('P1') && productosExistentes.includes('P5')) {
    dependencias.push('- **P1 → P5:** Los instrumentos de evaluación deben aprobarse antes de redactar las guías de actividades.');
  }
  if (productosExistentes.includes('P4') && productosExistentes.includes('P6')) {
    dependencias.push('- **P4 → P6:** El manual debe completarse antes de fijar el calendario de sesiones.');
  }
  if (productosExistentes.includes('P6') && productosExistentes.includes('P8')) {
    dependencias.push('- **P6 → P8:** El calendario de impartición (P6) debe estar aprobado antes de cerrar el cronograma de producción.');
  }
  if (dependencias.length === 0) {
    dependencias.push('- **P3 → P4:** Guiones antes que manual del participante.');
    dependencias.push('- **P1 → P5:** Instrumentos antes que guías de actividades.');
  }
  documentoFinal += dependencias.join('\n') + '\n\n---\n\n';

  // ── Sección 3: Hitos y riesgos por módulo ──
  for (const key of modulosOrdenados) {
    const m = partesAcumuladas[key];
    documentoFinal += `### ${key.replace('modulo_', 'Módulo ')}: ${m.nombre}\n\n`;
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
    datosProducto: { partes: partesAcumuladas, ficha_formacion: fichaFormacion, total_modulos: modulosOrdenados.length },
  });

  console.log(`[p8-assembler] Módulo ${moduloActual} ensamblado. Total: ${modulosOrdenados.length}`);
  return documentoFinal;
}
