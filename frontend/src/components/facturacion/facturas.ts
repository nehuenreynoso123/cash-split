// Local mock data for the Facturación section.
// The backend has no billing support yet, so invoice data lives entirely
// in the frontend. No fetch calls — render this directly.

export interface Factura {
  id: number;
  numero: string;
  cliente: string;
  fecha: string;
  tipo: 'A' | 'B' | 'C';
  monto: number;
  estado: 'pagada' | 'pendiente' | 'vencida';
}

export const facturas: Factura[] = [
  {
    id: 1,
    numero: '0004-00003421',
    cliente: 'Supermercado El Buen Precio S.R.L.',
    fecha: '2026-08-14',
    tipo: 'A',
    monto: 2450000,
    estado: 'pagada',
  },
  {
    id: 2,
    numero: '0002-00007812',
    cliente: 'Panadería La Nueva Esperanza',
    fecha: '2026-08-13',
    tipo: 'C',
    monto: 186500,
    estado: 'pagada',
  },
  {
    id: 3,
    numero: '0001-00004567',
    cliente: 'Estudio Jurídico Fernández & Asociados',
    fecha: '2026-08-11',
    tipo: 'A',
    monto: 1234500,
    estado: 'pendiente',
  },
  {
    id: 4,
    numero: '0004-00003420',
    cliente: 'Distribuidora del Oeste S.A.',
    fecha: '2026-08-08',
    tipo: 'A',
    monto: 3120000,
    estado: 'pagada',
  },
  {
    id: 5,
    numero: '0003-00009123',
    cliente: 'Taller Mecánico González',
    fecha: '2026-08-06',
    tipo: 'B',
    monto: 428000,
    estado: 'pendiente',
  },
  {
    id: 6,
    numero: '0002-00007811',
    cliente: 'Café del Centro',
    fecha: '2026-08-04',
    tipo: 'B',
    monto: 156750,
    estado: 'pagada',
  },
  {
    id: 7,
    numero: '0005-00005678',
    cliente: 'Clínica Privada San Martín',
    fecha: '2026-07-28',
    tipo: 'A',
    monto: 1875000,
    estado: 'vencida',
  },
  {
    id: 8,
    numero: '0001-00004566',
    cliente: 'Almacén de Barrio Los Amigos',
    fecha: '2026-07-24',
    tipo: 'C',
    monto: 98000,
    estado: 'pagada',
  },
  {
    id: 9,
    numero: '0003-00009122',
    cliente: 'Transporte Rápido S.R.L.',
    fecha: '2026-07-18',
    tipo: 'B',
    monto: 675300,
    estado: 'vencida',
  },
  {
    id: 10,
    numero: '0002-00007810',
    cliente: 'Librería El Saber',
    fecha: '2026-07-15',
    tipo: 'C',
    monto: 214000,
    estado: 'pendiente',
  },
];
