import { useState, useEffect } from 'react';
import { listLiberaciones, type LiberacionPlata } from '../../lib/api';
import { formatCurrency } from '../../lib/data';
import { useAuthRedirect } from '../../hooks/useAuthRedirect';
import LiberacionPlataModal from './LiberacionPlataModal';

interface DayGroup {
  fecha: string; // YYYY-MM-DD
  total: number;
  liberaciones: LiberacionPlata[];
}

// Group liberations by day (fecha string). Preserve the backend's newest-first
// day ordering while sorting each day's liberations by hora ascending.
function groupByDay(liberaciones: LiberacionPlata[]): DayGroup[] {
  const map = new Map<string, LiberacionPlata[]>();
  for (const l of liberaciones) {
    const arr = map.get(l.fecha);
    if (arr) arr.push(l);
    else map.set(l.fecha, [l]);
  }
  return Array.from(map.entries()).map(([fecha, list]) => ({
    fecha,
    total: list.reduce((s, l) => s + Number(l.monto), 0),
    liberaciones: [...list].sort((a, b) => a.hora.localeCompare(b.hora)),
  }));
}

// Parse date-only 'YYYY-MM-DD' as local midnight so the rendered day never
// shifts to the previous day in negative-offset timezones (see formatLocalDate).
function dayLabel(fecha: string): string {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

// ── Weekly totals ───────────────────────────────────────────────
interface SemanaLiberacionInfo {
  etiqueta: string;
  rango: string;
  monto: number;
  cantidad: number;
}

// Monday of the ISO week containing `date`, computed locally (no UTC drift).
function startOfIsoWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d;
}

// Local 'YYYY-MM-DD' key so it groups by the same week as the liberation dates.
function toISODateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const dayFormatter = new Intl.DateTimeFormat('es-AR', { day: 'numeric' });
const shortMonthFormatter = new Intl.DateTimeFormat('es-AR', { month: 'short' });

// Week range label like "24–30 ago" (month on both sides when it spans two months).
function formatWeekRange(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const start = monday.getMonth() === sunday.getMonth()
    ? dayFormatter.format(monday)
    : `${dayFormatter.format(monday)} ${shortMonthFormatter.format(monday)}`;
  return `${start}–${dayFormatter.format(sunday)} ${shortMonthFormatter.format(sunday)}`;
}

// Total money released per ISO week. Sums the montos of every liberation whose
// fecha falls in each week, keyed by the Monday 'YYYY-MM-DD'.
function buildSemanasLiberacion(liberaciones: LiberacionPlata[]): SemanaLiberacionInfo[] {
  const porSemana = new Map<string, { monto: number; cantidad: number }>();
  for (const l of liberaciones) {
    const key = toISODateKey(startOfIsoWeek(new Date(`${l.fecha}T00:00:00`)));
    const current = porSemana.get(key) ?? { monto: 0, cantidad: 0 };
    current.monto += Number(l.monto);
    current.cantidad += 1;
    porSemana.set(key, current);
  }

  const labels = ['Esta semana', 'Próxima semana', 'En 2 semanas'];
  const today = startOfIsoWeek(new Date());

  return labels.map((etiqueta, offset) => {
    const monday = new Date(today);
    monday.setDate(monday.getDate() + offset * 7);
    const row = porSemana.get(toISODateKey(monday));
    return {
      etiqueta,
      rango: formatWeekRange(monday),
      monto: row?.monto ?? 0,
      cantidad: row?.cantidad ?? 0,
    };
  });
}

export default function LiberacionPlataClient() {
  useAuthRedirect();
  const [liberaciones, setLiberaciones] = useState<LiberacionPlata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const reload = () => {
    setLoading(true);
    listLiberaciones()
      .then(setLiberaciones)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(reload, []);

  const days = groupByDay(liberaciones);
  const totalGeneral = liberaciones.reduce((s, l) => s + Number(l.monto), 0);
  const semanas = buildSemanasLiberacion(liberaciones);

  return (
    <div>
      <div className="flex justify-between items-end mb-8">
        <div>
          <div className="flex items-center gap-4 mb-1">
            <h3 className="font-headline-md text-headline-md text-on-surface">
              Liberaciones de Plata
            </h3>
            {!loading && (
              <span className="font-data-mono text-display-sm text-primary">
                {formatCurrency(totalGeneral)}
              </span>
            )}
          </div>
          <p className="font-body-base text-on-surface-variant">
            Acá ves las liberaciones de plata agrupadas por día.
          </p>
        </div>
        <button
          className="bg-secondary text-on-secondary px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 hover:bg-secondary-container transition-all shadow-sm active:scale-95"
          onClick={() => setModalOpen(true)}
        >
          <span className="material-symbols-outlined">add_circle</span>
          Nueva Liberación
        </button>
      </div>

      {/* Total liberado por semana: independiente del listado por día */}
      {!loading && !error && (
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-green-600 text-xl">payments</span>
          <h3 className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
            Liberación por semana
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {semanas.map((semana) => (
            <div
              key={semana.etiqueta}
              className="bg-surface-container-lowest border border-outline-variant border-l-4 border-l-green-600 rounded-xl p-6 min-w-0"
            >
              <div className="flex items-center justify-between mb-3 min-w-0">
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider truncate">
                  {semana.etiqueta}
                </span>
                <span className="material-symbols-outlined text-green-600 shrink-0">account_balance_wallet</span>
              </div>
              <p className="text-body-sm text-on-surface-variant mb-2">{semana.rango}</p>
              <span className="font-data-mono text-display-lg text-green-600 block mb-2 break-all leading-tight">
                {formatCurrency(semana.monto)}
              </span>
              <p className="text-body-sm text-on-surface-variant">
                {semana.cantidad === 1 ? '1 liberación' : `${semana.cantidad} liberaciones`}
              </p>
            </div>
          ))}
        </div>
      </div>
      )}

      {loading ? (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm px-6 py-12 text-center text-on-surface-variant">
          Cargando...
        </div>
      ) : error ? (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm px-6 py-12 text-center text-error">
          {error}
        </div>
      ) : days.length === 0 ? (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm px-6 py-12 text-center text-on-surface-variant">
          No hay liberaciones registradas.
        </div>
      ) : (
        <div className="space-y-4">
          {days.map((day) => (
            <div
              key={day.fecha}
              className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
                <div className="flex items-center gap-3">
                  <span className="font-label-caps text-label-caps text-on-surface capitalize">
                    {dayLabel(day.fecha)}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-label-caps font-semibold bg-secondary/10 text-secondary">
                    {day.liberaciones.length}
                    {day.liberaciones.length === 1 ? ' liberación' : ' liberaciones'}
                  </span>
                </div>
                <span className="font-data-mono text-display-sm text-on-surface">
                  {formatCurrency(day.total)}
                </span>
              </div>

              <ul className="divide-y divide-outline-variant">
                {day.liberaciones.map((l) => (
                  <li
                    key={l.id}
                    className="flex items-center justify-between px-6 py-3 hover:bg-surface-container-lowest transition-colors"
                  >
                    <span className="font-data-mono text-on-surface-variant">{l.hora}</span>
                    <span className="font-data-mono text-on-surface">{formatCurrency(l.monto)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <LiberacionPlataModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          reload();
        }}
      />
    </div>
  );
}
