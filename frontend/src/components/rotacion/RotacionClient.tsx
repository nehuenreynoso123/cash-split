import { useState, useEffect, useMemo } from 'react';
import { listProductos, listVentasPorProducto, type Producto, type VentasProducto } from '../../lib/api';
import { formatCurrency } from '../../lib/data';
import Badge from '../ui/Badge';
import { useAuthRedirect } from '../../hooks/useAuthRedirect';

// Whole days between fecha_carga and the "end" of the cycle: fecha_agotado when
// the product is currently out of stock (freeze day), today otherwise. All dates
// are opaque 'YYYY-MM-DD' strings: parse their components directly instead of
// new Date(...) so no UTC instant interpretation is involved. today is
// normalized to local midnight expressed as UTC (Date.UTC on y/m/d) so DST
// shifts never cause an off-by-one.
function daysInStock(fechaCarga: string, fechaAgotado: string | null, stock: number): number {
  const [y, m, d] = fechaCarga.slice(0, 10).split('-').map(Number);
  const cargaUTC = Date.UTC(y, m - 1, d);

  // Out of stock → freeze on the day it ran out, parsed the same way as
  // fecha_carga (no UTC instant interpretation).
  if (stock <= 0 && fechaAgotado) {
    const [ay, am, ad] = fechaAgotado.slice(0, 10).split('-').map(Number);
    const agotadoUTC = Date.UTC(ay, am - 1, ad);
    return Math.max(0, Math.floor((agotadoUTC - cargaUTC) / 86400000));
  }

  const today = new Date();
  const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max(0, Math.floor((todayUTC - cargaUTC) / 86400000));
}

const RECIENTE_MAX_DAYS = 30;
const NORMAL_MAX_DAYS = 60;

function badgeForDays(days: number, stock: number): { variant: 'success' | 'warning' | 'error'; label: string } {
  if (stock === 0) return { variant: 'error', label: 'Agotado' };
  if (days <= RECIENTE_MAX_DAYS) return { variant: 'success', label: 'Reciente' };
  if (days <= NORMAL_MAX_DAYS) return { variant: 'warning', label: 'Normal' };
  return { variant: 'error', label: 'Antiguo' };
}

// Build a LOCAL Date from the 'YYYY-MM-DD' components — no instant shift.
function formatFechaCarga(fechaCarga: string): string {
  const [y, m, d] = fechaCarga.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Días transcurridos entre la primera y la última venta del producto, o null
// si nunca vendió. Es el proxy disponible de "cuánto tarda en venderse": la app
// no guarda el stock inicial de cada ciclo, así que el ciclo completo de
// rotación no se puede reconstruir. Se usa el intervalo observado entre ventas
// reales en lugar de un supuesto.
function diasEntreVentas(primera: string | null, ultima: string | null): number | null {
  if (!primera || !ultima) return null;
  const [y1, m1, d1] = primera.slice(0, 10).split('-').map(Number);
  const [y2, m2, d2] = ultima.slice(0, 10).split('-').map(Number);
  const dias = Math.floor((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
  return Math.max(0, dias);
}

const DIAS_POR_MES = 30;

interface FilaRotacion {
  producto: Producto;
  dias: number;
  unidades: number;
  margen: number;
  ingresos: number;
  // Unidades por día desde la carga. null = no tiene sentido calcularla (sin
  // stock no hay nada rotando, o no hay días transcurridos). La UI muestra "—"
  // en vez de 0 para que un dato ausente no se lea como "no vendió".
  velocidad: number | null;
  // Margen proyectado a 30 días: cuánto deja este producto por mes al ritmo
  // actual. Combina margen × velocidad, que es la mitad del modelo de negocio
  // del usuario (la otra mitad es el capital, en la columna ROI).
  margenMes: number;
  // Retorno sobre capital: margen mensual por peso invertido. Es la columna que
  // decide. Sin esta, un producto de margen alto y rotación lenta parece igual
  // de bueno que uno chico y rápido — y no lo es.
  roi: number | null;
  // Units a reponer para cubrir el próximo ciclo comparable. Es una proyección,
  // no un cálculo de reposición con lead time: no hay dato de plazo de entrega
  // en la app.
  reposicion: number;
}

type ColumnaOrden = 'nombre' | 'dias' | 'velocidad' | 'unidades' | 'margen' | 'margenMes' | 'roi' | 'reposicion';

interface OrdenState {
  columna: ColumnaOrden;
  ascendente: boolean;
}

// Comparador por columna. Los nulos van siempre al final sin importar la
// dirección: en un ranking, "no aplica" no es lo mismo que "cero", y mezclarlo
// con los ceros haría que lo no medible pasara por el dato más bajo del grupo.
// Un producto sin stock o sin capital no tiene ROI calculable, y eso es un dato
// distinto de "retorna cero".
function comparar(a: FilaRotacion, b: FilaRotacion, columna: ColumnaOrden): number {
  const porNulos = (va: number | null, vb: number | null): number => {
    if (va === null && vb === null) return 0;
    if (va === null) return 1;
    if (vb === null) return -1;
    return va - vb;
  };

  switch (columna) {
    case 'dias':
      return a.dias - b.dias;
    case 'unidades':
      return a.unidades - b.unidades;
    case 'margen':
      return a.margen - b.margen;
    case 'velocidad':
      return porNulos(a.velocidad, b.velocidad);
    case 'margenMes':
      return a.margenMes - b.margenMes;
    case 'roi':
      return porNulos(a.roi, b.roi);
    case 'reposicion':
      return a.reposicion - b.reposicion;
    default:
      return a.producto.nombre.localeCompare(b.producto.nombre, 'es');
  }
}

export default function RotacionClient() {
  useAuthRedirect();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [ventas, setVentas] = useState<VentasProducto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orden, setOrden] = useState<OrdenState>({ columna: 'unidades', ascendente: false });

  useEffect(() => {
    // Ambas llamadas son necesarias y ninguna depende de la otra: los productos
    // traen fecha_carga y stock, las ventas traen unidades y margen. Un fallo en
    // una no debe vaciar la tabla de la otra.
    Promise.all([listProductos(), listVentasPorProducto()])
      .then(([productos, ventas]) => {
        setProductos(productos);
        setVentas(ventas);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const ventasPorId = useMemo(() => {
    const map = new Map<number, VentasProducto>();
    for (const v of ventas) map.set(v.producto_id, v);
    return map;
  }, [ventas]);

  const filas = useMemo<FilaRotacion[]>(() => {
    return productos.map((p) => {
      const v = ventasPorId.get(p.id);
      const dias = daysInStock(p.fecha_carga, p.fecha_agotado, p.stock);
      const unidades = v?.unidades ?? 0;
      const margen = v?.margen ?? 0;
      const ingresos = v?.ingresos ?? 0;
      // Capital actually tied up right now: same formula as "Total Invertido"
      // in Flujo de Fondos, so the two screens talk about the same number.
      const capital = Number(p.precio) * p.stock;
      // Rhythm window: days between the first and last sale, falling back to
      // days in stock when there's only one sale (or none) and the sales window
      // is a single day. Using the full filter range for every product would
      // understate a slow seller's rate just because the range is wide.
      const ventanaVentas = diasEntreVentas(v?.primera_venta ?? null, v?.ultima_venta ?? null);
      const diasRitmo = ventanaVentas !== null && ventanaVentas > 0 ? ventanaVentas : dias;
      const ritmo = diasRitmo > 0 ? unidades / diasRitmo : 0;
      // Project one month at the observed rhythm. margenMes is the "margin ×
      // velocity" half of the user's business model; ROI is the "÷ capital" half.
      const margenMes = ritmo * DIAS_POR_MES * (margen > 0 && unidades > 0 ? margen / unidades : 0);
      return {
        producto: p,
        dias,
        unidades,
        margen,
        ingresos,
        velocidad: p.stock > 0 && dias > 0 ? unidades / dias : null,
        margenMes,
        // No capital tied up means no return to measure — null, not 0. A
        // sold-out product has money waiting to be spent, not zero yield.
        roi: capital > 0 ? margenMes / capital : null,
        // Cover the next comparable cycle at the observed rhythm. A product
        // that never sold projects 0 units, which reads correctly: nothing to
        // reorder until there's a demand signal.
        reposicion: Math.ceil(ritmo * DIAS_POR_MES),
      };
    });
  }, [productos, ventasPorId]);

  // Orden por defecto: más unidades vendidas primero. Es el orden que dice qué
  // se está moviendo, que es lo accionable. Los nulos de velocidad se ordenan
  // al final por el comparador.
  const ordenadas = useMemo(() => {
    const signo = orden.ascendente ? 1 : -1;
    return [...filas].sort((a, b) => signo * comparar(a, b, orden.columna));
  }, [filas, orden]);

  const alternarOrden = (columna: ColumnaOrden) => {
    setOrden((prev) =>
      prev.columna === columna
        ? { columna, ascendente: !prev.ascendente }
        : // Primera vez que se toca una columna: los números se muestran de
          // mayor a menor (lo más vende arriba), el nombre de A a Z.
          { columna, ascendente: columna === 'nombre' },
    );
  };

  const columnas: { id: ColumnaOrden; label: string; derecha: boolean; title: string }[] = [
    { id: 'nombre', label: 'Producto', derecha: false, title: '' },
    { id: 'dias', label: 'Fecha de carga', derecha: false, title: 'Días que lleva cargado' },
    { id: 'velocidad', label: 'Velocidad', derecha: true, title: 'Unidades vendidas por día desde la carga' },
    { id: 'unidades', label: 'Vendidas', derecha: true, title: 'Unidades vendidas en el período' },
    { id: 'margenMes', label: 'Margen/mes', derecha: true, title: 'Margen proyectado a 30 días al ritmo actual de venta' },
    { id: 'roi', label: 'ROI', derecha: true, title: 'Margen del mes por peso invertido en stock. La columna que decide qué comprar' },
    { id: 'margen', label: 'Margen total', derecha: true, title: 'Margen acumulado histórico de las ventas' },
    { id: 'reposicion', label: 'Reposición', derecha: true, title: 'Unidades a comprar para cubrir el próximo ciclo comparable' },
  ];

  const agotados = filas.filter((f) => f.producto.stock === 0).length;

  return (
    <div>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h3 className="font-headline-md text-headline-md text-on-surface mb-1">
            Rotación de Mercadería
          </h3>
          <p className="font-body-base text-on-surface-variant">
            Margen, velocidad y retorno sobre capital. Tocá un encabezado para ordenar: el ROI es la columna que decide qué comprar.
          </p>
        </div>
      </div>

      {agotados > 0 && (
        <div className="mb-6 bg-surface-container rounded-xl p-4 border border-outline-variant flex items-start gap-3">
          <span className="material-symbols-outlined text-orange-500 shrink-0">inventory_2</span>
          <p className="text-body-sm text-on-surface-variant leading-relaxed">
            <span className="text-on-surface font-semibold">{agotados} de {filas.length} productos están agotados.</span>{' '}
            Es lo primero que hay que reponer: varios de los que más venden ya no tienen unidades.
            Los agotados no tienen velocidad porque no hay stock girando.
          </p>
        </div>
      )}

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                {columnas.map((c) => {
                  const activa = orden.columna === c.id;
                  return (
                    <th key={c.id} title={c.title} className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant uppercase whitespace-nowrap">
                      <button
                        onClick={() => alternarOrden(c.id)}
                        className={`flex items-center gap-1 w-full hover:text-secondary transition-colors ${c.derecha ? 'justify-end' : ''} ${activa ? 'text-secondary' : ''}`}
                      >
                        {c.label}
                        <span className={`material-symbols-outlined text-sm transition-opacity ${activa ? 'opacity-100' : 'opacity-0'}`}>
                          {orden.ascendente ? 'arrow_upward' : 'arrow_downward'}
                        </span>
                      </button>
                    </th>
                  );
                })}
                <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant uppercase">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading ? (
                <tr><td colSpan={9} className="px-6 py-12 text-center text-on-surface-variant">Cargando...</td></tr>
              ) : error ? (
                <tr><td colSpan={9} className="px-6 py-12 text-center text-error">{error}</td></tr>
              ) : ordenadas.length === 0 ? (
                <tr><td colSpan={9} className="px-6 py-12 text-center text-on-surface-variant">No hay productos cargados</td></tr>
              ) : (
                ordenadas.map((fila) => {
                  const { producto, dias, unidades, margen, velocidad, margenMes, roi, reposicion } = fila;
                  const badge = badgeForDays(dias, producto.stock);
                  return (
                    <tr key={producto.id} className="hover:bg-surface-container-lowest transition-colors group">
                      <td className="px-6 py-4 font-semibold text-primary whitespace-nowrap">{producto.nombre}</td>
                      <td className="px-6 py-4 text-on-surface-variant whitespace-nowrap">
                        {formatFechaCarga(producto.fecha_carga)}
                        <span className="text-body-sm text-on-surface-variant/70 ml-2">{dias} d</span>
                      </td>
                      <td className="px-6 py-4 text-right font-data-mono text-on-surface">
                        {velocidad === null ? (
                          <span className="text-on-surface-variant/50" title={producto.stock === 0 ? 'Sin stock: no hay rotación' : 'Cargado hoy'}>—</span>
                        ) : (
                          <span title="Unidades vendidas por día desde la fecha de carga">{velocidad.toFixed(2)}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-data-mono text-on-surface">{unidades}</td>
                      <td className="px-6 py-4 text-right font-data-mono text-on-surface">{formatCurrency(Math.round(margenMes))}</td>
                      <td className="px-6 py-4 text-right font-data-mono">
                        {roi === null ? (
                          <span className="text-on-surface-variant/50" title="Sin stock: no hay capital invertido que medir">—</span>
                        ) : (
                          <span className={roi > 0 ? 'text-green-600' : 'text-on-surface-variant'} title={`${formatCurrency(Math.round(margenMes))} de margen al mes sobre ${formatCurrency(Math.round(Number(producto.precio) * producto.stock))} invertidos`}>
                            {(roi * 100).toFixed(0)}%
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-data-mono text-green-600">{formatCurrency(Math.round(margen))}</td>
                      <td className="px-6 py-4 text-right font-data-mono text-on-surface">
                        {reposicion > 0 ? reposicion : <span className="text-on-surface-variant/50">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
