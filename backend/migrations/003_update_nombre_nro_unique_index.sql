-- Update the unique index on (nombre_factura, nro_factura) to only apply
-- when factura_id IS NULL, so multi-product invoices can share the same nro_factura.
DROP INDEX IF EXISTS ventas_facturacion_nombre_nro_key;
CREATE UNIQUE INDEX IF NOT EXISTS ventas_facturacion_nombre_nro_key
  ON ventas_facturacion (lower(nombre_factura), nro_factura)
  WHERE factura_id IS NULL;
