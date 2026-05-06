import { ProductContext } from './product.types';
import { parseJsonSafely } from '../../../helpers/json-cleaner';

const PROHIBITED_WORDS = /\b(adecuado|correctamente|correcto|bien|efectivo|notable|mejorado)\b/i;

interface UnidadData {
  modulo: number;
  nombre: string;
  objetivo: string;
  formContent: string;
  researchData: any;
}

export async function handleDocumentP4Assembler(context: ProductContext): Promise<string> {
  const { jobId, projectId, services, event, promptId, projectName } = context;
  console.log(`[p4-assembler] ── Iniciando ensamblado P4 por capítulos (job: ${jobId}) ──`);

  // 1. Obtener nombres reales de unidades desde el schema guardado en BD
  let unidadesForm: any[] = [];
  try {
    const { data: schemaData } = await services.supabase.client!
      .from('producto_form_schemas')
      .select('schema_json')
      .eq('project_id', projectId)
      .eq('producto', 'P4')
      .single();
    
    const fields = schemaData?.schema_json?.fields || [];
    unidadesForm = fields
      .filter((f: any) => f.name?.startsWith('manual_unidad_'))
      .map((f: any, i: number) => ({
        modulo: i + 1,
        nombre: f.label?.replace(/^Capítulo:\s*/, '') || `Unidad ${i + 1}`
      }));
  } catch (err) {
    console.warn('[p4-assembler] No se pudo leer schema de BD, usando nombres por defecto');
  }

  // 2. Leer contenido del formulario directamente de BD
  let secciones: any[] = [];
  let investigacion: any[] = [];
  try {
    const { data: formData } = await services.supabase.client!
      .from('producto_form_schemas')
      .select('valores_usuario')
      .eq('project_id', projectId)
      .eq('producto', 'P4')
      .single();
    
    const valores = formData?.valores_usuario || {};
    // Convertir { manual_unidad_1: "...", manual_unidad_2: "...", ... } en array de secciones
    secciones = Object.entries(valores)
      .filter(([key]) => key.startsWith('manual_unidad_'))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([campo, contenido]) => ({ campo, contenido: contenido as string }));
  } catch (err) {
    console.warn('[p4-assembler] No se pudo leer valores_usuario de BD');
  }

  if (secciones.length === 0) {
    console.warn('[p4-assembler] No se encontraron secciones en el extractor. Abortando.');
    return '# Manual del Participante\n\n*Error: No se encontraron datos para generar el manual.*';
  }

  console.log(`[p4-assembler] Procesando ${secciones.length} capítulos (${unidadesForm.length} nombres del Form Schema)...`);
  console.log(`[p4-assembler] Secciones detectadas: ${JSON.stringify(secciones.map((s: any) => s.campo))}`);
  console.log(`[p4-assembler] Unidades Form Schema: ${JSON.stringify(unidadesForm.map((u: any) => u.nombre))}`);

  // 2. Procesar cada unidad
  const capitulos: string[] = [];
  const capitulosData: Array<{ md: string; secciones: Record<string, any> }> = [];
  const allTerms: Array<{ termino: string; definicion: string }> = [];
  const allReferences: string[] = [];

  console.log(`[p4-assembler] Iniciando loop de ${secciones.length} iteraciones`);
  for (let i = 0; i < secciones.length; i++) {
    const seccion = secciones[i];
    const unidadNum = i + 1;
    const investigacionUnidad = investigacion.find((inv: any) => inv.unidad === String(unidadNum)) || {};

    // Extraer nombre de la unidad del campo del formulario
    const formContent = seccion.contenido || '';
    const nombreMatch = formContent.match(/^Objetivo de aprendizaje:.*$/m);
    // Obtener nombre real de la unidad desde el Form Schema
    const unidadForm = unidadesForm.find((u: any) => u.modulo === unidadNum);
    const nombreUnidad = unidadForm?.nombre || `Unidad ${unidadNum}`;

    console.log(`[p4-assembler] ── Capítulo ${unidadNum}: Buscando investigación para "${nombreUnidad}" ──`);

    // Buscar en Tavily información específica para esta unidad
    let researchData = investigacionUnidad;
    try {
      const searchResults = await services.osint.searchUnitTopic(
        nombreUnidad,
        projectName || ''
      );
      if (searchResults) {
        researchData = { ...investigacionUnidad, ...searchResults };
      }
    } catch (err) {
      console.warn(`[p4-assembler] Tavily search falló para unidad ${unidadNum}, usando datos del extractor`);
    }

    // Notificar progreso
    try {
      await services.pipelineService.updateJobProgress(jobId, {
        currentStep: `Generando capítulo ${unidadNum} de ${secciones.length}: ${nombreUnidad}`,
        progress: Math.round((i / secciones.length) * 100)
      });
    } catch {}

    // Construir prompt para esta unidad
    const promptUnidad = buildChapterPrompt(unidadNum, nombreUnidad, formContent, researchData, projectName || '');

    // Ejecutar A/B + Juez
    console.log(`[p4-assembler] Ejecutando agente A para capítulo ${unidadNum}...`);
    const rawA = await services.ai.runAgent(promptUnidad, 'qwen2.5:14b', '');

    console.log(`[p4-assembler] Ejecutando agente B para capítulo ${unidadNum}...`);
    const rawB = await services.ai.runAgent(promptUnidad.replace('agente_capitulo_A', 'agente_capitulo_B'), 'qwen2.5:14b', '');

    // Juez: elegir el mejor
    console.log(`[p4-assembler] Ejecutando juez para capítulo ${unidadNum}...`);
    const juezPrompt = buildJudgePrompt(rawA, rawB, nombreUnidad);
    const rawJuez = await services.ai.runAgent(juezPrompt, 'qwen2.5:14b', '');

    const juezMatch = rawJuez.match(/\{[\s\S]*\}/);
    const decision = juezMatch ? parseJsonSafely(juezMatch[0], { seleccion: 'A' }) : { seleccion: 'A' };
    const seleccion = decision.seleccion === 'B' ? 'B' : 'A';

    // Extraer documento_md del ganador
    const rawWinner = seleccion === 'A' ? rawA : rawB;
    const winnerMatch = rawWinner.match(/\{[\s\S]*\}/);
    const winnerData = winnerMatch ? parseJsonSafely(winnerMatch[0], {}) : {};
    let chapterMd: string = (winnerData as any).documento_md || rawWinner || `## Capítulo ${unidadNum}: ${nombreUnidad}\n\n*Error al generar este capítulo.*`;

    // Validar palabras prohibidas — fallback al perdedor
    if (PROHIBITED_WORDS.test(chapterMd)) {
      console.warn(`[p4-assembler] Palabras prohibidas en capítulo ${unidadNum} (${seleccion}) — intentando fallback`);
      const rawLoser = seleccion === 'A' ? rawB : rawA;
      const loserMatch = rawLoser.match(/\{[\s\S]*\}/);
      const loserData = loserMatch ? parseJsonSafely(loserMatch[0], {}) : {};
      const loserMd: string = (loserData as any).documento_md || '';
      if (loserMd && !PROHIBITED_WORDS.test(loserMd)) {
        chapterMd = loserMd;
        console.log(`[p4-assembler] Capítulo ${unidadNum}: usando fallback`);
      } else {
        console.warn(`[p4-assembler] Capítulo ${unidadNum}: ambos agentes tienen palabras prohibidas`);
      }
    }

    // Extraer términos para el glosario
    const termMatches = chapterMd.matchAll(/\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|/g);
    for (const match of termMatches) {
      const termino = match[1].trim();
      const definicion = match[2].trim();
      // Filtrar filas rotas
      if (!termino || !definicion) continue;
      if (termino === 'Término' || termino === '---') continue;
      if (definicion.startsWith('---')) continue;
      if (termino.length < 2 || definicion.length < 5) continue;
      // Si el término es igual a la definición, es una fila rota
      if (termino === definicion) continue;
      // Si el término tiene más de 60 caracteres, es una definición, no un término
      if (termino.length > 60) continue;
      // Si el término empieza con minúscula, verbo, artículo o preposición, es una definición
      if (/^[a-záéíóú]/.test(termino)) continue;
      if (/^(el |la |los |las |un |una |proceso |método |técnica |diferencia |importancia )/i.test(termino)) continue;
      // Si el término contiene markdown (negrita sin cerrar), limpiarlo
      const terminoLimpio = termino.replace(/\*\*/g, '').trim();
      allTerms.push({ termino: terminoLimpio, definicion });
    }

    // Extraer referencias para la bibliografía
    const refMatches = chapterMd.matchAll(/https?:\/\/[^\s)\]]+/g);
    for (const match of refMatches) {
      const url = match[0].trim();
      if (url && url !== 'undefined' && url.startsWith('http') && !allReferences.includes(url)) {
        allReferences.push(url);
      }
    }

    const seccionesJson = parseSecciones(chapterMd);
    capitulos.push(chapterMd);
    capitulosData.push({ md: chapterMd, secciones: seccionesJson });
    console.log(`[p4-assembler] Capítulo ${unidadNum} completado (${chapterMd.length} chars)`);
  }

  // 3. Generar Glosario General
  let glosarioMd = '\n## Glosario\n\n| Término | Definición |\n|---|---|\n';
  // Deduplicar por término normalizado (sin artículos, minúsculas, sin markdown)
  const seenTerms = new Set<string>();
  const uniqueTerms: Array<{ termino: string; definicion: string }> = [];
  for (const t of allTerms) {
    const normalized = t.termino
      .replace(/\*\*/g, '')
      .replace(/^(el |la |los |las |un |una )/i, '')
      .trim()
      .toLowerCase();
    if (!seenTerms.has(normalized)) {
      seenTerms.add(normalized);
      uniqueTerms.push({
        termino: t.termino.replace(/\*\*/g, '').trim(),
        definicion: t.definicion
      });
    }
  }
  // Ordenar alfabéticamente
  uniqueTerms.sort((a, b) => a.termino.localeCompare(b.termino, 'es'));
  for (const t of uniqueTerms) {
    glosarioMd += `| ${t.termino} | ${t.definicion} |\n`;
  }

  // 4. Generar Bibliografía
  let bibliografiaMd = '\n## Bibliografía\n\n';
  // Deduplicar URLs
  const uniqueRefs = [...new Set(allReferences)];
  if (uniqueRefs.length > 0) {
    const refLinks: string[] = [];
    for (const url of uniqueRefs) {
      // Intentar extraer un título descriptivo del dominio y path
      let title = '';
      try {
        const parsed = new URL(url);
        const hostname = parsed.hostname.replace('www.', '');
        const pathParts = parsed.pathname.split('/').filter(p => p && p.length > 3);
        if (pathParts.length > 0) {
          const lastPart = pathParts[pathParts.length - 1]
            .replace(/-/g, ' ')
            .replace(/\.(html|php|aspx?)$/, '')
            .trim();
          title = lastPart.length > 5
            ? lastPart.charAt(0).toUpperCase() + lastPart.slice(1)
            : hostname;
        } else {
          title = hostname;
        }
      } catch {
        title = 'Fuente consultada';
      }
      refLinks.push(`- ${title}. Disponible en: ${url}`);
    }
    // Deduplicar por título también
    const uniqueRefLinks = [...new Set(refLinks)];
    bibliografiaMd += uniqueRefLinks.join('\n') + '\n';
  } else {
    bibliografiaMd += '- No se encontraron referencias en línea para los temas de este manual.\n';
  }

  // 5. Ensamblar documento final
  // Normalizar títulos de capítulo: asegurar espacio después de ###
  const capitulosNormalizados = capitulos.map(cap => cap.replace(/^###(\S)/gm, '### $1'));
  const documentoMd = '# Manual del Participante\n\n' +
    capitulosNormalizados.join('\n\n') +
    glosarioMd +
    bibliografiaMd;

  console.log(`[p4-assembler] Documento final: ${documentoMd.length} chars, ${capitulos.length} capítulos`);

  // 6. Validación final
  let validacionEstado = 'aprobado';
  let validacionErrores: object = { passed: true };

  if (PROHIBITED_WORDS.test(documentoMd)) {
    validacionEstado = 'aprobado_con_errores';
    validacionErrores = { passed: false, errors: ['Palabras subjetivas prohibidas detectadas en el documento final'] };
  }

  // 7. Guardar en BD
await services.supabase.saveF4Producto({
    projectId,
    producto: 'P4',
    documentoFinal: documentoMd,
    borradorA: '',
    borradorB: '',
    validacionEstado,
    jobId,
    validacionErrores,
    datosProducto: {
      capitulos: capitulosData.map((cap, i) => ({
        unidad: i + 1,
        nombre: unidadesForm.find(u => u.modulo === i + 1)?.nombre || `Unidad ${i + 1}`,
        contenido_md: cap.md,
        secciones_json: cap.secciones,
        palabras: cap.md.split(/\s+/).length
      })),
      palabras_totales: documentoMd.split(/\s+/).length
    },
  });

  console.log(`[p4-assembler] P4 estado: ${validacionEstado}, ${documentoMd.length} caracteres`);

  return documentoMd;
}

function parseSecciones(chapterMd: string): Record<string, any> {
  const result: Record<string, any> = {
    introduccion: '',
    marco_teorico: '',
    conceptos_clave: [],
    desarrollo: [],
    ejemplo_practico: '',
    ejercicio_practico: '',
    puntos_recordar: [],
    lecturas_complementarias: [],
  };

  const blocks = chapterMd.split(/(?=###\s)/);
  for (const block of blocks) {
    const headerMatch = block.match(/^###\s+(.+)\n([\s\S]*)/);
    if (!headerMatch) continue;
    const header = headerMatch[1].trim().toLowerCase();
    const content = headerMatch[2].trim();

    if (header.includes('introducci')) {
      result.introduccion = content;
    } else if (header.includes('marco te')) {
      result.marco_teorico = content;
    } else if (header.includes('conceptos clave')) {
      const rows = content.split('\n').filter(r => r.includes('|') && !r.match(/^[\s|:-]+$/));
      result.conceptos_clave = rows.slice(1).map(row => {
        const cells = row.split('|').map(c => c.trim()).filter(Boolean);
        return { termino: cells[0] || '', definicion: cells[1] || '', ejemplo: cells[2] || '' };
      }).filter(c => c.termino && c.termino !== 'Término');
    } else if (header.includes('desarrollo')) {
      const numbered = content.split('\n').filter(l => /^\d+\./.test(l.trim()));
      result.desarrollo = numbered.length > 0
        ? numbered.map(l => l.replace(/^\d+\.\s*/, '').trim())
        : content.split('\n\n').filter(Boolean);
    } else if (header.includes('ejemplo pr')) {
      result.ejemplo_practico = content;
    } else if (header.includes('ejercicio pr')) {
      result.ejercicio_practico = content;
    } else if (header.includes('puntos')) {
      result.puntos_recordar = content.split('\n')
        .filter(l => /^[-*]/.test(l.trim()))
        .map(l => l.replace(/^[-*]\s*/, '').trim())
        .filter(Boolean);
    } else if (header.includes('lecturas')) {
      result.lecturas_complementarias = content.split('\n')
        .filter(l => l.trim().startsWith('-'))
        .map(l => {
          const urlMatch = l.match(/https?:\/\/[^\s)\]]+/);
          const titleMatch = l.match(/\[([^\]]+)\]/);
          return {
            titulo: titleMatch?.[1] || l.replace(/^-\s*/, '').replace(/https?:\/\/[^\s)\]]+/, '').trim(),
            url: urlMatch?.[0] || '',
          };
        })
        .filter(l => l.titulo || l.url);
    }
  }
  return result;
}

function buildChapterPrompt(
  num: number,
  nombre: string,
  formContent: string,
  researchData: any,
  proyecto: string
): string {
  return `
YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.

You are an EC0366 Technical Writer. Write ONE chapter of a participant manual for the course "${proyecto}".

UNIT DATA:
- Unit number: ${num}
- Unit name: ${nombre}
- Form content:
${formContent}

RESEARCH DATA (from web search):
- Best practices: ${JSON.stringify((researchData as any).practicas || [])}
- Trends: ${JSON.stringify((researchData as any).tendencias || [])}
- References: ${JSON.stringify((researchData as any).referencias || [])}
- Industry context: ${(researchData as any).contexto_industria || 'Not available'}

CHAPTER BOUNDARIES — WHAT THIS CHAPTER MUST COVER AND WHAT IT MUST NOT:
- This chapter is about: ${nombre}
- Content focus: ONLY write about ${nombre}. Every section (Marco Teórico, Desarrollo, Ejemplo, Ejercicio) must relate specifically to ${nombre}.
- FORBIDDEN TOPICS for this chapter: Do NOT write about topics that belong to other chapters. Check yourself before outputting: "Am I writing about ${nombre} or did I drift into another topic?"

Write the chapter with this EXACT structure in Spanish:

## Capítulo ${num}: ${nombre}

### Introducción
Hook sentence + what this chapter covers. 2-3 sentences.

### Marco Teórico
Real theory from the research data. 4-6 sentences with sourced facts. Do NOT write "F0 marco de referencia" — state facts directly.

### Conceptos Clave
Markdown table: | Término | Definición | Ejemplo |
Include at least 3 conceptos. Each must have all 3 columns filled (Término, Definición, Ejemplo). The Término column must contain the concept NAME, not its definition. Example of GOOD: | Contraste | Diferencia entre luces y sombras | Miniatura con zonas brillantes y oscuras |. Example of BAD: | Diferencia entre... | (missing term name) | ... |
3-5 terms from BOTH form content and research.

### Desarrollo
The procedure step by step. Expand form steps with details from research. Numbered steps.

### Ejemplo Práctico
One concrete scenario from the research practices or trends.

### Ejercicio Práctico
The practice activity from the form.

### Puntos a Recordar
- 3 bullet points.

### Lecturas Complementarias
Real references with clickable URLs from the research data. Format each as: "- [Title or description]. Available at: [URL]". If no URLs available, write "- No se encontraron referencias en línea para este tema."

CRITICAL:
- ALL text must be in Spanish. This includes Introducción, Marco Teórico, Conceptos Clave, Desarrollo, Ejemplo Práctico, Ejercicio Práctico, and Puntos a Recordar. NO English sections.
- Chapter title MUST BE EXACTLY "${nombre}". Never change it.
- Every theory claim must come from the RESEARCH DATA above.
- Minimum 800 characters of substantive content beyond the form fields.
- NO markdown wrapping around the JSON response.

OUTPUT ONLY THIS JSON:
{"documento_md": "[complete chapter markdown using \\n for line breaks]"}
`;
}

function buildJudgePrompt(rawA: string, rawB: string, unitName: string): string {
  return `
YOU ARE A JSON PARSER. DO NOT CONVERSE.

Compare two chapters for the unit "${unitName}".

CHAPTER A:
${rawA.slice(0, 2000)}

CHAPTER B:
${rawB.slice(0, 2000)}

SELECTION CRITERIA:
1. ACCURACY: Does the chapter title match "${unitName}" exactly? Penalize invented titles.
2. DEPTH: Does the Marco Teórico contain real, specific theory? Penalize generic statements.
3. RESEARCH GROUNDING: Are claims backed by research data? Penalize unsourced claims.
4. COMPLETENESS: Are all required sections present?
5. ACCESSIBILITY: Can a new worker understand this?

OUTPUT ONLY THIS JSON:
{"seleccion": "A" | "B", "razon": "brief explanation"}
`;
}
