import { ProductContext } from './product.types';

// ── Tipos ──────────────────────────────────────────────────────────────────

interface FichaActividad {
  objetivo: string;
  duracion: string;
  modalidad: string;
  tipo: string;
  unidad_competencia?: string;
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
  nivel_a?: string;
  nivel_b?: string;
  nivel_c?: string;
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
  md += `| **Unidad de Competencia EC0366** | ${f.unidad_competencia || '—'} |\n`;
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

  // EC0366 requires observable, reproducible rubrics — use multi-level format if descriptors present
  const hasLevels = e.rubrica.some(item => item.nivel_a || item.nivel_b || item.nivel_c);
  if (hasLevels) {
    md += '**Rúbrica de Desempeño (niveles observables):**\n\n';
    md += '| Criterio | Completo (100%) | Parcial (60%) | Insuficiente (0%) | Puntos |\n|---|---|---|---|---|\n';
    for (const item of e.rubrica) {
      const nivelA = item.nivel_a || item.indicador_exito || 'Cumple completamente el criterio';
      const nivelB = item.nivel_b || 'Cumple parcialmente el criterio con observaciones menores';
      const nivelC = item.nivel_c || 'No cumple el criterio o presenta errores críticos';
      md += `| ${item.criterio} | ${nivelA} | ${nivelB} | ${nivelC} | ${item.puntos} |\n`;
    }
  } else {
    // Generate levels from indicador_exito as fallback — always output 3-level format
    md += '**Rúbrica de Desempeño:**\n\n';
    md += '| Criterio | Completo | Parcial | Insuficiente | Puntos |\n|---|---|---|---|---|\n';
    for (const item of e.rubrica) {
      md += `| ${item.criterio} | ${item.indicador_exito} | Cumple con 1-2 observaciones menores | No cumple o presenta errores críticos | ${item.puntos} |\n`;
    }
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

// ── Normalizadores ─────────────────────────────────────────────────────────

function normalizarPasos(items: any[]): string[] {
  const TEXT_KEYS = ['paso', 'descripcion', 'texto', 'text', 'step', 'accion', 'action', 'content', 'instruccion'];
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

function normalizarRubrica(items: any[]): RubricaItem[] {
  const INDICADOR_KEYS = ['indicador_exito', 'indicador', 'indicator', 'criterio_exito', 'descripcion_exito', 'success_indicator'];
  const PUNTOS_KEYS = ['puntos', 'puntos_posibles', 'points', 'score', 'valor', 'puntaje'];
  const NIVEL_A_KEYS = ['nivel_a', 'nivel_completo', 'completo', 'excelente', 'nivel_1', 'level_a', 'full'];
  const NIVEL_B_KEYS = ['nivel_b', 'nivel_parcial', 'parcial', 'satisfactorio', 'nivel_2', 'level_b', 'partial'];
  const NIVEL_C_KEYS = ['nivel_c', 'nivel_insuficiente', 'insuficiente', 'nivel_3', 'level_c', 'insufficient'];
  return (items || []).map((item: any) => ({
    criterio: String(item.criterio || item.criterion || item.nombre || item.name || ''),
    indicador_exito: String(INDICADOR_KEYS.map((k: string) => item[k]).find((v: any) => v && typeof v === 'string') || ''),
    puntos: Number(PUNTOS_KEYS.map((k: string) => item[k]).find((v: any) => v !== undefined && v !== null) ?? 0),
    nivel_a: NIVEL_A_KEYS.map(k => item[k]).find(v => v && typeof v === 'string') || undefined,
    nivel_b: NIVEL_B_KEYS.map(k => item[k]).find(v => v && typeof v === 'string') || undefined,
    nivel_c: NIVEL_C_KEYS.map(k => item[k]).find(v => v && typeof v === 'string') || undefined,
  })).filter((item: RubricaItem) => item.criterio.trim().length > 0);
}

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
    let decision: { seleccion?: string } = { seleccion: 'A' };
    try { if (juezMatch) decision = JSON.parse(juezMatch[0]); } catch {}
    const seleccion: 'A' | 'B' = decision?.seleccion === 'B' ? 'B' : 'A';

    const agenteGanador = seleccion === 'A' ? `agente_${seccion}_A` : `agente_${seccion}_B`;
    const rawGanador = await services.pipelineService.getAgentOutput(jobId, agenteGanador) || '';

    (partes as any)[parteClave] = extractAny(rawGanador, parteClave) ?? ((partes as any)[parteClave]);
    console.log(`[p5-assembler] Sección ${seccion}: juez=${seleccion}`);
  }

  // Fallback defensivo: si el agente_materiales no produjo JSON válido (inventario vacío
  // o texto libre), generar logística mínima derivada del nombre de la actividad.
  if (!partes.logistica) {
    const nombreAct = nombreActividad.toLowerCase();
    const esDigital = /digital|software|código|programar|diseño|editar/.test(nombreAct);
    partes.logistica = esDigital
      ? { materiales: [], herramientas: ['Computadora', 'Software de diseño'], consumibles: [], especificaciones_tecnicas: undefined }
      : { materiales: ['Materiales de la actividad (ver manual P4)'], herramientas: ['Herramientas de la actividad (ver manual P4)'], consumibles: [], especificaciones_tecnicas: undefined };
    console.log(`[p5-assembler] Logística vacía — usando fallback defensivo para "${nombreActividad}"`);
  }

  // P5-B invariant: inject unidad_competencia from unit name (always present in ficha)
  if (partes.ficha && !partes.ficha.unidad_competencia) {
    partes.ficha.unidad_competencia = nombreActividad;
  }

  if (partes.procedimiento) {
    partes.procedimiento.preparacion = normalizarPasos(partes.procedimiento.preparacion);
    partes.procedimiento.ejecucion = normalizarPasos(partes.procedimiento.ejecucion);
    partes.procedimiento.cierre_limpieza = normalizarPasos(partes.procedimiento.cierre_limpieza);
    if (partes.procedimiento.medidas_seguridad) {
      partes.procedimiento.medidas_seguridad = normalizarPasos(partes.procedimiento.medidas_seguridad);
    }
    if (partes.procedimiento.ejecucion.length < 2) {
      console.warn(`[p5-assembler] ⚠️ Unidad ${moduloActual} "${nombreActividad}": solo ${partes.procedimiento.ejecucion.length} paso(s) de ejecución (mínimo recomendado: 2 para cobertura EC0366)`);
    }

    // P5-D invariant: inject safety warnings when materials contain risk patterns
    const inventarioP4: string[] = (event as any)?.body?.userInputs?.productos_previos?.P4?.inventario_materiales || [];
    const inventarioStr = inventarioP4.join(' ').toLowerCase();
    const RISK_PATTERNS = /\b(solvente|disolvente|eléctric|electrico|cortante|cuchilla|sierra|soldadura|soldar|químico|quimico|ácido|acido|alcalino|barniz|laca|thinner|acetona|resina|isocianato|pegamento|adhesivo)\b/;
    if (RISK_PATTERNS.test(inventarioStr) && (!partes.procedimiento.medidas_seguridad || partes.procedimiento.medidas_seguridad.length === 0)) {
      const warnings: string[] = [];
      if (/solvente|disolvente|thinner|acetona|barniz|laca/.test(inventarioStr)) warnings.push('Trabajar en área ventilada. Evitar inhalar vapores de solventes.');
      if (/eléctric|electrico|soldadura|soldar/.test(inventarioStr)) warnings.push('Verificar conexiones a tierra antes de operar equipo eléctrico.');
      if (/cortante|cuchilla|sierra/.test(inventarioStr)) warnings.push('Usar guantes de protección al manipular herramientas cortantes.');
      if (/ácido|acido|alcalino|químico|quimico/.test(inventarioStr)) warnings.push('Usar guantes y lentes de protección al manipular sustancias químicas.');
      if (/resina|isocianato/.test(inventarioStr)) warnings.push('Evitar contacto prolongado con piel. Usar guantes de nitrilo.');
      partes.procedimiento.medidas_seguridad = warnings;
      console.log(`[p5-assembler] Medidas de seguridad inyectadas invariantemente para unidad ${moduloActual} (materiales de riesgo detectados)`);
    }
  }
  if (partes.evaluacion?.rubrica) {
    partes.evaluacion.rubrica = normalizarRubrica(partes.evaluacion.rubrica);

    // Check P1 alignment: at least one rubrica criterio should reference the P1 instrument type
    try {
      const instrumentosP1: Array<{unidad: number, tipo: string}> =
        (event as any)?.body?.userInputs?.productos_previos?.P1?.instrumentos || [];
      const instrP1 = instrumentosP1.find((i: any) => Number(i.unidad) === Number(moduloActual));
      if (instrP1?.tipo && partes.evaluacion.rubrica.length > 0) {
        const tipoKeyword = instrP1.tipo.split(/\s+/)[0].toLowerCase();
        const hayAlineacion = partes.evaluacion.rubrica.some(r =>
          r.criterio.toLowerCase().includes(tipoKeyword) ||
          r.indicador_exito.toLowerCase().includes(tipoKeyword)
        );
        if (!hayAlineacion) {
          console.warn(`[p5-assembler] ⚠️ Rúbrica de unidad ${moduloActual} no menciona el instrumento P1 ("${instrP1.tipo}") — revisar alineación P5-P1`);
        }
      }
    } catch {}
  }
  if (partes.logistica) {
    partes.logistica.materiales = normalizarStringArray(partes.logistica.materiales);
    partes.logistica.herramientas = normalizarStringArray(partes.logistica.herramientas);
    partes.logistica.consumibles = normalizarStringArray(partes.logistica.consumibles);
  }

  // P5-E: Slot coherence — compare P5 activity duration against P6 session slot
  if (partes.ficha?.duracion) {
    try {
      const p6Partes = (event as any)?.body?.userInputs?.productos_previos?.P6?.partes || {};
      const sesionP6 = p6Partes[`modulo_${moduloActual}`];
      const slotHoras = sesionP6?.horario_raw?.total_horas;
      if (slotHoras) {
        const durStr = partes.ficha.duracion.toLowerCase();
        const horasMatch = durStr.match(/(\d+(?:\.\d+)?)\s*hora/);
        const minMatch = durStr.match(/(\d+)\s*min/);
        const actHoras = horasMatch
          ? parseFloat(horasMatch[1])
          : minMatch ? Math.ceil(parseInt(minMatch[1]) / 60) : 0;
        if (actHoras > 0 && actHoras > Number(slotHoras)) {
          console.warn(`[p5-assembler] ⚠️ COHERENCIA DE SLOT: Actividad "${nombreActividad}" (${partes.ficha.duracion}) excede el slot P6 de ${slotHoras}h para esta sesión — revisar duración o ajustar calendario.`);
        }
      }
    } catch {}
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
    documentoFinal += `### Ficha de la Actividad\n\n`;
    documentoFinal += m.ficha;
    documentoFinal += `\n### Logística y Materiales\n\n`;
    documentoFinal += m.logistica;
    documentoFinal += `### Procedimiento\n\n`;
    documentoFinal += m.procedimiento;
    documentoFinal += `### Evaluación\n\n`;
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
