import { useMemo } from 'react';
import MetricCard from '../ui/MetricCard';
import { formatCurrency } from '../../lib/data';
import type { Venta } from './ventas';

interface TotalFacturadoCardProps {
  ventas: Venta[];
}

interface NombreTotales {
  nombre: string;
  total: number;
  facturas: number;
}

// Aggregates the invoiced amount (importe = precio de venta) per invoice name
// (nombre_factura). Grouping mirrors the section's autocomplete convention:
// trimmed names with original casing; empty names are skipped. Sorted by total
// so the name that bills the most is first.
function buildTotalesPorNombre(ventas: Venta[]): NombreTotales[] {
  const map = new Map<string, NombreTotales>();

  for (const v of ventas) {
    const nombre = v.nombreFactura.trim();
    if (!nombre) continue;

    const existing = map.get(nombre);
    if (existing) {
      existing.total += v.importe;
      existing.facturas += 1;
    } else {
      map.set(nombre, { nombre, total: v.importe, facturas: 1 });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

export default function TotalFacturadoCard({ ventas }: TotalFacturadoCardProps) {
  const porNombre = useMemo(() => buildTotalesPorNombre(ventas), [ventas]);
  const totalGeneral = porNombre.reduce((sum, n) => sum + n.total, 0);

  return (
    <MetricCard
      title="Total Facturado por Nombre"
      value={formatCurrency(totalGeneral)}
      icon="receipt_long"
      iconColor="text-secondary"
    >
      <div className="mt-4 border-t border-outline-variant pt-2">
        {porNombre.length === 0 ? (
          <p className="font-body-sm text-on-surface-variant">
            No hay ventas cargadas todavía.
          </p>
        ) : (
          <ul className="divide-y divide-outline-variant/40">
            {porNombre.map((n) => (
              <li key={n.nombre} className="flex items-center justify-between gap-4 py-2">
                <span className="font-body-base text-on-surface truncate">
                  {n.nombre}
                  <span className="text-on-surface-variant font-body-sm ml-2">
                    {n.facturas} {n.facturas === 1 ? 'factura' : 'facturas'}
                  </span>
                </span>
                <span className="font-data-mono text-primary font-semibold shrink-0">
                  {formatCurrency(n.total)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </MetricCard>
  );
}