import { useState, useEffect } from 'react';
import { listGastos, createGasto, type Gasto } from '../../lib/api';
import { formatCurrency } from '../../lib/data';
import GastoModal from './GastoModal';
import { useAuthRedirect } from '../../hooks/useAuthRedirect';

export default function GastosClient() {
  useAuthRedirect();
  const [items, setItems] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Gasto | null>(null);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const load = () => {
    setLoading(true);
    const params: { desde?: string; hasta?: string } = {};
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    listGastos(Object.keys(params).length > 0 ? params : undefined)
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [desde, hasta]);

  const handleNew = () => { setEditItem(null); setModalOpen(true); };
  const handleEdit = (item: Gasto) => { setEditItem(item); setModalOpen(true); };
  const handleSaved = () => { setModalOpen(false); setEditItem(null); load(); };

  const total = items.reduce((s, i) => s + Number(i.monto), 0);

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
                {formatCurrency(total)}
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
            onChange={(e) => setDesde(e.target.value)}
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-1">Hasta</label>
          <input
            type="date"
            className="w-full px-4 py-2.5 border border-outline-variant rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none font-data-mono text-on-surface"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
          />
        </div>
        {(desde || hasta) && (
          <button
            className="px-4 py-2.5 text-on-surface-variant hover:text-on-surface font-semibold rounded-lg hover:bg-surface-container transition-all"
            onClick={() => { setDesde(''); setHasta(''); }}
          >
            Limpiar
          </button>
        )}
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                {['Descripción', 'Monto', 'Fecha', 'Acciones'].map((h) => (
                  <th key={h} className={`px-6 py-4 font-label-caps text-label-caps text-on-surface-variant uppercase ${h === 'Monto' || h === 'Acciones' ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-on-surface-variant">Cargando...</td></tr>
              ) : error ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-error">{error}</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-on-surface-variant">No hay gastos registrados.</td></tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-container-lowest transition-colors group">
                    <td className="px-6 py-4 font-semibold text-primary">{item.descripcion}</td>
                    <td className="px-6 py-4 text-right font-data-mono text-error">{formatCurrency(Number(item.monto))}</td>
                    <td className="px-6 py-4 text-on-surface-variant">
                      {new Date(item.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 text-on-surface-variant hover:text-secondary hover:bg-secondary/5 rounded-lg transition-all" onClick={() => handleEdit(item)}>
                        <span className="material-symbols-outlined">edit_square</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <GastoModal open={modalOpen} onClose={() => { setModalOpen(false); setEditItem(null); }} editItem={editItem} onSaved={handleSaved} />
    </div>
  );
}
