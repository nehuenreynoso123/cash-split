import Badge, { statusBadge, statusLabel } from '../ui/Badge';
import { formatCurrency, formatLocalDate } from '../../lib/data';
import type { Venta } from './ventas';

interface VentasTableProps {
  ventas: Venta[];
}

export default function VentasTable({ ventas }: VentasTableProps) {
  return (
    <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
      <div className="p-6 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary">point_of_sale</span>
          <h3 className="font-headline-md text-headline-md text-primary">Ventas Cargadas</h3>
        </div>
        <span className="text-on-surface-variant font-body-sm">
          {ventas.length} {ventas.length === 1 ? 'venta' : 'ventas'}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-bright border-b border-outline-variant">
              {['N°', 'Cliente', 'Producto', 'Fecha', 'Tipo', 'Monto', 'Estado'].map((h) => (
                <th
                  key={h}
                  className={`px-6 py-4 font-label-caps text-on-surface-variant uppercase tracking-wider ${
                    h === 'Tipo' || h === 'Estado'
                      ? 'text-center'
                      : h === 'Monto'
                        ? 'text-right'
                        : ''
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30">
            {ventas.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-on-surface-variant">
                  No hay ventas cargadas todavía. Usá la pestaña Agregar Venta para cargar datos.
                </td>
              </tr>
            ) : (
              ventas.map((v) => (
                <tr key={v.id} className="hover:bg-surface-container-lowest transition-colors group">
                  <td className="px-6 py-4 font-data-mono text-on-surface-variant">{v.numero}</td>
                  <td className="px-6 py-4 text-primary font-body-base">{v.cliente}</td>
                  <td className="px-6 py-4 text-on-surface-variant">{v.producto}</td>
                  <td className="px-6 py-4 text-on-surface-variant">{formatLocalDate(v.fecha)}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full bg-surface-container-low text-on-surface-variant font-data-mono">
                      {v.tipo}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-data-mono text-primary font-semibold">
                    {formatCurrency(v.monto)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Badge variant={statusBadge(v.estado)}>{statusLabel(v.estado)}</Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
