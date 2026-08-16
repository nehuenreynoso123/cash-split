import { useMemo, useState } from 'react';
import { formatCurrency, formatLocalDate } from '../../lib/data';
import type { Venta } from './ventas';

interface FacturasTableProps {
  ventas: Venta[];
  onDelete: (ids: number[]) => Promise<void>;
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

// Combine the jurisdiction parts following the "CP <cp> - <localidad>, <provincia>"
// shape (e.g. "CP 7600 - Mar del Plata, Buenos Aires"), skipping empty parts.
function jurisdiccionLabel(j: Venta['jurisdiccion']): string {
  const cp = j.codigoPostal.trim() ? `CP ${j.codigoPostal.trim()}` : '';
  const place = [j.localidad.trim(), j.provincia.trim()].filter(Boolean).join(', ');
  const label = [cp, place].filter(Boolean).join(' - ');
  return label || '—';
}

// One row per invoice, semicolon-separated fields, CRLF line endings so the
// clipboard pastes straight into Excel as rows and columns. The importe is
// copied as a plain number (two decimals, no currency symbol) so Excel treats
// it as a numeric cell. Field 8 is left empty on purpose (matches the column
// layout the user pastes into).
function buildClipboardText(ventas: Venta[]): string {
  return ventas
    .map((v) =>
      [
        v.numero,
        formatLocalDate(v.fecha),
        v.nroFactura,
        formatLocalDate(v.fechaFactura),
        v.importe.toFixed(2),
        jurisdiccionLabel(v.jurisdiccion),
        v.dniCuit || '',
        '',
        v.producto,
      ].join(';'),
    )
    .join('\r\n');
}

export default function FacturasTable({ ventas, onDelete }: FacturasTableProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Display order: the original (API id ASC) order until the user clicks a
  // sortable header. ISO date strings (Fecha, Fecha de Factura) compare
  // lexicographically, which equals chronological order; Nro de Factura is a
  // numeric string, so it is compared numerically to avoid "100" < "99".
  const sortedVentas = useMemo(() => {
    if (!sort) return ventas;
    const factor = sort.direction === 'asc' ? 1 : -1;
    return [...ventas].sort((a, b) => {
      if (sort.key === 'nroFactura') {
        return (Number(a.nroFactura) - Number(b.nroFactura)) * factor;
      }
      const aDate = sort.key === 'fechaFactura' ? a.fechaFactura : a.fecha;
      const bDate = sort.key === 'fechaFactura' ? b.fechaFactura : b.fecha;
      return aDate.localeCompare(bDate) * factor;
    });
  }, [ventas, sort]);

  // Clicking a sortable header cycles asc -> desc -> asc; switching to a
  // different column restarts at asc.
  const toggleSort = (key: string) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, direction: 'asc' };
      return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
    });
  };

  const toggleSelected = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  // Selection follows the currently displayed (sorted) order so the copy
  // operation pastes the rows exactly as they appear on screen.
  const selectedVentas = sortedVentas.filter((v) => selectedIds.includes(v.id));

  const handleCopy = async () => {
    if (selectedVentas.length === 0) return;
    try {
      await navigator.clipboard.writeText(buildClipboardText(selectedVentas));
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
    setTimeout(() => setCopyState('idle'), 2000);
  };

  // Destructive action: the user must confirm before the rows are deleted.
  // Errors are surfaced by the parent (FacturacionTabs) — onDelete never
  // rejects, so the selection is always cleared once the batch ran.
  const handleDelete = async () => {
    const count = selectedVentas.length;
    if (count === 0) return;
    const confirmed = window.confirm(
      count === 1
        ? '¿Borrar 1 venta? Esta acción no se puede deshacer.'
        : `¿Borrar ${count} ventas? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;
    await onDelete(selectedIds);
    setSelectedIds([]);
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
            {ventas.length} {ventas.length === 1 ? 'factura' : 'facturas'}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            disabled={selectedVentas.length === 0}
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
                  : `Copiar (${selectedVentas.length})`}
            </span>
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={selectedVentas.length === 0}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-error text-on-error font-label-lg shadow-sm hover:bg-error/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <span className="material-symbols-outlined text-lg">delete</span>
            <span>Borrar ({selectedVentas.length})</span>
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
            {ventas.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="px-6 py-12 text-center text-on-surface-variant">
                  No hay facturas emitidas todavía.
                </td>
              </tr>
            ) : (
              sortedVentas.map((v) => (
                <tr key={v.id} className="hover:bg-surface-container-lowest transition-colors group">
                  <td className="px-6 py-4 font-data-mono text-on-surface-variant whitespace-nowrap">
                    {v.numero}
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant whitespace-nowrap">
                    {formatLocalDate(v.fecha)}
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant">{v.cantidad}</td>
                  <td className="px-6 py-4 font-data-mono text-on-surface-variant whitespace-nowrap">
                    {v.nroFactura}
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant whitespace-nowrap">
                    {formatLocalDate(v.fechaFactura)}
                  </td>
                  <td className="px-6 py-4 text-right font-data-mono text-primary font-semibold whitespace-nowrap">
                    {formatCurrency(v.importe)}
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant">{jurisdiccionLabel(v.jurisdiccion)}</td>
                  <td className="px-6 py-4 font-data-mono text-on-surface-variant whitespace-nowrap">
                    {v.dniCuit || '—'}
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant">{v.nombreApellido}</td>
                  <td className="px-6 py-4 text-on-surface-variant">{v.producto}</td>
                  <td className="px-6 py-4 text-on-surface-variant whitespace-nowrap">
                    {v.nombreFactura}
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(v.id)}
                      onChange={() => toggleSelected(v.id)}
                      aria-label={`Seleccionar venta ${v.numero}`}
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
