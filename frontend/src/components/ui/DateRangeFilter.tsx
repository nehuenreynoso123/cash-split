import { useState, useEffect, useMemo } from 'react';
import type { DateRangeParams } from '../../lib/api';

interface DateRangeFilterProps {
  onApply: (params: DateRangeParams) => void;
  onClear: () => void;
  initialDesde?: string;
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

/**
 * Presets de mes. El foco es que comparar dos meses no requiera escribir cuatro
 * fechas a mano: dos clics y el rango queda aplicado.
 *
 * "Mes anterior" cierra el rango en el último día de ese mes porque el backend
 * trata `hasta` como inclusivo (created_at < hasta + 1 día). Con `hasta` vacío
 * el filtro queda abierto hacia adelante, que es lo correcto para "Este mes" y
 * "Últimos 3 meses".
 */
function buildPresets(now: Date) {
  const thisMonth = startOfMonth(now);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

  return [
    { label: 'Este mes', params: { desde: toISO(thisMonth) } },
    { label: 'Mes anterior', params: { desde: toISO(lastMonth), hasta: toISO(endOfMonth(lastMonth)) } },
    { label: 'Últimos 3 meses', params: { desde: toISO(twoMonthsAgo) } },
  ] as const;
}

export default function DateRangeFilter({ onApply, onClear, initialDesde = '' }: DateRangeFilterProps) {
  const [desde, setDesde] = useState(initialDesde);
  const [hasta, setHasta] = useState('');

  const presets = useMemo(() => buildPresets(new Date()), []);

  // El padre puede cambiar el rango por defecto (ej. al navegar de mes) y la
  // fecha tiene que seguirlo. Antes useState(initialDesde) lo leía una sola vez
  // en el montaje y el input mostraba un rango que ya no era el aplicado.
  useEffect(() => {
    setDesde(initialDesde);
  }, [initialDesde]);

  // String comparison is correct for YYYY-MM-DD dates.
  const invalid = !!desde && !!hasta && desde > hasta;

  const handleApply = () => {
    const params: DateRangeParams = {};
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    onApply(params);
  };

  const handlePreset = (params: DateRangeParams) => {
    setDesde(params.desde ?? '');
    setHasta(params.hasta ?? '');
    onApply(params);
  };

  const handleClear = () => {
    setDesde('');
    setHasta('');
    onClear();
  };

  const isPresetActive = (params: DateRangeParams) => params.desde === desde && (params.hasta ?? '') === hasta;

  return (
    <div>
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex items-center gap-4 flex-wrap">
        <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider flex items-center gap-1">
          <span className="material-symbols-outlined text-lg">calendar_month</span>
          Filtrar por fecha
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {presets.map((preset) => {
            const active = isPresetActive(preset.params);
            return (
              <button
                key={preset.label}
                onClick={() => handlePreset(preset.params)}
                className={`px-3 py-1.5 rounded-lg text-body-sm font-semibold border transition-colors ${
                  active
                    ? 'bg-secondary-container text-on-secondary-container border-secondary'
                    : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-body-sm text-on-surface-variant">Desde</label>
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="px-3 py-1.5 border border-outline-variant rounded-lg text-body-sm focus:ring-2 focus:border-secondary/20 focus:border-secondary outline-none bg-surface-container-low"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-body-sm text-on-surface-variant">Hasta</label>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="px-3 py-1.5 border border-outline-variant rounded-lg text-body-sm focus:ring-2 focus:border-secondary/20 focus:border-secondary outline-none bg-surface-container-low"
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
