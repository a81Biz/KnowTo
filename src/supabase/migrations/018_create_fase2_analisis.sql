-- 013_create_fase2_analisis.sql
-- Almacena los datos estructurados del documento F2 (Especificaciones de Análisis y Diseño)
-- parseados desde el output del sintetizador_final_f2.

CREATE TABLE IF NOT EXISTS fase2_analisis_alcance (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id              UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  job_id                  UUID,

  -- Sección 1: Decisión de modalidad
  modalidad               JSONB,   -- { modalidad, plataforma, distribucion, *_justificacion }

  -- Sección 2: Nivel de interactividad SCORM
  interactividad          JSONB,   -- { nivel: int, descripcion: text, elementos: [...] }

  -- Sección 3: Estructura temática
  estructura_tematica     JSONB,   -- [{ modulo, nombre, objetivo, horas }]

  -- Sección 4: Perfil de ingreso EC0366 (exactamente 5 categorías)
  perfil_ingreso          JSONB,   -- [{ categoria, requisito, fuente }]

  -- Sección 5: Estrategias instruccionales
  estrategias             JSONB,   -- [{ estrategia, descripcion, modulos, bloom }]

  -- Sección 6: Supuestos y restricciones
  supuestos_restricciones JSONB,   -- { supuestos: [...], restricciones: [...] }

  -- Documento markdown completo (para referencia y regeneración)
  documento_final         TEXT,

  created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fase2_analisis_project ON fase2_analisis_alcance(project_id);
CREATE INDEX IF NOT EXISTS idx_fase2_analisis_created ON fase2_analisis_alcance(project_id, created_at DESC);

-- ── Permisos para PostgREST / Supabase API ────────────────────────────────────
GRANT ALL ON TABLE fase2_analisis_alcance TO supabase_admin, service_role;
GRANT SELECT ON TABLE fase2_analisis_alcance TO anon, authenticated;
