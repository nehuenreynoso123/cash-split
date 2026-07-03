import { useState, useEffect } from 'react';
import { listLiquidez, createLiquidez, deleteLiquidez, type Liquidez } from '../../lib/api';
import { formatCurrency } from '../../lib/data';
import LiquidezModal from './LiquidezModal';

export default function LiquidezClient() {
  const [items, setItems] = useState<Liquidez[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Liquidez | null>(null);

  const load = () => {
    setLoading(true);
    listLiquidez()
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleNew = () => { setEditItem(null); setModalOpen(true); };
  const handleEdit = (item: Liquidez) => { setEditItem(item); setModalOpen(true); };
  const handleSaved = () => { setModalOpen(false); setEditItem(null); load(); };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este movimiento?')) return;
    try {
      await deleteLiquidez(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
    }
  };

  const total = items.reduce((s, i) => {
    const monto = Number(i.monto);
    return i.tipo === 'ingreso' ? s + monto : s - monto;
  }, 0);

  return (
    <div>
      <div className="flex justify-between items-end mb-8">
        <div>
          <div className="flex items-center gap-4 mb-1">
            <h3 className="font-headline-md text-headline-md text-on-surface">
              Gestión de Liquidez
            </h3>
            {!loading && (
              <span className={`font-data-mono text-display-sm ${total >= 0 ? 'text-green-600' : 'text-error'}`}>
                {formatCurrency(total)}
              </span>
            )}
          </div>
          <p className="font-body-base text-on-surface-variant">
            Registrá movimientos manuales para ajustar la liquidez disponible.
          </p>
        </div>
        <button
          className="bg-secondary text-on-secondary px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 hover:bg-secondary-container transition-all shadow-sm active:scale-95"
          onClick={handleNew}
        >
          <span className="material-symbols-outlined">add_circle</span>
          Nuevo Movimiento
        </button>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                {['Descripción', 'Tipo', 'Monto', 'Fecha', 'Acciones'].map((h) => (
                  <th key={h} className={`px-6 py-4 font-label-caps text-label-caps text-on-surface-variant uppercase ${h === 'Monto' || h === 'Acciones' ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-on-surface-variant">Cargando...</td></tr>
              ) : error ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-error">{error}</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-on-surface-variant">No hay movimientos registrados.</td></tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-container-lowest transition-colors group">
                    <td className="px-6 py-4 font-semibold text-primary">{item.descripcion}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-label-caps font-semibold ${item.tipo === 'ingreso' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        <span className="material-symbols-outlined text-sm">{item.tipo === 'ingreso' ? 'add' : 'remove'}</span>
                        {item.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-right font-data-mono ${item.tipo === 'ingreso' ? 'text-green-600' : 'text-error'}`}>
                      {item.tipo === 'ingreso' ? '+' : '-'}{formatCurrency(Number(item.monto))}
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant">
                      {new Date(item.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 text-on-surface-variant hover:text-secondary hover:bg-secondary/5 rounded-lg transition-all" onClick={() => handleEdit(item)}>
                        <span className="material-symbols-outlined">edit_square</span>
                      </button>
                      <button className="p-2 text-on-surface-variant hover:text-error hover:bg-error/5 rounded-lg transition-all ml-1" onClick={() => handleDelete(item.id)}>
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <LiquidezModal open={modalOpen} onClose={() => { setModalOpen(false); setEditItem(null); }} editItem={editItem} onSaved={handleSaved} />
    </div>
  );
}
