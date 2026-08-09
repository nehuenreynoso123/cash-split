import { useState, useEffect } from 'react';
import { listProductos, type Producto } from '../../lib/api';
import Badge from '../ui/Badge';
import { useAuthRedirect } from '../../hooks/useAuthRedirect';

// Whole days between fecha_carga and today. fecha_carga is an opaque 'YYYY-MM-DD'
// string: parse its components directly instead of new Date(...) so no UTC instant
// interpretation is involved. today is normalized to local midnight expressed as
// UTC (Date.UTC on y/m/d) so DST shifts never cause an off-by-one.
function daysInStock(fechaCarga: string): number {
  const [y, m, d] = fechaCarga.slice(0, 10).split('-').map(Number);
  const cargaUTC = Date.UTC(y, m - 1, d);
  const today = new Date();
  const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max(0, Math.floor((todayUTC - cargaUTC) / 86400000));
}

const RECIENTE_MAX_DAYS = 30;
const NORMAL_MAX_DAYS = 60;

function badgeForDays(days: number): { variant: 'success' | 'warning' | 'error'; label: string } {
  if (days <= RECIENTE_MAX_DAYS) return { variant: 'success', label: 'Reciente' };
  if (days <= NORMAL_MAX_DAYS) return { variant: 'warning', label: 'Normal' };
  return { variant: 'error', label: 'Antiguo' };
}

// Build a LOCAL Date from the 'YYYY-MM-DD' components — no instant shift.
function formatFechaCarga(fechaCarga: string): string {
  const [y, m, d] = fechaCarga.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function RotacionClient() {
  useAuthRedirect();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listProductos()
      .then(setProductos)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Oldest/riskiest first: days in stock descending.
  const rows = productos
    .map((p) => ({ producto: p, days: daysInStock(p.fecha_carga) }))
    .sort((a, b) => b.days - a.days);

  return (
    <div>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h3 className="font-headline-md text-headline-md text-on-surface mb-1">
            Rotación de Mercadería
          </h3>
          <p className="font-body-base text-on-surface-variant">
            Conocé cuánto tiempo lleva cada producto en stock y priorizá la rotación.
          </p>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                {['Producto', 'Fecha de carga', 'Días en stock', 'Estado'].map((h) => (
                  <th key={h} className={`px-6 py-4 font-label-caps text-label-caps text-on-surface-variant uppercase ${h === 'Días en stock' ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-on-surface-variant">Cargando...</td></tr>
              ) : error ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-error">{error}</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-on-surface-variant">No hay productos cargados</td></tr>
              ) : (
                rows.map(({ producto, days }) => {
                  const badge = badgeForDays(days);
                  return (
                    <tr key={producto.id} className="hover:bg-surface-container-lowest transition-colors group">
                      <td className="px-6 py-4 font-semibold text-primary">{producto.nombre}</td>
                      <td className="px-6 py-4 text-on-surface-variant">
                        {formatFechaCarga(producto.fecha_carga)}
                      </td>
                      <td className="px-6 py-4 text-right font-data-mono text-on-surface">{days}</td>
                      <td className="px-6 py-4">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
