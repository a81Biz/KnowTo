-- 012_create_fase1_informe_necesidades.sql
-- Informe estructurado de Necesidades de Capacitación (F1).
-- Se persiste después de que el pipeline F1 completa sintetizador_final.
-- El contenido markdown completo se guarda en la tabla documents (flujo existente).
-- Esta tabla almacena los datos PARSEADOS en JSONB para que F2 los consuma directamente.

CREATE TABLE IF NOT EXISTS fase1_informe_necesidades (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id              UUID        NOT NULL,
  job_id                  UUID        REFERENCES pipeline_jobs(id) ON DELETE SET NULL,

  -- Secciones estructuradas del informe
  sintesis_contexto       TEXT,
  preguntas_respuestas    JSONB,   -- [{ pregunta: string, respuesta: string }]
  brechas_competencia     JSONB,   -- [{ tipo: string, descripcion: string, capacitable: string }]
  declaracion_problema    TEXT,
  objetivos_aprendizaje   JSONB,   -- [{ objetivo: string, nivel_bloom: string, tipo: string }]
  perfil_participante     JSONB,   -- { perfil_profesional, nivel_educativo, experiencia_previa,
                                   --   conocimientos_previos, rango_edad, motivacion }
  resultados_esperados    JSONB,   -- [string]
  recomendaciones_diseno  JSONB,   -- [string]

  version                 INT         NOT NULL DEFAULT 1,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fase1_informe_project
  ON fase1_informe_necesidades(project_id);

CREATE OR REPLACE FUNCTION _update_fase1_informe_ts()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fase1_informe_ts ON fase1_informe_necesidades;
CREATE TRIGGER trg_fase1_informe_ts
BEFORE UPDATE ON fase1_informe_necesidades
FOR EACH ROW EXECUTE FUNCTION _update_fase1_informe_ts();

-- ── Permisos para PostgREST / Supabase API ────────────────────────────────────
GRANT ALL ON TABLE fase1_informe_necesidades TO supabase_admin, service_role;
GRANT SELECT ON TABLE fase1_informe_necesidades TO anon, authenticated;
