// Shared local model for the Facturación section.
// The three tabs (Ventas, Facturas, Comisiones y Retenciones) are projections
// of the SAME sale record — fields with equal names across tables are the same
// data. Sales are entered through the Agregar Venta tab and persisted to the
// backend (ventas_facturacion); id, numero and nro_factura are assigned
// server-side on creation.

export interface Venta {
  id: number;
  numero: string; // ID de venta, auto: V-0001, V-0002...
  producto: string; // Producto Vendido
  fecha: string; // Fecha (venta), YYYY-MM-DD
  cantidad: number;
  precioVenta: number; // Precio de Venta
  comisionVenta: number; // Comision por Venta
  comisionCuota: number; // Comision por Cuota
  envioML: number; // Envio ML
  envioFlex: number; // Envio Flex
  descuento: number; // Descuento
  retenciones: number; // Retenciones
  totalRecibido: number; // Total Recibido (manual input)
  importe: number; // Importe (= Precio de Venta; the facturación column name)
  nroFactura: string; // Nro de Factura, AUTO: starts with 202, ascending
  fechaFactura: string; // Fecha de Factura, YYYY-MM-DD
  jurisdiccion: { codigoPostal: string; localidad: string; provincia: string };
  dniCuit: string; // DNI / CUIT
  nombreApellido: string; // Nombre Apellido
  link: string; // Link de la venta (Mercado Libre, etc.), optional
}
