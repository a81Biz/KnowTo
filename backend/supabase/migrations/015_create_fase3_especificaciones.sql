-- 015_create_fase3_especificaciones.sql
-- Almacena los datos estructurados de la Fase 3: Especificaciones Técnicas del Curso.
-- Sigue el mismo patrón que fase2_analisis_alcance: un JSONB por sección + documento final.

CREATE TABLE IF NOT EXISTS fase3_especificaciones (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  job_id                UUID,

  -- Salidas de cada agente especializado (JSONB estructurado)
  plataforma_navegador  JSONB,   -- { plataforma_nombre, version, justificacion, navegadores_soportados[], dispositivos[] }
  reporteo              JSONB,   -- { metricas_a_reportar[], frecuencia, formato, destinatarios[], justificacion }
  formatos_multimedia   JSONB,   -- { videos{}, infografias{}, pdfs{}, audios{} }
  navegacion_identidad  JSONB,   -- { navegacion{}, identidad_grafica{} }
  criterios_aceptacion  JSONB,   -- { criterios_contenido[], criterios_tecnico[], criterios_pedagogico[], criterios_accesibilidad[] }
  calculo_duracion      JSONB,   -- { duracion_total_horas, distribucion_semanal{}, detalle_por_modulo[], formula_utilizada, justificacion }

  -- Documento final markdown
  documento_final       TEXT,

  -- Doble agente + juez
  borrador_A            TEXT,
  borrador_B            TEXT,
  juez_decision         VARCHAR(20),   -- 'ok' | 'revisar' | 'humano'
  juez_similitud        INT,

  -- Metadatos
  version               INT DEFAULT 1,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  validated_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_fase3_espec_project
  ON fase3_especificaciones(project_id);

CREATE INDEX IF NOT EXISTS idx_fase3_espec_created
  ON fase3_especificaciones(project_id, created_at DESC);

-- ── Permisos para PostgREST / Supabase API ────────────────────────────────────
GRANT ALL ON TABLE fase3_especificaciones TO supabase_admin, service_role;
GRANT SELECT ON TABLE fase3_especificaciones TO anon, authenticated;
