-- Migration: 034_create_producto_form_schemas
-- Descripción: Tabla para almacenar esquemas de formularios generados por IA para los productos EC0366
-- Fecha: 2026-04-28

CREATE TABLE IF NOT EXISTS producto_form_schemas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  producto TEXT NOT NULL, -- 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'
  schema_json JSONB NOT NULL DEFAULT '{"fields":[]}'::jsonb,
  valores_sugeridos JSONB,
  valores_usuario JSONB,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, producto)
);

COMMENT ON TABLE producto_form_schemas IS 'Esquemas de formularios generados dinámicamente por IA para cada producto EC0366';
COMMENT ON COLUMN producto_form_schemas.schema_json IS 'Esquema con campos: name, label, type, placeholder, required, options, description';
COMMENT ON COLUMN producto_form_schemas.valores_sugeridos IS 'Valores extraídos del contexto del proyecto (F0, F1, F2, F3)';
COMMENT ON COLUMN producto_form_schemas.valores_usuario IS 'Valores confirmados/modificados por el usuario';

CREATE INDEX IF NOT EXISTS idx_producto_form_schemas_project ON producto_form_schemas(project_id);
CREATE INDEX IF NOT EXISTS idx_producto_form_schemas_producto ON producto_form_schemas(producto);
CREATE INDEX IF NOT EXISTS idx_producto_form_schemas_project_producto ON producto_form_schemas(project_id, producto);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_producto_form_schemas_updated_at
  BEFORE UPDATE ON producto_form_schemas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE producto_form_schemas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own form schemas" ON producto_form_schemas
  FOR SELECT USING (
    auth.role() = 'authenticated' 
    AND project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert their own form schemas" ON producto_form_schemas
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' 
    AND project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their own form schemas" ON producto_form_schemas
  FOR UPDATE USING (
    auth.role() = 'authenticated' 
    AND project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete their own form schemas" ON producto_form_schemas
  FOR DELETE USING (
    auth.role() = 'authenticated'
    AND project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- service_role bypasa RLS por convención de Supabase, pero el policy explícito
-- garantiza acceso también en entornos self-hosted donde el bypass no esté activo.
CREATE POLICY "Service role full access" ON producto_form_schemas
  FOR ALL USING (auth.role() = 'service_role');

-- Permisos a nivel de tabla para los roles de PostgREST
GRANT ALL ON producto_form_schemas TO supabase_admin;
GRANT ALL ON producto_form_schemas TO authenticated;
GRANT ALL ON producto_form_schemas TO anon;
GRANT ALL ON producto_form_schemas TO service_role;
