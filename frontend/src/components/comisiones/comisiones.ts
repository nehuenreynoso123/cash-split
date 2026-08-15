// Local mock data for the Comisiones section.
// The backend has no commissions support yet, so commission data lives
// entirely in the frontend. No fetch calls — render this directly.

export interface Comision {
  id: number;
  vendedor: string;
  fecha: string;
  nroVenta: string;
  monto: number;
  estado: 'pagada' | 'pendiente';
}

export const comisiones: Comision[] = [
  {
    id: 1,
    vendedor: 'Juan Pérez',
    fecha: '2026-08-14',
    nroVenta: 'VNT-0847',
    monto: 145200,
    estado: 'pendiente',
  },
  {
    id: 2,
    vendedor: 'María González',
    fecha: '2026-08-14',
    nroVenta: 'VNT-0846',
    monto: 98250,
    estado: 'pagada',
  },
  {
    id: 3,
    vendedor: 'Carlos Rodríguez',
    fecha: '2026-08-12',
    nroVenta: 'VNT-0841',
    monto: 312500,
    estado: 'pendiente',
  },
  {
    id: 4,
    vendedor: 'Laura Martínez',
    fecha: '2026-08-11',
    nroVenta: 'VNT-0837',
    monto: 67400,
    estado: 'pagada',
  },
  {
    id: 5,
    vendedor: 'Diego Fernández',
    fecha: '2026-08-08',
    nroVenta: 'VNT-0829',
    monto: 221800,
    estado: 'pagada',
  },
  {
    id: 6,
    vendedor: 'Sofía López',
    fecha: '2026-08-05',
    nroVenta: 'VNT-0818',
    monto: 52900,
    estado: 'pendiente',
  },
  {
    id: 7,
    vendedor: 'Martín Álvarez',
    fecha: '2026-07-31',
    nroVenta: 'VNT-0803',
    monto: 187600,
    estado: 'pagada',
  },
  {
    id: 8,
    vendedor: 'Lucía Gómez',
    fecha: '2026-07-28',
    nroVenta: 'VNT-0794',
    monto: 43850,
    estado: 'pagada',
  },
  {
    id: 9,
    vendedor: 'Andrés Silva',
    fecha: '2026-07-24',
    nroVenta: 'VNT-0786',
    monto: 269400,
    estado: 'pendiente',
  },
  {
    id: 10,
    vendedor: 'Valentina Ruiz',
    fecha: '2026-07-21',
    nroVenta: 'VNT-0779',
    monto: 89400,
    estado: 'pagada',
  },
];
