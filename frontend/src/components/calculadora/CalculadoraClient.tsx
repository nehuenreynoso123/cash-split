import { useState } from 'react';

function toRaw(value: string): string {
  // Keep only digits, dots, commas; normalize comma→dot; remove thousand-separator dots
  const cleaned = value.replace(/[^\d.,]/g, '');
  const normalized = cleaned.replace(/,/g, '.');
  const parts = normalized.split('.');
  if (parts.length <= 1) return parts[0];
  return parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
}

function toDisplay(raw: string): string {
  if (!raw || raw === '.') return raw;
  const dotIndex = raw.indexOf('.');
  if (dotIndex === -1) {
    return raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  const intPart = raw.slice(0, dotIndex);
  const decPart = raw.slice(dotIndex);
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + decPart;
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

  // % del Costo
  const [porcentajeCosto, setPorcentajeCosto] = useState('');
  const [costoBase, setCostoBase] = useState('');
  const [resultadoPorcentajeCosto, setResultadoPorcentajeCosto] = useState<number | null>(null);

  const calcularUsdtAArs = () => {
    const v = parseFloat(valorUsdt);
    const c = parseFloat(cantidadUsdt);
    if (isNaN(v) || isNaN(c) || c === 0) return;
    setResultadoArs(v * c);
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

  const calcularPorcentajeCosto = () => {
    const p = parseFloat(porcentajeCosto);
    const c = parseFloat(costoBase);
    if (isNaN(p) || isNaN(c)) return;
    setResultadoPorcentajeCosto(c * (p / 100));
  };

  const calcularGanancia = () => {
    const costo = parseFloat(precioCosto);
    const venta = parseFloat(precioVenta);
    if (isNaN(costo) || isNaN(venta) || costo === 0) return;
    const diff = venta - costo;
    setGanancia(diff);
    setPorcentaje((diff / costo) * 100);
  };

  return (
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
      {/* ── USDT → ARS ── */}
      <div class="p-6 bg-surface rounded-2xl shadow-md sticky top-[calc(64px+32px)]">
        <div class="flex items-center gap-3 mb-5">
          <span class="material-symbols-outlined text-2xl text-secondary">currency_exchange</span>
          <h2 class="font-headline-md font-bold text-on-surface">USDT → ARS</h2>
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

      {/* ── Costo USDT → Ganancia ARS ── */}
      <div class="p-6 bg-surface rounded-2xl shadow-md sticky top-[calc(64px+32px)]">
        <div class="flex items-center gap-3 mb-5">
          <span class="material-symbols-outlined text-2xl text-secondary">conversion_path</span>
          <h2 class="font-headline-md font-bold text-on-surface">Costo USDT</h2>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block font-body-base font-medium text-on-surface mb-1.5">
              Costo del producto en USDT
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={numVal(costoUsdt)}
              onChange={(e) => numChange(e, setCostoUsdt)}
              placeholder="Ej: 15"
              class="w-full p-3 rounded-xl border border-outline bg-surface-container text-on-surface font-body-base placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-secondary"
            />
          </div>
          <div>
            <label class="block font-body-base font-medium text-on-surface mb-1.5">Valor del USDT ($)</label>
            <input
              type="text"
              inputMode="decimal"
              value={numVal(valorUsdt2)}
              onChange={(e) => numChange(e, setValorUsdt2)}
              placeholder="Ej: 1.300,50"
              class="w-full p-3 rounded-xl border border-outline bg-surface-container text-on-surface font-body-base placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-secondary"
            />
          </div>
          <div>
            <label class="block font-body-base font-medium text-on-surface mb-1.5">Precio de venta en ARS ($)</label>
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
                <p class="font-body-sm text-on-surface-variant mb-0.5">Costo total en ARS</p>
                <p class="font-body-base font-bold text-on-surface">
                  $ {(Number(costoUsdt) * Number(valorUsdt2)).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p class="font-body-sm text-on-surface-variant mb-0.5">Ganancia en ARS</p>
                <p class={`font-headline-md font-bold ${gananciaArs >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  $ {gananciaArs.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div class="border-t border-secondary-container/50 pt-2">
                <p class="font-body-sm text-on-surface-variant mb-0.5">Porcentaje de ganancia</p>
                <p class={`font-headline-md font-bold ${porcentajeGanancia >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {porcentajeGanancia >= 0 ? '+' : ''}{porcentajeGanancia.toFixed(2)}%
                </p>
              </div>
              <p class="font-body-sm text-on-surface-variant">
                ({costoUsdt} USDT × ${Number(valorUsdt2).toLocaleString('es-AR')}) → ${Number(ventaArs).toLocaleString('es-AR')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── % Ganancia ── */}
      <div class="p-6 bg-surface rounded-2xl shadow-md sticky top-[calc(64px+32px)]">
        <div class="flex items-center gap-3 mb-5">
          <span class="material-symbols-outlined text-2xl text-secondary">trending_up</span>
          <h2 class="font-headline-md font-bold text-on-surface">% Ganancia</h2>
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

      {/* ── % del Costo ── */}
      <div class="p-6 bg-surface rounded-2xl shadow-md sticky top-[calc(64px+32px)]">
        <div class="flex items-center gap-3 mb-5">
          <span class="material-symbols-outlined text-2xl text-secondary">percent</span>
          <h2 class="font-headline-md font-bold text-on-surface">% del Costo</h2>
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
  );
}
