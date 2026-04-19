-- 016_create_fase2_5_recomendaciones.sql
-- Almacena los datos estructurados de la Fase 2.5: Recomendaciones Pedagógicas de Producción.
-- Sigue el mismo patrón que fase3_especificaciones: JSONB por sección + documento final.

CREATE TABLE IF NOT EXISTS fase2_5_recomendaciones (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id                 UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  job_id                     UUID,

  -- Salidas de los agentes especializados (JSONB estructurado)
  actividades                JSONB,  -- [{tipo, proposito, frecuencia, justificacion}]
  metricas                   JSONB,  -- [{metrica, descripcion, frecuencia}]

  -- Campos escalares derivados del parser
  frecuencia_revision        VARCHAR(50),
  total_videos               INT,
  duracion_promedio_minutos  INT,

  -- Documento final markdown
  documento_final            TEXT,

  -- Doble agente + juez
  borrador_A                 TEXT,
  borrador_B                 TEXT,
  juez_decision              VARCHAR(20),   -- 'A' | 'B'

  -- Metadatos
  version                    INT DEFAULT 1,
  created_at                 TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fase2_5_rec_project
  ON fase2_5_recomendaciones(project_id);

CREATE INDEX IF NOT EXISTS idx_fase2_5_rec_created
  ON fase2_5_recomendaciones(project_id, created_at DESC);

-- ── Permisos para PostgREST / Supabase API ────────────────────────────────────
GRANT ALL ON TABLE fase2_5_recomendaciones TO supabase_admin, service_role;
GRANT SELECT ON TABLE fase2_5_recomendaciones TO anon, authenticated;
