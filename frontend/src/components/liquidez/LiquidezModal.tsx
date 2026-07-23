import { useState, useEffect, type FormEvent } from 'react';
import Modal from '../ui/Modal';
import type { Liquidez } from '../../lib/api';
import { createLiquidez, updateLiquidez } from '../../lib/api';

interface Props {
  open: boolean;
  onClose: () => void;
  editItem: Liquidez | null;
  onSaved: () => void;
}

export default function LiquidezModal({ open, onClose, editItem, onSaved }: Props) {
  const [descripcion, setDescripcion] = useState(editItem?.descripcion ?? '');
  const [monto, setMonto] = useState(editItem?.monto?.toString() ?? '');
  const [tipo, setTipo] = useState(editItem?.tipo ?? 'ingreso');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editItem) {
      setDescripcion(editItem.descripcion ?? '');
      setMonto(editItem.monto?.toString() ?? '');
      setTipo(editItem.tipo ?? 'ingreso');
    } else {
      setDescripcion('');
      setMonto('');
      setTipo('ingreso');
    }
    setError('');
  }, [editItem]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (editItem) {
        await updateLiquidez({ id: editItem.id, descripcion, monto: parseFloat(monto), tipo });
      } else {
        await createLiquidez({ descripcion, monto: parseFloat(monto), tipo });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editItem ? 'Editar Movimiento' : 'Nuevo Movimiento'}>
      <form onSubmit={handleSubmit} className="p-8 space-y-6">
        {error && <div className="bg-error-container text-on-error-container text-body-sm rounded-lg px-4 py-2">{error}</div>}
        <div>
          <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-2">Descripción</label>
          <input className="w-full px-4 py-2.5 border border-outline-variant rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none" placeholder="Ej: Aporte extra de capital" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} required />
        </div>
        <div>
          <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-2">Tipo</label>
          <select className="w-full px-4 py-2.5 border border-outline-variant rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none bg-surface-container-lowest" value={tipo} onChange={(e) => setTipo(e.target.value)} required>
            <option value="ingreso">Ingreso — aumenta liquidez</option>
            <option value="egreso">Egreso — reduce liquidez</option>
          </select>
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
