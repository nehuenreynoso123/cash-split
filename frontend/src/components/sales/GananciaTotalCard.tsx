import { useState, useEffect } from 'react';
import { formatCurrency } from '../../lib/data';
import { listVentas } from '../../lib/api';
import { useAuthRedirect } from '../../hooks/useAuthRedirect';

export default function GananciaTotalCard() {
  useAuthRedirect();
  const [totalGanancia, setTotalGanancia] = useState(0);
  const [cantidad, setCantidad] = useState(0);

  useEffect(() => {
    listVentas().then((list) => {
      setCantidad(list.length);
      const total = list.reduce((sum, v) => sum + (v.ganancia != null ? Number(v.ganancia) : 0), 0);
      setTotalGanancia(total);
    }).catch(() => {});
  }, []);

  return (
    <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl flex flex-col gap-2">
      <span className="text-on-surface-variant font-label-caps uppercase tracking-wider">Ganancia Total</span>
      <div className="flex items-baseline justify-between">
        <span className="font-data-mono text-display-lg text-green-600">{formatCurrency(totalGanancia)}</span>
        <span className="text-on-surface-variant flex items-center font-body-sm">{cantidad} ventas</span>
      </div>
    </div>
  );
}
