import { useState, type FormEvent } from 'react';
import { formatCurrency, todayISO } from '../../lib/data';
import type { Venta } from './ventas';

interface AgregarVentaFormProps {
  onAddVenta: (draft: Omit<Venta, 'id' | 'numero'>) => void;
}

export default function AgregarVentaForm({ onAddVenta }: AgregarVentaFormProps) {
  const [cliente, setCliente] = useState('');
  const [producto, setProducto] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [precioInput, setPrecioInput] = useState('');
  const [fecha, setFecha] = useState(todayISO);
  const [tipo, setTipo] = useState<Venta['tipo']>('B');
  const [estado, setEstado] = useState<Venta['estado']>('pendiente');
  const [done, setDone] = useState(false);

  const precio = parseFloat(precioInput) || 0;
  const total = precio * cantidad;
  const invalid =
    !cliente.trim() || !producto.trim() || cantidad < 1 || !fecha || precio <= 0;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (invalid) return;

    onAddVenta({
      cliente: cliente.trim(),
      producto: producto.trim(),
      cantidad,
      monto: total,
      fecha,
      tipo,
      estado,
    });

    setDone(true);

    setTimeout(() => {
      setDone(false);
      setCliente('');
      setProducto('');
      setCantidad(1);
      setPrecioInput('');
      setFecha(todayISO());
      setTipo('B');
      setEstado('pendiente');
    }, 2000);
  };

  return (
    <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
      <div className="p-6 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary">add_circle</span>
          <h3 className="font-headline-md text-headline-md text-primary">Agregar Venta</h3>
        </div>
        <span className="text-on-surface-variant font-body-sm">Datos locales</span>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="font-label-caps text-on-surface-variant uppercase">Cliente</label>
            <input
              type="text"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              placeholder="Nombre del cliente"
              required
              className="w-full h-12 border border-outline-variant rounded-xl px-4 focus:ring-2 focus:ring-secondary outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="font-label-caps text-on-surface-variant uppercase">
              Producto / Concepto
            </label>
            <input
              type="text"
              value={producto}
              onChange={(e) => setProducto(e.target.value)}
              placeholder="Producto o concepto de la venta"
              required
              className="w-full h-12 border border-outline-variant rounded-xl px-4 focus:ring-2 focus:ring-secondary outline-none transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="font-label-caps text-on-surface-variant uppercase">Cantidad</label>
            <div className="relative group">
              <input
                type="number"
                min={1}
                value={cantidad}
                onChange={(e) => setCantidad(parseInt(e.target.value) || 0)}
                className="w-full h-12 border border-outline-variant rounded-xl px-4 focus:ring-2 focus:ring-secondary outline-none transition-all"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-body-sm group-focus-within:text-secondary">
                Uds
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <label className="font-label-caps text-on-surface-variant uppercase">
              Precio Unitario
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-data-mono">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={precioInput}
                onChange={(e) => setPrecioInput(e.target.value)}
                placeholder="0.00"
                required
                className="w-full h-12 border border-outline-variant rounded-xl pl-8 pr-4 focus:ring-2 focus:ring-secondary outline-none font-data-mono transition-all"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="font-label-caps text-on-surface-variant uppercase">Fecha</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full h-12 border border-outline-variant rounded-xl px-4 focus:ring-2 focus:ring-secondary outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="font-label-caps text-on-surface-variant uppercase">Tipo</label>
            <div className="relative">
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as Venta['tipo'])}
                className="w-full h-12 bg-white border border-outline-variant rounded-xl px-4 appearance-none focus:ring-2 focus:ring-secondary transition-all cursor-pointer"
              >
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
              </select>
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">
                expand_more
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <label className="font-label-caps text-on-surface-variant uppercase">Estado</label>
            <div className="relative">
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value as Venta['estado'])}
                className="w-full h-12 bg-white border border-outline-variant rounded-xl px-4 appearance-none focus:ring-2 focus:ring-secondary transition-all cursor-pointer"
              >
                <option value="pagada">Pagada</option>
                <option value="pendiente">Pendiente</option>
                <option value="vencida">Vencida</option>
              </select>
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">
                expand_more
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 bg-surface-container rounded-xl flex justify-between items-center mt-4">
          <span className="font-headline-md text-headline-md text-primary">Total</span>
          <span className="font-data-mono text-display-lg text-secondary">
            {formatCurrency(total)}
          </span>
        </div>

        <button
          type="submit"
          disabled={invalid}
          className={`w-full h-14 font-bold rounded-xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg ${
            done
              ? 'bg-primary text-on-primary'
              : 'bg-secondary text-on-secondary hover:bg-secondary-container shadow-secondary/10'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {done ? (
            <>
              <span className="material-symbols-outlined">done_all</span>
              ¡Venta Cargada!
            </>
          ) : (
            <>
              <span className="material-symbols-outlined">check_circle</span>
              Cargar Venta
            </>
          )}
        </button>
      </form>
    </section>
  );
}
