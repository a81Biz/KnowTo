-- ── 017_create_fase4_productos.sql ──────────────────────────────────────────
-- Tabla para los 8 productos de producción F4 (EC0366).
-- Cada fila = un producto (P0..P7) de un proyecto.
-- datos_producto JSONB almacena campos estructurados específicos del producto.

CREATE TABLE IF NOT EXISTS fase4_productos (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          UUID        NOT NULL,
    producto            VARCHAR(10) NOT NULL,               -- 'P0'..'P7'

    -- Documento final Markdown (output del sintetizador_final_f4)
    documento_final     TEXT,

    -- Borradores intermedios (para auditoría)
    borrador_a          TEXT,
    borrador_b          TEXT,

    -- Decisión del juez (JSON: { borrador_elegido, razon, campos_faltantes })
    juez_decision       JSONB,

    -- Resultado de la validación de código
    validacion_estado   VARCHAR(20) NOT NULL DEFAULT 'pendiente',  -- 'aprobado' | 'revision_humana' | 'pendiente'
    validacion_errores  JSONB,

    -- Datos estructurados extraídos del documento (campos específicos por producto)
    -- P0: { fases: [], duracion_total_dias: int }
    -- P1: { objetivo_general, objetivos_particulares, perfil_ingreso }
    -- P2: { actividades_por_modulo: [], suma_ponderaciones: int }
    -- P3: { semanas: [], fecha_inicio, fecha_fin }
    -- P4: { documentos_por_modulo: [], palabras_totales: int }
    -- P5: { diapositivas_por_modulo: [], total_diapositivas: int }
    -- P6: { videos: [], duracion_total_minutos: int }
    -- P7: { cuestionario: {}, rubrica: {}, lista_cotejo: {}, suma_rubrica: int }
    datos_producto      JSONB,

    -- Referencia al job que generó este producto
    job_id              UUID,

    -- Versión del documento (para regeneraciones)
    version             INT         NOT NULL DEFAULT 1,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at         TIMESTAMPTZ
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_fase4_productos_project
    ON fase4_productos(project_id);

CREATE INDEX IF NOT EXISTS idx_fase4_productos_project_producto
    ON fase4_productos(project_id, producto);

-- Restricción: solo un documento aprobado por proyecto+producto
-- (permite múltiples versiones pero marca el aprobado con UNIQUE parcial)
CREATE UNIQUE INDEX IF NOT EXISTS idx_fase4_unique_aprobado
    ON fase4_productos(project_id, producto)
    WHERE validacion_estado = 'aprobado';

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_fase4_productos_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fase4_productos_updated_at ON fase4_productos;
CREATE TRIGGER trg_fase4_productos_updated_at
    BEFORE UPDATE ON fase4_productos
    FOR EACH ROW EXECUTE FUNCTION update_fase4_productos_updated_at();

-- RLS: habilitar para Supabase
ALTER TABLE fase4_productos ENABLE ROW LEVEL SECURITY;

-- Política: service role tiene acceso total
CREATE POLICY "service_role_all_fase4_productos"
    ON fase4_productos
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
