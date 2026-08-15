import Badge, { statusBadge, statusLabel } from '../ui/Badge';
import { formatCurrency, formatLocalDate } from '../../lib/data';
import { comisiones } from './comisiones';

export default function ComisionesTable() {
  return (
    <div className="space-y-gutter">
      {/* Commission list */}
      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">payments</span>
            <h3 className="font-headline-md text-headline-md text-primary">Comisiones de Vendedores</h3>
          </div>
          <button className="flex items-center gap-2 text-secondary font-body-base hover:underline transition-all">
            Exportar{' '}
            <span className="material-symbols-outlined text-[18px]">file_download</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-bright border-b border-outline-variant">
                {['Vendedor', 'Fecha', 'N° Venta', 'Monto', 'Estado'].map((h) => (
                  <th
                    key={h}
                    className={`px-6 py-4 font-label-caps text-on-surface-variant uppercase tracking-wider ${
                      h === 'Monto' ? 'text-right' : h === 'Estado' ? 'text-center' : ''
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {comisiones.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-on-surface-variant">
                    No hay comisiones registradas todavía.
                  </td>
                </tr>
              ) : (
                comisiones.map((c) => (
                  <tr key={c.id} className="hover:bg-surface-container-lowest transition-colors group">
                    <td className="px-6 py-4 text-primary font-body-base">{c.vendedor}</td>
                    <td className="px-6 py-4 text-on-surface-variant">{formatLocalDate(c.fecha)}</td>
                    <td className="px-6 py-4 font-data-mono text-on-surface-variant">{c.nroVenta}</td>
                    <td className="px-6 py-4 text-right font-data-mono text-primary font-semibold">
                      {formatCurrency(c.monto)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant={statusBadge(c.estado)}>{statusLabel(c.estado)}</Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
