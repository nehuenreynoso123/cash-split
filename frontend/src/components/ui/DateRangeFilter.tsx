import { useState } from 'react';
import type { DateRangeParams } from '../../lib/api';

interface DateRangeFilterProps {
  onApply: (params: DateRangeParams) => void;
  onClear: () => void;
  initialDesde?: string;
}

export default function DateRangeFilter({ onApply, onClear, initialDesde = '' }: DateRangeFilterProps) {
  const [desde, setDesde] = useState(initialDesde);
  const [hasta, setHasta] = useState('');

  // String comparison is correct for YYYY-MM-DD dates.
  const invalid = !!desde && !!hasta && desde > hasta;

  const handleApply = () => {
    const params: DateRangeParams = {};
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    onApply(params);
  };

  const handleClear = () => {
    setDesde('');
    setHasta('');
    onClear();
  };

  return (
    <div>
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
          onClick={handleApply}
          disabled={invalid}
          className="px-4 py-1.5 bg-secondary text-on-secondary text-body-sm font-semibold rounded-lg hover:bg-secondary-container transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-secondary disabled:active:scale-100"
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
      {invalid && (
        <p className="text-body-sm text-error mt-1">La fecha "desde" no puede ser mayor que "hasta"</p>
      )}
    </div>
  );
}
