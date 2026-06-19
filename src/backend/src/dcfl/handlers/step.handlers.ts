import { Context } from 'hono';
import { SupabaseService } from '../services/supabase.service';

const F4_STEP_NUMBER = 5;
const F4_PRODUCT_CODES = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'];

export async function handleSaveStep(c: Context) {
  const { projectId, stepNumber, inputData } = (c.req as any).valid('json');
  const supabase = new SupabaseService(c.env);
  const data = await supabase.saveStep({ projectId, stepNumber, inputData });
  return c.json({ success: true, data, timestamp: new Date().toISOString() }, 200 as 200);
}

export async function handleCompleteStep(c: Context) {
  const { stepId } = await c.req.json() as { stepId: string };
  const supabase = new SupabaseService(c.env);

  if (!supabase.client) return c.json({ success: false, error: 'DB not initialised' }, 503);

  // Look up step row including status to support idempotency and gate checks
  const { data: stepRow } = await supabase.client
    .from('wizard_steps')
    .select('step_number, project_id, status')
    .eq('id', stepId)
    .maybeSingle();

  // ── PT-102: Idempotency guard — short-circuit if already completed ──────────
  if (stepRow?.status === 'completed') {
    return c.json({ success: true, alreadyCompleted: true, timestamp: new Date().toISOString() });
  }

  // ── PT-082 Gate: block completion of F4 step if project is not certificable ──
  if (stepRow?.step_number === F4_STEP_NUMBER && stepRow.project_id) {
    const projectId = stepRow.project_id as string;
    try {
      const { data: artifacts } = await supabase.client
        .from('artifact_versions')
        .select('product_code, status, cert_score')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .in('product_code', F4_PRODUCT_CODES);

      const present = new Set((artifacts ?? []).map((a: any) => a.product_code));
      const allPresent = F4_PRODUCT_CODES.every(c => present.has(c));
      const rejectedArtifacts = (artifacts ?? []).filter((a: any) => a.status === 'rejected');
      const certificable = allPresent && rejectedArtifacts.length === 0;

      if (!certificable) {
        const missing = F4_PRODUCT_CODES.filter(c => !present.has(c));

        // ── PT-103: Distinguish CCM_PARSE_FAILED from PRODUCT_MISSING ──────────
        // Cross-query fase4_productos to detect products that exist in DB but lack an artifact
        let approvedInFase4 = new Set<string>();
        try {
          const { data: f4Rows } = await supabase.client
            .from('fase4_productos')
            .select('producto')
            .eq('project_id', projectId)
            .in('validacion_estado', [
              'aprobado', 'aprobado_con_errores', 'aprobado_por_fallback', 'valid', 'corrected',
            ]);
          approvedInFase4 = new Set((f4Rows ?? []).map((r: any) => r.producto as string));
        } catch (diagErr) {
          console.warn('[handleCompleteStep] PT-103 cross-query failed (non-blocking):', diagErr);
        }

        // ── PT-188: If all 8 products are in fase4_productos but artifact_versions is unpopulated
        // (CCM pipeline not connected), allow completion — fase4_productos is the source of truth.
        const allInFase4 = F4_PRODUCT_CODES.every(c => approvedInFase4.has(c));
        if (allInFase4) {
          console.log(`[handleCompleteStep] PT-188 bypass: all ${F4_PRODUCT_CODES.length} products in fase4_productos — artifact_versions unpopulated. projectId=${projectId}`);
          // fall through to complete the step below
        } else {
          const violaciones = [
            ...missing.map(code => {
              const inFase4 = approvedInFase4.has(code);
              return {
                code: inFase4 ? 'CCM_PARSE_FAILED' : 'PRODUCT_MISSING',
                field: code,
                message: inFase4
                  ? `Producto ${code} generado pero sin artifact de certificación. Regenerar para reconstruir.`
                  : `Producto ${code} no generado. Generar el producto para continuar.`,
                severity: 'error' as const,
              };
            }),
            ...rejectedArtifacts.map((a: any) => ({
              code: 'PRODUCT_REJECTED',
              field: a.product_code,
              message: `${a.product_code} rechazado por el motor de certificación`,
              severity: 'error' as const,
            })),
          ];

          console.warn(`[handleCompleteStep] Bloqueado por PT-082 gate: ${violaciones.length} violación(es). projectId=${projectId}`);
          return c.json({ success: false, certificable: false, violaciones }, 409);
        }
      }
    } catch (certErr) {
      // Certification check failure is non-blocking — log and allow completion
      console.warn('[handleCompleteStep] PT-082 cert check error (non-blocking):', certErr instanceof Error ? certErr.message : certErr);
    }
  }

  const { error } = await supabase.client
    .from('wizard_steps')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', stepId);
  if (error) return c.json({ success: false, error: error.message }, 500);
  return c.json({ success: true, timestamp: new Date().toISOString() });
}
