import { Hono } from 'hono';
import { SupabaseService } from '../services/supabase.service';
import type { Env } from '../../core/types/env';
import type { ArtifactStatus, CertificationScore } from '../types/certification.types';

const PRODUCT_CODES = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'] as const;

export const EMPTY_CERT_SCORE: CertificationScore = {
  cobertura: 0, bloom: 0, modalidad: 0, idioma: 0, vocabulario: 0, trazabilidad: 0, total: 0,
};

const certificationRoutes = new Hono<{ Bindings: Env; Variables: { userId: string } }>();

// ── GET /dcfl/api/certification-status/:projectId ─────────────────────────
//
// Aggregates the active artifact version for each of the 8 F4 products.
// Returns per-product status + a weighted project score + certificable flag.

certificationRoutes.get('/:projectId', async (c) => {
  const projectId = c.req.param('projectId');
  const userId = c.get('userId');
  const supabase = new SupabaseService(c.env);

  try {
    if (supabase.client && userId) {
      const { data: proj } = await supabase.client
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .eq('user_id', userId)
        .maybeSingle();
      if (!proj) return c.json({ error: 'Forbidden' }, 403);
    }

    if (!supabase.client) return c.json({ error: 'DB not initialised' }, 503);

    const { data: rows, error } = await supabase.client
      .from('artifact_versions')
      .select('product_code, version, cert_score, status, is_active')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .in('product_code', PRODUCT_CODES as unknown as string[]);

    if (error) {
      // 42P01 = relation does not exist (migrations not yet applied to this volume)
      if ((error as any).code === '42P01' || error.message?.includes('does not exist')) {
        return c.json({
          products: {},
          projectCertScore: { ...EMPTY_CERT_SCORE },
          certificable: false,
          warning: 'CCM_NOT_INITIALIZED',
        });
      }
      console.error('[certification-route] artifact_versions query error:', error);
      return c.json({ error: 'certification_service_unavailable' }, 503);
    }

    type ProductEntry = {
      status: ArtifactStatus;
      certScore: CertificationScore;
      version: number;
    };

    const products: Record<string, ProductEntry> = {};

    for (const row of rows ?? []) {
      const rawScore = (row.cert_score as any) ?? EMPTY_CERT_SCORE;
      const certScore: CertificationScore = {
        cobertura:    Number(rawScore.cobertura ?? rawScore.overall ?? 0),
        bloom:        Number(rawScore.bloom ?? 0),
        modalidad:    Number(rawScore.modalidad ?? 0),
        idioma:       Number(rawScore.idioma ?? 0),
        vocabulario:  Number(rawScore.vocabulario ?? 0),
        trazabilidad: Number(rawScore.trazabilidad ?? 0),
        total:        Number(rawScore.total ?? rawScore.overall ?? 0),
      };

      products[row.product_code] = {
        status: (row.status as ArtifactStatus) ?? 'draft',
        certScore,
        version: row.version ?? 1,
      };
    }

    // Compute per-axis project averages (only over products that have an artifact)
    const presentCodes = Object.keys(products);
    const n = presentCodes.length;

    const projectCertScore: CertificationScore = n === 0
      ? { ...EMPTY_CERT_SCORE }
      : {
        cobertura:    Math.round(presentCodes.reduce((s, k) => s + products[k].certScore.cobertura, 0) / n),
        bloom:        Math.round(presentCodes.reduce((s, k) => s + products[k].certScore.bloom, 0) / n),
        modalidad:    Math.round(presentCodes.reduce((s, k) => s + products[k].certScore.modalidad, 0) / n),
        idioma:       Math.round(presentCodes.reduce((s, k) => s + products[k].certScore.idioma, 0) / n),
        vocabulario:  Math.round(presentCodes.reduce((s, k) => s + products[k].certScore.vocabulario, 0) / n),
        trazabilidad: Math.round(presentCodes.reduce((s, k) => s + products[k].certScore.trazabilidad, 0) / n),
        total:        Math.round(presentCodes.reduce((s, k) => s + products[k].certScore.total, 0) / n),
      };

    // certificable = all 8 products present + none have status 'rejected'
    const allPresent = PRODUCT_CODES.every(code => code in products);
    const noneRejected = Object.values(products).every(p => p.status !== 'rejected');
    const certificable = allPresent && noneRejected;

    return c.json({ products, projectCertScore, certificable });
  } catch (err) {
    console.error('[certification-route] error:', err);
    return c.json({ error: String(err) }, 500);
  }
});

export { certificationRoutes };
