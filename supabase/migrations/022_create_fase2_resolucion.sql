-- 014_create_fase2_resolucion.sql
-- Almacena las decisiones del cliente para resolver discrepancias detectadas
-- entre el Informe de Necesidades (F1) y las Especificaciones de Análisis (F2).
-- Cada fila representa una sesión de resolución para un proyecto.

CREATE TABLE IF NOT EXISTS fase2_resolucion_discrepancias (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Array de discrepancias con decisión: [{aspecto, valor_f1, valor_f2, decision, valor_elegido}]
  discrepancias       JSONB NOT NULL DEFAULT '[]',

  -- Resoluciones del cliente: [{aspecto, decision, valor_elegido}]
  resoluciones        JSONB NOT NULL DEFAULT '[]',

  -- true cuando el cliente confirmó y se puede proceder a F3
  listo_para_f3       BOOLEAN NOT NULL DEFAULT FALSE,

  resuelto_en         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fase2_resolucion_project
  ON fase2_resolucion_discrepancias(project_id);

CREATE INDEX IF NOT EXISTS idx_fase2_resolucion_created
  ON fase2_resolucion_discrepancias(project_id, created_at DESC);

-- ── Permisos para PostgREST / Supabase API ────────────────────────────────────
GRANT ALL ON TABLE fase2_resolucion_discrepancias TO supabase_admin, service_role;
GRANT SELECT ON TABLE fase2_resolucion_discrepancias TO anon, authenticated;
