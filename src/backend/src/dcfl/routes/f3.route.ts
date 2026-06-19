import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { SupabaseService } from '../services/supabase.service';
import { CertificationEngineFactory } from '../helpers/certification-engine.factory';
import { F3StructuredPatchBody } from '../schemas/wizard.schemas';
import type { Env } from '../../core/types/env';
import type {
  F3Artifact, ModalidadCanonica, ISO639LanguageCode,
  CertificationScore, ArtifactStatus,
} from '../types/certification.types';

const f3Routes = new OpenAPIHono<{ Bindings: Env; Variables: { userId: string } }>();

// ── Route specs ───────────────────────────────────────────────────────────────

const ProjectIdParam = z.object({ projectId: z.string().uuid() });

const routeGetF3ValidationStatus = createRoute({
  method: 'get',
  path: '/{projectId}/validation-status',
  tags: ['f3'],
  summary: 'Estado de validación F3',
  description: 'Verifica si plataforma, modalidad e idioma de F3 están configurados.',
  security: [{ bearerAuth: [] }],
  request: { params: ProjectIdParam },
  responses: {
    200: {
      description: 'Estado de validación F3',
      content: {
        'application/json': {
          schema: z.object({
            plataforma: z.boolean(),
            modalidad: z.boolean(),
            idioma_ok: z.boolean(),
            f3_exists: z.boolean(),
            error: z.string().optional(),
          }).openapi('F3ValidationStatusResponse'),
        },
      },
    },
  },
});

const F3PatchOkSchema = z.object({
  ok: z.literal(true),
  updatedFields: z.object({
    plataforma: z.boolean(),
    modalidad: z.boolean(),
    idioma: z.boolean(),
    criteriosAceptacion: z.boolean(),
  }),
  certStatus: z.string(),
}).openapi('F3StructuredPatchResponse');

const routePatchF3Structured = createRoute({
  method: 'patch',
  path: '/{projectId}/structured',
  tags: ['f3'],
  summary: 'Actualizar criterios de aceptación F3',
  description: 'Actualiza plataforma_navegador JSONB y persiste un ArtifactVersion para F3. Al menos un campo es requerido.',
  security: [{ bearerAuth: [] }],
  request: {
    params: ProjectIdParam,
    body: {
      content: { 'application/json': { schema: F3StructuredPatchBody } },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'F3 actualizado correctamente',
      content: { 'application/json': { schema: F3PatchOkSchema } },
    },
    400: {
      description: 'Bad request — ningún campo proporcionado o JSON inválido',
      content: { 'application/json': { schema: z.object({ error: z.string() }) } },
    },
    403: {
      description: 'Forbidden',
      content: { 'application/json': { schema: z.object({ error: z.string() }) } },
    },
    500: {
      description: 'Error interno',
      content: { 'application/json': { schema: z.object({ error: z.string() }) } },
    },
  },
});

// ── GET /dcfl/api/f3/:projectId/validation-status ─────────────────────────────
//
// Returns { plataforma: bool, modalidad: bool, idioma_ok: bool }

f3Routes.openapi(routeGetF3ValidationStatus, async (c) => {
  const projectId = c.req.valid('param').projectId;
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
      if (!proj) return c.json({ error: 'Forbidden' }, 403) as any;
    }

    const f3 = await supabase.getF3Especificaciones(projectId);

    if (!f3) {
      return c.json({ plataforma: false, modalidad: false, idioma_ok: false, f3_exists: false });
    }

    const pn = f3.plataforma_navegador as any;
    const plataforma = !!(pn && (pn.plataforma || pn.tipo || pn.modalidad_curso || pn.modalidad));
    const modalidad = !!(pn && (pn.modalidad_curso || pn.modalidad));
    const idioma_ok = !!(f3.criterios_aceptacion || f3.calculo_duracion);

    return c.json({ plataforma, modalidad, idioma_ok, f3_exists: true });
  } catch (err) {
    console.error('[f3-route] validation-status error:', err);
    return c.json({ plataforma: false, modalidad: false, idioma_ok: false, f3_exists: false, error: String(err) });
  }
});

// ── PATCH /dcfl/api/f3/:projectId/structured ─────────────────────────────────
//
// Accepts F3StructuredPatchBody { plataforma?, modalidad?, idioma?, criteriosAceptacion? }
// Updates plataforma_navegador JSONB and persists an ArtifactVersion for F3.

f3Routes.openapi(routePatchF3Structured, async (c) => {
  const projectId = c.req.valid('param').projectId;
  const userId = c.get('userId');
  const supabase = new SupabaseService(c.env);

  if (supabase.client && userId) {
    const { data: proj } = await supabase.client
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .maybeSingle();
    if (!proj) return c.json({ error: 'Forbidden' }, 403);
  }

  let body: { plataforma?: string; modalidad?: string; idioma?: string; criteriosAceptacion?: string[] } = {};
  try {
    body = c.req.valid('json');
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  if (!body.plataforma && !body.modalidad && !body.idioma && !body.criteriosAceptacion) {
    return c.json({ error: 'At least one field required: plataforma, modalidad, idioma, or criteriosAceptacion' }, 400);
  }

  try {
    // Read existing F3 row
    const f3 = await supabase.getF3Especificaciones(projectId);
    const existingPn = (f3?.plataforma_navegador as any) ?? {};

    // Merge structured fields into plataforma_navegador JSONB
    const updatedPn: Record<string, any> = {
      ...existingPn,
      ...(body.plataforma ? { plataforma: body.plataforma } : {}),
      ...(body.modalidad ? { modalidad_curso: body.modalidad, modalidad: body.modalidad } : {}),
    };
    const updatedIdioma: string = body.idioma ?? (existingPn.idioma ?? 'es');

    if (!supabase.client) throw new Error('Supabase client not initialised');

    // Update the most recent fase3_especificaciones row for this project
    const { error: updateErr } = await supabase.client
      .from('fase3_especificaciones')
      .update({ plataforma_navegador: updatedPn })
      .eq('project_id', projectId);

    if (updateErr) throw new Error(`F3 update failed: ${updateErr.message}`);

    // Persist criteriosAceptacion when provided
    if (body.criteriosAceptacion && body.criteriosAceptacion.length > 0) {
      await supabase.updateF3CriteriosAceptacion(projectId, body.criteriosAceptacion);
    }

    // Build F3Artifact for ArtifactVersion
    const modalidadCcm = (body.modalidad ?? existingPn.modalidad_curso ?? existingPn.modalidad ?? 'presencial') as ModalidadCanonica;
    const idiomaCcm = (updatedIdioma) as ISO639LanguageCode;
    const criterios = body.criteriosAceptacion ?? (f3?.criterios_aceptacion as string[] | null) ?? [];

    const f3Artifact: F3Artifact = {
      plataforma: body.plataforma ?? existingPn.plataforma ?? '',
      modalidad: modalidadCcm,
      criteriosAceptacion: criterios,
      reporteo: [],
      idioma: idiomaCcm,
    };

    // Get estandar_norma from project brief
    let estandarNorma: string | null = null;
    try {
      const brief = await supabase.getProjectBrief(projectId);
      estandarNorma = (brief as any)?.estandarNorma ?? null;
    } catch {}

    const engine = CertificationEngineFactory.getEngine(estandarNorma);
    const certResult = engine.runCertificationCheck(f3Artifact, {
      f3Artifact,
      requiredLang: idiomaCcm,
      estandarNorma,
      roundingThreshold: 3,
    });
    const errorCount = certResult.violaciones.filter(v => v.severity === 'error').length;

    const certScore: CertificationScore = {
      cobertura: 100, bloom: 100,
      modalidad: certResult.violaciones.some(v => v.code === 'MODALITY_INCONSISTENCY') ? 0 : 100,
      idioma: certResult.violaciones.some(v => v.code === 'LANGUAGE_FIELD_MISMATCH') ? 0 : 100,
      vocabulario: 100, trazabilidad: 100, total: 0,
    };
    certScore.total = Math.round((certScore.cobertura + certScore.bloom + certScore.modalidad + certScore.idioma + certScore.vocabulario + certScore.trazabilidad) / 6);

    const certStatus: ArtifactStatus = errorCount > 0 ? 'corrected' : 'valid';

    await supabase.saveArtifactVersion({
      projectId,
      productCode: 'F3',
      artifact: f3Artifact,
      documentoMd: f3?.documento_final as string ?? '',
      certScore,
      status: certStatus,
      promptTemplateId: 'F3_ESPECIFICACIONES',
      promptTemplateVersion: '1.0',
      generatedBy: 'structured-edit',
    });

    return c.json({
      ok: true as const,
      updatedFields: { plataforma: !!body.plataforma, modalidad: !!body.modalidad, idioma: !!body.idioma, criteriosAceptacion: !!body.criteriosAceptacion },
      certStatus,
    });
  } catch (err) {
    console.error('[f3-route] structured patch error:', err);
    return c.json({ error: String(err) }, 500);
  }
});

export { f3Routes };
