import { useState, useEffect } from 'react';
import ProductTable from './ProductTable';
import ProductModal from './ProductModal';
import MetricCard from '../ui/MetricCard';
import { formatCurrency } from '../../lib/data';
import { listProductos, type Producto } from '../../lib/api';
import type { Product } from '../../lib/data';
import { useAuthRedirect } from '../../hooks/useAuthRedirect';

export default function ProductPageClient() {
  useAuthRedirect();
  const [modalOpen, setModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [totalInvertido, setTotalInvertido] = useState(0);

  useEffect(() => {
    listProductos()
      .then((list) => {
        const total = list.reduce((s, p) => s + Number(p.precio) * Number(p.stock), 0);
        setTotalInvertido(total);
      })
      .catch(() => {});
  }, [refreshKey]);

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
        <div className="flex items-center gap-4">
          <MetricCard
            title="Total Invertido"
            value={formatCurrency(totalInvertido)}
            icon="account_balance"
          />
          <button
            className="bg-secondary text-on-secondary px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 hover:bg-secondary-container transition-all shadow-sm active:scale-95"
            onClick={handleNewProduct}
          >
            <span className="material-symbols-outlined">add_circle</span>
            Nuevo Producto
          </button>
        </div>
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
