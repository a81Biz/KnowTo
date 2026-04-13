// src/cce/services/context-extractor.service.ts
// Extrae secciones específicas de documentos markdown de fases previas,
// produciendo un contexto compacto para la siguiente fase.
//
// Estrategia por campo:
//   1. Parser markdown (extracción verbatim por patrón regex).
//   2. Si el parser no encuentra la sección → fallback a IA (anti-alucinación).

import flowMap from '../prompts/flow-map.json';
import type { Env } from '../../core/types/env';
import type { ExtractContextRequest, ExtractContextResponse } from '../types/wizard.types';

interface FlowMapSalidaField {
  header: string;
  patron: string;
}

interface FlowMapExtractorFuente {
  fase: string;
  campos: string[];
}

interface FlowMapExtractorNode {
  tipo: 'extractor';
  label: string;
  fuentes: FlowMapExtractorFuente[];
  next: string;
}

interface FlowMapFaseNode {
  tipo: 'fase';
  step: number;
  label: string;
  promptId: string;
  salida: Record<string, FlowMapSalidaField>;
  next: string;
}

type FlowMapNode =
  | FlowMapFaseNode
  | FlowMapExtractorNode
  | { tipo: 'cierre'; step: number; label: string; promptId: null; salida: Record<string, never>; next: null };

function extractMarkdownSection(doc: string, patron: string): string | null {
  let regex: RegExp;
  try {
    regex = new RegExp(patron, 'im');
  } catch {
    return null;
  }

  const match = regex.exec(doc);
  if (!match) return null;

  const start = match.index;
  const headerLine = doc.slice(start, doc.indexOf('\n', start));
  const levelMatch = headerLine.match(/^(#{1,6})\s/);
  const level = levelMatch ? levelMatch[1]!.length : 2;
  const stopPattern = new RegExp(`^#{1,${level}}\\s`, 'm');
  const afterHeader = doc.slice(start + headerLine.length + 1);
  const stopMatch = stopPattern.exec(afterHeader);
  const sectionBody = stopMatch ? afterHeader.slice(0, stopMatch.index) : afterHeader;

  return `${headerLine}\n${sectionBody}`.trimEnd();
}

async function extractWithAI(
  env: Env,
  faseId: string,
  sourceDocument: string,
  missingFields: Array<{ fieldKey: string; header: string }>
): Promise<Record<string, string>> {
  const EXTRACTOR_SYSTEM =
    'Eres un extractor de texto. SOLO copias texto que existe literalmente en el documento. ' +
    `Si una sección no existe, escribe exactamente [NO ENCONTRADO EN ${faseId}]. ` +
    'NO inventes, NO parafrasees, NO añadas nada propio.';

  const seccionesTexto = missingFields.map((f) => `- ${f.header}`).join('\n');

  const prompt =
    `DOCUMENTOS FUENTE:\n\n[${faseId}]\n${sourceDocument}\n\n` +
    `SECCIONES SOLICITADAS:\n${seccionesTexto}\n\n` +
    `Copia verbatim cada sección encontrada. Usa el encabezado exacto como se indica. ` +
    `Si no existe, escribe [NO ENCONTRADO EN ${faseId}].`;

  const isProd = env.ENVIRONMENT === 'production';
  let rawResponse: string;

  try {
    if (isProd) {
      const response = await env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
        prompt,
        system_prompt: EXTRACTOR_SYSTEM,
        max_tokens: 2048,
        temperature: 0,
        stream: false,
      });
      rawResponse =
        typeof response === 'string'
          ? response
          : (response as { response: string }).response ?? '';
    } else {
      const base = (env.OLLAMA_URL ?? 'http://localhost:11434').replace(/\/$/, '');
      const model = env.OLLAMA_MODEL ?? 'llama3.2:3b';
      const res = await fetch(`${base}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt, system: EXTRACTOR_SYSTEM, stream: false, options: { temperature: 0 } }),
      });
      if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
      const data = (await res.json()) as { response?: string };
      rawResponse = data.response ?? '';
    }
  } catch {
    rawResponse = missingFields.map((f) => `${f.header}\n[NO ENCONTRADO EN ${faseId}]`).join('\n\n');
  }

  const results: Record<string, string> = {};
  for (const field of missingFields) {
    const escapedHeader = field.header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const fieldRegex = new RegExp(`${escapedHeader}\\s*\\n([\\s\\S]*?)(?=\\n#{1,6}\\s|$)`, 'i');
    const m = fieldRegex.exec(rawResponse);
    results[field.fieldKey] = m
      ? `${field.header}\n${m[1]!.trimEnd()}`
      : `${field.header}\n[NO ENCONTRADO EN ${faseId}]`;
  }
  return results;
}

export class ContextExtractorService {
  constructor(private readonly env: Env) {}

  async extract(req: ExtractContextRequest): Promise<ExtractContextResponse> {
    const map = flowMap as unknown as Record<string, FlowMapNode>;
    const extractorNode = map[req.extractorId] as FlowMapExtractorNode | undefined;

    if (!extractorNode || extractorNode.tipo !== 'extractor') {
      throw new Error(`Extractor node not found in flow-map: ${req.extractorId}`);
    }

    const sections: string[] = [];
    const parserUsed: Record<string, boolean> = {};

    for (const fuente of extractorNode.fuentes) {
      const phaseId = fuente.fase;
      const sourceDoc = req.sourceDocuments[phaseId] ?? '';
      const faseNode = map[phaseId] as FlowMapFaseNode | undefined;

      if (!faseNode || faseNode.tipo !== 'fase') continue;

      const missingFields: Array<{ fieldKey: string; header: string }> = [];

      for (const fieldKey of fuente.campos) {
        const fieldDef = faseNode.salida[fieldKey];
        if (!fieldDef) continue;

        const extracted = sourceDoc ? extractMarkdownSection(sourceDoc, fieldDef.patron) : null;

        if (extracted) {
          sections.push(`<!-- Extraído de ${phaseId} → ${fieldKey} -->\n${extracted}`);
          parserUsed[`${phaseId}.${fieldKey}`] = true;
        } else {
          missingFields.push({ fieldKey, header: fieldDef.header });
          parserUsed[`${phaseId}.${fieldKey}`] = false;
        }
      }

      if (missingFields.length > 0 && sourceDoc) {
        const aiResults = await extractWithAI(this.env, phaseId, sourceDoc, missingFields);
        for (const [fieldKey, content] of Object.entries(aiResults)) {
          sections.push(`<!-- Extraído de ${phaseId} → ${fieldKey} (AI fallback) -->\n${content}`);
        }
      } else if (missingFields.length > 0) {
        for (const f of missingFields) {
          sections.push(`${f.header}\n[DOCUMENTO ${phaseId} NO DISPONIBLE]`);
        }
      }
    }

    return {
      extractorId: req.extractorId,
      content: sections.join('\n\n---\n\n'),
      parserUsed,
      extractedContextId: crypto.randomUUID(),
    };
  }
}
