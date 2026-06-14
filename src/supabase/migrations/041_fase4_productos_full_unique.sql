-- 041_fase4_productos_full_unique.sql
-- Añade constraint UNIQUE incondicional sobre (project_id, producto) en fase4_productos.
-- La migración 019 sólo tiene un índice UNIQUE parcial WHERE validacion_estado='aprobado',
-- insuficiente para hacer UPSERT con onConflict.
-- Borra filas duplicadas antes de crear el constraint (por si existen en dev).

DELETE FROM fase4_productos f
WHERE ctid <> (
  SELECT min(f2.ctid)
  FROM fase4_productos f2
  WHERE f2.project_id = f.project_id AND f2.producto = f.producto
);

ALTER TABLE fase4_productos
  ADD CONSTRAINT fase4_productos_project_producto_unique UNIQUE (project_id, producto);
