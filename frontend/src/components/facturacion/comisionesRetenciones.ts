// Local mock data for the merged Comisiones y Retenciones table.
// Comisiones pay sales commissions to vendors; retenciones are withholdings
// applied on payments to suppliers (IIBB, IVA, Ganancias). No backend support
// yet — render directly, no fetch calls.

export interface ComisionRetencion {
  id: number;
  tipo: 'comision' | 'retencion';
  concepto: string;
  fecha: string;
  nroComprobante: string;
  monto: number;
  estado: 'pagada' | 'pendiente' | 'aplicada';
}

export const comisionesRetenciones: ComisionRetencion[] = [
  {
    id: 1,
    tipo: 'comision',
    concepto: 'Comisión por venta — Carlos Méndez',
    fecha: '2026-08-14',
    nroComprobante: 'COM-0001',
    monto: 245000,
    estado: 'pagada',
  },
  {
    id: 2,
    tipo: 'comision',
    concepto: 'Comisión por venta — Laura Fernández',
    fecha: '2026-08-12',
    nroComprobante: 'COM-0002',
    monto: 183750,
    estado: 'pagada',
  },
  {
    id: 3,
    tipo: 'retencion',
    concepto: 'Ret. IIBB — Transportes del Sur SRL',
    fecha: '2026-08-11',
    nroComprobante: 'RET-0017',
    monto: 89400,
    estado: 'aplicada',
  },
  {
    id: 4,
    tipo: 'comision',
    concepto: 'Comisión por venta — Pablo Ramírez',
    fecha: '2026-08-08',
    nroComprobante: 'COM-0003',
    monto: 312000,
    estado: 'pendiente',
  },
  {
    id: 5,
    tipo: 'retencion',
    concepto: 'Ret. Ganancias — Estudio Jurídico Fernández & Asoc.',
    fecha: '2026-08-07',
    nroComprobante: 'RET-0016',
    monto: 246900,
    estado: 'aplicada',
  },
  {
    id: 6,
    tipo: 'comision',
    concepto: 'Comisión por venta — Marta González',
    fecha: '2026-07-30',
    nroComprobante: 'COM-0004',
    monto: 156750,
    estado: 'pagada',
  },
  {
    id: 7,
    tipo: 'retencion',
    concepto: 'Ret. IVA — Distribuidora del Oeste S.A.',
    fecha: '2026-07-28',
    nroComprobante: 'RET-0015',
    monto: 187200,
    estado: 'pagada',
  },
  {
    id: 8,
    tipo: 'comision',
    concepto: 'Comisión por venta — Diego Sosa',
    fecha: '2026-07-24',
    nroComprobante: 'COM-0005',
    monto: 98400,
    estado: 'pendiente',
  },
  {
    id: 9,
    tipo: 'retencion',
    concepto: 'Ret. IIBB — Panadería La Nueva Esperanza',
    fecha: '2026-07-21',
    nroComprobante: 'RET-0014',
    monto: 12450,
    estado: 'aplicada',
  },
  {
    id: 10,
    tipo: 'comision',
    concepto: 'Comisión por venta — Carla Díaz',
    fecha: '2026-07-18',
    nroComprobante: 'COM-0006',
    monto: 214500,
    estado: 'pagada',
  },
  {
    id: 11,
    tipo: 'retencion',
    concepto: 'Ret. Ganancias — Clínica Privada San Martín',
    fecha: '2026-07-15',
    nroComprobante: 'RET-0013',
    monto: 375000,
    estado: 'pendiente',
  },
  {
    id: 12,
    tipo: 'comision',
    concepto: 'Comisión por venta — Jorge Pereyra',
    fecha: '2026-07-10',
    nroComprobante: 'COM-0007',
    monto: 67200,
    estado: 'pagada',
  },
];
