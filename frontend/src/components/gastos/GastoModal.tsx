import { useState, useEffect, type FormEvent } from 'react';
import Modal from '../ui/Modal';
import type { Gasto } from '../../lib/api';
import { createGasto, updateGasto } from '../../lib/api';

interface Props {
  open: boolean;
  onClose: () => void;
  editItem: Gasto | null;
  onSaved: () => void;
}

export default function GastoModal({ open, onClose, editItem, onSaved }: Props) {
  const [descripcion, setDescripcion] = useState(editItem?.descripcion ?? '');
  const [monto, setMonto] = useState(editItem?.monto?.toString() ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editItem) {
      setDescripcion(editItem.descripcion ?? '');
      setMonto(editItem.monto?.toString() ?? '');
    } else {
      setDescripcion('');
      setMonto('');
    }
    setError('');
  }, [editItem]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (editItem) {
        await updateGasto({ id: editItem.id, descripcion, monto: parseFloat(monto) });
      } else {
        await createGasto({ descripcion, monto: parseFloat(monto) });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editItem ? 'Editar Gasto' : 'Nuevo Gasto'}>
      <form onSubmit={handleSubmit} className="p-8 space-y-6">
        {error && <div className="bg-error-container text-on-error-container text-body-sm rounded-lg px-4 py-2">{error}</div>}
        <div>
          <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-2">Descripción</label>
          <input className="w-full px-4 py-2.5 border border-outline-variant rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none" placeholder="Ej: Alquiler mensual" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} required />
        </div>
        <div>
          <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-2">Monto</label>
          <input className="w-full px-4 py-2.5 border border-outline-variant rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none font-data-mono" placeholder="0.00" type="number" step="0.01" min="0" value={monto} onChange={(e) => setMonto(e.target.value)} required />
        </div>
        <div className="pt-4 flex gap-3">
          <button type="button" className="flex-1 px-6 py-3 border border-outline-variant text-on-surface-variant font-semibold rounded-lg hover:bg-surface-container-low transition-all" onClick={onClose}>Cancelar</button>
          <button type="submit" disabled={saving} className="flex-1 px-6 py-3 bg-secondary text-on-secondary font-semibold rounded-lg hover:bg-secondary-container transition-all shadow-md active:scale-95 disabled:opacity-60">
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
