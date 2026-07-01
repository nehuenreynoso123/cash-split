import { formatCurrency } from '../../lib/data';
import type { TotalCaja } from '../../lib/api';

interface Props {
  rows: TotalCaja[];
}

export default function CapitalTable({ rows }: Props) {
  const totals = rows.reduce(
    (acc, r) => ({
      unidades_vendidas: acc.unidades_vendidas + Number(r.unidades_vendidas),
      costo_invertido_stock: acc.costo_invertido_stock + Number(r.costo_invertido_stock),
      ingresos_totales: acc.ingresos_totales + Number(r.ingresos_totales),
      costo_reposicion_total: acc.costo_reposicion_total + Number(r.costo_reposicion_total),
      ganancia_real_total: acc.ganancia_real_total + Number(r.ganancia_real_total),
    }),
    { unidades_vendidas: 0, costo_invertido_stock: 0, ingresos_totales: 0, costo_reposicion_total: 0, ganancia_real_total: 0 }
  );

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center">
        <div>
          <h3 className="font-headline-md text-headline-md text-primary">
            Análisis Total Cajas
          </h3>
          <p className="text-body-sm text-on-surface-variant">
            Desglose detallado por línea de producto y rentabilidad.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 text-body-sm font-semibold text-primary border border-outline-variant rounded-lg hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-lg">filter_alt</span>
            Filtrar
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-body-sm font-semibold text-on-primary bg-secondary rounded-lg hover:opacity-90 transition-opacity active:scale-[0.98]">
            <span className="material-symbols-outlined text-lg">download</span>
            Exportar
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-surface-container-low">
            <tr>
              {['Producto', 'Unidades Vendidas', 'Costo Invertido', 'Ingresos Totales', 'Costo Reposición', 'Ganancia Real'].map(
                (h) => (
                  <th
                    key={h}
                    className={`px-6 py-3 font-label-caps text-label-caps text-on-surface-variant uppercase ${
                      h !== 'Producto' ? 'text-right' : ''
                    }`}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant">
                  No hay datos de cajas disponibles.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.producto_id} className="hover:bg-surface-container-lowest transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined">inventory_2</span>
                      </div>
                      <span className="font-semibold text-primary">{row.producto}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-data-mono">
                    {Number(row.unidades_vendidas).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right font-data-mono text-primary font-bold">
                    {formatCurrency(Number(row.costo_invertido_stock))}
                  </td>
                  <td className="px-6 py-4 text-right font-data-mono">
                    {formatCurrency(Number(row.ingresos_totales))}
                  </td>
                  <td className="px-6 py-4 text-right font-data-mono text-on-surface-variant">
                    {formatCurrency(Number(row.costo_reposicion_total))}
                  </td>
                  <td className="px-6 py-4 text-right font-data-mono text-green-600 font-bold">
                    +{formatCurrency(Number(row.ganancia_real_total))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot className="bg-surface-container-high border-t-2 border-primary">
            <tr>
              <td className="px-6 py-4 font-bold text-primary">Total</td>
              <td className="px-6 py-4 text-right font-bold font-data-mono">
                {totals.unidades_vendidas.toLocaleString()}
              </td>
              <td className="px-6 py-4 text-right font-bold font-data-mono text-primary">
                {formatCurrency(totals.costo_invertido_stock)}
              </td>
              <td className="px-6 py-4 text-right font-bold font-data-mono">
                {formatCurrency(totals.ingresos_totales)}
              </td>
              <td className="px-6 py-4 text-right font-bold font-data-mono">
                {formatCurrency(totals.costo_reposicion_total)}
              </td>
              <td className="px-6 py-4 text-right font-bold font-data-mono text-secondary">
                +{formatCurrency(totals.ganancia_real_total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
