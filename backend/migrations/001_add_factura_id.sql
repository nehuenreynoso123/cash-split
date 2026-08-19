-- Agrega columna factura_id a la tabla ventas para agrupar productos en una misma factura.
-- Ejecutar una sola vez: psql -f migrations/001_add_factura_id.sql

ALTER TABLE ventas ADD COLUMN IF NOT EXISTS factura_id VARCHAR(36);
