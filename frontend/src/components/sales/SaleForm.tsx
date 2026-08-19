import { useState, useEffect, type FormEvent } from 'react';
import { formatCurrency } from '../../lib/data';
import { listProductos, createFactura, type Producto } from '../../lib/api';
import { useAuthRedirect } from '../../hooks/useAuthRedirect';

interface SaleFormProps {
  onSaleComplete: () => void;
}

type ProductOption = Producto & { _stock: number };

interface SaleItem {
  productId: string;
  unitPriceInput: string;
  quantity: number;
}

const emptyItem = (): SaleItem => ({
  productId: '',
  unitPriceInput: '',
  quantity: 1,
});

export default function SaleForm({ onSaleComplete }: SaleFormProps) {
  useAuthRedirect();
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [items, setItems] = useState<SaleItem[]>([emptyItem()]);
  const [fechaCobro, setFechaCobro] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    listProductos()
      .then((list) => setProducts(list))
      .catch(() => {})
      .finally(() => setLoadingProducts(false));
  }, []);

  // ── helpers ────────────────────────────────────────────────
  const updateItem = (index: number, patch: Partial<SaleItem>) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

  const getSelected = (productId: string) => products.find((p) => p.id.toString() === productId);

  const getItemTotal = (item: SaleItem) => {
    const price = parseFloat(item.unitPriceInput) || 0;
    return price * item.quantity;
  };

  const grandTotal = items.reduce((sum, it) => sum + getItemTotal(it), 0);

  // stock error per item
  const getStockError = (item: SaleItem) => {
    const sel = getSelected(item.productId);
    if (!sel) return false;
    return item.quantity > sel.stock;
  };

  const hasStockError = items.some(getStockError);

  // can submit?
  const canSubmit =
    items.length > 0 &&
    items.every((it) => it.productId && it.quantity >= 1 && parseFloat(it.unitPriceInput) > 0) &&
    !hasStockError;

  // ── submit ─────────────────────────────────────────────────
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);

    try {
      const factura_id = crypto.randomUUID();

      await createFactura({
        factura_id,
        fecha_cobro: fechaCobro || null,
        items: items.map((it) => ({
          product_id: Number(it.productId),
          cantidad: it.quantity,
          precio: getItemTotal(it),
        })),
      });

      setDone(true);
      onSaleComplete();

      setTimeout(() => {
        setDone(false);
        setItems([emptyItem()]);
        setFechaCobro(new Date().toISOString().split('T')[0]);
      }, 2000);
    } catch {
      // error silencioso
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="lg:col-span-5 bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
      <div className="p-6 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary">add_shopping_cart</span>
          <h3 className="font-headline-md text-headline-md text-primary">Nueva Venta</h3>
        </div>
        <span className="text-on-surface-variant font-body-sm">
          ID: #VNT-{String(Date.now()).slice(-4)}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-6">
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
        {items.map((item, idx) => {
          const selected = getSelected(item.productId);
          const maxStock = selected?.stock ?? 0;
          const stockErr = getStockError(item);
          const rowTotal = getItemTotal(item);

          return (
            <div
              key={idx}
              className="space-y-4 p-4 bg-surface-container rounded-xl border border-outline-variant/50"
            >
              <div className="flex items-center justify-between">
                <span className="font-label-caps text-on-surface-variant uppercase text-xs">
                  Producto {idx + 1}
                </span>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
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
                      updateItem(idx, {
                        productId: e.target.value,
                        quantity: 1,
                        unitPriceInput: p?.precio?.toString() ?? '',
                      });
                    }}
                    required
                  >
                    <option disabled value="">
                      Elegir producto...
                    </option>
                    {loadingProducts ? (
                      <option disabled>Cargando productos...</option>
                    ) : products.filter((p) => p.stock > 0).length === 0 ? (
                      <option disabled>No hay productos con stock</option>
                    ) : (
                      products
                        .filter((p) => p.stock > 0)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombre} (Stock: {p.stock})
                          </option>
                        ))
                    )}
                  </select>
                  <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">
                    expand_more
                  </span>
                </div>
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
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, { quantity: parseInt(e.target.value) || 0 })}
                      disabled={!item.productId}
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
                      onChange={(e) => updateItem(idx, { unitPriceInput: e.target.value })}
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
          onClick={addItem}
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

        {/* ── Submit ──────────────────────────────────────── */}
        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className={`w-full h-14 font-bold rounded-xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg ${
            done
              ? 'bg-primary text-on-primary'
              : 'bg-secondary text-on-secondary hover:bg-secondary-container shadow-secondary/10'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {submitting ? (
            <>
              <span className="material-symbols-outlined animate-spin">sync</span>
              Procesando...
            </>
          ) : done ? (
            <>
              <span className="material-symbols-outlined">done_all</span>
              Venta Registrada!
            </>
          ) : (
            <>
              <span className="material-symbols-outlined">check_circle</span>
              Registrar Venta
            </>
          )}
        </button>
      </form>
    </section>
  );
}
