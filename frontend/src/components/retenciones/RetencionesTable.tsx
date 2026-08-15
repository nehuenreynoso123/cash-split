import Badge, { statusBadge, statusLabel } from '../ui/Badge';
import { formatCurrency, formatLocalDate } from '../../lib/data';
import { retenciones } from './retenciones';

export default function RetencionesTable() {
  return (
    <div className="space-y-gutter">
      {/* Withholdings list */}
      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">account_balance</span>
            <h3 className="font-headline-md text-headline-md text-primary">Retenciones</h3>
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
                {['Tipo', 'Razón Social', 'Fecha', 'Comprobante', 'Monto', 'Estado'].map((h) => (
                  <th
                    key={h}
                    className={`px-6 py-4 font-label-caps text-on-surface-variant uppercase tracking-wider ${
                      h === 'Tipo' || h === 'Estado' ? 'text-center' : h === 'Monto' ? 'text-right' : ''
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {retenciones.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant">
                    No hay retenciones registradas todavía.
                  </td>
                </tr>
              ) : (
                retenciones.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-container-lowest transition-colors group">
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full bg-surface-container-low text-on-surface-variant font-data-mono">
                        {r.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-primary font-body-base">{r.razonSocial}</td>
                    <td className="px-6 py-4 text-on-surface-variant">{formatLocalDate(r.fecha)}</td>
                    <td className="px-6 py-4 font-data-mono text-on-surface-variant">{r.nroComprobante}</td>
                    <td className="px-6 py-4 text-right font-data-mono text-primary font-semibold">
                      {formatCurrency(r.monto)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant={statusBadge(r.estado)}>{statusLabel(r.estado)}</Badge>
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
