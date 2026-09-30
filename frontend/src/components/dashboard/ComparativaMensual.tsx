import HelpTooltip from '../ui/HelpTooltip';
import type { ComparativaFila, ComparativaMensual, ComparativaVariacion } from '../../lib/api';

// Comparativa mes a mes. Es la sección PRINCIPAL del dashboard porque contesta
// la pregunta que la app no podía: ¿el negocio creció respecto del mes pasado?
//
// ── La regla que esta pantalla respeta ───────────────────────────────────────
//
// Ninguna celda de la tabla suma un stock con un flujo. Todo lo de la tabla es
// un flujo del mes (se mide en un período). El capital de hoy está en otra
// tarjeta, arriba, con su fecha y sin Δ: es un stock, y un stock no tiene mes
// anterior contra el cual moverse.
//
// Esto reemplaza la fórmula que estaba en DashboardClient.tsx
// (`totalInversion - totalGastos + netoLiquidezManual`), que sumaba el valor de
// la mercadería de HOY con flujos del período y por eso cambiaba al tocar las
// fechas sin que hubiera cambiado ni la plata ni el estante.

// ── Formato ──────────────────────────────────────────────────────────────────
// Cero decimales, como en PuntoEquilibrioClient: esta tabla tiene siete columnas
// de plata y los centavos sólo agregan ruido. El separador de miles es-AR es lo
// que hace legible el número argentino ("$2.300.000" y no "$2300000").
const fmt = (v: number | null | undefined): string =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(Number(v ?? 0));

// Un porcentaje es null cuando el mes anterior fue 0. La app no devuelve 0 ni
// Infinity en ese caso, y acá tampoco se inventa un "0,0%": se dice que no hay
// base de comparación, que es la verdad.
function fmtPct(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  const pct = v * 100;
  const signo = pct > 0 ? '+' : '';
  return `${signo}${pct.toFixed(1)}%`;
}

const MESES_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// 'YYYY-MM' → 'septiembre 2026'. El backend devuelve la clave cruda a propósito:
// la traducción del mes es cosa de la presentación, no de la API.
function etiquetaMes(mes: string): string {
  const [anio, m] = mes.split('-').map(Number);
  return `${MESES_ES[m - 1] ?? mes} ${anio}`;
}

// El color de una variación depende de si el número subiendo es una BUENA
// noticia, y eso no es lo mismo para todas las filas: más ingresos es bueno,
// más gastos es malo. Sin esto, "gastos +40%" se pinta en verde y el usuario
// lee "creció" cuando la plata se fue.
const SUBE_ES_BUENO: Record<string, boolean> = {
  ingresos: true,
  costoMercaderia: false,
  margenBruto: true,
  gastosNegocio: false,
  gastosSinClasificar: false,
  gastosPersonales: false,
  gananciaNegocio: true,
};

function colorVariacion(clave: string, v: ComparativaVariacion): string {
  if (v.porcentual === null || v.porcentual === 0) return 'text-on-surface-variant';
  const sube = v.porcentual > 0;
  const bueno = SUBE_ES_BUENO[clave] ?? true;
  return sube === bueno ? 'text-emerald-600' : 'text-red-600';
}

function Delta({ valor, clave }: { valor: ComparativaVariacion; clave: string }) {
  if (valor.absoluta === null) {
    return <span className="font-data-mono text-on-surface-variant text-xs">sin base</span>;
  }
  return (
    <span className={`font-data-mono text-xs ${colorVariacion(clave, valor)}`}>
      {valor.porcentual === null ? '—' : fmtPct(valor.porcentual)}
      {/* El absoluto se muestra al lado del % sólo si el mes anterior existía. */}
      {valor.porcentual !== null && (
        <span className="opacity-70"> ({valor.absoluta > 0 ? '+' : ''}{fmt(valor.absoluta)})</span>
      )}
    </span>
  );
}

interface Props {
  data: ComparativaMensual;
}

export default function ComparativaMensualView({ data }: Props) {
  const { filas, capital, avisos } = data;
  const conDatos = filas.filter((f) => !f.sinDatos);
  // El mes más reciente con actividad: es contra ese que el usuario compara.
  const ultimo = conDatos[0] ?? null;

  // El total de "sin clasificar" que se muestra en el aviso. Va aparte del
  // total de la tabla a propósito: la ventana pedida puede no cubrir todos los
  // gastos sin clasificar que tenés, y un total que se ve como "la suma de esta
  // tabla" mentiría sobre su propio alcance.
  const totalSinClasificar = avisos.gastosSinClasificarTotal;

  return (
    <div className="space-y-gutter">
      {/* ── Avisos: primero, porque cambian cómo hay que leer la tabla ─────── */}
      <div className="space-y-3">
        {!avisos.gastosClasificados && (
          <div className="bg-secondary-container text-on-secondary-container rounded-xl p-5 flex items-start gap-3">
            <span className="material-symbols-outlined">help</span>
            <div>
              <p className="font-semibold mb-1">
                {fmt(totalSinClasificar)} de gastos sin clasificar ({avisos.gastosSinClasificarCantidad} gastos)
              </p>
              <p className="text-body-sm">
                Están fuera de la cuenta del negocio: la app no sabe si eran del negocio o tuyos, ni si
                {' '}escalan con las ventas, así que no los suma a los fijos ni a los variables ni a la ganancia.
                {' '}No es que no se hayan pagado: es que la app no sabe dónde dejarlos. La ganancia de cada mes
                {' '}está sobreestimada por este monto. Clasificalos en Gastos y la cuenta cierra sola.
              </p>
            </div>
          </div>
        )}
        {avisos.hayMesesSinDatos && avisos.primerMesConDatos && (
          <div className="bg-surface-container border border-outline-variant rounded-xl p-5 flex items-start gap-3">
            <span className="material-symbols-outlined text-on-surface-variant">info</span>
            <div>
              <p className="font-semibold mb-1">Tu negocio tiene {avisos.mesesConDatos} meses de historia</p>
              <p className="text-body-sm text-on-surface-variant">
                Los primeros datos son de {etiquetaMes(avisos.primerMesConDatos)}. Los meses anteriores aparecen
                {' '}en la tabla igual, vacíos: preferimos que se vea el hueco a que la ventana parezca completa.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Capital de hoy: stock, no flujo ───────────────────────────────── */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="material-symbols-outlined text-secondary">savings</span>
          <h2 className="font-headline-md text-headline-md text-primary">Capital de hoy</h2>
          <HelpTooltip
            text="Es un STOCK, no un flujo: la plata en mano más la mercadería valuada a costo, en un instante concreto. Por eso NO tiene variación contra el mes anterior: un stock se mide hoy o no se mide. Antes esta pantalla mezclaba este número con los flujos del período y el resultado cambiaba al tocar los filtros."
            label="Por qué este número no tiene Δ"
          />
        </div>
        <p className="text-on-surface-variant font-body-sm mb-4">
          Foto de hoy ({capital.fecha}), no un promedio mensual. No se puede comparar con meses anteriores:{' '}
          {capital.motivoHistorico}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-gutter">
          <div>
            <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">Plata en mano</p>
            <p className="font-data-mono text-display-lg text-primary">{fmt(capital.plata)}</p>
          </div>
          <div>
            <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">Mercadería a costo</p>
            <p className="font-data-mono text-display-lg text-primary">{fmt(capital.mercaderia)}</p>
          </div>
          <div>
            <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">Capital total</p>
            <p className="font-data-mono text-display-lg text-primary">{fmt(capital.total)}</p>
            <p className="text-body-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-xs align-middle">schedule</span>{' '}
              snapshot de hoy — no hay histórico
            </p>
          </div>
        </div>
      </div>

      {/* ── La comparativa ───────────────────────────────────────────────── */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-outline-variant">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">insights</span>
            <h2 className="font-headline-md text-headline-md text-primary">Mes a mes</h2>
            <HelpTooltip
              text="Cada fila es un flujo: lo que pasó durante ese mes, y nada más. Se compara contra el mes anterior en monto y en porcentaje. Cuando el mes anterior fue 0 no hay porcentaje posible y dice 'sin base' en vez de inventar un número."
              label="Qué es esta tabla"
            />
          </div>
          <p className="text-body-sm text-on-surface-variant mt-1">
            {ultimo ? (
              <>
                {etiquetaMes(ultimo.mes)} fue{' '}
                <strong className={ultimo.gananciaNegocio >= 0 ? 'text-emerald-600' : 'text-error'}>
                  {ultimo.gananciaNegocio >= 0 ? 'ganativo' : 'con pérdida'}
                </strong>{' '}
                en {fmt(ultimo.gananciaNegocio)} de ganancia del negocio.
              </>
            ) : (
              'Todavía no hay ventas registradas para comparar.'
            )}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low">
              <tr>
                {['Mes', 'Ingresos', 'Costo mercadería', 'Margen bruto', 'Gastos del negocio', 'Ganancia del negocio', 'Gastos personales'].map(
                  (h) => (
                    <th
                      key={h}
                      className={`px-6 py-3 font-label-caps text-label-caps text-on-surface-variant uppercase whitespace-nowrap ${
                        h !== 'Mes' ? 'text-right' : ''
                      }`}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {filas.map((fila: ComparativaFila) => {
                if (fila.sinDatos) {
                  return (
                    <tr key={fila.mes} className="opacity-40">
                      <td className="px-6 py-4 text-on-surface-variant">{etiquetaMes(fila.mes)}</td>
                      <td colSpan={6} className="px-6 py-4 text-on-surface-variant font-body-sm">
                        sin movimientos registrados
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={fila.mes} className="hover:bg-surface-container-lowest transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-semibold text-primary">{etiquetaMes(fila.mes)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-data-mono">{fmt(fila.ingresos)}</span>
                      <br />
                      <Delta valor={fila.variacion.ingresos} clave="ingresos" />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-data-mono text-on-surface-variant">{fmt(fila.costoMercaderia)}</span>
                      <br />
                      <Delta valor={fila.variacion.costoMercaderia} clave="costoMercaderia" />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-data-mono text-primary font-bold">{fmt(fila.margenBruto)}</span>
                      <br />
                      <Delta valor={fila.variacion.margenBruto} clave="margenBruto" />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-data-mono">{fmt(fila.gastosNegocio)}</span>
                      <br />
                      <span className="font-data-mono text-xs text-on-surface-variant">
                        {fmt(fila.gastosFijos)} fijo · {fmt(fila.gastosVariables)} variable
                      </span>
                      {/* La línea "sin clasificar" va SIEMPRE visible cuando hay
                          monto, con su cantidad de gastos. Es la diferencia entre
                          una cuenta que se sostiene y una que parece precisa. */}
                      {fila.gastosSinClasificar > 0 && (
                        <>
                          <br />
                          <span className="font-data-mono text-xs text-amber-700">
                            {fmt(fila.gastosSinClasificar)} sin clasificar ({fila.cantidadGastosSinClasificar})
                          </span>
                        </>
                      )}
                      <br />
                      <Delta valor={fila.variacion.gastosNegocio} clave="gastosNegocio" />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-data-mono font-bold ${fila.gananciaNegocio >= 0 ? 'text-emerald-600' : 'text-error'}`}>
                        {fmt(fila.gananciaNegocio)}
                      </span>
                      <br />
                      <Delta valor={fila.variacion.gananciaNegocio} clave="gananciaNegocio" />
                      {fila.gastosSinClasificar > 0 && (
                        <>
                          <br />
                          <span className="font-data-mono text-xs text-amber-700">
                            entre {fmt(fila.gananciaNegocioPeorCaso)} y {fmt(fila.gananciaNegocio)}
                          </span>
                        </>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-data-mono text-on-surface-variant">{fmt(fila.gastosPersonales)}</span>
                      <br />
                      <span className="font-data-mono text-xs text-on-surface-variant">no resta del negocio</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── De dónde sale ─────────────────────────────────────────────────── */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="material-symbols-outlined text-secondary">fact_check</span>
          <h2 className="font-headline-md text-headline-md text-primary">De dónde sale cada número</h2>
        </div>
        <p className="text-on-surface-variant font-body-sm mb-4">
          La cuenta de cada mes, tal como la leyó la app.
        </p>

        <div className="space-y-3">
          {conDatos.map((fila) => (
            <div key={fila.mes} className="border-b border-outline-variant pb-3 last:border-0">
              <p className="font-semibold text-primary mb-1">{etiquetaMes(fila.mes)}</p>
              <ul className="text-body-sm text-on-surface-variant font-data-mono space-y-0.5">
                <li>+ {fmt(fila.ingresos)} ingresos ({fila.unidades} unidades)</li>
                <li>− {fmt(fila.costoMercaderia)} costo de mercadería (congelado en cada venta)</li>
                <li>= {fmt(fila.margenBruto)} margen bruto</li>
                <li>− {fmt(fila.gastosNegocio)} gastos del negocio ({fmt(fila.gastosFijos)} fijo + {fmt(fila.gastosVariables)} variable)</li>
                {fila.gastosSinClasificar > 0 && (
                  <li className="text-amber-700">
                    ? {fmt(fila.gastosSinClasificar)} sin clasificar ({fila.cantidadGastosSinClasificar} gastos) — la app
                    no los resta
                  </li>
                )}
                <li>
                  = <strong className={fila.gananciaNegocio >= 0 ? 'text-emerald-600' : 'text-error'}>{fmt(fila.gananciaNegocio)}</strong>{' '}
                  ganancia del negocio
                </li>
                <li className="opacity-70">· {fmt(fila.gastosPersonales)} gastos personales (no restan)</li>
                <li className="opacity-70">
                  · {fmt(fila.costosVentaFacturacion)} de comisiones, envíos y retenciones, en {fila.facturas}{' '}
                  {fila.facturas === 1 ? 'factura' : 'facturas'} — informado aparte, no restado
                </li>
              </ul>
            </div>
          ))}
        </div>

        <p className="text-body-sm text-on-surface-variant mt-4">
          Las comisiones de Facturación no están dentro de la ganancia de cada venta (esa es sólo precio menos
          {' '}costo de mercadería), pero tampoco se restan acá: Facturación cubre un subconjunto distinto de
          {' '}ventas y no hay forma de cruzarlas sin inventar el reparto. Por eso el número queda a la vista
          {' '}en vez de escondido en una fórmula.
        </p>
      </div>
    </div>
  );
}
