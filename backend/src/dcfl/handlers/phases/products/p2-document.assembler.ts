import { ProductContext } from './product.types';

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
  const decisionPres = juezPresMatch ? JSON.parse(juezPresMatch[0]) : { seleccion: 'A' };
  const selPres: 'A' | 'B' = decisionPres?.seleccion === 'B' ? 'B' : 'A';
  const agentePresGanador = selPres === 'A' ? 'agente_presentacion_A' : 'agente_presentacion_B';
  const rawPresGanador = await services.pipelineService.getAgentOutput(jobId, agentePresGanador) || '';
  const presentacionCompleta: PresentacionItem[] = sanitizeArray(extractAny(rawPresGanador, 'presentacion_completa'));
  console.log(`[p2-assembler] Presentación: juez=${selPres}, ${presentacionCompleta.length} diapositivas`);

  // ── Sección 2: Actividades ────────────────────────────────────────────────
  const rawJuezAct = await services.pipelineService.getAgentOutput(jobId, 'juez_actividades') || '';
  const juezActMatch = rawJuezAct.match(/\{[\s\S]*\}/);
  const decisionAct = juezActMatch ? JSON.parse(juezActMatch[0]) : { seleccion: 'A' };
  const selAct: 'A' | 'B' = decisionAct?.seleccion === 'B' ? 'B' : 'A';
  const agenteActGanador = selAct === 'A' ? 'agente_actividades_A' : 'agente_actividades_B';
  const rawActGanador = await services.pipelineService.getAgentOutput(jobId, agenteActGanador) || '';
  const actividades: Actividad[] = sanitizeArray(extractAny(rawActGanador, 'actividades'));
  console.log(`[p2-assembler] Actividades: juez=${selAct}, ${actividades.length} actividades`);

  // ── Sección 3: Cierre ─────────────────────────────────────────────────────
  const rawJuezCierre = await services.pipelineService.getAgentOutput(jobId, 'juez_cierre') || '';
  const juezCierreMatch = rawJuezCierre.match(/\{[\s\S]*\}/);
  const decisionCierre = juezCierreMatch ? JSON.parse(juezCierreMatch[0]) : { seleccion: 'A' };
  const selCierre: 'A' | 'B' = decisionCierre?.seleccion === 'B' ? 'B' : 'A';
  const agenteCierreGanador = selCierre === 'A' ? 'agente_cierre_A' : 'agente_cierre_B';
  const rawCierreGanador = await services.pipelineService.getAgentOutput(jobId, agenteCierreGanador) || '';
  const cierreRaw = extractAny(rawCierreGanador, 'cierre_transicion');
  const cierre: Cierre | null = cierreRaw ? sanitizeObject(cierreRaw) as Cierre : null;
  console.log(`[p2-assembler] Cierre: juez=${selCierre}`);

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
  let documentoFinal = '# Presentación Electrónica del Facilitador\n\n';
  for (const key of modulosOrdenados) {
    const m = partesAcumuladas[key];
    documentoFinal += `## ${key.replace('modulo_', 'Módulo ')}: ${m.nombre}\n\n`;
    documentoFinal += m.presentacion_md || m.slides || '';
    documentoFinal += m.actividades;
    documentoFinal += m.cierre;
    documentoFinal += '\n\n---\n\n';
  }

  await services.supabase.saveF4Producto({
    projectId,
    producto: 'P2',
    documentoFinal,
    borradorA: '',
    borradorB: '',
    validacionEstado: 'aprobado',
    jobId,
    validacionErrores: { passed: true },
    datosProducto: { partes: partesAcumuladas, total_modulos: modulosOrdenados.length },
  });

  console.log(`[p2-assembler] Módulo ${moduloActual} ensamblado. Total: ${modulosOrdenados.length}`);
  return documentoFinal;
}
