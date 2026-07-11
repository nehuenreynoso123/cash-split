import { useState, useEffect } from 'react';

function toRaw(value: string): string {
  // Argentine format: dots = thousand separators (remove), commas = decimal (normalize to dot)
  const cleaned = value.replace(/[^\d.,]/g, '');
  const withoutDots = cleaned.replace(/\./g, '');
  return withoutDots.replace(/,/g, '.');
}

function toDisplay(raw: string): string {
  if (!raw || raw === '.') return raw;
  const dotIndex = raw.indexOf('.');
  if (dotIndex === -1) {
    return raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  const intPart = raw.slice(0, dotIndex);
  const decPart = raw.slice(dotIndex + 1);
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + decPart;
}

function numChange(e: React.ChangeEvent<HTMLInputElement>, setter: (v: string) => void) {
  setter(toRaw(e.target.value));
}

function numVal(raw: string): string {
  return toDisplay(raw);
}

export default function CalculadoraClient() {
  // USDT → ARS
  const [valorUsdt, setValorUsdt] = useState('');
  const [cantidadUsdt, setCantidadUsdt] = useState('');
  const [resultadoArs, setResultadoArs] = useState<number | null>(null);

  // Costo USDT → Ganancia ARS
  const [costoUsdt, setCostoUsdt] = useState('');
  const [valorUsdt2, setValorUsdt2] = useState('');
  const [ventaArs, setVentaArs] = useState('');
  const [gananciaArs, setGananciaArs] = useState<number | null>(null);
  const [porcentajeGanancia, setPorcentajeGanancia] = useState<number | null>(null);

  // Ganancia
  const [precioCosto, setPrecioCosto] = useState('');
  const [precioVenta, setPrecioVenta] = useState('');
  const [ganancia, setGanancia] = useState<number | null>(null);
  const [porcentaje, setPorcentaje] = useState<number | null>(null);

  // Bloc de Notas
  const [notas, setNotas] = useState(() => {
    try { return localStorage.getItem('calculadora-notas') ?? ''; } catch { return ''; }
  });

  useEffect(() => {
    try { localStorage.setItem('calculadora-notas', notas); } catch { /* noop */ }
  }, [notas]);

  const limpiarNotas = () => setNotas('');

  // % del Costo
  const [porcentajeCosto, setPorcentajeCosto] = useState('');
  const [costoBase, setCostoBase] = useState('');
  const [resultadoPorcentajeCosto, setResultadoPorcentajeCosto] = useState<number | null>(null);

  // Guardar datos
  const [nombreProducto, setNombreProducto] = useState('');

  // Productos calculados
  interface ProductoCalculado {
    id: number;
    nombre: string;
    costo: number;
    ganancia: number;
    porcentajeGanancia: number;
    usdt: string;
    cantidadUsdt: string;
  }
  const [productos, setProductos] = useState<ProductoCalculado[]>(() => {
    try { return JSON.parse(localStorage.getItem('calculadora-productos') ?? '[]'); } catch { return []; }
  });
  const [nextId, setNextId] = useState(() => {
    try { return JSON.parse(localStorage.getItem('calculadora-productos-nextid') ?? '1'); } catch { return 1; }
  });

  useEffect(() => {
    try { localStorage.setItem('calculadora-productos', JSON.stringify(productos)); } catch { /* noop */ }
  }, [productos]);

  useEffect(() => {
    try { localStorage.setItem('calculadora-productos-nextid', JSON.stringify(nextId)); } catch { /* noop */ }
  }, [nextId]);

  const calcularUsdtAArs = () => {
    const v = parseFloat(valorUsdt);
    const c = parseFloat(cantidadUsdt);
    if (isNaN(v) || isNaN(c) || c === 0) return;
    setResultadoArs(v * c);
  };

  const limpiarUsdtAArs = () => {
    setValorUsdt('');
    setCantidadUsdt('');
    setResultadoArs(null);
  };

  const calcularCostoEnUsdt = () => {
    const costo = parseFloat(costoUsdt);
    const usdt = parseFloat(valorUsdt2);
    const venta = parseFloat(ventaArs);
    if (isNaN(costo) || isNaN(usdt) || isNaN(venta) || usdt === 0) return;
    const costoEnArs = costo * usdt;
    const ganancia = venta - costoEnArs;
    setGananciaArs(ganancia);
    setPorcentajeGanancia((ganancia / costoEnArs) * 100);
  };

  const limpiarCostoUsdt = () => {
    setCostoUsdt('');
    setValorUsdt2('');
    setVentaArs('');
    setGananciaArs(null);
    setPorcentajeGanancia(null);
  };

  const calcularPorcentajeCosto = () => {
    const p = parseFloat(porcentajeCosto);
    const c = parseFloat(costoBase);
    if (isNaN(p) || isNaN(c)) return;
    setResultadoPorcentajeCosto(c * (p / 100));
  };

  const limpiarPorcentajeCosto = () => {
    setPorcentajeCosto('');
    setCostoBase('');
    setResultadoPorcentajeCosto(null);
  };

  const calcularGanancia = () => {
    const costo = parseFloat(precioCosto);
    const venta = parseFloat(precioVenta);
    if (isNaN(costo) || isNaN(venta) || costo === 0) return;
    const diff = venta - costo;
    setGanancia(diff);
    setPorcentaje((diff / costo) * 100);
  };

  const limpiarGanancia = () => {
    setPrecioCosto('');
    setPrecioVenta('');
    setGanancia(null);
    setPorcentaje(null);
  };

  const resolverNombreDuplicado = (nombre: string, productos: ProductoCalculado[]): string => {
    const existe = productos.some(p => p.nombre === nombre);
    if (!existe) return nombre;
    let i = 1;
    while (productos.some(p => p.nombre === `${nombre} ${i}`)) i++;
    return `${nombre} ${i}`;
  };

  const guardarProducto = () => {
    if (!nombreProducto) return;
    const costoTotal = Number(costoUsdt) * Number(valorUsdt2);
    if (isNaN(costoTotal) || costoTotal === 0) return;
    const gananciaVal = gananciaArs ?? 0;
    const porcVal = porcentajeGanancia ?? 0;
    const nombreResuelto = resolverNombreDuplicado(nombreProducto, productos);
    setProductos(prev => [...prev, {
      id: nextId,
      nombre: nombreResuelto,
      costo: costoTotal,
      ganancia: gananciaVal,
      porcentajeGanancia: porcVal,
      usdt: costoUsdt,
      cantidadUsdt: valorUsdt2,
    }]);
    setNextId(prev => prev + 1);
    setNombreProducto('');
  };

  const modificarProducto = () => {
    if (!nombreProducto) return;
    const idx = productos.findIndex(p => p.nombre === nombreProducto);
    if (idx === -1) return;
    const costoTotal = Number(costoUsdt) * Number(valorUsdt2);
    if (isNaN(costoTotal) || costoTotal === 0) return;
    const gananciaVal = gananciaArs ?? 0;
    const porcVal = porcentajeGanancia ?? 0;
    setProductos(prev => prev.map((p, i) => i === idx ? {
      ...p,
      costo: costoTotal,
      ganancia: gananciaVal,
      porcentajeGanancia: porcVal,
      usdt: costoUsdt,
      cantidadUsdt: valorUsdt2,
    } : p));
    setNombreProducto('');
  };

  const eliminarProducto = (id: number) => {
    setProductos(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
      {/* ── Columna 1: USDT → ARS + % del Costo ── */}
      <div class="flex flex-col gap-4">
        {/* USDT → ARS */}
        <div class="p-6 bg-surface rounded-2xl shadow-md">
          <div class="flex items-center justify-between mb-5">
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-2xl text-secondary">currency_exchange</span>
              <h2 class="font-headline-md font-bold text-on-surface">USDT → ARS</h2>
            </div>
            <button
              onClick={limpiarUsdtAArs}
              class="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-all duration-200"
              title="Limpiar campos"
            >
              <span class="material-symbols-outlined text-[20px]">refresh</span>
            </button>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block font-body-base font-medium text-on-surface mb-1.5">Valor del USDT ($)</label>
              <input
                type="text"
                inputMode="decimal"
                value={numVal(valorUsdt)}
                onChange={(e) => numChange(e, setValorUsdt)}
                placeholder="Ej: 1.300,50"
                class="w-full p-3 rounded-xl border border-outline bg-surface-container text-on-surface font-body-base placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-secondary"
              />
            </div>
            <div>
              <label class="block font-body-base font-medium text-on-surface mb-1.5">Cantidad de USDT</label>
              <input
                type="text"
                inputMode="decimal"
                value={numVal(cantidadUsdt)}
                onChange={(e) => numChange(e, setCantidadUsdt)}
                placeholder="Ej: 100"
                class="w-full p-3 rounded-xl border border-outline bg-surface-container text-on-surface font-body-base placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-secondary"
              />
            </div>
            <button
              onClick={calcularUsdtAArs}
              disabled={!valorUsdt || !cantidadUsdt}
              class="w-full py-3 px-6 rounded-xl bg-secondary text-on-secondary font-body-base font-bold hover:bg-secondary/90 transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              Calcular
            </button>
            {resultadoArs !== null && (
              <div class="p-4 rounded-xl bg-secondary-container/30 border border-secondary-container">
                <p class="font-body-sm text-on-surface-variant mb-1">Total en pesos</p>
                <p class="font-display-lg text-display-lg font-bold text-on-surface">
                  $ {resultadoArs.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p class="font-body-sm text-on-surface-variant mt-2">
                  {valorUsdt} × {cantidadUsdt} = {resultadoArs.toFixed(2)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* % del Costo */}
        <div class="p-6 bg-surface rounded-2xl shadow-md">
          <div class="flex items-center justify-between mb-5">
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-2xl text-secondary">percent</span>
              <h2 class="font-headline-md font-bold text-on-surface">% del Costo</h2>
            </div>
            <button
              onClick={limpiarPorcentajeCosto}
              class="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-all duration-200"
              title="Limpiar campos"
            >
              <span class="material-symbols-outlined text-[20px]">refresh</span>
            </button>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block font-body-base font-medium text-on-surface mb-1.5">Porcentaje (%)</label>
              <input
                type="text"
                inputMode="decimal"
                value={numVal(porcentajeCosto)}
                onChange={(e) => numChange(e, setPorcentajeCosto)}
                placeholder="Ej: 25"
                class="w-full p-3 rounded-xl border border-outline bg-surface-container text-on-surface font-body-base placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-secondary"
              />
            </div>
            <div>
              <label class="block font-body-base font-medium text-on-surface mb-1.5">Costo ($)</label>
              <input
                type="text"
                inputMode="decimal"
                value={numVal(costoBase)}
                onChange={(e) => numChange(e, setCostoBase)}
                placeholder="Ej: 100.000"
                class="w-full p-3 rounded-xl border border-outline bg-surface-container text-on-surface font-body-base placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-secondary"
              />
            </div>
            <button
              onClick={calcularPorcentajeCosto}
              disabled={!porcentajeCosto || !costoBase}
              class="w-full py-3 px-6 rounded-xl bg-secondary text-on-secondary font-body-base font-bold hover:bg-secondary/90 transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              Calcular
            </button>
            {resultadoPorcentajeCosto !== null && (
              <div class="p-4 rounded-xl bg-secondary-container/30 border border-secondary-container">
                <p class="font-body-sm text-on-surface-variant mb-1">
                  El {porcentajeCosto}% de ${Number(costoBase).toLocaleString('es-AR')}
                </p>
                <p class="font-display-lg text-display-lg font-bold text-on-surface">
                  $ {resultadoPorcentajeCosto.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p class="font-body-sm text-on-surface-variant mt-2">
                  {porcentajeCosto}% × ${Number(costoBase).toLocaleString('es-AR')} = $ {resultadoPorcentajeCosto.toFixed(2)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Columna 2: % Ganancia + Guardar datos ── */}
      <div class="flex flex-col gap-4">
        {/* % Ganancia */}
        <div class="p-6 bg-surface rounded-2xl shadow-md">
          <div class="flex items-center justify-between mb-5">
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-2xl text-secondary">trending_up</span>
              <h2 class="font-headline-md font-bold text-on-surface">% Ganancia</h2>
            </div>
            <button
              onClick={limpiarGanancia}
              class="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-all duration-200"
              title="Limpiar campos"
            >
              <span class="material-symbols-outlined text-[20px]">refresh</span>
            </button>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block font-body-base font-medium text-on-surface mb-1.5">Precio de costo ($)</label>
              <input
                type="text"
                inputMode="decimal"
                value={numVal(precioCosto)}
                onChange={(e) => numChange(e, setPrecioCosto)}
                placeholder="Ej: 25.000"
                class="w-full p-3 rounded-xl border border-outline bg-surface-container text-on-surface font-body-base placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-secondary"
              />
            </div>
            <div>
              <label class="block font-body-base font-medium text-on-surface mb-1.5">Precio de venta ($)</label>
              <input
                type="text"
                inputMode="decimal"
                value={numVal(precioVenta)}
                onChange={(e) => numChange(e, setPrecioVenta)}
                placeholder="Ej: 45.000"
                class="w-full p-3 rounded-xl border border-outline bg-surface-container text-on-surface font-body-base placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-secondary"
              />
            </div>
            <button
              onClick={calcularGanancia}
              disabled={!precioCosto || !precioVenta}
              class="w-full py-3 px-6 rounded-xl bg-secondary text-on-secondary font-body-base font-bold hover:bg-secondary/90 transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              Calcular
            </button>
            {ganancia !== null && porcentaje !== null && (
              <div class="p-4 rounded-xl bg-secondary-container/30 border border-secondary-container space-y-2">
                <div>
                  <p class="font-body-sm text-on-surface-variant mb-0.5">Ganancia en pesos</p>
                  <p class="font-headline-md font-bold text-on-surface">
                    $ {ganancia.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div class="border-t border-secondary-container/50 pt-2">
                  <p class="font-body-sm text-on-surface-variant mb-0.5">Porcentaje de ganancia</p>
                  <p class={`font-headline-md font-bold ${porcentaje >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {porcentaje >= 0 ? '+' : ''}{porcentaje.toFixed(2)}%
                  </p>
                </div>
                <p class="font-body-sm text-on-surface-variant">
                  ${Number(precioVenta).toLocaleString('es-AR')} — ${Number(precioCosto).toLocaleString('es-AR')} = $ {ganancia.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Guardar datos calculados */}
        <div class="p-6 bg-surface rounded-2xl shadow-md">
          <div class="flex items-center gap-3 mb-5">
            <span class="material-symbols-outlined text-2xl text-secondary">save</span>
            <h2 class="font-headline-md font-bold text-on-surface">Guardar datos calculados</h2>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block font-body-base font-medium text-on-surface mb-1.5">Nombre del producto</label>
              <input
                type="text"
                value={nombreProducto}
                onChange={(e) => setNombreProducto(e.target.value)}
                placeholder="Ej: Resma A4"
                class="w-full p-3 rounded-xl border border-outline bg-surface-container text-on-surface font-body-base placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-secondary"
              />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <button
                onClick={modificarProducto}
                disabled={!nombreProducto}
                class="py-3 px-6 rounded-xl bg-tertiary text-on-tertiary font-body-base font-bold hover:bg-tertiary/90 transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                Modificar
              </button>
              <button
                onClick={guardarProducto}
                disabled={!nombreProducto}
                class="py-3 px-6 rounded-xl bg-secondary text-on-secondary font-body-base font-bold hover:bg-secondary/90 transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Columna 3: Costo USDT ── */}
      <div class="p-6 bg-surface rounded-2xl shadow-md">
        <div class="flex items-center justify-between mb-5">
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined text-2xl text-secondary">conversion_path</span>
            <h2 class="font-headline-md font-bold text-on-surface">Costo USDT</h2>
          </div>
          <button
            onClick={limpiarCostoUsdt}
            class="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-all duration-200"
            title="Limpiar campos"
          >
            <span class="material-symbols-outlined text-[20px]">refresh</span>
          </button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block font-body-base font-medium text-on-surface mb-1.5">Valor del USDT ($)</label>
            <input
              type="text"
              inputMode="decimal"
              value={numVal(costoUsdt)}
              onChange={(e) => numChange(e, setCostoUsdt)}
              placeholder="Ej: 1.300,50"
              class="w-full p-3 rounded-xl border border-outline bg-surface-container text-on-surface font-body-base placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-secondary"
            />
          </div>
          <div>
            <label class="block font-body-base font-medium text-on-surface mb-1.5">Cantidad de USDT</label>
            <input
              type="text"
              inputMode="decimal"
              value={numVal(valorUsdt2)}
              onChange={(e) => numChange(e, setValorUsdt2)}
              placeholder="Ej: 15"
              class="w-full p-3 rounded-xl border border-outline bg-surface-container text-on-surface font-body-base placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-secondary"
            />
          </div>
          <div>
            <label class="block font-body-base font-medium text-on-surface mb-1.5">Precio de Venta ($)</label>
            <input
              type="text"
              inputMode="decimal"
              value={numVal(ventaArs)}
              onChange={(e) => numChange(e, setVentaArs)}
              placeholder="Ej: 45.000"
              class="w-full p-3 rounded-xl border border-outline bg-surface-container text-on-surface font-body-base placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-secondary"
            />
          </div>
          <button
            onClick={calcularCostoEnUsdt}
            disabled={!costoUsdt || !valorUsdt2 || !ventaArs}
            class="w-full py-3 px-6 rounded-xl bg-secondary text-on-secondary font-body-base font-bold hover:bg-secondary/90 transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            Calcular
          </button>
          {gananciaArs !== null && porcentajeGanancia !== null && (
            <div class="p-4 rounded-xl bg-secondary-container/30 border border-secondary-container space-y-2">
              <div>
                <p class="font-body-sm text-on-surface-variant mb-0.5">Total en pesos</p>
                <p class="font-headline-md font-bold text-on-surface">
                  $ {(Number(costoUsdt) * Number(valorUsdt2)).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p class="font-body-sm text-on-surface-variant mt-1">
                  ${Number(costoUsdt).toLocaleString('es-AR')} × ${Number(valorUsdt2).toLocaleString('es-AR')} = ${(Number(costoUsdt) * Number(valorUsdt2)).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div class="border-t border-secondary-container/50 pt-2">
                <p class="font-body-sm text-on-surface-variant mb-0.5">Ganancia en pesos</p>
                <p class={`font-headline-md font-bold ${gananciaArs >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  $ {gananciaArs.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p class="font-body-sm text-on-surface-variant mt-1">
                  ${Number(ventaArs).toLocaleString('es-AR')} − ${(Number(costoUsdt) * Number(valorUsdt2)).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} = $ {gananciaArs.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div class="border-t border-secondary-container/50 pt-2">
                <p class="font-body-sm text-on-surface-variant mb-0.5">Porcentaje de ganancia</p>
                <p class={`font-headline-md font-bold ${porcentajeGanancia >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {porcentajeGanancia >= 0 ? '+' : ''}{porcentajeGanancia.toFixed(2)}%
                </p>
                <p class="font-body-sm text-on-surface-variant mt-1">
                  (${gananciaArs.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ÷ ${(Number(costoUsdt) * Number(valorUsdt2)).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) × 100 = {porcentajeGanancia >= 0 ? '+' : ''}{porcentajeGanancia.toFixed(2)}%
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Productos calculados ── */}
      {productos.length > 0 && (
        <div class="p-6 bg-surface rounded-2xl shadow-md md:col-span-3">
          <div class="flex items-center gap-3 mb-5">
            <span class="material-symbols-outlined text-2xl text-secondary">inventory_2</span>
            <h2 class="font-headline-md font-bold text-on-surface">Productos calculados</h2>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left">
              <thead>
                <tr class="border-b border-outline">
                  <th class="py-3 px-3 font-body-sm font-medium text-on-surface-variant">Nombre</th>
                  <th class="py-3 px-3 font-body-sm font-medium text-on-surface-variant">Costo</th>
                  <th class="py-3 px-3 font-body-sm font-medium text-on-surface-variant">Ganancia</th>
                  <th class="py-3 px-3 font-body-sm font-medium text-on-surface-variant">% Ganancia</th>
                  <th class="py-3 px-3 font-body-sm font-medium text-on-surface-variant">USDT</th>
                  <th class="py-3 px-3 font-body-sm font-medium text-on-surface-variant">Cant. USDT</th>
                  <th class="py-3 px-3 font-body-sm font-medium text-on-surface-variant"></th>
                </tr>
              </thead>
              <tbody>
                {productos.map((p) => (
                  <tr key={p.id} class="border-b border-outline/50 hover:bg-surface-container/50 transition-colors">
                    <td class="py-3 px-3 font-body-base font-medium text-on-surface">{p.nombre}</td>
                    <td class="py-3 px-3 font-body-base text-on-surface">$ {p.costo.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td class="py-3 px-3 font-body-base font-medium text-on-surface">
                      <span class={p.ganancia >= 0 ? 'text-green-600' : 'text-red-600'}>
                        $ {p.ganancia.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td class="py-3 px-3 font-body-base font-medium text-on-surface">
                      <span class={p.porcentajeGanancia >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {p.porcentajeGanancia >= 0 ? '+' : ''}{p.porcentajeGanancia.toFixed(2)}%
                      </span>
                    </td>
                    <td class="py-3 px-3 font-body-base text-on-surface">{p.usdt}</td>
                    <td class="py-3 px-3 font-body-base text-on-surface">{p.cantidadUsdt}</td>
                    <td class="py-3 px-3">
                      <button
                        onClick={() => eliminarProducto(p.id)}
                        class="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-all duration-200"
                        title="Eliminar producto"
                      >
                        <span class="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Bloc de Notas ── */}
      <div class="p-6 bg-surface rounded-2xl shadow-md md:col-span-3">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined text-2xl text-secondary">sticky_note_2</span>
            <h2 class="font-headline-md font-bold text-on-surface">Bloc de Notas</h2>
          </div>
          {notas && (
            <button
              onClick={limpiarNotas}
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-on-surface-variant hover:text-error hover:bg-error/10 transition-all duration-200"
            >
              <span class="material-symbols-outlined text-[18px]">delete</span>
              Limpiar
            </button>
          )}
        </div>
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Escribí notas, números parciales, observaciones..."
          rows={5}
          class="w-full p-4 rounded-xl border border-outline bg-surface-container text-on-surface font-body-base placeholder:text-on-surface-variant/40 resize-y focus:outline-none focus:ring-2 focus:ring-secondary min-h-[120px]"
        />
        <p class="font-body-sm text-on-surface-variant mt-2 flex items-center gap-1">
          <span class="material-symbols-outlined text-[16px]">save</span>
          Se guarda automáticamente
        </p>
      </div>
    </div>
  );
}
