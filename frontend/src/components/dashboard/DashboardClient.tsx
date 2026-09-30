import { useState, useEffect, useCallback, useRef } from 'react';
import ComparativaMensualView from './ComparativaMensual';
import CapitalTable from './CapitalTable';
import DateRangeFilter from '../ui/DateRangeFilter';
import {
  getComparativaMensual,
  getTotalCajas,
  type ComparativaMensual,
  type TotalCaja,
  type DateRangeParams,
} from '../../lib/api';
import { useAuthRedirect } from '../../hooks/useAuthRedirect';

// Cuántos meses muestra la comparativa. Es la longitud de la serie, NO un
// filtro: la comparativa siempre compara meses contra meses. El DateRangeFilter
// de abajo sigue aplicando a CapitalTable, que sí es una vista por período.
const MESES_COMPARATIVA = 6;

export default function DashboardClient() {
  useAuthRedirect();
  const [comparativa, setComparativa] = useState<ComparativaMensual | null>(null);
  const [cajas, setCajas] = useState<TotalCaja[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestIdRef = useRef(0);
  // El "desde" por defecto arranca el día 1 del mes actual
  const now = new Date();
  const firstDayOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  // La comparativa NO depende del rango de fechas: su unidad es el mes, y se
  // compara contra el mes anterior. Por eso pide los 6 meses una sola vez, en
  // el mismo lote que las cajas, y no vuelve a pedirla cuando el usuario cambia
  // el filtro. Si dependiera del rango, "Este mes" dejaría una sola fila y la
  // comparación — que es el punto de la pantalla — desaparecería.
  const fetchComparativa = useCallback(() => {
    return getComparativaMensual({ meses: MESES_COMPARATIVA }).catch(() => null);
  }, []);

  const fetchCajas = useCallback((params?: DateRangeParams) => {
    return getTotalCajas(params).catch(() => [] as TotalCaja[]);
  }, []);

  const fetchData = useCallback(
    (params?: DateRangeParams) => {
      const requestId = ++requestIdRef.current;
      setLoading(true);
      setError('');

      Promise.all([fetchComparativa(), fetchCajas(params)])
        .then(([comparativaData, cajasData]) => {
          // Guarda contra respuestas viejas: dos cambios rápidos de rango pueden
          // llegar en orden inverso y pintar el período anterior.
          if (requestId !== requestIdRef.current) return;
          if (!comparativaData) {
            setError('No se pudo cargar la comparativa mensual');
            setLoading(false);
            return;
          }
          setComparativa(comparativaData);
          setCajas(cajasData);
          setLoading(false);
        })
        .catch((err) => {
          if (requestId !== requestIdRef.current) return;
          setError(err instanceof Error ? err.message : 'No se pudo cargar el dashboard');
          setLoading(false);
        });
    },
    [fetchComparativa, fetchCajas],
  );

  // Carga inicial al montar el componente: aplica el rango por defecto (desde el día 1 del mes actual)
  useEffect(() => {
    fetchData({ desde: firstDayOfMonth });
  }, [fetchData, firstDayOfMonth]);

  if (error) {
    return <div className="p-10 text-center text-error">{error}</div>;
  }

  if (loading || !comparativa) {
    return (
      <div className="space-y-gutter">
        {/* El filtro se mantiene montado durante la carga para no perder el rango aplicado */}
        <DateRangeFilter initialDesde={firstDayOfMonth} onApply={(params) => fetchData(params)} onClear={() => fetchData()} />
        <div className="flex items-center justify-center h-64 text-on-surface-variant">
          Cargando dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-gutter">
      <DateRangeFilter initialDesde={firstDayOfMonth} onApply={(params) => fetchData(params)} onClear={() => fetchData()} />

      {/* Sección principal: la comparativa mes a mes. Reemplaza a SummaryMetrics,
          que mezclaba el stock de mercadería de hoy con los flujos del período en
          una sola fórmula y además mostraba tendencias fijas inventadas
          ("+12.5% vs mes anterior"). */}
      <ComparativaMensualView data={comparativa} />

      {/* Sección secundaria: el detalle por producto. El rango de fechas de arriba
          SÍ lo afecta, y por eso vive acá y no arriba de la comparativa. */}
      <div>
        <h3 className="font-headline-md text-headline-md text-primary mb-1">Detalle por producto</h3>
        <p className="text-on-surface-variant text-body-sm mb-4">
          Desglose del rango de fechas seleccionado. La columna "Costo Invertido" es el valor de la mercadería
          {' '}que tenés hoy en el estante, no un flujo del período: no se compara contra el mes anterior.
        </p>
        <CapitalTable rows={cajas} />
      </div>
    </div>
  );
}
