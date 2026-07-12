import { useState, useEffect, useCallback } from 'react';
import SummaryMetrics from './SummaryMetrics';
import CapitalTable from './CapitalTable';
import { getTotalCajas, listLiquidez, type TotalCaja, type Liquidez } from '../../lib/api';
import { useAuthRedirect } from '../../hooks/useAuthRedirect';

export default function DashboardClient() {
  useAuthRedirect();
  const [cajas, setCajas] = useState<TotalCaja[]>([]);
  const [netoLiquidezManual, setNetoLiquidezManual] = useState(0);
  const [loading, setLoading] = useState(true);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const fetchData = useCallback((params?: { desde?: string; hasta?: string }) => {
    setLoading(true);

    Promise.all([
      getTotalCajas(params).catch(() => [] as TotalCaja[]),
      listLiquidez(params).catch(() => [] as Liquidez[]),
    ]).then(([cajasData, liquidezData]) => {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-on-surface-variant">
        Cargando dashboard...
      </div>
    );
  }

  const totalInversion = cajas.reduce((s, r) => s + Number(r.costo_invertido_stock), 0);
  const totalGastos = cajas.reduce((s, r) => s + Number(r.costo_reposicion_total), 0);
  const liquidezDisponible = totalInversion - totalGastos + netoLiquidezManual;
  const gananciaTotal = cajas.reduce((s, r) => s + Number(r.ganancia_real_total), 0);
  const saludCartera = totalInversion > 0 ? Math.round((gananciaTotal / totalInversion) * 100) : 0;
  const unidadesVendidas = cajas.reduce((s, r) => s + Number(r.unidades_vendidas), 0);

  const metrics = { totalInversion, totalGastos, liquidezDisponible, saludCartera, gananciaTotal, unidadesVendidas };

  const handleFilter = () => {
    const params: { desde?: string; hasta?: string } = {};
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    fetchData(params);
  };

  const handleClear = () => {
    setDesde('');
    setHasta('');
    fetchData();
  };

  return (
    <div className="space-y-gutter">
      {/* Filtro por fechas */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex items-center gap-4 flex-wrap">
        <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider flex items-center gap-1">
          <span className="material-symbols-outlined text-lg">calendar_month</span>
          Filtrar por fecha
        </span>
        <div className="flex items-center gap-2">
          <label className="text-body-sm text-on-surface-variant">Desde</label>
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="px-3 py-1.5 border border-outline-variant rounded-lg text-body-sm focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none bg-surface-container-low"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-body-sm text-on-surface-variant">Hasta</label>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="px-3 py-1.5 border border-outline-variant rounded-lg text-body-sm focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none bg-surface-container-low"
          />
        </div>
        <button
          onClick={handleFilter}
          className="px-4 py-1.5 bg-secondary text-on-secondary text-body-sm font-semibold rounded-lg hover:bg-secondary-container transition-all active:scale-95"
        >
          Aplicar
        </button>
        {(desde || hasta) && (
          <button
            onClick={handleClear}
            className="px-4 py-1.5 border border-outline-variant text-on-surface-variant text-body-sm font-semibold rounded-lg hover:bg-surface-container-low transition-all"
          >
            Limpiar
          </button>
        )}
      </div>

      <SummaryMetrics metrics={metrics} />
      <CapitalTable rows={cajas} />
    </div>
  );
}
