-- Agrega columna factura_id a ventas_facturacion para agrupar productos en una misma factura.
-- Ejecutar una sola vez en Neon: ALTER TABLE ventas_facturacion ADD COLUMN IF NOT EXISTS factura_id VARCHAR(36);

ALTER TABLE ventas_facturacion ADD COLUMN IF NOT EXISTS factura_id VARCHAR(36);
