import { useState, useEffect, useRef } from 'react';
import { listGastos, createGasto, deleteGasto, CATEGORIAS_GASTO, TIPOS_GASTO, type Gasto, type CategoriaGasto, type CategoriaGastoInput, type TipoGasto, type TotalPorCategoria } from '../../lib/api';
import { formatCurrency } from '../../lib/data';
import GastoModal from './GastoModal';
import Pagination from '../ui/Pagination';
import { useAuthRedirect } from '../../hooks/useAuthRedirect';

// Colores de cada categoría: se reusa el idioma de LiquidezClient (chip
// rounded-full) para que las dos tablas se lean igual. La clave es el slug, así
// TypeScript obliga a dar estilo a las 3 categorías si el dominio crece.
const BADGE_CATEGORIA: Record<CategoriaGasto, { clases: string; icono: string }> = {
  personal: { clases: 'bg-blue-100 text-blue-700', icono: 'person' },
  emprendimiento: { clases: 'bg-green-100 text-green-700', icono: 'storefront' },
  servicios: { clases: 'bg-red-100 text-red-700', icono: 'bolt' },
};

// "Sin categoría" no es una cuarta categoría sino la ausencia de clasificación
// (gastos cargados antes de que la columna existiera), por eso usa los tokens
// neutros de superficie en lugar de un color propio.
const SIN_CATEGORIA = { clases: 'bg-surface-container text-on-surface-variant', icono: 'help' };

function CategoriaBadge({ categoria }: { categoria: CategoriaGasto | null }) {
  const estilo = categoria ? BADGE_CATEGORIA[categoria] : SIN_CATEGORIA;
  const label = categoria ? CATEGORIAS_GASTO.find((c) => c.valor === categoria)?.label ?? categoria : 'Sin categoría';
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-label-caps font-semibold ${estilo.clases}`}>
      <span className="material-symbols-outlined text-sm">{estilo.icono}</span>
      {label}
    </span>
  );
}

// Estilo del tipo. 'Fijo' y 'Variable' se distinguen por icono además de color:
// el color solo no alcanza para leer una tabla, y la diferencia (¿escala con la
// venta o no?) es justo la que hay que ver de un vistazo.
const BADGE_TIPO: Record<TipoGasto, { clases: string; icono: string }> = {
  fijo: { clases: 'bg-purple-100 text-purple-700', icono: 'lock' },
  variable: { clases: 'bg-orange-100 text-orange-700', icono: 'trending_up' },
};

// Sin tipo NO es un tercer tipo: es la ausencia de clasificación (gastos
// cargados antes de que la columna existieran, o nunca marcados). Mismo
// tratamiento que "Sin categoría" — tokens neutros, no un color inventado.
const SIN_TIPO = { clases: 'bg-surface-container text-on-surface-variant', icono: 'help' };

function TipoBadge({ tipo }: { tipo: TipoGasto | null }) {
  const estilo = tipo ? BADGE_TIPO[tipo] : SIN_TIPO;
  const label = tipo ? TIPOS_GASTO.find((t) => t.valor === tipo)?.label ?? tipo : 'Sin tipo';
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-label-caps font-semibold ${estilo.clases}`}>
      <span className="material-symbols-outlined text-sm">{estilo.icono}</span>
      {label}
    </span>
  );
}

export default function GastosClient() {
  useAuthRedirect();
  const [items, setItems] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Gasto | null>(null);
  // El "desde" por defecto arranca el día 1 del mes actual
  const now = new Date();
  const firstDayOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const [desde, setDesde] = useState(firstDayOfMonth);
  const [hasta, setHasta] = useState('');
  const [categoria, setCategoria] = useState<CategoriaGastoInput>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalMonto, setTotalMonto] = useState(0);
  const [totales, setTotales] = useState<TotalPorCategoria[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const pageSize = 15;

  // Bloquea todos los botones de eliminar mientras un borrado está en vuelo
  // (mismo idioma que LiberacionPlataClient y SaleHistory): sin esto, un doble
  // click dispara dos DELETE contra el mismo id.
  const busy = deletingId !== null;

  const load = () => {
    setLoading(true);
    // El error se limpia al arrancar el load, no al terminar. `error` reemplaza
    // toda la tabla en el render, así que un error viejo que nunca se limpiara
    // dejaría la vista vacía para siempre aunque las consultas volvieran a
    // funcionar.
    setError('');
    const params: { desde?: string; hasta?: string; categoria?: CategoriaGastoInput; limit: number; offset: number } = {
      limit: pageSize,
      offset: (currentPage - 1) * pageSize,
    };
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    if (categoria) params.categoria = categoria;
    listGastos(params)
      .then((res) => {
        setItems(res.data);
        setTotal(res.total);
        setTotalMonto(res.totalMonto);
        setTotales(res.totalesPorCategoria);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [desde, hasta, categoria, currentPage, refreshKey]);

  const handleNew = () => { setEditItem(null); setModalOpen(true); };
  const handleEdit = (item: Gasto) => { setEditItem(item); setModalOpen(true); };

  // Acción destructiva: se pide confirmación nombrando el gasto concreto, no un
  // "¿eliminar?" genérico — el monto y la descripción son lo que el usuario
  // necesita para confirmar que apretó el botón correcto.
  const handleDelete = async (item: Gasto) => {
    if (!window.confirm(`¿Eliminar el gasto "${item.descripcion}" por ${formatCurrency(item.monto)}?`)) return;
    setDeletingId(item.id);
    try {
      await deleteGasto(item.id);
      // El id borrado no puede seguir en la selección o la barra de seleccionadas
      // contaría un gasto que ya no existe.
      setSelectedIds((prev) => {
        if (!prev.has(item.id)) return prev;
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      // Edge case de paginación: si este era el único gasto de la última página,
      // el refetch dejaría currentPage apuntando más allá del final — la tabla
      // volvería vacía mientras `total` sigue siendo > 0, y la paginación
      // mostraría una página que ya no existe. Retroceder antes de refetchear hace
      // que ese único reload caiga en una página real.
      if (items.length === 1 && currentPage > 1) setCurrentPage((p) => p - 1);
      else setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaved = () => {
    const wasCreate = editItem === null; // read BEFORE clearing
    setModalOpen(false);
    setEditItem(null);
    if (wasCreate) setCurrentPage(1); // new expense is newest -> page 1
    setSelectedIds(new Set());        // list changed -> drop stale selections
    setRefreshKey((k) => k + 1);      // always refetch (effect owns fetching now)
  };

  const allPageSelected = items.length > 0 && items.every((item) => selectedIds.has(item.id));
  const somePageSelected = items.some((item) => selectedIds.has(item.id));

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = somePageSelected && !allPageSelected;
    }
  }, [somePageSelected, allPageSelected]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const pageIds = items.map((item) => item.id);
      const next = new Set(prev);
      if (allPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const selectedItems = items.filter((item) => selectedIds.has(item.id));
  const selectedTotal = selectedItems.reduce((sum, item) => sum + Number(item.monto), 0);

  const totalPages = Math.ceil(total / pageSize);

  // Los totales por categoría llegan del backend ya reducidos por el rango de
  // fechas (no por el filtro ni por la paginación), así que son el desglose real
  // del período. Se muestran las 3 categorías siempre, aunque una no tenga filas,
  // para que el breakdown nunca quede oculto detrás del filtro activo; la
  // cuarta aparece solo si quedan gastos legacy sin clasificar.
  const totalDe = (slug: CategoriaGasto | null) => totales.find((t) => t.categoria === slug)?.totalMonto ?? 0;
  const totalSinCategoria = totalDe(null);
  const tarjetas = [
    ...CATEGORIAS_GASTO.map((c) => ({
      clave: c.valor,
      label: c.label,
      total: totalDe(c.valor),
      icono: BADGE_CATEGORIA[c.valor].icono,
    })),
    ...(totalSinCategoria > 0
      ? [{ clave: null, label: 'Sin categoría', total: totalSinCategoria, icono: SIN_CATEGORIA.icono }]
      : []),
  ];

  return (
    <div>
      <div className="flex justify-between items-end mb-8">
        <div>
          <div className="flex items-center gap-4 mb-1">
            <h3 className="font-headline-md text-headline-md text-on-surface">
              Gestión de Gastos
            </h3>
            {!loading && (
              <span className="font-data-mono text-display-sm text-error">
                {formatCurrency(totalMonto)}
              </span>
            )}
          </div>
          <p className="font-body-base text-on-surface-variant">
            Controlá los gastos operativos del negocio.
          </p>
        </div>
        <button
          className="bg-secondary text-on-secondary px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 hover:bg-secondary-container transition-all shadow-sm active:scale-95"
          onClick={handleNew}
        >
          <span className="material-symbols-outlined">add_circle</span>
          Nuevo Gasto
        </button>
      </div>

      {/* Date filter bar */}
      <div className="flex flex-wrap items-end gap-4 mb-6 p-4 bg-surface-container-low rounded-xl border border-outline-variant">
        <div className="flex-1 min-w-[160px]">
          <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-1">Desde</label>
          <input
            type="date"
            className="w-full px-4 py-2.5 border border-outline-variant rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none font-data-mono text-on-surface"
            value={desde}
            onChange={(e) => { setDesde(e.target.value); setCurrentPage(1); setSelectedIds(new Set()); }}
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-1">Hasta</label>
          <input
            type="date"
            className="w-full px-4 py-2.5 border border-outline-variant rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none font-data-mono text-on-surface"
            value={hasta}
            onChange={(e) => { setHasta(e.target.value); setCurrentPage(1); setSelectedIds(new Set()); }}
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-1">Categoría</label>
          <select
            className="w-full px-4 py-2.5 border border-outline-variant rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none bg-surface-container-lowest text-on-surface"
            value={categoria}
            onChange={(e) => { setCategoria(CATEGORIAS_GASTO.find((c) => c.valor === e.target.value)?.valor ?? ''); setCurrentPage(1); setSelectedIds(new Set()); }}
          >
            <option value="">Todas las categorías</option>
            {CATEGORIAS_GASTO.map((c) => (
              <option key={c.valor} value={c.valor}>{c.label}</option>
            ))}
          </select>
        </div>
        {(desde || hasta) && (
          <button
            className="px-4 py-2.5 text-on-surface-variant hover:text-on-surface font-semibold rounded-lg hover:bg-surface-container transition-all"
            onClick={() => { setDesde(''); setHasta(''); setCurrentPage(1); setSelectedIds(new Set()); }}
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Desglose del período por categoría: se muestra siempre completo, con la
          categoría filtrada resaltada, para que el total grande del encabezado
          (total del período, no del filtro) siempre se pueda descomponer. */}
      {!loading && (
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${tarjetas.length === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-gutter mb-6`}>
          {tarjetas.map((t) => {
            const activa = categoria === (t.clave ?? '');
            return (
              <div
                key={t.clave ?? 'sin-categoria'}
                // El resaltado de la activa va con ring, no con border-secondary: dos
                // utilidades de border-color (outline-variant vs secondary) se resuelven
                // por orden de emisión de Tailwind, no por orden en el className.
                className={`bg-surface-container-lowest border border-outline-variant border-l-4 rounded-xl p-stack_lg min-w-0 ${activa ? 'ring-2 ring-secondary' : ''}`}
              >
                <div className="flex items-center justify-between mb-3 min-w-0">
                  <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider truncate">{t.label}</span>
                  <span className="material-symbols-outlined text-secondary shrink-0">{t.icono}</span>
                </div>
                <span className="font-data-mono text-display-lg text-error block mb-2 break-all leading-tight">
                  {formatCurrency(t.total)}
                </span>
                <p className="text-body-sm text-on-surface-variant">{activa ? 'Filtro activo' : 'Total del período'}</p>
              </div>
            );
          })}
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="sticky top-0 z-10 mb-4 flex items-center justify-between gap-4 rounded-xl border border-secondary/30 bg-secondary-container px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-secondary">check_circle</span>
            <span className="font-body-base text-on-secondary-container">
              {selectedItems.length} {selectedItems.length === 1 ? 'gasto seleccionado' : 'gastos seleccionados'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-data-mono text-display-sm text-secondary">
              {formatCurrency(selectedTotal)}
            </span>
            <button
              className="text-on-secondary-container hover:text-secondary font-semibold"
              onClick={() => setSelectedIds(new Set())}
            >
              Quitar selección
            </button>
          </div>
        </div>
      )}

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="px-4 py-4 w-12">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    className="w-4 h-4 accent-secondary cursor-pointer"
                    checked={allPageSelected}
                    onChange={toggleSelectAll}
                  />
                </th>
                {['Descripción', 'Categoría', 'Tipo', 'Monto', 'Fecha', 'Acciones'].map((h) => (
                  <th key={h} className={`px-6 py-4 font-label-caps text-label-caps text-on-surface-variant uppercase ${h === 'Monto' || h === 'Acciones' ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant">Cargando...</td></tr>
              ) : error ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-error">{error}</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant">No hay gastos registrados.</td></tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-container-lowest transition-colors group">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-secondary cursor-pointer"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                      />
                    </td>
                    <td className="px-6 py-4 font-semibold text-primary">{item.descripcion}</td>
                    <td className="px-6 py-4"><CategoriaBadge categoria={item.categoria} /></td>
                    <td className="px-6 py-4"><TipoBadge tipo={item.tipo} /></td>
                    <td className="px-6 py-4 text-right font-data-mono text-error">{formatCurrency(Number(item.monto))}</td>
                    <td className="px-6 py-4 text-on-surface-variant">
                      {new Date(item.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 text-on-surface-variant hover:text-secondary hover:bg-secondary/5 rounded-lg transition-all" onClick={() => handleEdit(item)}>
                        <span className="material-symbols-outlined">edit_square</span>
                      </button>
                      <button
                        className="p-2 text-on-surface-variant hover:text-error hover:bg-error/5 rounded-lg transition-all ml-1 disabled:opacity-40 disabled:hover:text-on-surface-variant disabled:hover:bg-transparent"
                        title="Eliminar gasto"
                        disabled={busy}
                        onClick={() => handleDelete(item)}
                      >
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={total}
            pageSize={pageSize}
            onPageChange={(p) => { setCurrentPage(p); setSelectedIds(new Set()); }}
          />
        )}
      </div>

      <GastoModal open={modalOpen} onClose={() => { setModalOpen(false); setEditItem(null); }} editItem={editItem} onSaved={handleSaved} />
    </div>
  );
}
