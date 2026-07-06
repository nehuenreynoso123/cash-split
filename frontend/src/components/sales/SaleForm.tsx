import { useState, useEffect, type FormEvent } from 'react';
import { formatCurrency } from '../../lib/data';
import { listProductos, createVenta, type Producto } from '../../lib/api';

interface SaleFormProps {
  onSaleComplete: () => void;
}

type ProductOption = Producto & { _stock: number };

export default function SaleForm({ onSaleComplete }: SaleFormProps) {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [productId, setProductId] = useState('');
  const [unitPriceInput, setUnitPriceInput] = useState('');
  const [quantity, setQuantity] = useState(1);
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

  const selected = products.find((p) => p.id.toString() === productId);
  const unitPrice = parseFloat(unitPriceInput) || 0;
  const maxStock = selected?.stock ?? 0;
  const total = unitPrice * quantity;
  const stockError = quantity > maxStock;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected || stockError || quantity < 1) return;

    setSubmitting(true);

    try {
      await createVenta({
        nombre: selected.nombre,
        precio: total,
        product_id: selected.id,
        cantidad: quantity,
        fecha_cobro: fechaCobro || null,
      });

      setDone(true);
      onSaleComplete();

      setTimeout(() => {
        setDone(false);
        setProductId('');
        setUnitPriceInput('');
        setQuantity(1);
        setFechaCobro(new Date().toISOString().split('T')[0]);
      }, 2000);
    } catch {
      // error silencioso por ahora
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
        <div className="space-y-2">
          <label className="font-label-caps text-on-surface-variant uppercase">
            Seleccionar Producto
          </label>
          <div className="relative">
            <select
              className="w-full h-12 bg-white border border-outline-variant rounded-xl px-4 appearance-none focus:ring-2 focus:ring-secondary transition-all cursor-pointer"
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                setQuantity(1);
                const p = products.find((x) => x.id.toString() === e.target.value);
                setUnitPriceInput(p?.precio?.toString() ?? '');
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

        <div className="space-y-2">
          <label className="font-label-caps text-on-surface-variant uppercase">Fecha de Cobro</label>
          <input
            type="date"
            value={fechaCobro}
            onChange={(e) => setFechaCobro(e.target.value)}
            className="w-full h-12 border border-outline-variant rounded-xl px-4 focus:ring-2 focus:ring-secondary outline-none transition-all"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="font-label-caps text-on-surface-variant uppercase">Cantidad</label>
            <div className="relative group">
              <input
                className={`w-full h-12 border rounded-xl px-4 focus:ring-2 focus:ring-secondary outline-none transition-all ${
                  stockError ? 'border-error bg-error-container/20' : 'border-outline-variant'
                }`}
                type="number"
                min={1}
                max={maxStock}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                disabled={!selected}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-body-sm group-focus-within:text-secondary">
                Uds
              </span>
            </div>
            {stockError && (
              <p className="text-error text-body-sm">Máximo disponible: {maxStock}</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="font-label-caps text-on-surface-variant uppercase">Precio Venta Unidad</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-data-mono">$</span>
              <input
                className="w-full h-12 border border-outline-variant rounded-xl pl-8 pr-4 focus:ring-2 focus:ring-secondary outline-none font-data-mono transition-all"
                type="number"
                step="0.01"
                min="0"
                value={unitPriceInput}
                onChange={(e) => setUnitPriceInput(e.target.value)}
                disabled={!selected}
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        <div className="p-6 bg-surface-container rounded-xl flex justify-between items-center mt-4">
          <span className="font-headline-md text-headline-md text-primary">Total Venta</span>
          <span className="font-data-mono text-display-lg text-secondary">
            {formatCurrency(total)}
          </span>
        </div>

        <button
          type="submit"
          disabled={!selected || stockError || submitting || quantity < 1}
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
              ¡Venta Registrada!
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
