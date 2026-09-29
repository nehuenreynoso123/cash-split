import { useCallback, useEffect, useRef, useState } from 'react';
import DateRangeFilter from '../ui/DateRangeFilter';
import HelpTooltip from '../ui/HelpTooltip';
import { getPuntoEquilibrio, type PuntoEquilibrio, type DateRangeParams } from '../../lib/api';
import { useAuthRedirect } from '../../hooks/useAuthRedirect';

// ── Formato ──────────────────────────────────────────────────────────────────
// Las cifras de esta pantalla son de millones: dos decimales sólo agregan ruido
// visual. `Intl` con 0 decimales mantiene el separador de miles es-AR, que es
// lo que hace legible un número Argentine ("$2.300.000" y no "$2300000").
const fmt = (v: number | null | undefined): string =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(Number(v ?? 0));

const pct = (v: number | null | undefined, decimales = 1): string =>
  `${(Number(v ?? 0) * 100).toFixed(decimales)}%`;

// Sliders del simulador.
const MIN_DELTA_VENTAS = -50;
const MAX_DELTA_VENTAS = 200;
const MIN_TASA = 0;
const MAX_TASA = 100;

interface CardProps {
  titulo: string;
  valor: string;
  descripcion: string;
  ayuda?: string;
  colorValor?: string;
  bordeClase?: string;
  extra?: React.ReactNode;
}

function Card({ titulo, valor, descripcion, ayuda, colorValor = 'text-primary', bordeClase, extra }: CardProps) {
  return (
    <div className={`bg-surface-container-lowest border border-outline-variant p-6 rounded-xl flex flex-col gap-2 ${bordeClase ?? ''}`}>
      <div className="flex items-center gap-1.5">
        <span className="text-on-surface-variant font-label-caps uppercase tracking-wider">{titulo}</span>
        {ayuda && <HelpTooltip text={ayuda} label={`Qué significa ${titulo}`} />}
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className={`font-data-mono text-display-lg ${colorValor}`}>{valor}</span>
      </div>
      <span className="text-on-surface-variant font-body-sm">{descripcion}</span>
      {extra}
    </div>
  );
}

// Fila de la cuenta: signo + concepto + monto. Se usa para la cascada
// ingresos → margen de contribución → resultado, donde lo que importa es ver
// QUÉ se resta de qué, no sólo el total.
interface LineaProps {
  // '?' marca un gasto que la app NO puede ubicar en el modelo (sin categoría):
  // no es una resta, es un dato que se declara incompleto.
  signo: '+' | '−' | '=' | '?';
  concepto: string;
  monto: number;
  ayuda?: string;
  destacado?: boolean;
  colorMonto?: string;
}

function Linea({ signo, concepto, monto, ayuda, destacado, colorMonto }: LineaProps) {
  return (
    <div className={`flex items-center justify-between gap-4 py-2 ${destacado ? 'border-t border-outline-variant mt-1 pt-3' : ''}`}>
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-data-mono text-on-surface-variant w-4 shrink-0">{signo}</span>
        <span className={`font-body-base truncate ${destacado ? 'font-semibold text-on-surface' : 'text-on-surface-variant'}`}>
          {concepto}
        </span>
        {ayuda && <HelpTooltip text={ayuda} label={`Qué es ${concepto}`} />}
      </div>
      <span className={`font-data-mono shrink-0 ${colorMonto ?? (destacado ? 'text-on-surface' : 'text-on-surface-variant')}`}>
        {fmt(monto)}
      </span>
    </div>
  );
}

export default function PuntoEquilibrioClient() {
  useAuthRedirect();
  const [data, setData] = useState<PuntoEquilibrio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Simulador. Ambos arrancan en los valores reales del período: el usuario
  // ve SU número, no uno inventado, y lo corre de ahí.
  const [deltaVentas, setDeltaVentas] = useState(0);
  const [tasaOverride, setTasaOverride] = useState<number | null>(null);

  const requestIdRef = useRef(0);
  const now = new Date();
  const firstDayOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const load = useCallback((params?: DateRangeParams) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError('');
    getPuntoEquilibrio(params)
      .then((res) => {
        // Guarda contra respuestas viejas: dos cambios rápidos de rango
        // pueden llegar en orden inverso y pintar el período anterior.
        if (requestId !== requestIdRef.current) return;
        setData(res);
        // El simulador vuelve al punto de partida real en cada cambio de período:
        // sliders que arrastran una simulación vieja sobre números nuevos mienten.
        setDeltaVentas(0);
        setTasaOverride(null);
        setLoading(false);
      })
      .catch((err) => {
        if (requestId !== requestIdRef.current) return;
        setError(err instanceof Error ? err.message : 'No se pudo calcular el punto de equilibrio');
        setLoading(false);
      });
  }, []);

  useEffect(() => { load({ desde: firstDayOfMonth }); }, [load, firstDayOfMonth]);

  if (loading) {
    return <div className="p-10 text-center text-on-surface-variant">Calculando estructura de contribución...</div>;
  }

  if (error) {
    return <div className="p-10 text-center text-error">{error}</div>;
  }

  if (!data) {
    return <div className="p-10 text-center text-on-surface-variant">Sin datos para el período.</div>;
  }

  const { ventas, operativos, gastos, modelo, avisos } = data;
  const rangoTexto = data.periodo.desde
    ? data.periodo.hasta
      ? `${data.periodo.desde} a ${data.periodo.hasta}`
      : `desde ${data.periodo.desde}`
    : 'todo el historial';

  // ── Simulación ────────────────────────────────────────────────────────────
  const tasaSimulada = tasaOverride ?? modelo.tasaContribucion;
  const ingresosSimulados = ventas.ingresos * (1 + deltaVentas / 100);
  // La tasa puede ser negativa (margen en rojo) o mayor a 1 (contribución > 100%
  // si el costo de mercadería fuera 0). El slider va 0..100, así que se recorta
  // sólo para el control; el cálculo usa el valor recortado que el usuario ve.
  const tasaAjustada = Math.min(Math.max(tasaSimulada, 0), MAX_TASA / 100);
  const equilibrioSimulado = tasaAjustada > 0 ? modelo.umbralPersonal / tasaAjustada : null;
  const resultadoSimulado = ingresosSimulados * tasaAjustada - modelo.umbralPersonal;
  const equilibrioNegocioSimulado = tasaAjustada > 0 ? modelo.costosFijos / tasaAjustada : null;

  // Escala de la regla: el eje va hasta el mayor de (ingresos actuales,
  // equilibrio personal, equilibrio simulado) con un margen del 15%, para que
  // ningún marcador quede pegado al borde derecho.
  const maximoEje = Math.max(
    ventas.ingresos,
    modelo.equilibrioPersonal ?? 0,
    equilibrioSimulado ?? 0,
    ingresosSimulados,
    1,
  ) * 1.15;
  const pos = (v: number) => `${Math.min(Math.max((v / maximoEje) * 100, 0), 100)}%`;

  return (
    <div className="space-y-gutter">
      <DateRangeFilter initialDesde={firstDayOfMonth} onApply={(params) => load(params)} onClear={() => load()} />

      {/* Avisos: primero, porque cambian cómo hay que leer todos los números
          que vienen abajo. No se esconden detrás de un tooltip. */}
      {(avisos.equilibrioNoAlcanzable || !avisos.gastosClasificados || avisos.sinDatosFacturacion) && (
        <div className="space-y-3">
          {avisos.equilibrioNoAlcanzable && (
            <div className="bg-error-container text-on-error-container rounded-xl p-5 flex items-start gap-3">
              <span className="material-symbols-outlined">warning</span>
              <div>
                <p className="font-semibold mb-1">Con estos números no existe punto de equilibrio</p>
                <p className="text-body-sm">
                  Cada peso que vendés deja {fmt(modelo.margenContribucion)} de margen de contribución sobre {fmt(ventas.ingresos)}
                  {' '}facturados. Vender más NO te acerca al equilibrio: te aleja. El problema no es la cantidad de ventas,
                  {' '}es que el costo variable se come más de lo que la venta deja. La palanca es el margen
                  {' '}(precios, envíos, comisiones), no el volumen.
                </p>
              </div>
            </div>
          )}
          {!avisos.gastosClasificados && (
            <div className="bg-secondary-container text-on-secondary-container rounded-xl p-5 flex items-start gap-3">
              <span className="material-symbols-outlined">help</span>
              <div>
                <p className="font-semibold mb-1">
                  Hay {fmt(avisos.gastosSinClasificar)} de gastos del negocio sin tipo
                </p>
                <p className="text-body-sm">
                  Mientras esos gastos no tengas marcado si son fijos o variables, este cálculo está
                  {' '}subestimando lo que cuesta tu negocio. No se puede adivinar: un gasto cargado sin tipo
                  {' '}podría ser cualquier cosa. Clasificalos en la sección Gastos.
                </p>
              </div>
            </div>
          )}
          {avisos.sinDatosFacturacion && (
            <div className="bg-surface-container border border-outline-variant rounded-xl p-5 flex items-start gap-3">
              <span className="material-symbols-outlined text-on-surface-variant">info</span>
              <div>
                <p className="font-semibold mb-1">Sin datos de Facturación en el período</p>
                <p className="text-body-sm text-on-surface-variant">
                  Las comisiones, retenciones y envíos se sacan de Facturación, no de Ventas. Sin facturas
                  {' '}cargadas en {rangoTexto} el costo operativo cuenta como $0 y el margen de contribución
                  {' '}de abajo está sobreestimado. Cargá las ventas en Facturación para que el número sea real.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── La cuenta completa ─────────────────────────────────────────── */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="material-symbols-outlined text-secondary">calculate</span>
          <h2 className="font-headline-md text-headline-md text-primary">La cuenta del período</h2>
        </div>
        <p className="text-on-surface-variant font-body-sm mb-4">
          De cada peso que facturas, cuánto sobrevive después de lo que escala con la venta. Período: {rangoTexto}.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-gutter">
          <div>
            <Linea signo="+" concepto="Ingresos" monto={ventas.ingresos}
              ayuda="Total de las líneas de venta del período (precio × cantidad, sumando todas las ventas). No es el margen: es la plata que entró." />
            <Linea signo="−" concepto="Costo de la mercadería" monto={ventas.costoMercaderia}
              ayuda="Lo que te costaron los productos que vendiste, con el costo congelado en cada venta. Cambiar el precio de costo de un producto después no reescribe lo que gastaste antes." />
            <Linea signo="−" concepto="Costo operativo de cada venta" monto={modelo.costosOperativosAplicados}
              ayuda={`Comisiones (${fmt(operativos.comisiones)}), retenciones (${fmt(operativos.retenciones)}), envíos (${fmt(operativos.envios)}) y descuentos (${fmt(operativos.descuentos)}), tomados de Facturación y aplicados como tasa (${pct(operativos.tasa)}) sobre los ingresos del período.`} />
            <Linea signo="−" concepto="Gastos variables" monto={gastos.variablesNegocio}
              ayuda="Los gastos que marcaste como 'Variable': crecen en la misma proporción que las ventas (envíos, comisiones, impuestos, materiales)." />
            <Linea signo="=" concepto="Margen de contribución" monto={modelo.margenContribucion} destacado
              colorMonto={modelo.margenContribucion >= 0 ? 'text-emerald-600' : 'text-error'}
              ayuda="Ingresos menos TODO lo que crece con la venta. Esta es la plata real que te deja cada peso que vendés, antes de pagar los gastos fijos. Si es negativo, vender más te hace perder más." />
            <div className="flex items-center justify-between gap-4 py-1">
              <span className="text-on-surface-variant font-body-sm pl-6">Tasa de contribución</span>
              <span className={`font-data-mono ${modelo.tasaContribucion >= 0 ? 'text-emerald-600' : 'text-error'}`}>
                {pct(modelo.tasaContribucion)}
              </span>
            </div>
          </div>

          <div>
            <Linea signo="−" concepto="Gastos fijos del negocio" monto={modelo.costosFijos}
              ayuda="Los gastos que marcaste como 'Fijo': no cambian vendés lo que vendés (alquiler, monotributo, internet). Son los que el equilibrio tiene que cubrir." />
            <Linea signo="=" concepto="Resultado del negocio" monto={modelo.resultadoNegocio} destacado
              colorMonto={modelo.cubreNegocio ? 'text-emerald-600' : 'text-error'}
              ayuda="Margen de contribución menos los gastos fijos. Positivo: el negocio se banca solo. Negativo: lo estás financiando con tu sueldo." />
            <Linea signo="−" concepto="Gastos personales" monto={gastos.personal}
              ayuda="Los gastos de categoría 'Gastos personales'. Respecto de las ventas son FIJOS: no cambian si vendés el doble. Por eso son el segundo umbral, no un costo variable." />
            <Linea signo="=" concepto="Te queda a vos" monto={modelo.resultadoPersonal} destacado
              colorMonto={modelo.cubrePersonal ? 'text-emerald-600' : 'text-error'}
              ayuda="Resultado del negocio menos tus gastos personales. Este es el número que importa: lo que realmente te queda en el bolsillo." />
          </div>
        </div>
      </div>

      {/* ── La regla de equilibrio ─────────────────────────────────────── */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="material-symbols-outlined text-secondary">straighten</span>
          <h2 className="font-headline-md text-headline-md text-primary">Dónde estás parado</h2>
          <HelpTooltip
            text="Dos umbrales sobre la misma regla. El primero es cuánta venta necesita tu negocio para no dar pérdida. El segundo es cuánta necesitás para, además, cubrir tus gastos personales. Si la marca verde está a la izquierda del primer umbral, vendés por debajo del equilibrio: cada venta acerca al rojo."
            label="Qué es la regla de equilibrio"
          />
        </div>
        <p className="text-on-surface-variant font-body-sm mb-6">
          Cada marca es una cantidad de facturación. La verde es la real.
        </p>

        {modelo.equilibrioAlcanzable ? (
          <div>
            <div className="relative h-12 bg-surface-container rounded-full overflow-hidden">
              {/* Zona muerta: entre el equilibrio del negocio y el personal, el
                  negocio sobrevive pero vos lo financiás con tu sueldo. */}
              <div
                className="absolute inset-y-0 bg-amber-500/20"
                style={{ left: pos(modelo.equilibrioNegocio ?? 0), width: `${Math.max(0, ((modelo.equilibrioPersonal ?? 0) - (modelo.equilibrioNegocio ?? 0)) / maximoEje * 100)}%` }}
              />
              <div
                className="absolute inset-y-0 bg-emerald-500/20"
                style={{ left: pos(modelo.equilibrioPersonal ?? 0), right: 0 }}
              />
              <div
                className="absolute inset-y-0 w-1 bg-emerald-600"
                style={{ left: pos(ventas.ingresos) }}
                title={`Facturación real: ${fmt(ventas.ingresos)}`}
              />
            </div>

            <div className="relative h-16 mt-1">
              <div className="absolute -translate-x-1/2 text-center" style={{ left: pos(ventas.ingresos) }}>
                <p className="font-data-mono text-emerald-600 text-body-sm whitespace-nowrap">Facturas {fmt(ventas.ingresos)}</p>
              </div>
              <div className="absolute -translate-x-1/2 text-center" style={{ left: pos(modelo.equilibrioNegocio ?? 0) }}>
                <p className="font-data-mono text-amber-700 text-body-sm whitespace-nowrap">Negocio {fmt(modelo.equilibrioNegocio)}</p>
              </div>
              <div className="absolute -translate-x-1/2 text-center" style={{ left: pos(modelo.equilibrioPersonal ?? 0) }}>
                <p className="font-data-mono text-primary text-body-sm whitespace-nowrap">Vos {fmt(modelo.equilibrioPersonal)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter mt-4">
              <Card
                titulo="Equilibrio del negocio"
                valor={fmt(modelo.equilibrioNegocio)}
                colorValor="text-amber-700"
                descripcion="Facturación mínima para que el negocio no dé pérdida."
                ayuda="Gastos fijos del negocio divididos por la tasa de contribución. Es el número de ventas que paga el alquiler, el monotributo y los servicios."
              />
              <Card
                titulo="Equilibrio personal"
                valor={fmt(modelo.equilibrioPersonal)}
                descripcion="Facturación mínima para cubrir el negocio Y tus gastos."
                ayuda="(Gastos fijos del negocio + gastos personales) divididos por la tasa de contribución. Este es el número que tenés que superar para que el negocio te sostenga."
              />
              <Card
                titulo="Te falta"
                valor={modelo.cubrePersonal ? 'Nada' : fmt((modelo.equilibrioPersonal ?? 0) - ventas.ingresos)}
                colorValor={modelo.cubrePersonal ? 'text-emerald-600' : 'text-error'}
                descripcion={
                  modelo.cubrePersonal
                    ? `Facturás ${fmt(Math.abs(modelo.resultadoPersonal))} por encima del equilibrio personal.`
                    : 'Facturación adicional que te falta para cubrirte.'
                }
                ayuda="La diferencia entre tu facturación real y el equilibrio personal. Es el objetivo concreto de ventas."
              />
            </div>

            {modelo.precioUnitarioMedio !== null && (
              <p className="text-on-surface-variant font-body-sm mt-4">
                En unidades: el equilibrio del negocio es <strong>{Math.ceil(modelo.unidadesEquilibrioNegocio ?? 0)}</strong> ventas
                {' '}y el personal <strong>{Math.ceil(modelo.unidadesEquilibrioPersonal ?? 0)}</strong>, a un precio
                {' '}promedio de {fmt(modelo.precioUnitarioMedio)} ({ventas.unidades} unidades en el período).
              </p>
            )}
          </div>
        ) : (
          <div className="bg-error-container text-on-error-container rounded-xl p-5">
            <p className="font-semibold mb-1">No hay punto de equilibrio que mostrar</p>
            <p className="text-body-sm">
              Tu margen de contribución es {pct(modelo.tasaContribucion)} sobre {fmt(ventas.ingresos)} de facturación.
              {' '}Con ese margen no hay volumen de ventas que cubra {fmt(modelo.umbralPersonal)} de gastos: cada venta
              {' '}suma pérdida. El simulador de abajo te deja ver qué margen haría falta, que es la única palanca real.
            </p>
          </div>
        )}
      </div>

      {/* ── Simulador ──────────────────────────────────────────────────── */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="material-symbols-outlined text-secondary">tune</span>
          <h2 className="font-headline-md text-headline-md text-primary">Simulador</h2>
          <HelpTooltip
            text="La pregunta que te hago siempre fue 'si vendo más, ¿me queda más?'. Acá la contestás con números. Movés la venta y el margen, y mirás qué pasa con tu resultado. Es la respuesta honesta a '¿conviene vender más?'."
            label="Qué es el simulador"
          />
        </div>
        <p className="text-on-surface-variant font-body-sm mb-6">
          Movés los dos controles que importan: cuántas ventas hacés y cuánto te deja cada una.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                Cambio en ventas
              </label>
              <span className="font-data-mono text-primary">{deltaVentas > 0 ? '+' : ''}{deltaVentas}%</span>
            </div>
            <input
              type="range"
              min={MIN_DELTA_VENTAS}
              max={MAX_DELTA_VENTAS}
              step={5}
              value={deltaVentas}
              onChange={(e) => setDeltaVentas(Number(e.target.value))}
              className="w-full accent-secondary"
              aria-label="Cambio porcentual en ventas"
            />
            <p className="text-on-surface-variant font-body-sm">
              Facturación: <strong className="font-data-mono">{fmt(ingresosSimulados)}</strong>
              {deltaVentas !== 0 && <> (hoy {fmt(ventas.ingresos)})</>}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                Margen por cada $100
              </label>
              <span className="font-data-mono text-primary">{fmt(tasaAjustada * 100)}</span>
            </div>
            <input
              type="range"
              min={MIN_TASA}
              max={MAX_TASA}
              step={1}
              value={Math.round(tasaAjustada * 100)}
              onChange={(e) => setTasaOverride(Number(e.target.value) / 100)}
              className="w-full accent-secondary"
              aria-label="Tasa de contribución objetivo"
            />
            <p className="text-on-surface-variant font-body-sm">
              Hoy es <strong className="font-data-mono">{fmt(modelo.tasaContribucion * 100)}</strong> por cada $100
                {tasaOverride !== null && <> · margen simulado</>}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter mt-6">
          <Card
            titulo="Facturación de equilibrio"
            valor={equilibrioSimulado !== null ? fmt(equilibrioSimulado) : 'No existe'}
            descripcion="Con este margen, lo que necesitás facturar para cubrirte."
            ayuda="Gastos fijos y personales divididos por el margen que estás simulando. Si el margen es 0 o menos, no hay facturación que te cubra."
          />
          <Card
            titulo="Equilibrio del negocio"
            valor={equilibrioNegocioSimulado !== null ? fmt(equilibrioNegocioSimulado) : 'No existe'}
            descripcion="Con este margen, lo que necesitás para no dar pérdida."
            ayuda="Sólo los gastos fijos del negocio, divididos por el margen simulado."
          />
          <Card
            titulo="Te quedaría"
            valor={fmt(resultadoSimulado)}
            colorValor={resultadoSimulado >= 0 ? 'text-emerald-600' : 'text-error'}
            descripcion={`Con ${fmt(ingresosSimulados)} de facturación y este margen.`}
            ayuda="Facturación simulada × margen simulado, menos tus gastos fijos y personales. Es el resultado final de la simulación."
          />
        </div>

        <p className="text-on-surface-variant font-body-sm mt-4">
          Para cubrirte con este margen necesitás facturar {equilibrioSimulado !== null ? fmt(equilibrioSimulado) : '—'}
          {equilibrioSimulado !== null && ventas.ingresos > 0 && (
            <>
              {' '}— {ingresosSimulados >= equilibrioSimulado
                ? `ya lo superás con ${fmt(ingresosSimulados - equilibrioSimulado)} de margen`
                : `son ${fmt(equilibrioSimulado - ingresosSimulados)} más que tu facturación actual`}
            </>
          )}
          .
        </p>
      </div>

      {/* ── De dónde sale cada número ──────────────────────────────────── */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="material-symbols-outlined text-secondary">fact_check</span>
          <h2 className="font-headline-md text-headline-md text-primary">De dónde sale cada número</h2>
        </div>
        <p className="text-on-surface-variant font-body-sm mb-4">
          La app no te pide que le creas nada: esto es exactamente lo que leyó de tus datos.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-gutter">
          <div>
            <Linea signo="+" concepto="Ingresos (Ventas)" monto={ventas.ingresos} />
            <div className="flex items-center justify-between gap-4 py-1 pl-6">
              <span className="text-on-surface-variant font-body-sm">unidades vendidas</span>
              <span className="font-data-mono text-on-surface-variant">{ventas.unidades}</span>
            </div>
            <Linea signo="−" concepto="Costo mercadería (Ventas)" monto={ventas.costoMercaderia} />
            <Linea signo="=" concepto="Margen bruto" monto={ventas.margenBruto} destacado />
            <div className="pt-2 mt-2 border-t border-outline-variant">
              <p className="text-on-surface-variant font-body-sm mb-2">
                Facturación del período: <span className="font-data-mono">{fmt(operativos.ingresosFacturacion)}</span>
                {' '}en {operativos.facturas} venta{operativos.facturas === 1 ? '' : 's'}
              </p>
              <Linea signo="−" concepto="Comisiones" monto={operativos.comisiones} />
              <Linea signo="−" concepto="Retenciones / impuestos" monto={operativos.retenciones} />
              <Linea signo="−" concepto="Envíos" monto={operativos.envios} />
              <Linea signo="−" concepto="Descuentos" monto={operativos.descuentos} />
              <Linea signo="=" concepto="Costo operativo facturado" monto={operativos.total} destacado />
              <p className="text-on-surface-variant font-body-sm mt-2">
                Como tasa: <span className="font-data-mono">{pct(operativos.tasa)}</span> de lo facturado, aplicado
                {' '}a los ingresos del período.
              </p>
            </div>
          </div>

          <div>
            <p className="text-on-surface-variant font-body-sm mb-2">Gastos del período</p>
            <Linea signo="−" concepto="Fijos del negocio" monto={gastos.fijosNegocio} />
            <Linea signo="−" concepto="Variables del negocio" monto={gastos.variablesNegocio} />
            <Linea signo="−" concepto="Personales" monto={gastos.personal} />
            {!avisos.gastosClasificados && (
              <Linea signo="−" concepto="Del negocio SIN tipo" monto={gastos.sinTipoNegocio} colorMonto="text-amber-700"
                ayuda="Gastos de categoría emprendimiento o servicios a los que nunca les marcaste si son fijos o variables. No se descuentan de este modelo (no se sabe cómo escalan), pero sí los pagás: por eso el equilibrio real es peor que el que muestra esta pantalla." />
            )}
            {gastos.sinCategoria > 0 && (
              <Linea signo="?" concepto="Sin categoría" monto={gastos.sinCategoria} colorMonto="text-amber-700"
                ayuda="Gastos cargados antes de que existiera la columna de categoría. No se pueden asignar solos: no hay forma de saber si eran personales o del negocio, así que la app no los inventa." />
            )}
            <div className="pt-2 mt-2 border-t border-outline-variant">
              <p className="text-on-surface-variant font-body-sm mb-2">Desglose categoría × tipo</p>
              {gastos.desglose.length === 0 ? (
                <p className="text-on-surface-variant font-body-sm">Sin gastos en el período.</p>
              ) : (
                gastos.desglose.map((row, i) => (
                  <div key={i} className="flex items-center justify-between gap-4 py-1 text-body-sm">
                    <span className="text-on-surface-variant">
                      {row.categoria ?? 'Sin categoría'}
                      {row.tipo && <span className="opacity-70"> · {row.tipo}</span>}
                    </span>
                    <span className="font-data-mono">{fmt(row.totalMonto)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
