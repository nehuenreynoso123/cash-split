import { useMemo, useState } from 'react';
import { formatCurrency, formatLocalDate } from '../../lib/data';
import type { Venta } from './ventas';

interface FacturasTableProps {
  ventas: Venta[];
  onDelete: (ids: number[]) => Promise<void>;
}

interface GroupedFactura {
  key: string;
  rowIds: number[];
  numero: string;
  fecha: string;
  cantidad: number;
  nroFactura: string;
  fechaFactura: string;
  importe: number;
  jurisdiccion: Venta['jurisdiccion'];
  dniCuit: string;
  nombreApellido: string;
  productos: string[];
  nombreFactura: string;
}

const COLUMNS: { label: string; align?: 'right'; sortKey?: 'fecha' | 'fechaFactura' | 'nroFactura' }[] = [
  { label: 'ID de venta' },
  { label: 'Fecha', sortKey: 'fecha' },
  { label: 'Cantidad' },
  { label: 'Nro de Factura', sortKey: 'nroFactura' },
  { label: 'Fecha de Factura', sortKey: 'fechaFactura' },
  { label: 'Importe', align: 'right' },
  { label: 'Jurisdicción' },
  { label: 'DNI / CUIT' },
  { label: 'Nombre Apellido' },
  { label: 'Producto Vendido' },
  { label: 'Nombre' },
  { label: '' },
];

function jurisdiccionLabel(j: Venta['jurisdiccion']): string {
  const cp = j.codigoPostal.trim() ? `CP ${j.codigoPostal.trim()}` : '';
  const place = [j.localidad.trim(), j.provincia.trim()].filter(Boolean).join(', ');
  const label = [cp, place].filter(Boolean).join(' - ');
  return label || '—';
}

function groupFacturas(ventas: Venta[]): GroupedFactura[] {
  const map = new Map<string, GroupedFactura>();

  for (const v of ventas) {
    const key = v.facturaId || String(v.id);
    const existing = map.get(key);

    if (existing) {
      existing.rowIds.push(v.id);
      existing.cantidad += v.cantidad;
      existing.importe += v.importe;
      if (v.producto.trim() && !existing.productos.includes(v.producto.trim())) {
        existing.productos.push(v.producto.trim());
      }
    } else {
      map.set(key, {
        key,
        rowIds: [v.id],
        numero: v.numero,
        fecha: v.fecha,
        cantidad: v.cantidad,
        nroFactura: v.nroFactura,
        fechaFactura: v.fechaFactura,
        importe: v.importe,
        jurisdiccion: v.jurisdiccion,
        dniCuit: v.dniCuit,
        nombreApellido: v.nombreApellido,
        productos: [v.producto.trim()],
        nombreFactura: v.nombreFactura,
      });
    }
  }

  return Array.from(map.values());
}

function buildClipboardText(groups: GroupedFactura[]): string {
  return groups
    .map((g) =>
      [
        g.numero,
        formatLocalDate(g.fecha),
        g.nroFactura,
        formatLocalDate(g.fechaFactura),
        g.importe.toFixed(2),
        jurisdiccionLabel(g.jurisdiccion),
        g.dniCuit || '',
        '',
        g.productos.join(' / '),
      ].join(';'),
    )
    .join('\r\n');
}

export default function FacturasTable({ ventas, onDelete }: FacturasTableProps) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const grouped = useMemo(() => groupFacturas(ventas), [ventas]);

  const sorted = useMemo(() => {
    if (!sort) return grouped;
    const factor = sort.direction === 'asc' ? 1 : -1;
    return [...grouped].sort((a, b) => {
      if (sort.key === 'nroFactura') {
        return (Number(a.nroFactura) - Number(b.nroFactura)) * factor;
      }
      const aDate = sort.key === 'fechaFactura' ? a.fechaFactura : a.fecha;
      const bDate = sort.key === 'fechaFactura' ? b.fechaFactura : b.fecha;
      return aDate.localeCompare(bDate) * factor;
    });
  }, [grouped, sort]);

  const toggleSort = (key: string) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, direction: 'asc' };
      return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
    });
  };

  const toggleSelected = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectedGroups = sorted.filter((g) => selectedKeys.has(g.key));

  const handleCopy = async () => {
    if (selectedGroups.length === 0) return;
    try {
      await navigator.clipboard.writeText(buildClipboardText(selectedGroups));
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
    setTimeout(() => setCopyState('idle'), 2000);
  };

  const handleDelete = async () => {
    const count = selectedGroups.length;
    if (count === 0) return;
    const confirmed = window.confirm(
      count === 1
        ? '¿Borrar 1 factura? Esta acción no se puede deshacer.'
        : `¿Borrar ${count} facturas? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;
    // Collect all row IDs from selected groups
    const allIds = selectedGroups.flatMap((g) => g.rowIds);
    await onDelete(allIds);
    setSelectedKeys(new Set());
  };

  return (
    <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
      <div className="p-6 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary">receipt_long</span>
          <h3 className="font-headline-md text-headline-md text-primary">Facturas Emitidas</h3>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-on-surface-variant font-body-sm">
            {grouped.length} {grouped.length === 1 ? 'factura' : 'facturas'}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            disabled={selectedGroups.length === 0}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-primary text-on-primary font-label-lg shadow-sm hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <span className="material-symbols-outlined text-lg">
              {copyState === 'copied' ? 'check' : 'content_copy'}
            </span>
            <span>
              {copyState === 'copied'
                ? '¡Copiado!'
                : copyState === 'error'
                  ? 'Error'
                  : `Copiar (${selectedGroups.length})`}
            </span>
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={selectedGroups.length === 0}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-error text-on-error font-label-lg shadow-sm hover:bg-error/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <span className="material-symbols-outlined text-lg">delete</span>
            <span>Borrar ({selectedGroups.length})</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-bright border-b border-outline-variant">
              {COLUMNS.map((c) => {
                const sortKey = c.sortKey;
                return (
                  <th
                    key={c.label || '__check__'}
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
            {grouped.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="px-6 py-12 text-center text-on-surface-variant">
                  No hay facturas emitidas todavía.
                </td>
              </tr>
            ) : (
              sorted.map((g) => (
                <tr key={g.key} className="hover:bg-surface-container-lowest transition-colors group">
                  <td className="px-6 py-4 font-data-mono text-on-surface-variant whitespace-nowrap">
                    {g.numero}
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant whitespace-nowrap">
                    {formatLocalDate(g.fecha)}
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant">{g.cantidad}</td>
                  <td className="px-6 py-4 font-data-mono text-on-surface-variant whitespace-nowrap">
                    {g.nroFactura}
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant whitespace-nowrap">
                    {formatLocalDate(g.fechaFactura)}
                  </td>
                  <td className="px-6 py-4 text-right font-data-mono text-primary font-semibold whitespace-nowrap">
                    {formatCurrency(g.importe)}
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant">{jurisdiccionLabel(g.jurisdiccion)}</td>
                  <td className="px-6 py-4 font-data-mono text-on-surface-variant whitespace-nowrap">
                    {g.dniCuit || '—'}
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant">{g.nombreApellido}</td>
                  <td className="px-6 py-4 text-on-surface-variant">
                    {g.productos.length === 1 ? g.productos[0] : g.productos.join(' / ')}
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant whitespace-nowrap">
                    {g.nombreFactura}
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedKeys.has(g.key)}
                      onChange={() => toggleSelected(g.key)}
                      aria-label={`Seleccionar factura ${g.numero}`}
                      className="h-5 w-5 accent-secondary cursor-pointer"
                    />
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
