import { useState, useEffect, useCallback, useRef } from 'react';
import Modal from '../ui/Modal';
import DateRangeFilter from '../ui/DateRangeFilter';
import { getFlujoFondos, getVentasPorCobrarSemanas, getLiquidezTotal, listLiquidez, listProductos, listGastos, CATEGORIAS_GASTO, type TotalCaja, type DateRangeParams, type Producto, type Liquidez, type VentasPorCobrarSemana, type TotalPorCategoria, type CategoriaGasto } from '../../lib/api';
import { formatCurrency } from '../../lib/data';
import { useAuthRedirect } from '../../hooks/useAuthRedirect';

// ¿La fecha de carga del producto cae dentro del rango? Compara los tres
// componentes del 'YYYY-MM-DD' como enteros: parsear con new Date() metería
// interpretación de zona horaria y podría dejar fuera un producto del último día.
function fechaEnRango(fecha: string, desde?: string, hasta?: string): boolean {
  const f = fecha.slice(0, 10);
  if (desde && f < desde) return false;
  if (hasta && f > hasta) return false;
  return true;
}

interface CajaInfo {
  id: string;
  titulo: string;
  valor: string;
  icono: string;
  colorIcono: string;
  bordeClase: string;
  descripcion: string;
  detalle: string;
}

// Categorías que cuentan como gasto del emprendimiento en la ganancia real.
// Decisión del usuario: `servicios` se cuenta como negocio aunque la categoría no
// distinga un servicio personal de uno del local. No se esconde el problema: el
// detalle de la tarjeta muestra esa línea por separado, y los gastos sin
// categoría sereportan aparte para que se vea lo que NO se está descontando.
const CATEGORIAS_NEGOCIO: CategoriaGasto[] = ['emprendimiento', 'servicios'];

// Suma de una fila de totalesPorCategoria para una categoría dada. La columna es
// nullable y el slug puede no aparecer en el período: ambos casos cuentan como 0.
function totalDeCategoria(totales: TotalPorCategoria[], categoria: CategoriaGasto | null): number {
  return totales.find((t) => t.categoria === categoria)?.totalMonto ?? 0;
}

function buildCajas(
  totalInversionMercaderia: number,
  totalInvertido: number,
  gananciaReal: number,
  costoReposicion: number,
  gananciaPorCobrar: number,
  gastosNegocio: number,
  detalleInversionCargada: {
    productos: number;
    rango: string;
    costoVendido: number;
    stockCargado: number;
  },
): CajaInfo[] {
  return [
    {
      id: 'liquidez-dinero',
      titulo: 'Inversión en mercadería',
      valor: formatCurrency(totalInversionMercaderia),
      icono: 'inventory_2',
      colorIcono: 'text-amber-500',
      bordeClase: 'border-l-amber-500',
      descripcion: `Cuánto gastaste en mercadería en ${detalleInversionCargada.rango}.`,
      detalle:
        'Es la plata que salió de tu bolsillo para la mercadería en el período: lo que te costaron los productos que vendiste, más lo que cargaste nuevo y todavía tenés en góndola. Mirá la diferencia contra Total Invertido: ese es el stock que tenés hoy, este es el flujo de plata. La parte vendida usa el costo congelado en cada venta, así que cambiar el precio de un producto después no reescribe lo que gastaste antes.',
    },
    {
      id: 'total-invertido',
      titulo: 'Total Invertido',
      valor: formatCurrency(totalInvertido),
      icono: 'inventory_2',
      colorIcono: 'text-blue-500',
      bordeClase: 'border-l-blue-500',
      descripcion: 'Total del costo de compra de la mercadería en stock.',
      detalle:
        'Es la métrica del tamaño de tu negocio. Si este número sube mes a mes, tu rueda se está agrandando (Efecto bola de nieve).',
    },
    {
      id: 'ganancia',
      titulo: 'Ganancia',
      valor: formatCurrency(gananciaReal),
      icono: 'savings',
      colorIcono: 'text-emerald-500',
      bordeClase: 'border-l-emerald-500',
      descripcion: 'Precio de Venta menos Costo de Mercadería.',
      detalle:
        'El valor bruto generado por tu trabajo. De este bloque se alimentan las cajas operativas, de reserva y de escala.',
    },
    {
      id: 'ganancia-mas-invertido',
      titulo: 'Ganancia + Invertido',
      valor: formatCurrency(gananciaReal + totalInvertido),
      icono: 'payments',
      colorIcono: 'text-teal-500',
      bordeClase: 'border-l-teal-500',
      descripcion: 'La ganancia del período más el costo de la mercadería en stock.',
      detalle:
        'Te muestra el valor total que maneja tu rueda: lo que generaste con las ventas más lo que tenés invertido en productos.',
    },
    {
      id: 'caja-reposicion',
      titulo: 'Caja Reposición Base',
      valor: formatCurrency(costoReposicion),
      icono: 'shield',
      colorIcono: 'text-purple-500',
      bordeClase: 'border-l-purple-500',
      descripcion: 'El 100% del costo viejo de la mercadería. Es intocable para gastos personales.',
      detalle:
        'Garantizar la supervivencia. Asegura que cuando cobres, recuperás los mismos pesos exactos que te costó el stock para volver a comprar la misma cantidad.',
    },
    {
      id: 'ganancia-cobrar',
      titulo: 'Ganancia por Cobrar',
      valor: formatCurrency(gananciaPorCobrar),
      icono: 'hourglass_bottom',
      colorIcono: 'text-orange-500',
      bordeClase: 'border-l-orange-500',
      descripcion: 'Margen de las ventas ya hechas pero retenidas por Mercado Pago, tarjetas o clientes.',
      detalle:
        'Medir tu descalce financiero. Te dice cuánta ganancia tenés "en el aire" esperando impactar en tu cuenta.',
    },
    {
      id: 'ganancia-emprendimiento',
      titulo: 'Ganancia del Emprendimiento',
      valor: formatCurrency(Math.round(gananciaReal - gastosNegocio)),
      icono: 'trending_up',
      colorIcono: 'text-cyan-500',
      bordeClase: 'border-l-cyan-500',
      descripcion: 'Ganancia del período menos los gastos del emprendimiento.',
      detalle:
        'Es la plata que dejó el negocio una vez pagos sus gastos. La Ganancia de arriba todavía no sabe nada de ellos: este número sí. Tocá la tarjeta para ver la resta completa.',
    },
    {
      id: 'caja-amortiguacion',
      titulo: 'Caja de Amortiguación (Reserva)',
      valor: formatCurrency(Math.round(gananciaReal * 0.1)),
      icono: 'security',
      colorIcono: 'text-rose-500',
      bordeClase: 'border-l-rose-500',
      descripcion: '10% de la Ganancia Real acumulada hasta armar un colchón equivalente a 1 mes de costos.',
      detalle:
        'El airbag del negocio. Se usa exclusivamente si el proveedor se atrasa con la entrega o si las ventas caen drásticamente una semana.',
    },
  ];
}

interface SemanaCardInfo {
  etiqueta: string;
  rango: string;
  monto: number;
  unidades: number;
}

// Monday of the ISO week containing `date`, computed locally (no UTC drift).
function startOfIsoWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d;
}

// Local 'YYYY-MM-DD' key so it matches the API `semana` string exactly.
function toISODateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const dayFormatter = new Intl.DateTimeFormat('es-AR', { day: 'numeric' });
const shortMonthFormatter = new Intl.DateTimeFormat('es-AR', { month: 'short' });

// Week range label like "24–30 ago" (month on both sides when it spans two months).
function formatWeekRange(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const start = monday.getMonth() === sunday.getMonth()
    ? dayFormatter.format(monday)
    : `${dayFormatter.format(monday)} ${shortMonthFormatter.format(monday)}`;
  return `${start}–${dayFormatter.format(sunday)} ${shortMonthFormatter.format(sunday)}`;
}

// Builds exactly three forward-looking cards (current week, next week and
// week+2). Weeks without pending sales show $0. API rows are keyed by the
// ISO week of fecha_cobro as a local 'YYYY-MM-DD' string.
function buildSemanasPorCobrar(rows: VentasPorCobrarSemana[]): SemanaCardInfo[] {
  const porSemana = new Map(rows.map((row) => [row.semana, row]));
  const labels = ['Esta semana', 'Próxima semana', 'En 2 semanas'];
  const today = startOfIsoWeek(new Date());

  return labels.map((etiqueta, offset) => {
    const monday = new Date(today);
    monday.setDate(monday.getDate() + offset * 7);
    const row = porSemana.get(toISODateKey(monday));
    return {
      etiqueta,
      rango: formatWeekRange(monday),
      monto: row ? Number(row.total_ventas) : 0,
      unidades: row ? Number(row.unidades_por_cobrar) : 0,
    };
  });
}

export default function FlujoFondosClient() {
  useAuthRedirect();
  const [selected, setSelected] = useState<CajaInfo | null>(null);
  const [cajas, setCajas] = useState<CajaInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [flujoFondosData, setFlujoFondosData] = useState<TotalCaja[]>([]);
  const [liquidezItems, setLiquidezItems] = useState<Liquidez[]>([]);
  const [netoLiquidez, setNetoLiquidez] = useState(0);
  // Totales de gastos por categoría del mismo rango de fechas que esta pantalla.
  // Alimentan la resta de la Ganancia del Emprendimiento.
  const [gastosPorCategoria, setGastosPorCategoria] = useState<TotalPorCategoria[]>([]);
  // Weekly pending sales amount cards: independent of the date-range filter.
  const [semanasPorCobrar, setSemanasPorCobrar] = useState<SemanaCardInfo[]>([]);
  const requestIdRef = useRef(0);
  // El "desde" por defecto arranca el día 1 del mes actual
  const now = new Date();
  const firstDayOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  // Rango aplicado, para que el detalle de la card use el mismo filtro que la
  // consulta y no se desincronice al limpiar o cambiar fechas.
  const [rango, setRango] = useState<DateRangeParams | undefined>({ desde: firstDayOfMonth });

  // Weekly pending sales only depend on fecha_cobro, so they load once on
  // mount and must NOT reset when the date-range filter is applied.
  useEffect(() => {
    getVentasPorCobrarSemanas()
      .then((rows) => setSemanasPorCobrar(buildSemanasPorCobrar(rows)))
      .catch(() => setSemanasPorCobrar([]));
  }, []);

  const load = useCallback((params?: DateRangeParams) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setRango(params);
    Promise.all([
      getFlujoFondos(params).catch(() => [] as TotalCaja[]),
      getLiquidezTotal(params).catch(() => 0),
      listLiquidez(params).catch(() => [] as Liquidez[]),
      // productos viene en el mismo lote que el resto: la card de Inversión
      // cargada depende de él, y si se pidiera aparte la primera carga podría
      // pintar $0 hasta que llegue la respuesta.
      listProductos().catch(() => [] as Producto[]),
      // limit 1: de esta respuesta solo se leen los totales por categoría, que
      // el backend calcula sobre el rango de fechas completo e ignorando el
      // límite — las filas de la tabla son un payload que acá no se usa.
      listGastos({ ...params, limit: 1 }).catch(() => ({ totalesPorCategoria: [] } as unknown as Awaited<ReturnType<typeof listGastos>>)),
    ]).then(([flujoFondosData, netoLiquidez, liquidezItems, productosData, gastos]) => {
      if (requestId !== requestIdRef.current) return;
      setFlujoFondosData(flujoFondosData);
      setNetoLiquidez(netoLiquidez);
      setLiquidezItems(liquidezItems);
      setGastosPorCategoria(gastos.totalesPorCategoria);
      setProductos(productosData);
      const totalInvertido = flujoFondosData.reduce((s, r) => s + Number(r.costo_invertido_stock), 0);
      const gananciaReal = flujoFondosData.reduce((s, r) => s + Number(r.ganancia_real_total), 0);
      const costoReposicion = flujoFondosData.reduce((s, r) => s + Number(r.costo_reposicion_total), 0);
      // Ganancia por cobrar: margen de las ventas pendientes (sin fecha de cobro o con fecha futura)
      const gananciaPorCobrar = flujoFondosData.reduce((s, r) => s + (Number(r.ganancia_por_cobrar_total) || 0), 0);

      // "Cuánta plata gasté en mercadería": lo que costó la mercadería que VENDÍ
      // en el período (costo congelado en la venta) más lo que sigo teniendo
      // cargado de cargas nuevas del período. La parte vendida es la que
      // faltaba: si solo se mira el stock, un producto agotado aporta $0 y el
      // gasto real desaparece de la pantalla.
      const productosCargados = productosData.filter((p) => fechaEnRango(p.fecha_carga, params?.desde, params?.hasta));
      const stockCargado = productosCargados.reduce((s, p) => s + Number(p.precio) * p.stock, 0);
      const costoVendido = flujoFondosData.reduce((s, r) => s + (Number(r.costo_mercaderia_vendida) || 0), 0);
      const totalInversionMercaderia = costoVendido + stockCargado;

      const gastosNegocio = CATEGORIAS_NEGOCIO.reduce(
        (s, cat) => s + totalDeCategoria(gastos.totalesPorCategoria, cat),
        0,
      );
      const rangoTexto = params?.desde
        ? (params.hasta ? `${params.desde} a ${params.hasta}` : `desde ${params.desde}`)
        : 'todo el historial';
      const built = buildCajas(
        totalInversionMercaderia,
        totalInvertido,
        gananciaReal,
        costoReposicion,
        gananciaPorCobrar,
        gastosNegocio,
        {
          productos: productosCargados.length,
          rango: rangoTexto,
          costoVendido,
          stockCargado,
        },
      );
      setCajas(built);
      setLoading(false);
    });
    // Sin dependencias: `load` no lee `productos` ni `firstDayOfMonth` — pide
    // los productos en su propio lote y recibe el rango como argumento. Con
    // `productos` en las deps, cada setProductos recreaba `load`, disparaba el
    // efecto de nuevo y la página se quedaba en "Calculando..." para siempre.
  }, []);

  // Carga inicial al montar el componente: aplica el rango por defecto (desde el día 1 del mes actual)
  useEffect(() => { load({ desde: firstDayOfMonth }); }, [load, firstDayOfMonth]);

  // Desglose de Liquidez Dinero: Total Invertido − Caja Reposición + Liquidez neta
  const totalInvertidoDesglose = flujoFondosData.reduce((s, r) => s + Number(r.costo_invertido_stock), 0);
  const costoReposicionDesglose = flujoFondosData.reduce((s, r) => s + Number(r.costo_reposicion_total), 0);
  const gananciaRealDesglose = flujoFondosData.reduce((s, r) => s + Number(r.ganancia_real_total), 0);
  const gananciaMasInvertidoDesglose = totalInvertidoDesglose + gananciaRealDesglose;
  // Mismo filtro que usa la card, recalculado sobre `productos` ya cargado, para
  // que el detalle muestre exactamente los productos que componen el total.
  const productosCargadosDesglose = productos.filter((p) => fechaEnRango(p.fecha_carga, rango?.desde, rango?.hasta));
  const stockCargadoDesglose = productosCargadosDesglose.reduce((s, p) => s + Number(p.precio) * p.stock, 0);
  const costoVendidoDesglose = flujoFondosData.reduce((s, r) => s + (Number(r.costo_mercaderia_vendida) || 0), 0);
  const capitalCargadoDesglose = costoVendidoDesglose + stockCargadoDesglose;
  // Desglose de la Ganancia del Emprendimiento: cada categoría de gasto que se
  // descuenta por separado, más los gastos sin categoría — que NO se descuentan
  // pero cuya existencia hay que mostrar, porque inflan la ganancia de arriba.
  const gastosNegocioDesglose = CATEGORIAS_NEGOCIO.reduce(
    (s, cat) => s + totalDeCategoria(gastosPorCategoria, cat),
    0,
  );
  const gastosSinClasificarDesglose = totalDeCategoria(gastosPorCategoria, null);

  return (
    <div className="space-y-gutter">
      {/* Encabezado */}
      <div className="flex items-start gap-4 bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
        <span className="material-symbols-outlined text-secondary text-3xl mt-1">account_tree</span>
        <div>
          <h2 className="font-headline-md text-headline-md text-primary mb-1">
            Estructura de Capital
          </h2>
          <p className="text-body-sm text-on-surface-variant max-w-2xl">
            Cada caja representa un bloque de tu flujo de fondos.
            Tocá cualquier tarjeta para ver su detalle y entender cómo se compone.
          </p>
        </div>
      </div>

      {/* Filtro por fechas */}
      <DateRangeFilter initialDesde={firstDayOfMonth} onApply={(params) => load(params)} onClear={() => load()} />

      {/* Grilla de cajas */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-on-surface-variant">
          <span className="material-symbols-outlined animate-spin mr-2">sync</span>
          Calculando estructura de capital...
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
        {cajas.map((caja) => (
          <button
            key={caja.id}
            onClick={() => setSelected(caja)}
            className={`text-left w-full bg-surface-container-lowest border border-outline-variant border-l-4 rounded-xl p-stack_lg overflow-hidden min-w-0 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer group ${caja.bordeClase}`}
          >
            <div className="flex items-center justify-between mb-3 min-w-0">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider truncate">
                {caja.titulo}
              </span>
              <span className={`material-symbols-outlined ${caja.colorIcono} shrink-0 group-hover:scale-110 transition-transform`}>
                {caja.icono}
              </span>
            </div>

            <span className="font-data-mono text-display-lg text-primary block mb-2 break-all leading-tight">
              {caja.valor}
            </span>

            <p className="text-body-sm text-on-surface-variant line-clamp-2 leading-relaxed">
              {caja.descripcion}
            </p>

            <div className="mt-3 flex items-center gap-1 text-secondary text-label-caps text-xs font-semibold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
              <span>Ver detalle</span>
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </div>
          </button>
        ))}
      </div>
      )}

      {/* Ventas por cobrar por semana: independiente del filtro de fechas */}
      <div className="space-y-gutter">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-orange-500 text-xl">event_available</span>
          <h3 className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
            Ventas por cobrar por semana
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
          {semanasPorCobrar.map((semana) => (
            <div
              key={semana.etiqueta}
              className="bg-surface-container-lowest border border-outline-variant border-l-4 border-l-orange-500 rounded-xl p-stack_lg min-w-0"
            >
              <div className="flex items-center justify-between mb-3 min-w-0">
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider truncate">
                  {semana.etiqueta}
                </span>
                <span className="material-symbols-outlined text-orange-500 shrink-0">hourglass_bottom</span>
              </div>
              <p className="text-body-sm text-on-surface-variant mb-2">{semana.rango}</p>
              <span className="font-data-mono text-display-lg text-orange-500 block mb-2 break-all leading-tight">
                {formatCurrency(semana.monto)}
              </span>
              <p className="text-body-sm text-on-surface-variant">
                {semana.unidades === 1 ? '1 unidad pendiente' : `${semana.unidades} unidades pendientes`}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de detalle */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.titulo ?? ''}
        maxWidth={selected?.id === 'ganancia' ? 'max-w-3xl' : undefined}
      >
        {selected && (
          <div className="px-8 py-6 space-y-5">
            <div className="flex items-center gap-4">
              <span className={`material-symbols-outlined text-4xl ${selected.colorIcono}`}>
                {selected.icono}
              </span>
              <div>
                <span className="font-data-mono text-display-sm text-primary">
                  {selected.valor}
                </span>
                <p className="text-label-caps text-on-surface-variant uppercase tracking-wider text-xs mt-1">
                  {selected.titulo}
                </p>
              </div>
            </div>

            <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant">
              <p className="font-body-base text-on-surface leading-relaxed">
                {selected.descripcion}
              </p>
            </div>

            {selected.id === 'total-invertido' && (
              <div className="border-t border-outline-variant pt-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-label-caps text-label-caps text-secondary uppercase tracking-wider">
                    Productos en stock
                  </h4>
                  <span className="text-body-sm text-on-surface-variant">
                    {productos.filter((p) => p.stock > 0).length} productos
                  </span>
                </div>
                {productos.filter((p) => p.stock > 0).length === 0 ? (
                  <p className="text-body-sm text-on-surface-variant">
                    No hay productos con stock.
                  </p>
                ) : (
                  <ul className="divide-y divide-outline-variant/40 border border-outline-variant rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                    {[...productos]
                      .filter((p) => p.stock > 0)
                      .sort((a, b) => a.nombre.localeCompare(b.nombre))
                      .map((p) => (
                        <li
                          key={p.id}
                          className="flex items-center justify-between gap-4 px-4 py-3 bg-surface-container-lowest hover:bg-surface-container-low transition-colors"
                        >
                          <span className="font-body-base text-on-surface truncate">
                            {p.nombre}
                          </span>
                          <span className="text-body-sm text-on-surface-variant shrink-0">
                            Stock: {p.stock}
                          </span>
                          <span className="font-data-mono text-on-surface-variant shrink-0">
                            {formatCurrency(p.precio)}
                          </span>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            )}

            {selected.id === 'ganancia-cobrar' && (
              <div className="border-t border-outline-variant pt-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-label-caps text-label-caps text-secondary uppercase tracking-wider">
                    Ventas pendientes de cobro
                  </h4>
                  <span className="text-body-sm text-on-surface-variant">
                    {flujoFondosData.filter((r) => Number(r.unidades_por_cobrar) > 0).length} productos
                  </span>
                </div>
                {flujoFondosData.filter((r) => Number(r.unidades_por_cobrar) > 0).length === 0 ? (
                  <p className="text-body-sm text-on-surface-variant">
                    No hay ventas pendientes de cobro en el período.
                  </p>
                ) : (
                  <ul className="divide-y divide-outline-variant/40 border border-outline-variant rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                    {[...flujoFondosData]
                      .filter((r) => Number(r.unidades_por_cobrar) > 0)
                      .sort((a, b) => Number(b.ganancia_por_cobrar_total) - Number(a.ganancia_por_cobrar_total))
                      .map((r) => (
                        <li
                          key={r.producto_id}
                          className="flex items-center justify-between gap-4 px-4 py-3 bg-surface-container-lowest hover:bg-surface-container-low transition-colors"
                        >
                          <span className="font-body-base text-on-surface truncate">
                            {r.producto}
                          </span>
                          <span className="text-body-sm text-on-surface-variant shrink-0">
                            Cant. por cobrar: {r.unidades_por_cobrar}
                          </span>
                          <span className="font-data-mono text-green-600 shrink-0">
                            {formatCurrency(Number(r.ganancia_por_cobrar_total))}
                          </span>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            )}

            {selected.id === 'ganancia' && (
              <div className="border-t border-outline-variant pt-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-label-caps text-label-caps text-secondary uppercase tracking-wider">
                    Ventas del período
                  </h4>
                  <span className="text-body-sm text-on-surface-variant">
                    {flujoFondosData.filter((r) => Number(r.unidades_vendidas) > 0).length} productos
                  </span>
                </div>
                {flujoFondosData.filter((r) => Number(r.unidades_vendidas) > 0).length === 0 ? (
                  <p className="text-body-sm text-on-surface-variant">
                    No hay ventas en el período.
                  </p>
                ) : (
                  <ul className="divide-y divide-outline-variant/40 border border-outline-variant rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                    {[...flujoFondosData]
                      .filter((r) => Number(r.unidades_vendidas) > 0)
                      .sort((a, b) => Number(b.ganancia_real_total) - Number(a.ganancia_real_total))
                      .map((r) => (
                        <li
                          key={r.producto_id}
                          className="flex items-center justify-between gap-4 px-4 py-3 bg-surface-container-lowest hover:bg-surface-container-low transition-colors"
                        >
                          <span className="font-body-base text-on-surface truncate">
                            {r.producto}
                          </span>
                          <span className="text-body-sm text-on-surface-variant shrink-0">
                            Cant. vendida: {r.unidades_vendidas}
                          </span>
                          <span className="text-body-sm text-on-surface-variant shrink-0">
                            Precio venta: {formatCurrency(r.ingresos_totales)}
                          </span>
                          <span className="font-data-mono text-green-600 shrink-0">
                            {formatCurrency(r.ganancia_real_total)}
                          </span>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            )}

            {selected.id === 'ganancia-mas-invertido' && (
              <div className="border-t border-outline-variant pt-5">
                <h4 className="font-label-caps text-label-caps text-secondary uppercase tracking-wider mb-2">
                  De dónde sale el cálculo
                </h4>
                <ul className="divide-y divide-outline-variant/40 border border-outline-variant rounded-xl overflow-hidden">
                  <li className="flex items-center justify-between gap-4 px-4 py-3 bg-surface-container-lowest">
                    <span className="font-body-base text-on-surface">Total Invertido</span>
                    <span className="font-data-mono text-on-surface-variant shrink-0">+{formatCurrency(totalInvertidoDesglose)}</span>
                  </li>
                  <li className="flex items-center justify-between gap-4 px-4 py-3 bg-surface-container-lowest">
                    <span className="font-body-base text-on-surface">Ganancia del período</span>
                    <span className="font-data-mono text-on-surface-variant shrink-0">+{formatCurrency(gananciaRealDesglose)}</span>
                  </li>
                  <li className="flex items-center justify-between gap-4 px-4 py-3 bg-surface-container-low">
                    <span className="font-label-caps text-label-caps text-secondary uppercase tracking-wider">Total</span>
                    <span className="font-data-mono text-primary font-semibold shrink-0">{formatCurrency(gananciaMasInvertidoDesglose)}</span>
                  </li>
                </ul>
              </div>
            )}

            {selected.id === 'caja-reposicion' && (
              <div className="border-t border-outline-variant pt-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-label-caps text-label-caps text-secondary uppercase tracking-wider">
                    Productos que componen la caja
                  </h4>
                  <span className="text-body-sm text-on-surface-variant">
                    {flujoFondosData.filter((r) => Number(r.costo_reposicion_total) > 0).length} productos
                  </span>
                </div>
                {flujoFondosData.filter((r) => Number(r.costo_reposicion_total) > 0).length === 0 ? (
                  <p className="text-body-sm text-on-surface-variant">
                    No hay ventas en el período.
                  </p>
                ) : (
                  <ul className="divide-y divide-outline-variant/40 border border-outline-variant rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                    {[...flujoFondosData]
                      .filter((r) => Number(r.costo_reposicion_total) > 0)
                      .sort((a, b) => Number(b.costo_reposicion_total) - Number(a.costo_reposicion_total))
                      .map((r) => (
                        <li
                          key={r.producto_id}
                          className="flex items-center justify-between gap-4 px-4 py-3 bg-surface-container-lowest hover:bg-surface-container-low transition-colors"
                        >
                          <span className="font-body-base text-on-surface truncate">
                            {r.producto}
                          </span>
                          <span className="text-body-sm text-on-surface-variant shrink-0">
                            Cant. ventas: {r.unidades_vendidas}
                          </span>
                          <span className="font-data-mono text-purple-600 shrink-0">
                            {formatCurrency(r.costo_reposicion_total)}
                          </span>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            )}

            {selected.id === 'liquidez-dinero' && (
              <div className="border-t border-outline-variant pt-5 space-y-4">
                <div>
                  <h4 className="font-label-caps text-label-caps text-secondary uppercase tracking-wider mb-2">
                    De dónde sale el cálculo
                  </h4>
                  <ul className="divide-y divide-outline-variant/40 border border-outline-variant rounded-xl overflow-hidden">
                    <li className="flex items-center justify-between gap-4 px-4 py-3 bg-surface-container-lowest">
                      <span className="font-body-base text-on-surface">Costo de mercadería que vendiste en el período</span>
                      <span className="font-data-mono text-on-surface-variant shrink-0">{formatCurrency(costoVendidoDesglose)}</span>
                    </li>
                    <li className="flex items-center justify-between gap-4 px-4 py-3 bg-surface-container-lowest">
                      <span className="font-body-base text-on-surface">Mercadería cargada y todavía en góndola</span>
                      <span className="font-data-mono text-on-surface-variant shrink-0">{formatCurrency(stockCargadoDesglose)}</span>
                    </li>
                    <li className="flex items-center justify-between gap-4 px-4 py-3 bg-surface-container-lowest">
                      <span className="font-body-base text-on-surface">Total Invertido (stock actual, todos los períodos)</span>
                      <span className="font-data-mono text-on-surface-variant shrink-0">{formatCurrency(totalInvertidoDesglose)}</span>
                    </li>
                    <li className="flex items-center justify-between gap-4 px-4 py-3 bg-surface-container-low">
                      <span className="font-label-caps text-label-caps text-secondary uppercase tracking-wider">Inversión en mercadería</span>
                      <span className="font-data-mono text-primary font-semibold shrink-0">{formatCurrency(capitalCargadoDesglose)}</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-label-caps text-label-caps text-secondary uppercase tracking-wider mb-2">
                    Mercadería todavía en góndola
                  </h4>
                  {productosCargadosDesglose.length === 0 ? (
                    <p className="text-body-sm text-on-surface-variant">
                      No cargaste mercadería nueva en este período. El total de arriba es solo el costo de lo que vendiste.
                    </p>
                  ) : (
                    <ul className="divide-y divide-outline-variant/40 border border-outline-variant rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                      {productosCargadosDesglose.map((p) => (
                        <li
                          key={p.id}
                          className="flex items-center justify-between gap-4 px-4 py-3 bg-surface-container-lowest hover:bg-surface-container-low transition-colors"
                        >
                          <span className="font-body-base text-on-surface truncate">
                            {p.nombre}
                            <span className="text-body-sm text-on-surface-variant/70 ml-2">
                              {p.stock} u × {formatCurrency(Number(p.precio))}
                            </span>
                          </span>
                          <span className="font-data-mono shrink-0">{formatCurrency(Number(p.precio) * p.stock)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="text-body-sm text-on-surface-variant mt-2">
                    Un producto con 0 unidades no aparece porque ya no te queda nada de ese: su costo ya está incluido arriba, en la mercadería que vendiste. Recargar un producto que ya existía tampoco queda registrado, así que esas compras no aparecen en ninguna de las dos partes.
                  </p>
                </div>
              </div>
            )}

            {selected.id === 'ganancia-emprendimiento' && (
              <div className="border-t border-outline-variant pt-5 space-y-4">
                <div>
                  <h4 className="font-label-caps text-label-caps text-secondary uppercase tracking-wider mb-2">
                    De dónde sale el cálculo
                  </h4>
                  <ul className="divide-y divide-outline-variant/40 border border-outline-variant rounded-xl overflow-hidden">
                    <li className="flex items-center justify-between gap-4 px-4 py-3 bg-surface-container-lowest">
                      <span className="font-body-base text-on-surface">Ganancia del período (ventas − costo de mercadería)</span>
                      <span className="font-data-mono text-on-surface-variant shrink-0">+{formatCurrency(gananciaRealDesglose)}</span>
                    </li>
                    {CATEGORIAS_NEGOCIO.map((cat) => {
                      const info = CATEGORIAS_GASTO.find((c) => c.valor === cat);
                      const monto = totalDeCategoria(gastosPorCategoria, cat);
                      // Categoría presente en el período pero con 0 en gastos:
                      // mostrarla igual mantiene la resta legible entre períodos.
                      if (monto === 0) return null;
                      return (
                        <li key={cat} className="flex items-center justify-between gap-4 px-4 py-3 bg-surface-container-lowest">
                          <span className="font-body-base text-on-surface">Gastos {info?.label ?? cat}</span>
                          <span className="font-data-mono text-on-surface-variant shrink-0">−{formatCurrency(monto)}</span>
                        </li>
                      );
                    })}
                    <li className="flex items-center justify-between gap-4 px-4 py-3 bg-surface-container-low">
                      <span className="font-label-caps text-label-caps text-secondary uppercase tracking-wider">Ganancia del Emprendimiento</span>
                      <span className="font-data-mono text-primary font-semibold shrink-0">
                        {formatCurrency(Math.round(gananciaRealDesglose - gastosNegocioDesglose))}
                      </span>
                    </li>
                  </ul>
                </div>

                {gastosSinClasificarDesglose > 0 && (
                  <div className="bg-surface-container rounded-xl p-5 border border-outline-variant">
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-orange-500 shrink-0">warning</span>
                      <div>
                        <p className="font-body-base text-on-surface leading-relaxed">
                          Hay {formatCurrency(gastosSinClasificarDesglose)} en gastos sin categoría este
                          período. No se descuentan, así que la ganancia de arriba los está
                          sobrestimando en esa misma cantidad.
                        </p>
                        <p className="text-body-sm text-on-surface-variant mt-2">
                          Clasificalos desde Gastos: la ganancia real solo es tan precisa como su
                          clasificación.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="border-t border-outline-variant pt-5">
              <h4 className="font-label-caps text-label-caps text-secondary uppercase tracking-wider mb-2">
                ¿Para qué sirve?
              </h4>
              <p className="font-body-base text-on-surface-variant leading-relaxed">
                {selected.detalle}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
