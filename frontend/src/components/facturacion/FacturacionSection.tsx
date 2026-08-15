import MetricCard from '../ui/MetricCard';
import Badge, { statusBadge, statusLabel } from '../ui/Badge';
import { formatCurrency, formatLocalDate } from '../../lib/data';
import { useAuthRedirect } from '../../hooks/useAuthRedirect';
import { facturas } from './facturas';

export default function FacturacionSection() {
  useAuthRedirect();

  // Sync mock data — render directly, no loading state.
  const totalEmitido = facturas.reduce((sum, f) => sum + f.monto, 0);
  const cobrado = facturas
    .filter((f) => f.estado === 'pagada')
    .reduce((sum, f) => sum + f.monto, 0);
  // Outstanding balance: pending + overdue (emitido = cobrado + pendiente).
  const pendiente = totalEmitido - cobrado;

  return (
    <div className="space-y-gutter">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
        <MetricCard
          title="Total Emitido"
          value={formatCurrency(totalEmitido)}
          icon="receipt_long"
        />
        <MetricCard
          title="Cobrado"
          value={formatCurrency(cobrado)}
          icon="payments"
          variant="primary"
        />
        <MetricCard
          title="Pendiente de Cobro"
          value={formatCurrency(pendiente)}
          icon="schedule"
        />
      </div>

      {/* Invoice list */}
      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">receipt_long</span>
            <h3 className="font-headline-md text-headline-md text-primary">Facturas Emitidas</h3>
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
                {['Número', 'Cliente', 'Fecha', 'Tipo', 'Monto', 'Estado'].map((h) => (
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
              {facturas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant">
                    No hay facturas registradas todavía.
                  </td>
                </tr>
              ) : (
                facturas.map((f) => (
                  <tr key={f.id} className="hover:bg-surface-container-lowest transition-colors group">
                    <td className="px-6 py-4 font-data-mono text-on-surface-variant">{f.numero}</td>
                    <td className="px-6 py-4 text-primary font-body-base">{f.cliente}</td>
                    <td className="px-6 py-4 text-on-surface-variant">{formatLocalDate(f.fecha)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full bg-surface-container-low text-on-surface-variant font-data-mono">
                        {f.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-data-mono text-primary font-semibold">
                      {formatCurrency(f.monto)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant={statusBadge(f.estado)}>{statusLabel(f.estado)}</Badge>
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
