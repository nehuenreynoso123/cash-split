import { useState, useEffect } from 'react';
import Badge, { statusBadge, statusLabel } from '../ui/Badge';
import Pagination from '../ui/Pagination';
import { formatCurrency } from '../../lib/data';
import { listVentas, type Venta } from '../../lib/api';

export default function SaleHistory() {
  const [sales, setSales] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  useEffect(() => {
    listVentas()
      .then((list) => setSales(list))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const totalPages = Math.ceil(sales.length / pageSize);
  const paginated = sales.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <section className="lg:col-span-7 bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm self-stretch">
      <div className="p-6 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary">history</span>
          <h3 className="font-headline-md text-headline-md text-primary">Historial de Ventas</h3>
        </div>
        <button className="flex items-center gap-2 text-secondary font-body-base hover:underline transition-all">
          Exportar{' '}
          <span className="material-symbols-outlined text-[18px]">file_download</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-bright border-b border-outline-variant">
              {['Fecha', 'Producto', 'Cant.', 'Total', 'Ganancia', 'Estado'].map((h) => (
                <th
                  key={h}
                  className={`px-6 py-4 font-label-caps text-on-surface-variant uppercase tracking-wider ${
                    h === 'Cant.' || h === 'Total' || h === 'Ganancia' ? 'text-right' : h === 'Estado' ? 'text-center' : ''
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant">
                  Cargando ventas...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-error">
                  {error}
                </td>
              </tr>
            ) : (
              paginated.map((sale) => (
                <tr key={sale.id} className="hover:bg-surface-container-lowest transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-primary font-medium">
                        {new Date(sale.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-primary font-body-base">{sale.nombre}</td>
                  <td className="px-6 py-4 text-right font-data-mono">{sale.cantidad}</td>
                  <td className="px-6 py-4 text-right font-data-mono text-primary font-semibold">
                    {formatCurrency(sale.precio)}
                  </td>
                  <td className="px-6 py-4 text-right font-data-mono text-green-600 font-semibold">
                    {sale.ganancia != null ? formatCurrency(sale.ganancia) : '—'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Badge variant="success">Pagado</Badge>
                  </td>
                </tr>
              ))
            )}
            {!loading && !error && paginated.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant">
                  No hay ventas registradas todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={sales.length}
          pageSize={pageSize}
        />
      )}
    </section>
  );
}
