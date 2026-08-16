import { formatCurrency, formatLocalDate } from '../../lib/data';
import type { Venta } from './ventas';

interface ComisionesRetencionesTableProps {
  ventas: Venta[];
}

const COLUMNS: { label: string; align?: 'right' }[] = [
  { label: 'ID de venta' },
  { label: 'Fecha' },
  { label: 'Cantidad' },
  { label: 'Precio de Venta', align: 'right' },
  { label: 'Comisión por Venta', align: 'right' },
  { label: 'Comisión por Cuota', align: 'right' },
  { label: 'Envío ML', align: 'right' },
  { label: 'Envío Flex', align: 'right' },
  { label: 'Descuento', align: 'right' },
  { label: '% Descuento', align: 'right' },
  { label: 'Retenciones', align: 'right' },
  { label: 'Total Recibido', align: 'right' },
  { label: 'Producto Vendido' },
];

const moneyCell = 'px-6 py-4 text-right font-data-mono whitespace-nowrap';

export default function ComisionesRetencionesTable({ ventas }: ComisionesRetencionesTableProps) {
  return (
    <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
      <div className="p-6 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary">request_quote</span>
          <h3 className="font-headline-md text-headline-md text-primary">Comisiones y Retenciones</h3>
        </div>
        <span className="text-on-surface-variant font-body-sm">
          {ventas.length} {ventas.length === 1 ? 'venta' : 'ventas'}
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
                  No hay comisiones ni retenciones cargadas todavía.
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
                  <td className={`${moneyCell} text-primary font-semibold`}>
                    {formatCurrency(v.precioVenta)}
                  </td>
                  <td className={`${moneyCell} text-error`}>-{formatCurrency(v.comisionVenta)}</td>
                  <td className={`${moneyCell} text-error`}>-{formatCurrency(v.comisionCuota)}</td>
                  <td className={`${moneyCell} text-error`}>-{formatCurrency(v.envioML)}</td>
                  <td className={`${moneyCell} text-green-600`}>{formatCurrency(v.envioFlex)}</td>
                  <td className={`${moneyCell} text-error`}>-{formatCurrency(v.descuento)}</td>
                  <td className={`${moneyCell} text-error`}>
                    {v.precioVenta > 0
                      ? `${((v.descuento / v.precioVenta) * 100).toLocaleString('es-AR', {
                          maximumFractionDigits: 2,
                        })}%`
                      : '—'}
                  </td>
                  <td className={`${moneyCell} text-error`}>-{formatCurrency(v.retenciones)}</td>
                  <td className={`${moneyCell} text-primary font-semibold`}>
                    {formatCurrency(v.totalRecibido)}
                  </td>
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
