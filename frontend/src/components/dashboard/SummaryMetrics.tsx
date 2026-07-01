import MetricCard from '../ui/MetricCard';
import { formatCurrency } from '../../lib/data';

interface Metrics {
  totalInversion: number;
  totalGastos: number;
  liquidezDisponible: number;
  saludCartera: number;
  gananciaTotal: number;
  unidadesVendidas: number;
}

interface Props {
  metrics: Metrics;
}

export default function SummaryMetrics({ metrics }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-gutter">
      <MetricCard
        title="Total Inversión"
        value={formatCurrency(metrics.totalInversion)}
        icon="account_balance"
        trend={{ label: '+12.5% vs mes anterior', direction: 'up' }}
      />
      <MetricCard
        title="Total Gastos"
        value={formatCurrency(metrics.totalGastos)}
        icon="receipt_long"
        iconColor="text-error"
        trend={{ label: '+4.2% incremento', direction: 'down', color: 'text-red-600' }}
      />
      <MetricCard
        title="Ganancia Total"
        value={formatCurrency(metrics.gananciaTotal)}
        icon="savings"
        iconColor="text-green-600"
        trend={{ label: 'Caja Ganancia', direction: 'up', color: 'text-green-600' }}
      />
      <MetricCard
        title="Unidades Vendidas"
        value={metrics.unidadesVendidas.toLocaleString()}
        icon="inventory_2"
      />
      <MetricCard
        title="Liquidez Disponible"
        value={formatCurrency(metrics.liquidezDisponible)}
        icon="account_balance_wallet"
      />
      <MetricCard
        title="Salud de Cartera"
        value={`${metrics.saludCartera}%`}
        icon="monitoring"
        variant="primary"
      >
        <div className="mt-4 flex gap-1 h-2">
          <div className="bg-secondary-container h-full w-[70%] rounded-full" />
          <div className="bg-surface-variant h-full w-[30%] rounded-full opacity-30" />
        </div>
        <p className="font-body-sm text-primary-fixed opacity-70 leading-tight mt-2">
          Tu tasa de retorno actual es superior al 18% anual.
        </p>
      </MetricCard>
    </div>
  );
}
