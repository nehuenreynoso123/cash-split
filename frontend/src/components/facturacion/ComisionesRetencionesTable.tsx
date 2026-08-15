import Badge, { statusBadge, statusLabel } from '../ui/Badge';
import { formatCurrency, formatLocalDate } from '../../lib/data';
import { comisionesRetenciones } from './comisionesRetenciones';

export default function ComisionesRetencionesTable() {
  return (
    <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
      <div className="p-6 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary">request_quote</span>
          <h3 className="font-headline-md text-headline-md text-primary">
            Comisiones y Retenciones
          </h3>
        </div>
        <span className="text-on-surface-variant font-body-sm">
          {comisionesRetenciones.length} registros
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-bright border-b border-outline-variant">
              {['Tipo', 'Concepto', 'Fecha', 'Comprobante', 'Monto', 'Estado'].map((h) => (
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
            {comisionesRetenciones.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant">
                  No hay comisiones ni retenciones cargadas todavía.
                </td>
              </tr>
            ) : (
              comisionesRetenciones.map((c) => (
                <tr key={c.id} className="hover:bg-surface-container-lowest transition-colors group">
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-surface-container-low font-body-sm ${
                        c.tipo === 'comision' ? 'text-secondary' : 'text-primary'
                      }`}
                    >
                      {c.tipo === 'comision' ? 'Comisión' : 'Retención'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-primary font-body-base">{c.concepto}</td>
                  <td className="px-6 py-4 text-on-surface-variant">{formatLocalDate(c.fecha)}</td>
                  <td className="px-6 py-4 font-data-mono text-on-surface-variant">
                    {c.nroComprobante}
                  </td>
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
  );
}
