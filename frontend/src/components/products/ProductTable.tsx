import { useState, useEffect } from 'react';
import Badge, { statusBadge, statusLabel } from '../ui/Badge';
import Pagination from '../ui/Pagination';
import { type Product, formatCurrency } from '../../lib/data';
import { listProductos, deleteProducto, type Producto } from '../../lib/api';

interface ProductTableProps {
  onNewProduct: () => void;
  onEditProduct: (product: Product) => void;
}

function toProduct(p: Producto): Product {
  const stock = p.stock ?? 0;
  const status = stock === 0 ? 'agotado' as const : stock <= 5 ? 'stock_bajo' as const : 'disponible' as const;
  return { id: p.id, name: p.nombre, price: Number(p.precio), stock, category: '', icon: 'inventory_2', status };
}

export default function ProductTable({ onNewProduct, onEditProduct }: ProductTableProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    listProductos()
      .then((list) => setProducts(list.map(toProduct)))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: number) => {
    try {
      await deleteProducto(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
    }
  };

  const totalPages = Math.ceil(products.length / pageSize);
  const paginated = products.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.05)]">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low border-b border-outline-variant">
              {['Nombre del Producto', 'Categoría', 'Precio Unitario', 'Stock Actual', 'Estado', 'Acciones'].map(
                (h) => (
                  <th
                    key={h}
                    className={`px-6 py-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider ${
                      h === 'Precio Unitario' || h === 'Acciones' ? 'text-right' : h === 'Stock Actual' ? 'text-center' : ''
                    }`}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant">
                  Cargando productos...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-error">
                  {error}
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant">
                  No hay productos. Creá el primero.
                </td>
              </tr>
            ) : (
              paginated.map((product) => (
                <tr key={product.id} className="hover:bg-surface-container-lowest transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-secondary/10 text-secondary flex items-center justify-center rounded-lg">
                        <span className="material-symbols-outlined">{product.icon}</span>
                      </div>
                      <span className="font-body-base text-on-surface font-semibold">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-body-base text-on-surface-variant">{product.category}</td>
                  <td className="px-6 py-4 font-data-mono text-right text-on-surface">{formatCurrency(product.price)}</td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`px-3 py-1 font-data-mono rounded-full text-xs ${
                        product.stock === 0
                          ? 'bg-error-container text-error'
                          : product.stock <= 5
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-surface-container-highest text-primary'
                      }`}
                    >
                      {product.stock} u.
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={statusBadge(product.status)}>
                      {statusLabel(product.status)}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        className="p-2 text-on-surface-variant hover:text-secondary hover:bg-secondary/5 rounded-lg transition-all"
                        onClick={() => onEditProduct(product)}
                      >
                        <span className="material-symbols-outlined">edit_square</span>
                      </button>
                      <button
                        className="p-2 text-on-surface-variant hover:text-error hover:bg-error/5 rounded-lg transition-all"
                        onClick={() => handleDelete(product.id)}
                      >
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
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
          totalItems={products.length}
          pageSize={pageSize}
        />
      )}
    </div>
  );
}
