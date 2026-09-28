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
}

type ColumnaOrden = 'nombre' | 'dias' | 'unidades' | 'margen' | 'velocidad';

interface OrdenState {
  columna: ColumnaOrden;
  ascendente: boolean;
}

// Comparador por columna. Los nulos (velocidad no calculable) van siempre al
// final sin importar la dirección: en un ranking de rotación, "no aplica" no
// es lo mismo que "cero", y esconderlo mezclado con los ceros lo haría pasar
// por el dato más bajo del grupo.
function comparar(a: FilaRotacion, b: FilaRotacion, columna: ColumnaOrden): number {
  switch (columna) {
    case 'dias':
      return a.dias - b.dias;
    case 'unidades':
      return a.unidades - b.unidades;
    case 'margen':
      return a.margen - b.margen;
    case 'velocidad': {
      if (a.velocidad === null && b.velocidad === null) return 0;
      if (a.velocidad === null) return 1;
      if (b.velocidad === null) return -1;
      return a.velocidad - b.velocidad;
    }
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
      return {
        producto: p,
        dias,
        unidades,
        margen: v?.margen ?? 0,
        ingresos: v?.ingresos ?? 0,
        // Sin stock no hay rotación que medir: el producto no está girando,
        // está esperando reposición. Y con cero días transcurridos el
        // denominador es cero.
        velocidad: p.stock > 0 && dias > 0 ? unidades / dias : null,
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

  const columnas: { id: ColumnaOrden; label: string; derecha: boolean }[] = [
    { id: 'nombre', label: 'Producto', derecha: false },
    { id: 'dias', label: 'Fecha de carga', derecha: false },
    { id: 'velocidad', label: 'Velocidad', derecha: true },
    { id: 'unidades', label: 'Vendidas', derecha: true },
    { id: 'margen', label: 'Margen', derecha: true },
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
            Conocé qué se está vendiendo y cuánto margen deja. Tocá un encabezado para ordenar.
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
                    <th key={c.id} className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant uppercase">
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
                <tr><td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant">Cargando...</td></tr>
              ) : error ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-error">{error}</td></tr>
              ) : ordenadas.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant">No hay productos cargados</td></tr>
              ) : (
                ordenadas.map(({ producto, dias, unidades, margen, velocidad }) => {
                  const badge = badgeForDays(dias, producto.stock);
                  return (
                    <tr key={producto.id} className="hover:bg-surface-container-lowest transition-colors group">
                      <td className="px-6 py-4 font-semibold text-primary">{producto.nombre}</td>
                      <td className="px-6 py-4 text-on-surface-variant">
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
                      <td className="px-6 py-4 text-right font-data-mono text-green-600">{formatCurrency(Math.round(margen))}</td>
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
