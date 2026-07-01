import { useState, useEffect } from 'react';
import SummaryMetrics from './SummaryMetrics';
import CapitalTable from './CapitalTable';
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

  return (
    <div className="space-y-gutter">
      <SummaryMetrics metrics={metrics} />
      <CapitalTable rows={data} />
    </div>
  );
}
