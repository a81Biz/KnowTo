import type { ProductContext } from '../handlers/phases/products/product.types';

// Pure helper functions extracted from p4-document.assembler.ts

const MATERIAL_PATTERN = /(?:utilizar|usar|emplear|con\s+el\s+uso\s+de|mediante|a\s+través\s+de|con\s+ayuda\s+de)\s+([A-ZÁÉÍÓÚÜÑ][a-záéíóúüñA-ZÁÉÍÓÚÜÑ\s]{3,50}(?:manual|guía|herramienta|equipo|software|aplicación|formato|plantilla|registro|check\s*list|check-list|lista\s+de\s+cotejo)?)/gi;

/** Normalizes a raw chapter markdown: fixes heading levels and ensures spaces after ###. */
export function generarCapitulo(md: string): string {
  return md
    .replace(/^#\s+(Capítulo\s)/gm, '## $1')
    .replace(/^###(\S)/gm, '### $1');
}

/** Formats a deduplicated URL list into a bibliography markdown section. */
export function formatearBibliografia(uniqueRefs: string[]): string {
  let bibliografiaMd = '\n## Bibliografía\n\n';
  if (uniqueRefs.length === 0) {
    bibliografiaMd += '- No se encontraron referencias en línea para los temas de este manual.\n';
    return bibliografiaMd;
  }

  const refLinks: string[] = [];
  for (const url of uniqueRefs) {
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
  const uniqueRefLinks = [...new Set(refLinks)];
  bibliografiaMd += uniqueRefLinks.join('\n') + '\n';
  bibliografiaMd += '\n> **Nota de verificación:** Las referencias en línea fueron sugeridas por IA (Tavily). Verificar que cada URL resuelve correctamente antes de entregar el manual a candidatos.\n';
  return bibliografiaMd;
}

/** Extracts material names from chapter text using MATERIAL_PATTERN regex. */
export function procesarMateriales(textoCapitulo: string, maxItems = 20): string[] {
  const materiales: string[] = [];
  for (const match of textoCapitulo.matchAll(MATERIAL_PATTERN)) {
    const item = match[1]?.trim().slice(0, 80);
    if (item && item.length > 5 && !materiales.includes(item)) {
      materiales.push(item);
      if (materiales.length >= maxItems) break;
    }
  }
  return materiales;
}

/**
 * TS assembler for F4_P4_CHAPTER pipeline.
 * Reads A/B/juez outputs from pipeline_agent_outputs, selects the winner,
 * normalizes heading levels, persists as capitulo_ensamblado_cap{N}, and returns the MD.
 */
export async function handleChapterAssembler(context: ProductContext): Promise<string> {
  const { jobId, services, event } = context;
  const capituloIndex: number = (event?.body?.context as any)?.capitulo_index ?? 0;

  const [rawA, rawB, rawJuez] = await Promise.all([
    services.pipelineService.getAgentOutput(jobId, 'agente_contenido_A'),
    services.pipelineService.getAgentOutput(jobId, 'agente_contenido_B'),
    services.pipelineService.getAgentOutput(jobId, 'juez_capitulo'),
  ]);

  // Parse judge decision — always with try-catch (LLM may produce invalid JSON)
  let decision: { seleccion?: string; razon?: string } = { seleccion: 'A' };
  if (rawJuez) {
    const juezMatch = rawJuez.match(/\{[\s\S]*?\}/);
    if (juezMatch) {
      try {
        decision = JSON.parse(juezMatch[0]);
      } catch {
        // malformed JSON — fallback to A kept
      }
    }
  }

  const seleccion = decision.seleccion === 'B' ? 'B' : 'A';
  const rawWinner = seleccion === 'B' ? (rawB || rawA) : (rawA || rawB);

  if (!rawWinner) {
    console.warn(`[p4-chapter] cap${capituloIndex}: no agent output found — saving empty chapter`);
    await services.pipelineService.saveAgentOutput(jobId, `capitulo_ensamblado_cap${capituloIndex}`, '');
    return '';
  }

  // Extract documento_md from winner JSON — always with try-catch
  let chapterMd = '';
  const winnerMatch = rawWinner.match(/\{[\s\S]*\}/);
  if (winnerMatch) {
    try {
      const parsed = JSON.parse(winnerMatch[0]);
      chapterMd = parsed.documento_md || '';
    } catch {
      chapterMd = rawWinner;
    }
  } else {
    chapterMd = rawWinner;
  }

  if (!chapterMd) {
    chapterMd = `## Capítulo ${capituloIndex + 1}\n\n*Error al generar este capítulo.*`;
  }

  const capMd = generarCapitulo(chapterMd);

  await services.pipelineService.saveAgentOutput(jobId, `capitulo_ensamblado_cap${capituloIndex}`, capMd);
  console.log(`[p4-chapter] cap${capituloIndex}: ensamblado (${capMd.length} chars, seleccion=${seleccion})`);

  return capMd;
}
