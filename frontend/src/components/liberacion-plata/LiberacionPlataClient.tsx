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

  return (
    <div>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h3 className="font-headline-md text-headline-md text-on-surface">
            Liberaciones de Plata
          </h3>
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
