import { useState, useEffect } from 'react';
import Badge from '../ui/Badge';
import Pagination from '../ui/Pagination';
import { formatCurrency } from '../../lib/data';
import { listVentasGrouped, type VentaFactura } from '../../lib/api';
import { useAuthRedirect } from '../../hooks/useAuthRedirect';

export default function SaleHistory() {
  useAuthRedirect();
  const [sales, setSales] = useState<VentaFactura[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const pageSize = 5;

  useEffect(() => {
    listVentasGrouped()
      .then((list) => setSales(list))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const totalPages = Math.ceil(sales.length / pageSize);
  const paginated = sales.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleExpand = (facturaId: string) => {
    setExpanded((prev) => (prev === facturaId ? null : facturaId));
  };

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
              {['Fecha', 'Productos', 'Cant.', 'Total', 'Ganancia', 'Estado'].map((h) => (
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
              paginated.map((sale) => {
                const isExpanded = expanded === sale.factura_id;
                const productCount = sale.productos?.length ?? 0;

                return (
                  <>
                    {/* Main row */}
                    <tr
                      key={sale.factura_id}
                      className="hover:bg-surface-container-lowest transition-colors group cursor-pointer"
                      onClick={() => productCount > 1 && toggleExpand(sale.factura_id)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-primary font-medium">
                            {new Date(sale.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                          {sale.fecha_cobro && (
                            <span className="text-on-surface-variant text-xs mt-0.5">
                              Cobro: {new Date(sale.fecha_cobro).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-primary font-body-base">
                        <div className="flex items-center gap-2">
                          {productCount === 1
                            ? sale.productos[0].nombre
                            : `${productCount} productos`}
                          {productCount > 1 && (
                            <span className="material-symbols-outlined text-on-surface-variant text-[16px]">
                              {isExpanded ? 'expand_less' : 'expand_more'}
                            </span>
                          )}
                        </div>
                      </td>
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

                    {/* Expanded product details */}
                    {isExpanded && sale.productos && (
                      <tr key={`${sale.factura_id}-detail`}>
                        <td colSpan={6} className="px-6 py-3 bg-surface-container-low/50">
                          <div className="pl-8 space-y-1">
                            {sale.productos.map((p, i) => (
                              <div key={i} className="flex justify-between text-sm text-on-surface-variant">
                                <span>{p.nombre}</span>
                                <span className="font-data-mono">
                                  {p.cantidad} x {formatCurrency(p.precio / p.cantidad)} = {formatCurrency(p.precio)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
            )}
            {!loading && !error && paginated.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant">
                  No hay ventas registradas todavia.
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
          onPageChange={setCurrentPage}
        />
      )}
    </section>
  );
}
