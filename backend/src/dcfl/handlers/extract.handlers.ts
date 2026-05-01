import { Context } from 'hono';
import { SupabaseService } from '../services/supabase.service';
import { ContextExtractorService } from '../../core/services/context-extractor.service';
import dcflFlowMap from '../prompts/flow-map.json';

export async function handleExtract(c: Context) {
  try {
    const { projectId, extractorId, sourceDocuments } = (c.req as any).valid('json');
    const extractor = new ContextExtractorService(c.env, dcflFlowMap as Record<string, unknown>);
    const supabase = new SupabaseService(c.env);

    const result = await extractor.extract({ projectId, extractorId, sourceDocuments });

    const toPhase = extractorId.replace(/^EXTRACTOR_/, '');
    const fromPhases = Object.keys(sourceDocuments);

    await supabase.saveExtractedContext({
      projectId,
      extractorId,
      fromPhases,
      toPhase,
      content: result.content,
      parserUsed: result.parserUsed,
    });

    return c.json({ success: true, data: result, timestamp: new Date().toISOString() }, 200 as 200);
  } catch (err) {
    console.error('[Extract] Error:', err);
    return c.json({ 
      success: true, 
      timestamp: new Date().toISOString(),
      data: { 
        content: "{}", 
        extractorId: "fallback", 
        parserUsed: {}, 
        extractedContextId: "fallback" 
      } 
    }, 200 as 200);
  }
}
