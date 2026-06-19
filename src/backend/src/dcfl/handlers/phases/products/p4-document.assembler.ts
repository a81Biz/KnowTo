import { ProductContext } from './product.types';
import { sanitizeProductDocument } from '../../../helpers/doc-sanitizer.helper';
import { validateUnitCoverage, validateSemanticAnchor } from '../../../helpers/assembler-utils.helper';
import { generarCapitulo, formatearBibliografia } from '../../../helpers/p4-chapter.helper';
import { CertificationEngineFactory } from '../../../helpers/certification-engine.factory';
import type { P4Artifact, ModalidadCanonica, CertificationContext } from '../../../types/certification.types';

const PROHIBITED_WORDS = /\b(adecuado|correctamente|correcto|bien|efectivo|notable|mejorado)\b/i;
const MATERIAL_PATTERN = /(?:\d+\.\s*|[-*]\s*)(?:usar?|utilizar?|colocar?|aplicar?|mezclar?|tomar?|retirar?|limpiar?|preparar?)?[^.\n]*(?:pincel|pintura|herramienta|material|tela|madera|metal|papel|piel|cuero|resina|soldad|cable|tubo|tornill|perno|equipo|máquina|dispositivo|modelo|pieza|miniatura)[^.\n]*/gi;


export async function handleDocumentP4Assembler(context: ProductContext): Promise<string> {
  const { jobId, projectId, services, event, promptId, projectName } = context;
  console.log(`[p4-assembler] ── Iniciando ensamblado P4 (job: ${jobId}) ──`);

  // 1. Load unit names from form schema (for datosProducto metadata)
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

  // 2. Read chapters from context (injected by orchestrator via capitulos_generados)
  const capitulosContext: Array<{ index: number; md: string }> =
    (event?.body?.context as any)?.capitulos_generados || [];
  const capitulosSorted = [...capitulosContext].sort((a, b) => a.index - b.index);

  console.log(`[p4-assembler] ${capitulosSorted.length} capítulos en context.capitulos_generados`);

  const capitulos: string[] = [];
  const capitulosData: Array<{ md: string; secciones: Record<string, any> }> = [];
  const allTerms: Array<{ termino: string; definicion: string }> = [];
  const allReferences: string[] = [];

  for (const { index: capIdx, md: chapterMd } of capitulosSorted) {
    const seccionesJson = parseSecciones(chapterMd);

    for (const clave of seccionesJson.conceptos_clave || []) {
      if (clave.termino && clave.definicion) {
        allTerms.push({
          termino: clave.termino.replace(/\*\*/g, '').trim(),
          definicion: clave.definicion
        });
      }
    }

    const refMatches = chapterMd.matchAll(/https?:\/\/[^\s)\]]+/g);
    for (const match of refMatches) {
      const url = match[0].trim();
      if (url && url !== 'undefined' && url.startsWith('http') && !allReferences.includes(url)) {
        allReferences.push(url);
      }
    }

    const sectionCount = (chapterMd.match(/^###\s/gm) || []).length;
    if (sectionCount < 6) {
      console.warn(`[p4-assembler] ⚠️ Capítulo ${capIdx}: solo ${sectionCount} sección(es) — puede indicar contenido incompleto.`);
    }

    capitulos.push(chapterMd);
    capitulosData.push({ md: chapterMd, secciones: seccionesJson });
    console.log(`[p4-assembler] Capítulo ${capIdx}: ${chapterMd.length} chars`);
  }

  // 2b. Renumeración defensiva: garantiza ## Capítulo 1, 2, 3,... independiente del LLM
  let chapterCounter = 0;
  const capitulosRenumerados = capitulos.map(md =>
    md.replace(/^## Capítulo \d+:/m, () => `## Capítulo ${++chapterCounter}:`)
  );

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
  let suspiciousCount = 0;
  const bibliografiaMd = formatearBibliografia(uniqueRefs);

  // Count suspicious URLs that were filtered — allReferences was built before filtering
  suspiciousCount = allReferences.filter(u => esSospechosa(u)).length;

  // 5. Ensamblar documento final
  const capitulosNormalizados = capitulosRenumerados.map(cap => generarCapitulo(cap));
  const validacionSectionMd = `\n\n---\n\n## Validación y Vigencia del Manual\n\n` +
    `| Rol | Nombre | Firma | Fecha |\n|---|---|---|---|\n` +
    `| Diseñador Instruccional | | | |\n` +
    `| Experto en la Materia (SME) | | | |\n\n` +
    `*Este manual requiere validación por el Experto en la Materia (SME) y firma del Diseñador Instruccional ` +
    `antes de su entrega oficial a candidatos. Vigencia: 1 año o hasta la siguiente actualización.*\n`;

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

  let documentoMdFinal = documentoMd;
  if (suspiciousCount > 0 || uniqueRefs.length === 0) {
    const bibWarnings: string[] = [];
    if (suspiciousCount > 0) {
      bibWarnings.push(`${suspiciousCount} referencia(s) generadas por IA fueron omitidas por contener URLs potencialmente inventadas (placeholders o dominios genéricos).`);
    }
    if (uniqueRefs.length === 0) {
      bibWarnings.push('No se encontraron referencias en línea verificadas. Agregar fuentes manualmente antes de entregar el manual a candidatos.');
    }
    console.warn('[p4-assembler] ⚠️ Advertencia de bibliografía:', bibWarnings);
    documentoMdFinal = documentoMd.trimEnd() + `

---

> ⚠️ **Advertencia de bibliografía:**
${bibWarnings.map(w => `> - ${w}`).join('\n')}
>
> *Validar referencias con SME antes de entregar el manual a candidatos.*
`;
  }

  const _temarioModulos: any[] = event?.body?.userInputs?.previousData?.temario_base?.temario?.modulos ?? [];
  const inventarioSegmentado = segmentarInventarioPorModulo(capitulosData, unidadesForm, _temarioModulos);

  let _coberturaP4: { valido: boolean; faltantes: string[] } = { valido: true, faltantes: [] };
  try {
    const _mods: any[] = _temarioModulos;
    const _unis = _mods.flatMap((m: any) => (m.unidades ?? []).map((u: any) => String(u.nombre ?? '')).filter(Boolean));
    _coberturaP4 = validateUnitCoverage(documentoMdFinal, _unis);
    if (!_coberturaP4.valido && _coberturaP4.faltantes.length > 0) {
      documentoMdFinal = documentoMdFinal.trimEnd() + `\n\n> ⚠️ **Unidades sin cobertura:** ${_coberturaP4.faltantes.join(', ')} — estas unidades del Temario Base no fueron referenciadas en este documento.`;
    }
  } catch {}

  const documentoMdProcesado = procesarReferencias(documentoMdFinal);
  const { doc: documentoMdClean, warnings: _p4sw } = sanitizeProductDocument(documentoMdProcesado, 'P4');
  if (_p4sw.length > 0) console.warn('[p4-assembler] Sanitizer:', _p4sw);

  let _anchorP4: { valido: boolean; ausentes: string[]; cobertura: number } = { valido: true, ausentes: [], cobertura: 1 };
  try {
    const briefP4 = await services.supabase.getProjectBrief(projectId);
    _anchorP4 = validateSemanticAnchor(documentoMdClean, briefP4?.dominioTecnico ?? '');
    if (!_anchorP4.valido) console.warn(`[p4-assembler] ⚠ Ancla semántica: cobertura=${_anchorP4.cobertura}, ausentes=${_anchorP4.ausentes.join(', ')}`);
  } catch {}

  // 7. Guardar en BD
  await services.supabase.saveF4Producto({
    projectId,
    producto: 'P4',
    documentoFinal: documentoMdClean,
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
      inventario_segmentado: inventarioSegmentado,
      palabras_totales: documentoMdClean.split(/\s+/).length,
      validacion_cobertura: _coberturaP4,
      validacion_anchor: _anchorP4,
    },
  });

  console.log(`[p4-assembler] P4 estado: ${validacionEstado}, ${documentoMdClean.length} caracteres`);

  // ── CCM: build P4Artifact, run Rules Engine, persist ArtifactVersion ─────
  try {
    const frozen = event?.body?.context?._frozen as Record<string, any> ?? {};
    const estandarNorma: string | null = frozen.estandar_norma ?? null;
    const requiredLang: string | null = frozen.idioma_requerido ?? null;

    // Build F3Artifact from stored F3 data (best-effort)
    let f3Artifact: CertificationContext['f3Artifact'];
    try {
      const f3Row = await services.supabase.getF3Especificaciones(projectId);
      const pn = f3Row?.plataforma_navegador as any;
      f3Artifact = {
        plataforma:           pn?.plataforma ?? '',
        modalidad:            (pn?.modalidad_curso ?? 'virtual') as ModalidadCanonica,
        criteriosAceptacion:  [],
        reporteo:             [],
        idioma:               requiredLang ?? 'es',
      };
    } catch {
      f3Artifact = { plataforma: '', modalidad: 'virtual', criteriosAceptacion: [], reporteo: [], idioma: 'es' };
    }

    // Build P4Artifact from data already computed by this assembler
    const p4Artifact: P4Artifact = {
      productCode: 'P4',
      modalidad:   f3Artifact.modalidad,
      idioma:      (requiredLang ?? 'es') as any,
      capitulos:   capitulosData.map((cap, i) => ({
        numero:    i + 1,
        nombre:    unidadesForm[i]?.nombre ?? `Unidad ${i + 1}`,
        secciones: Object.entries(cap.secciones).map(([titulo, contenido]) => ({
          titulo,
          contenido: typeof contenido === 'string' ? contenido : JSON.stringify(contenido),
        })),
      })),
      glosario:    [], // Extracted from glosarioMd — available as separate structure in future refactor
      referencias: uniqueRefs.map(url => ({ texto: url, verificable: !esSospechosa(url), url })),
    };

    const ctx: CertificationContext = {
      f3Artifact,
      requiredLang: requiredLang as any,
      estandarNorma,
      roundingThreshold: 3,
    };

    const engine = CertificationEngineFactory.getEngine(estandarNorma);
    const certResult = engine.runCertificationCheck(p4Artifact, ctx);

    const certScore = {
      cobertura:    100,
      bloom:        100,
      modalidad:    certResult.violaciones.some(v => v.code === 'MODALITY_INCONSISTENCY') ? 0 : 100,
      idioma:       certResult.violaciones.some(v => v.code === 'LANGUAGE_FIELD_MISMATCH') ? 0 : 100,
      vocabulario:  PROHIBITED_WORDS.test(documentoMdClean) ? 50 : 100,
      trazabilidad: uniqueRefs.length > 0 && suspiciousCount === 0 ? 100 : 50,
      total:        0,
    };
    certScore.total = Math.round((certScore.cobertura + certScore.bloom + certScore.modalidad + certScore.idioma + certScore.vocabulario + certScore.trazabilidad) / 6);

    await services.supabase.saveArtifactVersion({
      projectId,
      productCode:  'P4',
      artifact:     p4Artifact,
      documentoMd:  documentoMdClean,
      certScore,
      status:       validacionEstado === 'aprobado' ? 'valid' : 'corrected',
    });

    console.log(`[p4-assembler] ArtifactVersion guardado. Violaciones: ${certResult.violaciones.length}, certScore: ${certScore.total}`);
  } catch (err) {
    console.warn('[p4-assembler] CCM saveArtifactVersion falló (no crítico):', err);
  }

  return documentoMdClean;
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

// Segment the extracted inventory by temario module for P5/P2 Domain Lock
function segmentarInventarioPorModulo(
  capitulosData: Array<{ md: string; secciones: Record<string, any> }>,
  unidadesForm: Array<{ modulo: number; nombre: string }>,
  temarioModulos: Array<{ nombre: string; unidades: Array<{ nombre: string }> }>,
): Array<{ modulo: number; unidades: string[]; materiales: string[] }> {
  const porCapitulo = capitulosData.map((cap, i) => {
    const modulo = i + 1;
    const nombre = unidadesForm.find(u => u.modulo === modulo)?.nombre || `Unidad ${modulo}`;
    const textoDesarrollo = typeof cap.secciones.desarrollo === 'string'
      ? cap.secciones.desarrollo
      : (cap.secciones.desarrollo || []).join(' ');
    const textoEjercicio = typeof cap.secciones.ejercicio_practico === 'string'
      ? cap.secciones.ejercicio_practico : '';
    const materiales: string[] = [];
    for (const match of (textoDesarrollo + ' ' + textoEjercicio).matchAll(MATERIAL_PATTERN)) {
      const item = match[0].trim().slice(0, 80);
      if (item.length > 5 && !materiales.includes(item)) materiales.push(item);
    }
    if (materiales.length === 0) {
      for (const clave of cap.secciones.conceptos_clave || []) {
        if (clave.termino) materiales.push(clave.termino);
      }
    }
    return { modulo, nombre, materiales: [...new Set(materiales)] };
  });

  if (temarioModulos.length > 0) {
    return temarioModulos.map((tmMod, tmIdx) => {
      const unidades = (tmMod.unidades || []).map((u: any) => u.nombre as string);
      const materialesModulo = porCapitulo
        .filter(cap => unidades.some(u => u.toLowerCase() === cap.nombre.toLowerCase()))
        .flatMap(cap => cap.materiales);
      const materialesFinal = materialesModulo.length > 0 ? materialesModulo : (porCapitulo[tmIdx]?.materiales || []);
      return { modulo: tmIdx + 1, unidades, materiales: [...new Set(materialesFinal)] };
    });
  }

  return porCapitulo.map(cap => ({ modulo: cap.modulo, unidades: [cap.nombre], materiales: cap.materiales }));
}

// 4.2: Detect URLs that look hallucinated (template brackets, placeholder domains, personal blogs, etc.)
function esSospechosa(url: string): boolean {
  const PATRONES = [
    /\[.*?\]/, /\{.*?\}/, /example\.com/i, /placeholder/i,
    /tu-url/i, /your-url/i, /sitio-web/i, /lorem/i, /undefined/i,
    /enlace-aqui/i, /url-aqui/i, /insert-url/i,
    // Personal blog platforms — never institutional sources for EC0366
    /\.wordpress\.com/i, /\.blogspot\.com/i, /\.tumblr\.com/i, /\.weebly\.com/i,
    // Malformed URL: trailing HTML character leaked from LLM template (e.g., "...pdf>")
    /[>"]$/,
  ];
  return PATRONES.some(p => p.test(url));
}

/** Replaces suspicious URLs found inline in the document with a VERIFICAR-URL marker. */
function procesarReferencias(doc: string): string {
  return doc.replace(/(https?:\/\/[^\s)\]"']+)/g, (url) => {
    if (esSospechosa(url)) {
      return `[VERIFICAR-URL: ${url.slice(0, 50)}...]`;
    }
    return url;
  });
}

