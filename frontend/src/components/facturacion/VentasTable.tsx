import { useMemo, useState } from 'react';
import { formatCurrency, formatLocalDate } from '../../lib/data';
import type { Venta } from './ventas';

interface VentasTableProps {
  ventas: Venta[];
}

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

// Group ventas by facturaId (legacy rows without facturaId group by their own id).
interface GroupedVenta {
  key: string;
  numero: string;
  fecha: string;
  cantidad: number;
  totalRecibido: number;
  link: string;
  productos: string[];
}

function groupVentas(ventas: Venta[]): GroupedVenta[] {
  const map = new Map<string, GroupedVenta>();

  for (const v of ventas) {
    const key = v.facturaId || String(v.id);
    const existing = map.get(key);

    if (existing) {
      existing.cantidad += v.cantidad;
      existing.totalRecibido += v.totalRecibido;
      if (v.producto.trim() && !existing.productos.includes(v.producto.trim())) {
        existing.productos.push(v.producto.trim());
      }
    } else {
      map.set(key, {
        key,
        numero: v.numero,
        fecha: v.fecha,
        cantidad: v.cantidad,
        totalRecibido: v.totalRecibido,
        link: v.link,
        productos: [v.producto.trim()],
      });
    }
  }

  return Array.from(map.values());
}

export default function VentasTable({ ventas }: VentasTableProps) {
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const grouped = useMemo(() => groupVentas(ventas), [ventas]);

  const sorted = useMemo(() => {
    if (!sort) return grouped;
    const factor = sort.direction === 'asc' ? 1 : -1;
    return [...grouped].sort((a, b) => a.fecha.localeCompare(b.fecha) * factor);
  }, [grouped, sort]);

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
          {sorted.length} {sorted.length === 1 ? 'venta' : 'ventas'}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-bright border-b border-outline-variant">
              {['ID de venta', 'Productos', 'Fecha', 'Cant.', 'Total Recibido'].map((label) => {
                const isSortable = label === 'Fecha';
                return (
                  <th
                    key={label}
                    className={`px-6 py-4 font-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap ${
                      label === 'Cant.' || label === 'Total Recibido' ? 'text-right' : ''
                    }`}
                  >
                    {isSortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort('fecha')}
                        title="Ordenar por Fecha"
                        className="inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
                      >
                        {label}
                        <span className={`material-symbols-outlined text-base leading-none ${
                          sort?.key === 'fecha' ? 'text-primary' : 'text-on-surface-variant'
                        }`}>
                          {sort?.key === 'fecha'
                            ? sort.direction === 'asc' ? 'arrow_upward' : 'arrow_downward'
                            : 'unfold_more'}
                        </span>
                      </button>
                    ) : (
                      label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-on-surface-variant">
                  No hay ventas cargadas todavia. Usa la pestana Agregar Venta para cargar datos.
                </td>
              </tr>
            ) : (
              sorted.map((g) => (
                <tr key={g.key} className="hover:bg-surface-container-lowest transition-colors group">
                  <td className="px-6 py-4 font-data-mono text-on-surface-variant whitespace-nowrap">
                    {isValidLink(g.link) ? (
                      <a
                        href={g.link.trim()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline hover:text-on-primary-container"
                      >
                        {g.numero}
                      </a>
                    ) : (
                      g.numero
                    )}
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant">
                    {g.productos.length === 1 ? g.productos[0] : g.productos.join(', ')}
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant whitespace-nowrap">
                    {formatLocalDate(g.fecha)}
                  </td>
                  <td className="px-6 py-4 text-right font-data-mono text-on-surface-variant">{g.cantidad}</td>
                  <td className="px-6 py-4 text-right font-data-mono text-primary font-semibold whitespace-nowrap">
                    {formatCurrency(g.totalRecibido)}
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
