import { ProductContext } from './product.types';

// ── Tipos ──────────────────────────────────────────────────────────────────

interface DescripcionTema {
  que_es: string;
  para_que_sirve: string;
  relacion_puesto: string;
  errores_evitar?: string;
}

interface Concepto {
  termino: string;
  definicion: string;
  ejemplo: string;
}

interface Tecnico {
  conceptos: Concepto[];
  normativa: string[];
  indicador_dominio?: string;
}

interface ParteInformacion {
  descripcion: DescripcionTema | null;
  tecnico: Tecnico | null;
}

const SECCIONES = ['descripcion', 'conceptos'] as const;
type Seccion = typeof SECCIONES[number];

const CLAVE_PARTE: Record<Seccion, keyof ParteInformacion> = {
  descripcion: 'descripcion',
  conceptos: 'tecnico',
};

// ── Formateadores ──────────────────────────────────────────────────────────

function formatearDescripcion(d: DescripcionTema): string {
  let md = '#### Descripción y Utilidad Práctica\n\n';
  md += `**¿Qué es?**\n${d.que_es}\n\n`;
  md += `**¿Para qué sirve?**\n${d.para_que_sirve}\n\n`;
  md += `**Relación con el puesto:**\n${d.relacion_puesto}\n\n`;
  if (d.errores_evitar) md += `> ⚠️ **Errores a evitar:** ${d.errores_evitar}\n\n`;
  return md;
}

function formatearTecnico(t: Tecnico): string {
  let md = '#### Fundamentos Técnicos\n\n';
  md += '**Conceptos Clave:**\n\n| Término | Definición | Ejemplo |\n|---|---|---|\n';
  for (const c of t.conceptos) {
    md += `| ${c.termino} | ${c.definicion} | ${c.ejemplo} |\n`;
  }
  md += `\n**Normativa Aplicable:**\n${t.normativa.map(n => `- ${n}`).join('\n')}\n\n`;
  if (t.indicador_dominio) md += `**Indicador de Dominio:** ${t.indicador_dominio}\n\n`;
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

export async function handleDocumentP7Assembler(context: ProductContext): Promise<string> {
  const { jobId, projectId, services, event } = context;
  console.log(`[p7-assembler] ── Ensamblando información del tema (job: ${jobId}) ──`);

  const moduloActual = event?.body?.userInputs?._modulo_actual || 1;
  const nombreTema = event?.body?.userInputs?._nombre_tema || `Tema ${moduloActual}`;

  const partes: ParteInformacion = {
    descripcion: null,
    tecnico: null,
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
    console.log(`[p7-assembler] Sección ${seccion}: juez=${seleccion}`);
  }

  // Formatear a markdown
  const descMd = partes.descripcion ? formatearDescripcion(partes.descripcion) : '';
  const tecnicoMd = partes.tecnico ? formatearTecnico(partes.tecnico) : '';

  // Acumular en BD
  let partesAcumuladas: Record<string, any> = {};
  try {
    const { data } = await services.supabase.client!
      .from('fase4_productos')
      .select('datos_producto')
      .eq('project_id', projectId)
      .eq('producto', 'P7')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.datos_producto?.partes) partesAcumuladas = data.datos_producto.partes;
  } catch {}

  partesAcumuladas[`tema_${moduloActual}`] = {
    nombre: nombreTema,
    descripcion: descMd,
    tecnico: tecnicoMd,
  };

  const modulosOrdenados = Object.keys(partesAcumuladas).sort();
  let documentoFinal = '# Documento de Información General\n\n';
  
  // Agregar sección de materiales producidos (glosario consolidado)
  documentoFinal += '## Glosario Consolidado del Curso\n\n| Término | Definición |\n|---|---|\n';
  const glosario: Record<string, string> = {};
  for (const key of modulosOrdenados) {
    // Esto es simplificado, en una implementación real extraeríamos los conceptos de los datos crudos
  }
  documentoFinal += '\n---\n\n';

  for (const key of modulosOrdenados) {
    const m = partesAcumuladas[key];
    documentoFinal += `## Tema ${key.replace('tema_', '')}: ${m.nombre}\n\n`;
    documentoFinal += m.descripcion;
    documentoFinal += m.tecnico;
    documentoFinal += '\n\n---\n\n';
  }

  await services.supabase.saveF4Producto({
    projectId,
    producto: 'P7',
    documentoFinal,
    borradorA: '',
    borradorB: '',
    validacionEstado: 'aprobado',
    jobId,
    validacionErrores: { passed: true },
    datosProducto: { partes: partesAcumuladas, total_temas: modulosOrdenados.length },
  });

  console.log(`[p7-assembler] Tema ${moduloActual} ensamblado. Total: ${modulosOrdenados.length}`);
  return documentoFinal;
}
