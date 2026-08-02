import { useState, useEffect, useCallback, useRef } from 'react';
import SummaryMetrics from './SummaryMetrics';
import CapitalTable from './CapitalTable';
import DateRangeFilter from '../ui/DateRangeFilter';
import { getTotalCajas, listLiquidez, type TotalCaja, type Liquidez, type DateRangeParams } from '../../lib/api';
import { useAuthRedirect } from '../../hooks/useAuthRedirect';

export default function DashboardClient() {
  useAuthRedirect();
  const [cajas, setCajas] = useState<TotalCaja[]>([]);
  const [netoLiquidezManual, setNetoLiquidezManual] = useState(0);
  const [loading, setLoading] = useState(true);
  const requestIdRef = useRef(0);

  const fetchData = useCallback((params?: DateRangeParams) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);

    Promise.all([
      getTotalCajas(params).catch(() => [] as TotalCaja[]),
      listLiquidez(params).catch(() => [] as Liquidez[]),
    ]).then(([cajasData, liquidezData]) => {
      if (requestId !== requestIdRef.current) return;
      setCajas(cajasData);
      const neto = liquidezData.reduce((s, l) => {
        return l.tipo === 'ingreso' ? s + Number(l.monto) : s - Number(l.monto);
      }, 0);
      setNetoLiquidezManual(neto);
      setLoading(false);
    });
  }, []);

  // Carga inicial al montar el componente
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalInversion = cajas.reduce((s, r) => s + Number(r.costo_invertido_stock), 0);
  const totalGastos = cajas.reduce((s, r) => s + Number(r.costo_reposicion_total), 0);
  const liquidezDisponible = totalInversion - totalGastos + netoLiquidezManual;
  const gananciaTotal = cajas.reduce((s, r) => s + Number(r.ganancia_real_total), 0);
  const saludCartera = totalInversion > 0 ? Math.round((gananciaTotal / totalInversion) * 100) : 0;
  const unidadesVendidas = cajas.reduce((s, r) => s + Number(r.unidades_vendidas), 0);

  const metrics = { totalInversion, totalGastos, liquidezDisponible, saludCartera, gananciaTotal, unidadesVendidas };

  return (
    <div className="space-y-gutter">
      {/* Filtro por fechas — se mantiene montado durante la carga para no perder el rango aplicado */}
      <DateRangeFilter onApply={(params) => fetchData(params)} onClear={() => fetchData()} />

      {loading ? (
        <div className="flex items-center justify-center h-64 text-on-surface-variant">
          Cargando dashboard...
        </div>
      ) : (
        <>
          <SummaryMetrics metrics={metrics} />
          <CapitalTable rows={cajas} />
        </>
      )}
    </div>
  );
}
