import { useState } from 'react';
import ProductTable from './ProductTable';
import ProductModal from './ProductModal';
import type { Product } from '../../lib/data';

export default function ProductPageClient() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleNewProduct = () => {
    setEditProduct(null);
    setModalOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditProduct(product);
    setModalOpen(true);
  };

  const handleSaved = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h3 className="font-headline-md text-headline-md text-on-surface mb-1">
            Gestión de Inventario
          </h3>
          <p className="font-body-base text-on-surface-variant">
            Controlá tus activos y márgenes de ganancia en tiempo real.
          </p>
        </div>
        <button
          className="bg-secondary text-on-secondary px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 hover:bg-secondary-container transition-all shadow-sm active:scale-95"
          onClick={handleNewProduct}
        >
          <span className="material-symbols-outlined">add_circle</span>
          Nuevo Producto
        </button>
      </div>

      <ProductTable
        key={refreshKey}
        onNewProduct={handleNewProduct}
        onEditProduct={handleEditProduct}
      />

      <ProductModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditProduct(null); }}
        editProduct={editProduct}
        onSaved={handleSaved}
      />
    </>
  );
}
