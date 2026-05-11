import { ProductContext } from './product.types';
import { parseJsonSafely } from '../../../helpers/json-cleaner';

const PROHIBITED_WORDS = /\b(adecuado|correctamente|correcto|bien|efectivo|notable|mejorado)\b/i;

// Misma lógica que en p7-document.assembler.ts — convierte el JSONB de F2 a texto compacto
const PERFIL_LABEL_P4: Record<string, string> = {
  conocimientos_previos: 'Conocimientos previos',
  habilidades_digitales: 'Habilidades digitales',
  escolaridad_minima: 'Escolaridad mínima',
  disponibilidad_sugerida: 'Disponibilidad sugerida',
};

function formatearPerfilIngresoCompacto(raw: any): string {
  if (!raw) return '';
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return Object.entries(raw)
      .map(([key, val]: [string, any]) => {
        const label = PERFIL_LABEL_P4[key] || key.replace(/_/g, ' ');
        const req = typeof val === 'object' ? (val.requisito || val.requirement || '') : String(val);
        return req ? `${label}: ${req}` : '';
      })
      .filter(Boolean)
      .join(' | ');
  }
  if (Array.isArray(raw)) {
    return (raw as Array<any>)
      .map(item => item.requisito || item.requirement || '')
      .filter(Boolean)
      .join(' | ');
  }
  return String(raw);
}

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

  // Query F2 audience profile — used to calibrate assumed knowledge in every chapter
  let audienceProfile = '';
  try {
    const f2 = await services.supabase.getF2Analisis(projectId);
    if (f2?.perfil_ingreso) {
      audienceProfile = formatearPerfilIngresoCompacto(f2.perfil_ingreso);
      console.log(`[p4-assembler] Perfil de ingreso F2 cargado para calibración de capítulos`);
    }
  } catch (err) {
    console.warn('[p4-assembler] No se pudo leer perfil F2, capítulos sin calibración de audiencia');
  }

  console.log(`[p4-assembler] Procesando ${secciones.length} capítulos (${unidadesForm.length} nombres del Form Schema)...`);
  console.log(`[p4-assembler] Secciones detectadas: ${JSON.stringify(secciones.map((s: any) => s.campo))}`);
  console.log(`[p4-assembler] Unidades Form Schema: ${JSON.stringify(unidadesForm.map((u: any) => u.nombre))}`);

  // 2. Procesar cada unidad
  const capitulos: string[] = [];
  const capitulosData: Array<{ md: string; secciones: Record<string, any> }> = [];
  const allTerms: Array<{ termino: string; definicion: string }> = [];
  const allReferences: string[] = [];

  let domainLockViolations = 0;

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
    let tavilyFallo = false;
    try {
      const searchResults = await services.osint.searchUnitTopic(
        nombreUnidad,
        projectName || ''
      );
      if (searchResults) {
        researchData = { ...investigacionUnidad, ...searchResults };
        // 4.5: Audit trail — log Tavily sources per chapter for No Fake Theory traceability
        const sources: any[] = searchResults.referencias || searchResults.results || [];
        console.log(`[p4-assembler] Tavily unidad ${unidadNum} (${nombreUnidad}): ${sources.length} fuentes — ${sources.slice(0, 3).map((r: any) => r.url || r.title || String(r)).join(' | ')}`);
        if (sources.length === 0) tavilyFallo = true;
      } else {
        tavilyFallo = true;
      }
    } catch (err) {
      console.warn(`[p4-assembler] Tavily search falló para unidad ${unidadNum}, usando datos del extractor`);
      tavilyFallo = true;
    }

    // Notificar progreso
    try {
      await services.pipelineService.updateJobProgress(jobId, {
        currentStep: `Generando capítulo ${unidadNum} de ${secciones.length}: ${nombreUnidad}`,
        progress: Math.round((i / secciones.length) * 100)
      });
    } catch {}

    // Construir prompt para esta unidad
    const promptUnidad = buildChapterPrompt(unidadNum, nombreUnidad, formContent, researchData, projectName || '', audienceProfile);

    // Ejecutar A/B + Juez
    console.log(`[p4-assembler] Ejecutando agente A para capítulo ${unidadNum}...`);
    const rawA = await services.ai.runAgent(promptUnidad, 'qwen2.5:14b', '');

    console.log(`[p4-assembler] Ejecutando agente B para capítulo ${unidadNum}...`);
    const rawB = await services.ai.runAgent(promptUnidad.replace('agente_capitulo_A', 'agente_capitulo_B'), 'qwen2.5:14b', '');

    // Juez: elegir el mejor (con DOMAIN LOCK check)
    console.log(`[p4-assembler] Ejecutando juez para capítulo ${unidadNum}...`);
    const juezPrompt = buildJudgePrompt(rawA, rawB, nombreUnidad, formContent);
    const rawJuez = await services.ai.runAgent(juezPrompt, 'qwen2.5:14b', '');

    const juezMatch = rawJuez.match(/\{[\s\S]*\}/);
    const decision = juezMatch ? parseJsonSafely(juezMatch[0], { seleccion: 'A' }) : { seleccion: 'A' };
    if (decision.seleccion === 'RECHAZADO') {
      console.warn(`[p4-assembler] Capítulo ${unidadNum}: RECHAZADO por DOMAIN LOCK (ambos agentes introdujeron materiales fuera del formulario). Razón: ${decision.razon}. Usando agente A como fallback.`);
      domainLockViolations++;
    }
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

    // P4-D: If Tavily failed, prepend a visible banner so the reader knows theory is unverified
    if (tavilyFallo) {
      chapterMd = chapterMd.replace(
        /### Marco Teórico/,
        '> ⚠️ **Marco Teórico generado sin fuentes externas verificadas** — Tavily no devolvió resultados para esta unidad. Validar con SME antes de publicar.\n\n### Marco Teórico'
      );
    }

    // P4-E: Count ### sections and warn if < 6
    const sectionCount = (chapterMd.match(/^###\s/gm) || []).length;
    if (sectionCount < 6) {
      console.warn(`[p4-assembler] ⚠️ Capítulo ${unidadNum} "${nombreUnidad}": solo ${sectionCount} sección(es) (mínimo 6). Secciones faltantes pueden indicar contenido incompleto.`);
    }

    const seccionesJson = parseSecciones(chapterMd);

    // Extraer términos del glosario SOLO desde la sección ### Conceptos Clave
    // (evita falsos positivos de tablas de Desarrollo, Ejemplo, etc.)
    for (const clave of seccionesJson.conceptos_clave || []) {
      if (clave.termino && clave.definicion) {
        allTerms.push({
          termino: clave.termino.replace(/\*\*/g, '').trim(),
          definicion: clave.definicion
        });
      }
    }

    // Extraer referencias para la bibliografía
    const refMatches = chapterMd.matchAll(/https?:\/\/[^\s)\]]+/g);
    for (const match of refMatches) {
      const url = match[0].trim();
      if (url && url !== 'undefined' && url.startsWith('http') && !allReferences.includes(url)) {
        allReferences.push(url);
      }
    }

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
  // Deduplicar por dominio: solo una URL por hostname (evita múltiples URLs del mismo blog)
  const domainsSeen = new Set<string>();
  const uniqueRefs: string[] = [];
  for (const url of allReferences) {
    // 4.2: Flag URLs that look hallucinated before including them
    if (esSospechosa(url)) {
      console.warn(`[p4-assembler] URL potencialmente inventada omitida de bibliografía: ${url}`);
      continue;
    }
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      if (!domainsSeen.has(domain)) {
        domainsSeen.add(domain);
        uniqueRefs.push(url);
      }
    } catch {
      if (!uniqueRefs.includes(url)) uniqueRefs.push(url);
    }
  }
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
    bibliografiaMd += '\n> **Nota de verificación:** Las referencias en línea fueron sugeridas por IA (Tavily). Verificar que cada URL resuelve correctamente antes de entregar el manual a candidatos.\n';
  } else {
    bibliografiaMd += '- No se encontraron referencias en línea para los temas de este manual.\n';
  }

  // 5. Ensamblar documento final
  // Normalizar títulos de capítulo: asegurar espacio después de ###
  const capitulosNormalizados = capitulos.map(cap =>
    cap
      .replace(/^#\s+(Capítulo\s)/gm, '## $1')
      .replace(/^###(\S)/gm, '### $1')
  );
  const validacionSectionMd = `\n\n---\n\n## Validación y Vigencia del Manual\n\n` +
    `| Rol | Nombre | Firma | Fecha |\n|---|---|---|---|\n` +
    `| Diseñador Instruccional | | | |\n` +
    `| Experto en la Materia (SME) | | | |\n\n` +
    `*Este manual requiere validación por el Experto en la Materia (SME) y firma del Diseñador Instruccional ` +
    `antes de su entrega oficial a candidatos. Vigencia: 1 año o hasta actualización del Estándar EC0366.*\n`;

  const documentoMd = '# Manual del Participante\n\n' +
    capitulosNormalizados.join('\n\n') +
    glosarioMd +
    bibliografiaMd +
    validacionSectionMd;

  console.log(`[p4-assembler] Documento final: ${documentoMd.length} chars, ${capitulos.length} capítulos`);

  // 6. Validación final
  let validacionEstado = 'aprobado';
  let validacionErrores: object = { passed: true };

  const erroresValidacion: string[] = [];
  if (PROHIBITED_WORDS.test(documentoMd)) {
    erroresValidacion.push('Palabras subjetivas prohibidas detectadas en el documento final');
  }
  // 4.4: Programmatic fallback for domain lock violations
  if (domainLockViolations > 0) {
    erroresValidacion.push(`${domainLockViolations} capítulo(s) con DOMAIN LOCK violation — materiales no autorizados detectados por el juez (agente A usado como fallback)`);
  }
  if (erroresValidacion.length > 0) {
    validacionEstado = 'aprobado_con_errores';
    validacionErrores = { passed: false, errors: erroresValidacion };
  }

  // P4-B: Separate inventario_conceptos (theoretical terms from conceptos_clave)
  // from inventario_materiales (physical items from Desarrollo and Ejercicio Práctico sections).
  // Only physical materials should gate Domain Lock for P2/P3/P5.
  const inventarioConceptos = [...new Set(
    capitulosData.flatMap(c =>
      (c.secciones.conceptos_clave || []).map((t: any) => t.termino).filter(Boolean)
    )
  )];

  // Extract physical materials from Desarrollo (numbered steps) and Ejercicio Práctico
  // by matching lines that describe physical objects (tools, materials, quantities)
  const MATERIAL_PATTERN = /(?:\d+\.\s*|[-*]\s*)(?:usar?|utilizar?|colocar?|aplicar?|mezclar?|tomar?|retirar?|limpiar?|preparar?)?[^.\n]*(?:pincel|pintura|herramienta|material|tela|madera|metal|papel|piel|cuero|resina|soldad|cable|tubo|tornill|perno|equipo|máquina|dispositivo|modelo|pieza|miniatura)[^.\n]*/gi;
  const inventarioMateriales = [...new Set(
    capitulosData.flatMap(c => {
      const textoDesarrollo = typeof c.secciones.desarrollo === 'string' ? c.secciones.desarrollo : (c.secciones.desarrollo || []).join(' ');
      const textoEjercicio = typeof c.secciones.ejercicio_practico === 'string' ? c.secciones.ejercicio_practico : '';
      const matches: string[] = [];
      for (const match of (textoDesarrollo + ' ' + textoEjercicio).matchAll(MATERIAL_PATTERN)) {
        const item = match[0].trim().slice(0, 80);
        if (item.length > 5) matches.push(item);
      }
      // Fallback: if pattern finds nothing, include conceptos as before to avoid empty Domain Lock
      return matches.length > 0 ? matches : (c.secciones.conceptos_clave || []).map((t: any) => t.termino).filter(Boolean);
    })
  )];

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
      inventario_materiales: inventarioMateriales,
      inventario_conceptos: inventarioConceptos,
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
  proyecto: string,
  audienceProfile: string = ''
): string {
  const audienceSection = audienceProfile
    ? `
🎯 AUDIENCE PROFILE — CONTENT CALIBRATION RULE (from F2 analysis — authoritative):
${audienceProfile}

CALIBRATION MANDATE: This manual is the PRIMARY STUDY DOCUMENT for participants with the above profile.
- Write at the level of a participant who meets EXACTLY the stated "Conocimientos previos" — not below, not above.
- FORBIDDEN: assuming the reader knows concepts NOT listed in the profile.
- FORBIDDEN: over-explaining concepts that are explicitly listed as "known" in the profile.
- EXAMPLE: if profile says "Conocimientos previos: basic brush application" → you may reference brush application without defining it, but must explain advanced color mixing from scratch.
- Every technical term introduced for the FIRST TIME in this chapter MUST appear in ### Conceptos Clave.
`
    : '';

  return `
YOU ARE AN API ENDPOINT. YOU DO NOT CONVERSE. YOU ONLY OUTPUT RAW JSON.

You are an EC0366 Technical Writer. Write ONE chapter of a participant manual for the course "${proyecto}".

UNIT DATA:
- Unit number: ${num}
- Unit name: ${nombre}
- Form content:
${formContent}

RESEARCH DATA (from web search — secondary source only):
- Best practices: ${JSON.stringify((researchData as any).practicas || [])}
- Trends: ${JSON.stringify((researchData as any).tendencias || [])}
- References: ${JSON.stringify((researchData as any).referencias || [])}
- Industry context: ${(researchData as any).contexto_industria || 'Not available'}
${audienceSection}
⚠️ DOMAIN LOCK — MANDATORY. READ BEFORE WRITING ANYTHING:
You are writing for the course "${proyecto}" — unit "${nombre}".
STEP 1 — BUILD YOUR INVENTORY: Scan the FORM CONTENT above. List every tool, material, instrument, and technique explicitly named there. That list is your AUTHORIZED INVENTORY.
STEP 2 — RESEARCH SCOPE: Research data may only deepen HOW to use inventory items (detail, safety tips, step order). It CANNOT introduce tools, materials, or techniques absent from the form.
STEP 3 — SELF-CHECK before outputting: For each tool/material you cite in the chapter, confirm it appears in the form content. If it does not appear, REMOVE it.
VIOLATION EXAMPLE: Form lists "adjustable torque wrench" → chapter introduces "calibration bench" → DOMAIN VIOLATION. Remove "calibration bench".

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
MINIMUM 5 terms. MANDATORY: include EVERY technical term introduced for the first time in the Desarrollo section.
Each must have all 3 columns filled. The Término column must contain the concept NAME, not its definition.
Example of GOOD: | Contraste | Diferencia entre luces y sombras | Miniatura con zonas brillantes y oscuras |.
Example of BAD: | Diferencia entre... | (missing term name) | ... |
Do NOT use generic terms already known by the target audience (e.g., "Color", "Pincel").
DO include domain-specific compound terms (e.g., "Pincel seco", "Referencia cenital", "Dilución al agua").
Terms from BOTH form content and research data.

### Desarrollo
The procedure step by step. Expand form steps with details from research. Numbered steps.
PROHIBIDO: copiar o parafrasear el texto del objetivo o la introducción.
STRICT VERB POLICY: every step MUST start with an active, observable verb. FORBIDDEN: "Aprender", "Entender", "Conocer", "Saber". USE: "Instalar", "Aplicar", "Ajustar", "Verificar", "Seleccionar", "Medir", "Colocar", "Activar".
Each step MUST specify: exact tool or instrument, quantity or measure, physical action, and expected verifiable result at that step's completion.
CORRECTO: "1. Coloca la herramienta en la posición indicada ajustando hasta que el indicador marque el valor especificado en la ficha técnica."
INCORRECTO: "1. Realiza el proceso correctamente para obtener el resultado deseado."

### Ejemplo Práctico
One concrete scenario from the research practices or trends.

### Ejercicio Práctico
The practice activity from the form.
RULE: This section MUST be a concrete activity with: (1) materials or tools needed, (2) numbered steps (minimum 3), (3) an observable product or result at the end.
FORBIDDEN: rhetorical questions, self-assessment prompts, or reflection questions without physical steps.
WRONG: "¿Puedes realizar el procedimiento de forma adecuada para lograr el resultado esperado?"
RIGHT: "Con [materiales de la unidad]: 1. [Acción física observable]... 2. [Acción con medida o herramienta]... 3. Verifica que [resultado observable y medible]..."

### Puntos a Recordar
- 3 bullet points.

### Lecturas Complementarias
Real references with clickable URLs from the research data. Format each as: "- [Title or description]. Available at: [URL]". If no URLs available, write "- No se encontraron referencias en línea para este tema."

CRITICAL:
- ALL text must be in Spanish. This includes Introducción, Marco Teórico, Conceptos Clave, Desarrollo, Ejemplo Práctico, Ejercicio Práctico, and Puntos a Recordar. NO English sections.
- SPELLING: Copy technical terms EXACTLY as they appear in the form content and unit data. Do not rephrase, abbreviate, or alter their spelling.
- Chapter title MUST BE EXACTLY "${nombre}". Never change it.
- Every theory claim must come from the RESEARCH DATA above.
- Minimum 800 characters of substantive content beyond the form fields.
- NO markdown wrapping around the JSON response.

OUTPUT ONLY THIS JSON:
{"documento_md": "[complete chapter markdown using \\n for line breaks]"}
`;
}

// 4.2: Detect URLs that look hallucinated (template brackets, placeholder domains, etc.)
function esSospechosa(url: string): boolean {
  const PATRONES = [
    /\[.*?\]/, /\{.*?\}/, /example\.com/i, /placeholder/i,
    /tu-url/i, /your-url/i, /sitio-web/i, /lorem/i, /undefined/i,
    /enlace-aqui/i, /url-aqui/i, /insert-url/i,
  ];
  return PATRONES.some(p => p.test(url));
}

function buildJudgePrompt(rawA: string, rawB: string, unitName: string, formContent: string): string {
  return `
YOU ARE A JSON PARSER. DO NOT CONVERSE.

Compare two chapters for the unit "${unitName}".

AUTHORIZED INVENTORY — tools, materials, instruments, and techniques from the form content:
${formContent.slice(0, 1500)}

CHAPTER A:
${rawA.slice(0, 3200)}

CHAPTER B:
${rawB.slice(0, 3200)}

SELECTION CRITERIA:
1. ACCURACY: Does the chapter title match "${unitName}" exactly? Penalize invented titles.
2. DEPTH: Does the Marco Teórico contain real, specific theory? Penalize generic statements.
3. RESEARCH GROUNDING: Are claims backed by research data? Penalize unsourced claims.
4. COMPLETENESS: Are all required sections present?
5. ACCESSIBILITY: Can a new worker understand this?
6. DOMAIN LOCK: Extract every tool, material, and technique cited in each chapter. Cross-check each against the AUTHORIZED INVENTORY above.
   - A chapter that cites ANY item absent from the authorized inventory has a DOMAIN VIOLATION.
   - If ONLY one chapter has a domain violation → select the other.
   - If BOTH chapters have domain violations → emit RECHAZADO.
   - If neither has violations → apply criteria 1-5.

OUTPUT ONLY THIS JSON:
{"seleccion": "A" | "B" | "RECHAZADO", "razon": "brief explanation"}
`;
}
