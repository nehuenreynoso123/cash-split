import { useState } from 'react';
import { formatCurrency, formatLocalDate } from '../../lib/data';
import type { Venta } from './ventas';

interface FacturasTableProps {
  ventas: Venta[];
}

const COLUMNS: { label: string; align?: 'right' }[] = [
  { label: 'ID de venta' },
  { label: 'Fecha' },
  { label: 'Cantidad' },
  { label: 'Nro de Factura' },
  { label: 'Fecha de Factura' },
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
// clipboard pastes straight into Excel as rows and columns. Field 8 is left
// empty on purpose (matches the column layout the user pastes into).
function buildClipboardText(ventas: Venta[]): string {
  return ventas
    .map((v) =>
      [
        v.numero,
        formatLocalDate(v.fecha),
        v.nroFactura,
        formatLocalDate(v.fechaFactura),
        formatCurrency(v.importe),
        jurisdiccionLabel(v.jurisdiccion),
        v.dniCuit || '',
        '',
        v.producto,
      ].join(';'),
    )
    .join('\r\n');
}

export default function FacturasTable({ ventas }: FacturasTableProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');

  const toggleSelected = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const selectedVentas = ventas.filter((v) => selectedIds.includes(v.id));

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
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-bright border-b border-outline-variant">
              {COLUMNS.map((c) => (
                <th
                  key={c.label || '__check__'}
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
                  No hay facturas emitidas todavía.
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
