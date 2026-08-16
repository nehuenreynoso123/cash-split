import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useAuthRedirect } from '../../hooks/useAuthRedirect';
import {
  createLumixCliente,
  deleteLumixCliente,
  listLumixClientes,
  type LumixCliente,
} from '../../lib/api';
import { formatLocalDate, todayISO } from '../../lib/data';

const COLUMNS = [
  'Usuario',
  'Contraseña',
  'Vencimiento',
  'Nombre del Cliente',
  'Nro de WhatsApp',
  'De quién es',
  '',
];

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'date';
  required?: boolean;
  placeholder?: string;
  helper?: string;
}

// Labeled field with the shared input shell used by every form input.
function Field({ label, value, onChange, type = 'text', required, placeholder, helper }: FieldProps) {
  return (
    <div className="space-y-2">
      <label className="font-label-caps text-on-surface-variant uppercase">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full h-12 px-4 border border-outline-variant rounded-xl focus:ring-2 focus:ring-secondary outline-none transition-all"
      />
      {helper && <p className="text-on-surface-variant font-body-sm">{helper}</p>}
    </div>
  );
}

export default function LumixClientes() {
  useAuthRedirect();

  // Clients are persisted server-side; the list is loaded once on mount and
  // new rows are appended with the backend-assigned id.
  const [clientes, setClientes] = useState<LumixCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // Form state
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  // Dates start EMPTY to avoid a hydration mismatch (the static build bakes the
  // build-time clock into SSR output); they are filled after mount below.
  const [vencimiento, setVencimiento] = useState('');
  const [nombreCliente, setNombreCliente] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [dueno, setDueno] = useState('');
  // Autocomplete de "de quién es el cliente"
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  // Feedback
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listLumixClientes()
      .then((rows) => {
        if (!cancelled) setClientes(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : 'No se pudieron cargar los clientes.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Default the vencimiento input to today, client-side only.
  useEffect(() => {
    setVencimiento(todayISO());
  }, []);

  // Distinct owner names already loaded ("de quién es el cliente") — feeds the
  // form autocomplete, deduped. Shows on focus, no minimum chars (same
  // reasoning as facturación's issuer-name autocomplete: the names are few).
  const duenosExistentes = Array.from(
    new Set(clientes.map((c) => (c.dueno ?? '').trim()).filter((d) => d.length > 0)),
  );

  const duenoQuery = dueno.trim().toLowerCase();
  const duenoMatches = duenoQuery
    ? duenosExistentes.filter((d) => d.toLowerCase().includes(duenoQuery))
    : duenosExistentes;

  // A stale active index must never point at a different list: reset it on
  // every query change (ArrowDown/ArrowUp navigate within the current list).
  useEffect(() => {
    setActiveIndex(-1);
  }, [duenoQuery]);

  // Keyboard navigation: ArrowDown/ArrowUp move the active suggestion, Enter
  // selects it (preventDefault so the form does not submit), Escape closes.
  const handleDuenoKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      if (suggestionsOpen) {
        e.preventDefault();
        setSuggestionsOpen(false);
        setActiveIndex(-1);
      }
      return;
    }
    if (!suggestionsOpen || duenoMatches.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % duenoMatches.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? duenoMatches.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < duenoMatches.length) {
        e.preventDefault();
        setDueno(duenoMatches[activeIndex]);
        setActiveIndex(-1);
        setSuggestionsOpen(false);
      }
      // No active index: let Enter submit the form as usual.
    }
  };

  // whatsapp and dueno are OPTIONAL (validated on the backend too); the four
  // required fields gate the submit button.
  const invalid = !usuario.trim() || !contrasena.trim() || !vencimiento || !nombreCliente.trim();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (invalid) return;

    setSubmitting(true);
    try {
      const row = await createLumixCliente({
        usuario: usuario.trim(),
        contrasena: contrasena.trim(),
        vencimiento,
        nombreCliente: nombreCliente.trim(),
        whatsapp: whatsapp.trim(),
        dueno: dueno.trim(),
      });

      // Backend lists rows ordered by nombre_cliente ASC — append the created
      // row and re-sort locally so the display order stays consistent.
      setClientes((prev) =>
        [...prev, row].sort((a, b) => {
          const byName = a.nombre_cliente.localeCompare(b.nombre_cliente);
          return byName !== 0 ? byName : a.id - b.id;
        }),
      );

      setDone(true);
      setError('');

      // Brief "¡Cliente Cargado!" feedback, then reset to defaults.
      setTimeout(() => {
        setDone(false);
        setUsuario('');
        setContrasena('');
        setVencimiento(todayISO());
        setNombreCliente('');
        setWhatsapp('');
        setDueno('');
        setSuggestionsOpen(false);
        setActiveIndex(-1);
      }, 2000);
    } catch (err) {
      // Keep the draft intact so the user can fix and retry.
      setError(
        err instanceof Error ? err.message : 'No se pudo cargar el cliente. Inténtalo de nuevo.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Destructive action: the user must confirm before the row is deleted.
  const handleDelete = async (id: number) => {
    const confirmed = window.confirm('¿Borrar este cliente? Esta acción no se puede deshacer.');
    if (!confirmed) return;
    setDeleteError('');
    try {
      await deleteLumixCliente(id);
      setClientes((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'No se pudo borrar el cliente.');
    }
  };

  return (
    <div className="space-y-gutter">
      {/* Clientes table */}
      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">live_tv</span>
            <h3 className="font-headline-md text-headline-md text-primary">Clientes Lumix</h3>
          </div>
          {!loading && !loadError && (
            <span className="text-on-surface-variant font-body-sm">
              {clientes.length} {clientes.length === 1 ? 'cliente' : 'clientes'}
            </span>
          )}
        </div>

        {loading ? (
          <p className="px-6 py-12 text-center text-on-surface-variant font-body-sm">
            Cargando clientes…
          </p>
        ) : loadError ? (
          <p role="alert" className="px-6 py-12 text-center text-error font-body-sm">
            {loadError}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-bright border-b border-outline-variant">
                  {COLUMNS.map((c) => (
                    <th
                      key={c || '__actions__'}
                      className={`px-6 py-4 font-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap ${
                        c === '' ? 'text-right' : ''
                      }`}
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {clientes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={COLUMNS.length}
                      className="px-6 py-12 text-center text-on-surface-variant"
                    >
                      No hay clientes cargados todavía.
                    </td>
                  </tr>
                ) : (
                  clientes.map((c) => (
                    <tr key={c.id} className="hover:bg-surface-container-lowest transition-colors group">
                      <td className="px-6 py-4 font-data-mono text-on-surface-variant whitespace-nowrap">
                        {c.usuario}
                      </td>
                      <td className="px-6 py-4 font-data-mono text-on-surface-variant whitespace-nowrap">
                        {c.contrasena}
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant whitespace-nowrap">
                        {formatLocalDate(c.vencimiento)}
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant">{c.nombre_cliente}</td>
                      <td className="px-6 py-4 font-data-mono text-on-surface-variant whitespace-nowrap">
                        {c.whatsapp || '—'}
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant whitespace-nowrap">
                        {c.dueno || '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id)}
                          aria-label={`Borrar cliente ${c.usuario}`}
                          title="Borrar cliente"
                          className="p-2 text-on-surface-variant hover:text-error hover:bg-error/5 rounded-lg transition-all"
                        >
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {deleteError && (
        <p role="alert" className="text-error font-body-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          {deleteError}
        </p>
      )}

      {/* Cargar Cliente form */}
      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">add_circle</span>
            <h3 className="font-headline-md text-headline-md text-primary">Cargar Cliente</h3>
          </div>
          <span className="text-on-surface-variant font-body-sm">Datos en el servidor</span>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field
              label="Usuario"
              value={usuario}
              onChange={setUsuario}
              placeholder="Usuario de la app"
              required
            />
            <Field
              label="Contraseña"
              value={contrasena}
              onChange={setContrasena}
              placeholder="Contraseña de la app"
              required
            />
            <Field
              label="Vencimiento"
              type="date"
              value={vencimiento}
              onChange={setVencimiento}
              required
            />
            <Field
              label="Nombre del Cliente"
              value={nombreCliente}
              onChange={setNombreCliente}
              placeholder="Nombre y apellido"
              required
            />
            <Field
              label="Nro de WhatsApp"
              value={whatsapp}
              onChange={setWhatsapp}
              placeholder="Ej: 5491112345678"
              helper="Opcional"
            />
            {/* De quién es el cliente — autocomplete over the owners already
                loaded: shows on focus, no minimum chars. */}
            <div className="space-y-2">
              <label className="font-label-caps text-on-surface-variant uppercase">
                De quién es el cliente
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={dueno}
                  onChange={(e) => {
                    setDueno(e.target.value);
                    setSuggestionsOpen(true);
                  }}
                  onFocus={() => setSuggestionsOpen(true)}
                  onBlur={() => setSuggestionsOpen(false)}
                  onKeyDown={handleDuenoKeyDown}
                  placeholder="Vendedor / revendedor"
                  className="w-full h-12 px-4 border border-outline-variant rounded-xl focus:ring-2 focus:ring-secondary outline-none transition-all"
                />
                {suggestionsOpen && duenoMatches.length > 0 && (
                  <ul className="absolute z-10 mt-1 w-full bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-lg">
                    {duenoMatches.map((name, index) => (
                      <li key={name}>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setDueno(name);
                            setActiveIndex(-1);
                            setSuggestionsOpen(false);
                          }}
                          onMouseEnter={() => setActiveIndex(index)}
                          className={`w-full text-left px-4 py-2.5 transition-colors ${
                            index === activeIndex
                              ? 'bg-surface-container text-on-surface'
                              : 'text-on-surface-variant hover:bg-surface-container'
                          }`}
                        >
                          {name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <p className="text-on-surface-variant font-body-sm">Opcional</p>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-error font-body-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={invalid || done || submitting}
            className={`w-full h-14 font-bold rounded-xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg ${
              done
                ? 'bg-primary text-on-primary'
                : 'bg-secondary text-on-secondary hover:bg-secondary-container shadow-secondary/10'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {done ? (
              <>
                <span className="material-symbols-outlined">done_all</span>
                ¡Cliente Cargado!
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">check_circle</span>
                Cargar Cliente
              </>
            )}
          </button>
        </form>
      </section>
    </div>
  );
}
