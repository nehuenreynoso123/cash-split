import { useMemo, useState } from 'react';
import { formatCurrency, formatLocalDate } from '../../lib/data';
import type { Venta } from './ventas';

interface VentasTableProps {
  ventas: Venta[];
}

const COLUMNS: { label: string; align?: 'right'; sortKey?: 'fecha' }[] = [
  { label: 'ID de venta' },
  { label: 'Producto Vendido' },
  { label: 'Fecha', sortKey: 'fecha' },
  { label: 'Cantidad' },
  { label: 'Total Recibido', align: 'right' },
];

// A sale link is rendered as a clickable anchor only when it is a non-empty,
// parseable http(s) URL; anything else falls back to plain text.
function isValidLink(value: string): boolean {
  if (!value.trim()) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function VentasTable({ ventas }: VentasTableProps) {
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Display order: the original (API id ASC) order until the user clicks a
  // sortable header. ISO date strings compare lexicographically, which equals
  // chronological order.
  const sortedVentas = useMemo(() => {
    if (!sort) return ventas;
    const factor = sort.direction === 'asc' ? 1 : -1;
    return [...ventas].sort((a, b) => a.fecha.localeCompare(b.fecha) * factor);
  }, [ventas, sort]);

  // Clicking a sortable header cycles asc -> desc -> asc; switching to a
  // different column restarts at asc.
  const toggleSort = (key: string) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, direction: 'asc' };
      return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
    });
  };

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
              {COLUMNS.map((c) => {
                const sortKey = c.sortKey;
                return (
                  <th
                    key={c.label}
                    aria-sort={
                      sort && sortKey && sort.key === sortKey
                        ? sort.direction === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : undefined
                    }
                    className={`px-6 py-4 font-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap ${
                      c.align === 'right' ? 'text-right' : ''
                    }`}
                  >
                    {sortKey ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(sortKey)}
                        title={`Ordenar por ${c.label}`}
                        aria-label={`Ordenar por ${c.label}`}
                        className="inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
                      >
                        {c.label}
                        <span
                          aria-hidden="true"
                          className={`material-symbols-outlined text-base leading-none ${
                            sort && sort.key === sortKey ? 'text-primary' : 'text-on-surface-variant'
                          }`}
                        >
                          {sort && sort.key === sortKey
                            ? sort.direction === 'asc'
                              ? 'arrow_upward'
                              : 'arrow_downward'
                            : 'unfold_more'}
                        </span>
                      </button>
                    ) : (
                      c.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30">
            {ventas.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="px-6 py-12 text-center text-on-surface-variant">
                  No hay ventas cargadas todavía. Usá la pestaña Agregar Venta para cargar datos.
                </td>
              </tr>
            ) : (
              sortedVentas.map((v) => (
                <tr key={v.id} className="hover:bg-surface-container-lowest transition-colors group">
                  <td className="px-6 py-4 font-data-mono text-on-surface-variant whitespace-nowrap">
                    {isValidLink(v.link) ? (
                      <a
                        href={v.link.trim()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline hover:text-on-primary-container"
                      >
                        {v.numero}
                      </a>
                    ) : (
                      v.numero
                    )}
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant">{v.producto}</td>
                  <td className="px-6 py-4 text-on-surface-variant whitespace-nowrap">
                    {formatLocalDate(v.fecha)}
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant">{v.cantidad}</td>
                  <td className="px-6 py-4 text-right font-data-mono text-primary font-semibold whitespace-nowrap">
                    {formatCurrency(v.totalRecibido)}
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
