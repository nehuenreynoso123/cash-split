// Shared local model for the Ventas tab of the Facturación section.
// Sales are entered manually through the Agregar Venta tab and live only in
// React state — the backend has no sales-invoicing support, so no fetch calls.

export interface Venta {
  id: number;
  numero: string;
  cliente: string;
  producto: string;
  cantidad: number;
  monto: number;
  fecha: string;
  tipo: 'A' | 'B' | 'C';
  estado: 'pagada' | 'pendiente' | 'vencida';
}
