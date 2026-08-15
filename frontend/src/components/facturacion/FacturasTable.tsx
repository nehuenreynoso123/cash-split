import { formatCurrency, formatLocalDate } from '../../lib/data';
import type { Venta } from './ventas';

interface FacturasTableProps {
  ventas: Venta[];
}

const COLUMNS: { label: string; align?: 'right' }[] = [
  { label: 'ID de venta' },
  { label: 'Fecha' },
  { label: 'Cantidad' },
  { label: 'Nro de Factura' },
  { label: 'Fecha de Factura' },
  { label: 'Importe', align: 'right' },
  { label: 'Jurisdicción' },
  { label: 'DNI / CUIT' },
  { label: 'Nombre Apellido' },
  { label: 'Producto Vendido' },
];

// Combine the jurisdiction parts following the "CP <cp> - <localidad>, <provincia>"
// shape (e.g. "CP 7600 - Mar del Plata, Buenos Aires"), skipping empty parts.
function jurisdiccionLabel(j: Venta['jurisdiccion']): string {
  const cp = j.codigoPostal.trim() ? `CP ${j.codigoPostal.trim()}` : '';
  const place = [j.localidad.trim(), j.provincia.trim()].filter(Boolean).join(', ');
  const label = [cp, place].filter(Boolean).join(' - ');
  return label || '—';
}

export default function FacturasTable({ ventas }: FacturasTableProps) {
  return (
    <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
      <div className="p-6 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary">receipt_long</span>
          <h3 className="font-headline-md text-headline-md text-primary">Facturas Emitidas</h3>
        </div>
        <span className="text-on-surface-variant font-body-sm">
          {ventas.length} {ventas.length === 1 ? 'factura' : 'facturas'}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-bright border-b border-outline-variant">
              {COLUMNS.map((c) => (
                <th
                  key={c.label}
                  className={`px-6 py-4 font-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap ${
                    c.align === 'right' ? 'text-right' : ''
                  }`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30">
            {ventas.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="px-6 py-12 text-center text-on-surface-variant">
                  No hay facturas emitidas todavía.
                </td>
              </tr>
            ) : (
              ventas.map((v) => (
                <tr key={v.id} className="hover:bg-surface-container-lowest transition-colors group">
                  <td className="px-6 py-4 font-data-mono text-on-surface-variant whitespace-nowrap">
                    {v.numero}
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant whitespace-nowrap">
                    {formatLocalDate(v.fecha)}
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant">{v.cantidad}</td>
                  <td className="px-6 py-4 font-data-mono text-on-surface-variant whitespace-nowrap">
                    {v.nroFactura}
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant whitespace-nowrap">
                    {formatLocalDate(v.fechaFactura)}
                  </td>
                  <td className="px-6 py-4 text-right font-data-mono text-primary font-semibold whitespace-nowrap">
                    {formatCurrency(v.importe)}
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant">{jurisdiccionLabel(v.jurisdiccion)}</td>
                  <td className="px-6 py-4 font-data-mono text-on-surface-variant whitespace-nowrap">
                    {v.dniCuit || '—'}
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant">{v.nombreApellido}</td>
                  <td className="px-6 py-4 text-on-surface-variant">{v.producto}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
