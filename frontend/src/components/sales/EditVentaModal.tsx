import { useState, useEffect, type FormEvent } from 'react';
import Modal from '../ui/Modal';
import { formatCurrency } from '../../lib/data';
import { listProductos, updateVentaFactura, type Producto, type VentaFactura } from '../../lib/api';
import { useSaleLines } from '../../hooks/useSaleLines';

interface EditVentaModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  sale: VentaFactura | null;
}

// SaleLine extended with edit bookkeeping. The original* snapshots drive two
// things: (a) the held-stock math for stock validation, and (b) which lines
// pass their EXACT stored total through on submit instead of a re-derived one
// (a rounded unit price round-trips into money drift: 100.00 / 3 → 33.33,
// × 3 → 99.99 on a no-op save).
interface EditRow {
  // Present only when the row came from an existing sale line (payload field).
  id?: number;
  productId: string;
  nombre: string;
  cantidad: number;
  unitPriceInput: string;
  originalProductId?: string;
  originalQuantity: number;
  originalUnitPrice: number;
  originalTotal: number;
}

const emptyRow = (): EditRow => ({
  productId: '',
  nombre: '',
  cantidad: 1,
  unitPriceInput: '',
  originalQuantity: 0,
  originalUnitPrice: 0,
  originalTotal: 0,
});

// precio in the payload is the LINE TOTAL (unit × qty) — the backend sends it
// that way too, so the unit price for the form input is derived by dividing.
const rowsFromSale = (sale: VentaFactura): EditRow[] =>
  sale.productos.map((p) => {
    const unitPrice = Math.round((p.precio / p.cantidad) * 100) / 100;
    return {
      id: p.id,
      productId: String(p.product_id),
      nombre: p.nombre,
      cantidad: p.cantidad,
      unitPriceInput: unitPrice.toString(),
      originalProductId: String(p.product_id),
      originalQuantity: p.cantidad,
      originalUnitPrice: unitPrice,
      originalTotal: p.precio,
    };
  });

export default function EditVentaModal({ open, onClose, onSaved, sale }: EditVentaModalProps) {
  const [fechaCobro, setFechaCobro] = useState('');
  const [products, setProducts] = useState<Producto[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const {
    lines: rows,
    setLines: setRows,
    updateLine: updateRow,
    addLine: addRow,
    removeLine: removeRow,
    getSelected,
    getLineTotal: getRowTotal,
    grandTotal,
    getMaxStock,
    getStockError,
    canSubmit,
  } = useSaleLines<EditRow>([emptyRow()], products, {
    newLine: emptyRow,
    // A line's own quantity is still "held" by the sale for its original
    // product, so that product can absorb up to stock + cantidad original
    // without a false stock error; any other product only has its current
    // stock available.
    heldQuantity: (line, selectedProductId) =>
      line.originalProductId === String(selectedProductId) ? line.originalQuantity : 0,
  });

  useEffect(() => {
    listProductos()
      .then(setProducts)
      .catch(() => {})
      .finally(() => setLoadingProducts(false));
  }, []);

  // Re-initialize the rows every time the modal opens for a different sale.
  // The modal always mounts with sale === null, so the mount initializer above
  // is only a placeholder — this effect is the real initializer.
  useEffect(() => {
    if (sale) {
      setRows(rowsFromSale(sale));
      setFechaCobro(sale.fecha_cobro ? sale.fecha_cobro.slice(0, 10) : '');
    } else {
      setRows([emptyRow()]);
      setFechaCobro('');
    }
    setError('');
  }, [sale]);

  // ── submit ─────────────────────────────────────────────────
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !sale) return;

    setSaving(true);
    setError('');

    try {
      await updateVentaFactura(sale.factura_id, {
        fecha_cobro: fechaCobro || null,
        items: rows.map((r) => {
          // Untouched lines keep their EXACT stored total: re-deriving it from
          // the rounded unit price drifts money (100.00 / 3 → 33.33 → 99.99).
          const unchanged =
            r.id != null &&
            r.productId === r.originalProductId &&
            r.cantidad === r.originalQuantity &&
            parseFloat(r.unitPriceInput) === r.originalUnitPrice;

          return {
            ...(r.id != null ? { id: r.id } : {}),
            product_id: Number(r.productId),
            cantidad: r.cantidad,
            precio: unchanged
              ? r.originalTotal
              : Math.round(r.cantidad * (parseFloat(r.unitPriceInput) || 0) * 100) / 100,
          };
        }),
      });

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Editar Venta" maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="p-8 space-y-6">
        {error && (
          <div className="bg-error-container text-on-error-container text-body-sm rounded-lg px-4 py-2">
            {error}
          </div>
        )}

        {/* ── Fecha de cobro ───────────────────────────────── */}
        <div className="space-y-2">
          <label className="font-label-caps text-on-surface-variant uppercase">Fecha de Cobro</label>
          <input
            type="date"
            value={fechaCobro}
            onChange={(e) => setFechaCobro(e.target.value)}
            className="w-full h-12 border border-outline-variant rounded-xl px-4 focus:ring-2 focus:ring-secondary outline-none transition-all"
          />
        </div>

        {/* ── Product rows ─────────────────────────────────── */}
        {rows.map((item, idx) => {
          const selected = getSelected(item.productId);
          const productMissing = !!item.productId && !selected;
          const held = item.originalProductId === item.productId ? item.originalQuantity : 0;
          const maxStock = getMaxStock(item);
          const stockErr = getStockError(item);
          const rowTotal = getRowTotal(item);

          return (
            <div
              key={item.id ?? `new-${idx}`}
              className="space-y-4 p-4 bg-surface-container rounded-xl border border-outline-variant/50"
            >
              <div className="flex items-center justify-between">
                <span className="font-label-caps text-on-surface-variant uppercase text-xs">
                  Producto {idx + 1}
                </span>
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
                    className="text-on-surface-variant hover:text-error transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                )}
              </div>

              {/* Product selector */}
              <div className="space-y-2">
                <label className="font-label-caps text-on-surface-variant uppercase">
                  Seleccionar Producto
                </label>
                <div className="relative">
                  <select
                    className="w-full h-12 bg-white border border-outline-variant rounded-xl px-4 appearance-none focus:ring-2 focus:ring-secondary transition-all cursor-pointer"
                    value={item.productId}
                    onChange={(e) => {
                      const p = products.find((x) => x.id.toString() === e.target.value);
                      // Keep the current quantity (unlike SaleForm: this line
                      // already has one) but prefill the sale price with the
                      // newly selected product's current price.
                      updateRow(idx, {
                        productId: e.target.value,
                        unitPriceInput: p?.precio?.toString() ?? '',
                      });
                    }}
                    disabled={productMissing}
                    required
                  >
                    <option disabled value="">
                      Elegir producto...
                    </option>
                    {loadingProducts ? (
                      <option disabled>Cargando productos...</option>
                    ) : (
                      <>
                        {/* Current product that no longer exists in the catalog: keep
                            the row visible with its stored name instead of a raw id */}
                        {productMissing && (
                          <option value={item.productId} disabled>
                            {item.nombre} (No disponible)
                          </option>
                        )}
                        {products.filter((p) => p.stock > 0 || p.id.toString() === item.productId).length === 0 &&
                          !productMissing && (
                            <option disabled>No hay productos con stock</option>
                          )}
                        {products
                          .filter((p) => p.stock > 0 || p.id.toString() === item.productId)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nombre} (Stock: {p.stock + (p.id.toString() === item.productId ? held : 0)})
                            </option>
                          ))}
                      </>
                    )}
                  </select>
                  <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">
                    expand_more
                  </span>
                </div>
                {productMissing && (
                  <p className="text-error text-body-sm">
                    {item.nombre}: producto no disponible — solo se puede ajustar el precio
                  </p>
                )}
              </div>

              {/* Quantity + Price + Subtotal */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="font-label-caps text-on-surface-variant uppercase">Cantidad</label>
                  <div className="relative group">
                    <input
                      className={`w-full h-12 border rounded-xl px-4 focus:ring-2 focus:ring-secondary outline-none transition-all ${
                        stockErr ? 'border-error bg-error-container/20' : 'border-outline-variant'
                      }`}
                      type="number"
                      min={1}
                      max={maxStock}
                      value={item.cantidad}
                      onChange={(e) => updateRow(idx, { cantidad: parseInt(e.target.value) || 0 })}
                      disabled={!item.productId || productMissing}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-body-sm group-focus-within:text-secondary">
                      Uds
                    </span>
                  </div>
                  {stockErr && (
                    <p className="text-error text-body-sm">Max disponible: {maxStock}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="font-label-caps text-on-surface-variant uppercase">
                    Precio Venta
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-data-mono">$</span>
                    <input
                      className="w-full h-12 border border-outline-variant rounded-xl pl-8 pr-4 focus:ring-2 focus:ring-secondary outline-none font-data-mono transition-all"
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unitPriceInput}
                      onChange={(e) => updateRow(idx, { unitPriceInput: e.target.value })}
                      disabled={!item.productId}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="font-label-caps text-on-surface-variant uppercase">
                    Subtotal
                  </label>
                  <div className="h-12 border border-outline-variant/50 rounded-xl px-4 flex items-center bg-surface-container-low font-data-mono text-primary font-semibold">
                    {formatCurrency(rowTotal)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* ── Add product button ──────────────────────────── */}
        <button
          type="button"
          onClick={addRow}
          className="w-full h-12 border-2 border-dashed border-outline-variant rounded-xl flex items-center justify-center gap-2 text-on-surface-variant hover:border-secondary hover:text-secondary transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Agregar otro producto
        </button>

        {/* ── Grand total ─────────────────────────────────── */}
        <div className="p-6 bg-surface-container rounded-xl flex justify-between items-center">
          <span className="font-headline-md text-headline-md text-primary">Total Venta</span>
          <span className="font-data-mono text-display-lg text-secondary">
            {formatCurrency(grandTotal)}
          </span>
        </div>

        {/* ── Footer ──────────────────────────────────────── */}
        <div className="pt-4 flex gap-3">
          <button
            type="button"
            className="flex-1 px-6 py-3 border border-outline-variant text-on-surface-variant font-semibold rounded-lg hover:bg-surface-container-low transition-all"
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!canSubmit || saving}
            className="flex-1 px-6 py-3 bg-secondary text-on-secondary font-semibold rounded-lg hover:bg-secondary-container transition-all shadow-md active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </Modal>
  );
}