// Local mock data for the Retenciones section.
// The backend has no withholdings support yet, so withholding data lives
// entirely in the frontend. No fetch calls — render this directly.

export interface Retencion {
  id: number;
  tipo: 'IVA' | 'IIBB' | 'Ganancias';
  razonSocial: string;
  fecha: string;
  nroComprobante: string;
  monto: number;
  estado: 'aplicada' | 'pagada';
}

export const retenciones: Retencion[] = [
  {
    id: 1,
    tipo: 'IVA',
    razonSocial: 'Supermercado El Buen Precio S.R.L.',
    fecha: '2026-08-14',
    nroComprobante: '0004-00003421',
    monto: 257250,
    estado: 'aplicada',
  },
  {
    id: 2,
    tipo: 'IIBB',
    razonSocial: 'Distribuidora del Oeste S.A.',
    fecha: '2026-08-12',
    nroComprobante: '0004-00003418',
    monto: 93600,
    estado: 'pagada',
  },
  {
    id: 3,
    tipo: 'Ganancias',
    razonSocial: 'Clínica Privada San Martín',
    fecha: '2026-08-08',
    nroComprobante: '0005-00005678',
    monto: 112500,
    estado: 'aplicada',
  },
  {
    id: 4,
    tipo: 'IVA',
    razonSocial: 'Panadería La Nueva Esperanza',
    fecha: '2026-08-06',
    nroComprobante: '0002-00007811',
    monto: 19582,
    estado: 'pagada',
  },
  {
    id: 5,
    tipo: 'IIBB',
    razonSocial: 'Transporte Rápido S.R.L.',
    fecha: '2026-08-04',
    nroComprobante: '0003-00009122',
    monto: 20259,
    estado: 'aplicada',
  },
  {
    id: 6,
    tipo: 'Ganancias',
    razonSocial: 'Estudio Jurídico Fernández & Asociados',
    fecha: '2026-07-30',
    nroComprobante: '0001-00004567',
    monto: 74070,
    estado: 'pagada',
  },
  {
    id: 7,
    tipo: 'IVA',
    razonSocial: 'Taller Mecánico González',
    fecha: '2026-07-27',
    nroComprobante: '0003-00009121',
    monto: 44940,
    estado: 'aplicada',
  },
  {
    id: 8,
    tipo: 'IIBB',
    razonSocial: 'Librería El Saber',
    fecha: '2026-07-23',
    nroComprobante: '0002-00007810',
    monto: 6420,
    estado: 'pagada',
  },
  {
    id: 9,
    tipo: 'Ganancias',
    razonSocial: 'Café del Centro',
    fecha: '2026-07-20',
    nroComprobante: '0002-00007809',
    monto: 9405,
    estado: 'aplicada',
  },
  {
    id: 10,
    tipo: 'IVA',
    razonSocial: 'Almacén de Barrio Los Amigos',
    fecha: '2026-07-16',
    nroComprobante: '0001-00004565',
    monto: 10290,
    estado: 'pagada',
  },
];
