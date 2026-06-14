-- 011_create_preguntas_fase.sql
-- Tablas genéricas para preguntas entre fases y sus respuestas.
-- Una fase genera preguntas para la siguiente (ej: F1 genera preguntas para F2).
-- Compatible con PostgreSQL local (dev) y Supabase (prod).

CREATE TABLE IF NOT EXISTS preguntas_fase (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID        NOT NULL,
  job_id        UUID        REFERENCES pipeline_jobs(id) ON DELETE SET NULL,
  fase_origen   INT         NOT NULL,   -- fase que generó las preguntas (0, 1, 2, 3...)
  fase_destino  INT         NOT NULL,   -- fase a la que van dirigidas (1, 2, 3, 4...)
  texto         TEXT        NOT NULL,
  objetivo      TEXT,
  justificacion TEXT,
  opciones      JSONB,                  -- null = texto libre; array de strings = opciones predefinidas
  orden         INT         NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_preguntas_fase_project_dest
  ON preguntas_fase(project_id, fase_destino);

CREATE INDEX IF NOT EXISTS idx_preguntas_fase_job
  ON preguntas_fase(job_id);

-- ── Respuestas ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS respuestas_preguntas_fase (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pregunta_id UUID        NOT NULL REFERENCES preguntas_fase(id) ON DELETE CASCADE,
  project_id  UUID        NOT NULL,
  respuesta   TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_respuestas_pregunta
  ON respuestas_preguntas_fase(pregunta_id);

CREATE INDEX IF NOT EXISTS idx_respuestas_project
  ON respuestas_preguntas_fase(project_id);

-- ── Permisos para PostgREST / Supabase API ────────────────────────────────────
GRANT ALL ON TABLE preguntas_fase            TO supabase_admin, service_role;
GRANT ALL ON TABLE respuestas_preguntas_fase TO supabase_admin, service_role;
GRANT SELECT ON TABLE preguntas_fase            TO anon, authenticated;
GRANT SELECT ON TABLE respuestas_preguntas_fase TO anon, authenticated;
