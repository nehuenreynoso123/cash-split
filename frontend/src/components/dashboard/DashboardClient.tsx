import { useState, useEffect } from 'react';
import SummaryMetrics from './SummaryMetrics';
import CapitalTable from './CapitalTable';
import LiquidityChart from './LiquidityChart';
import PortfolioHealth from './PortfolioHealth';
import { getTotalCajas, type TotalCaja } from '../../lib/api';

export default function DashboardClient() {
  const [data, setData] = useState<TotalCaja[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTotalCajas()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-on-surface-variant">
        Cargando dashboard...
      </div>
    );
  }

  const totalInversion = data.reduce((s, r) => s + Number(r.costo_invertido_stock), 0);
  const totalGastos = data.reduce((s, r) => s + Number(r.costo_reposicion_total), 0);
  const liquidezDisponible = totalInversion - totalGastos;
  const gananciaTotal = data.reduce((s, r) => s + Number(r.ganancia_real_total), 0);
  const saludCartera = totalInversion > 0 ? Math.round((gananciaTotal / totalInversion) * 100) : 0;
  const unidadesVendidas = data.reduce((s, r) => s + Number(r.unidades_vendidas), 0);

  const metrics = { totalInversion, totalGastos, liquidezDisponible, saludCartera, gananciaTotal, unidadesVendidas };

  const rendimiento = data.length > 0 ? Math.round(data.reduce((s, r) => s + Number(r.ganancia_real_total), 0) / data.length) : 0;
  const controlGastos = totalInversion > 0 ? Math.round((1 - totalGastos / totalInversion) * 100) : 0;
  const retornoInversion = totalInversion > 0 ? parseFloat(((gananciaTotal / totalInversion) * 100).toFixed(1)) : 0;

  return (
    <div className="space-y-gutter">
      <SummaryMetrics metrics={metrics} />

      <CapitalTable rows={data} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        <LiquidityChart />
        <PortfolioHealth
          rendimiento={Math.min(rendimiento, 100)}
          controlGastos={Math.min(controlGastos, 100)}
          retornoInversion={Math.min(retornoInversion, 100)}
        />
      </div>
    </div>
  );
}
