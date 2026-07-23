import { useState, useEffect, type FormEvent } from 'react';
import Modal from '../ui/Modal';
import { type Product } from '../../lib/data';
import { createProducto, updateProducto } from '../../lib/api';

interface ProductModalProps {
  open: boolean;
  onClose: () => void;
  editProduct?: Product | null;
  onSaved: () => void;
}

export default function ProductModal({ open, onClose, editProduct, onSaved }: ProductModalProps) {
  const [name, setName] = useState(editProduct?.name ?? '');
  const [price, setPrice] = useState(editProduct?.price?.toString() ?? '');
  const [stock, setStock] = useState(editProduct?.stock?.toString() ?? '');
  const [category, setCategory] = useState(editProduct?.category ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editProduct) {
      setName(editProduct.name ?? '');
      setPrice(editProduct.price?.toString() ?? '');
      setStock(editProduct.stock?.toString() ?? '');
      setCategory(editProduct.category ?? '');
    } else {
      setName('');
      setPrice('');
      setStock('');
      setCategory('');
    }
    setError('');
  }, [editProduct]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const precio = parseFloat(price);
      const stockNum = parseInt(stock);

      if (editProduct) {
        await updateProducto({ id: editProduct.id, nombre: name, precio, stock: stockNum });
      } else {
        await createProducto({ nombre: name, precio, stock: stockNum });
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editProduct ? 'Editar Producto' : 'Agregar Nuevo Producto'}>
      <form onSubmit={handleSubmit} className="p-8 space-y-6">
        {error && (
          <div className="bg-error-container text-on-error-container text-body-sm rounded-lg px-4 py-2">
            {error}
          </div>
        )}

        <div>
          <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-2">
            Nombre del Producto
          </label>
          <input
            className="w-full px-4 py-2.5 border border-outline-variant rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none font-body-base transition-all"
            placeholder="Ej: Monitor Gamer 4K"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-2">
              Precio de Compra
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-data-mono">
                $
              </span>
              <input
                className="w-full pl-8 pr-4 py-2.5 border border-outline-variant rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none font-data-mono transition-all"
                placeholder="0.00"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-2">
              Stock Inicial
            </label>
            <input
              className="w-full px-4 py-2.5 border border-outline-variant rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none font-data-mono transition-all"
              placeholder="Cant."
              type="number"
              min="0"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-2">
            Categoría
          </label>
          <select
            className="w-full px-4 py-2.5 border border-outline-variant rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none font-body-base transition-all bg-white"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
          >
            <option value="">Seleccionar categoría...</option>
            {['Electrónica', 'Hardware', 'Audio', 'Oficina', 'Accesorios'].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="pt-4 flex gap-3">
          <button
            type="button"
            className="flex-1 px-6 py-3 border border-outline-variant text-on-surface-variant font-semibold rounded-lg hover:bg-surface-container-low transition-all"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 px-6 py-3 bg-secondary text-on-secondary font-semibold rounded-lg hover:bg-secondary-container transition-all shadow-md active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? 'Guardando...' : editProduct ? 'Actualizar Producto' : 'Guardar Producto'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
