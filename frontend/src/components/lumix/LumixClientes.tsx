import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useAuthRedirect } from '../../hooks/useAuthRedirect';
import {
  createLumixCliente,
  deleteLumixCliente,
  getMensajeRenovacion,
  listLumixClientes,
  renovarLumixCliente,
  updateLumixClientePrecio,
  updateLumixClienteVencimiento,
  updateMensajeRenovacion,
  type LumixCliente,
} from '../../lib/api';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import { formatCurrency, formatLocalDate, todayISO } from '../../lib/data';
import {
  MENSAJE_RENOVACION_DEFAULT,
  clienteEstado,
  construirMensajeRenovacion,
  parsePrecioInput,
  parseSuscripcionText,
  sanitizarWhatsapp,
  type EstadoCliente,
} from '../../lib/lumix';

const COLUMNS = [
  'Estado',
  'Nombre del Cliente',
  'Usuario',
  'Contraseña',
  'Vencimiento',
  'Precio',
  'Nro de WhatsApp',
  'Vendedor',
  '',
];

// Estado del cliente → shared Badge mapping. The shared Badge (already used by
// ProductTable and RotacionClient) is the project's established status badge;
// reusing it keeps the Lumix table visually consistent with the other sections.
const ESTADO_BADGE: Record<EstadoCliente, { variant: 'success' | 'warning' | 'error'; label: string }> = {
  activo: { variant: 'success', label: 'Activo' },
  vence_pronto: { variant: 'warning', label: 'Vence pronto' },
  vencido: { variant: 'error', label: 'Vencido' },
};

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'date' | 'number';
  required?: boolean;
  placeholder?: string;
  helper?: string;
  step?: string;
}

// Labeled field with the shared input shell used by every form input.
function Field({ label, value, onChange, type = 'text', required, placeholder, helper, step }: FieldProps) {
  return (
    <div className="space-y-2">
      <label className="font-label-caps text-on-surface-variant uppercase">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        step={step}
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
  // "Vendedor" in the UI; the backend field and DB column keep the name dueno.
  const [dueno, setDueno] = useState('');
  // Optional price, kept as a string in the form (same as every other field);
  // '' means "no price" and is sent as null.
  const [precio, setPrecio] = useState('');
  // Vendedor autocomplete (fed by the dueno values already loaded).
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  // Feedback
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // "Pegar datos" flow: the manual-textarea fallback plus the paste feedback
  // line (auto-cleared, mirroring the submit "done" flash pattern).
  const [pasteFallbackOpen, setPasteFallbackOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteMessage, setPasteMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(
    null,
  );

  // Renovar: the target cliente plus the selected months drive the modal.
  const [renewTarget, setRenewTarget] = useState<LumixCliente | null>(null);
  const [renewMeses, setRenewMeses] = useState(12);
  const [renewing, setRenewing] = useState(false);
  const [renewError, setRenewError] = useState('');

  // Inline vencimiento editing: which row is being edited and its draft value.
  const [editingVencimientoId, setEditingVencimientoId] = useState<number | null>(null);
  const [vencimientoDraft, setVencimientoDraft] = useState('');
  const [vencimientoSavingId, setVencimientoSavingId] = useState<number | null>(null);
  // True after Escape: the pending blur (the input is unmounted by closing the
  // editor) must discard the draft instead of saving it.
  const [vencimientoEditCancelled, setVencimientoEditCancelled] = useState(false);
  // Inline precio editing: same pattern as the vencimiento editor, with its own
  // state so the two never collide.
  const [editingPrecioId, setEditingPrecioId] = useState<number | null>(null);
  const [precioDraft, setPrecioDraft] = useState('');
  const [precioSavingId, setPrecioSavingId] = useState<number | null>(null);
  const [precioEditCancelled, setPrecioEditCancelled] = useState(false);
  const [rowError, setRowError] = useState('');

  // "Consultar renovación" copy feedback, per row: which row the feedback
  // belongs to plus the ok/error message (auto-cleared like pasteMessage).
  const [copyMessage, setCopyMessage] = useState<{ id: number; type: 'ok' | 'error'; text: string } | null>(
    null,
  );

  // Renewal message template: loaded from the settings endpoint on mount and
  // used by the WhatsApp consult/copy flows. Loaded independently of the
  // clientes list so the table never blocks on it; a failure keeps the
  // frontend default.
  const [mensajeRenovacion, setMensajeRenovacion] = useState<string>(MENSAJE_RENOVACION_DEFAULT);
  // True when the saved template could not be loaded. Saving must then be
  // blocked: the draft would overwrite a server-side template we never saw.
  const [mensajeLoadFailed, setMensajeLoadFailed] = useState(false);
  // Template editing modal state.
  const [mensajeModalOpen, setMensajeModalOpen] = useState(false);
  const [mensajeDraft, setMensajeDraft] = useState('');
  const [mensajeSaving, setMensajeSaving] = useState(false);
  const [mensajeError, setMensajeError] = useState('');
  const [mensajeSaved, setMensajeSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMensajeRenovacion()
      .then((mensaje) => {
        if (!cancelled) setMensajeRenovacion(mensaje);
      })
      .catch(() => {
        // Real failure only: the GET endpoint falls back to the default with
        // 200 when no row exists, so a catch means 401/network. Keep the
        // frontend default but flag it so saving cannot clobber an unseen
        // server-side template.
        if (!cancelled) setMensajeLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  // Local today (same convention as the vencimiento inputs / data.ts todayISO).
  const hoy = todayISO();

  // Distinct seller names already loaded — feeds the vendedor autocomplete,
  // deduped. Shows on focus, no minimum chars (same reasoning as facturación's
  // issuer-name autocomplete: the names are few).
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
  // required fields gate the submit button. precio is optional too, but when
  // filled it must parse as a positive es-AR number.
  const precioValido = precio.trim() === '' || parsePrecioInput(precio) !== null;
  const invalid =
    !usuario.trim() ||
    !contrasena.trim() ||
    !vencimiento ||
    !nombreCliente.trim() ||
    !precioValido;

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
        // '' (no price) is sent as null, matching the nullable backend column;
        // otherwise parse the es-AR value ("15.000" → 15000).
        precio: parsePrecioInput(precio),
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
        setPrecio('');
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

  // "Pegar datos": reads the clipboard (secure contexts only) and fills the
  // form from the pasted subscription text. On any failure — insecure context,
  // permission denied, empty text — it opens the manual textarea fallback
  // instead of failing silently.
  const handlePasteClick = async () => {
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard || !window.isSecureContext) {
        throw new Error('clipboard unavailable');
      }
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        setPasteFallbackOpen(true);
        setPasteMessage({ type: 'error', text: 'El portapapeles está vacío.' });
        return;
      }
      aplicarDatosPegados(text);
    } catch {
      setPasteFallbackOpen(true);
      setPasteMessage({ type: 'error', text: 'No se pudo leer el portapapeles.' });
    }
  };

  // Applies parsed subscription data to the form. Only the fields the text
  // actually contains are filled; the rest of the form keeps its values.
  const aplicarDatosPegados = (text: string) => {
    const datos = parseSuscripcionText(text);
    const reconocido =
      datos.usuario !== undefined ||
      datos.contrasena !== undefined ||
      datos.vencimiento !== undefined ||
      datos.vencimientoError !== undefined;
    if (!reconocido) {
      setPasteMessage({ type: 'error', text: 'No se pudieron reconocer los datos pegados.' });
      return;
    }
    if (datos.usuario !== undefined) setUsuario(datos.usuario);
    if (datos.contrasena !== undefined) setContrasena(datos.contrasena);
    if (datos.vencimiento !== undefined) setVencimiento(datos.vencimiento);
    if (datos.vencimientoError) {
      // Partial fill: credentials were recognized but the date was malformed.
      setPasteMessage({
        type: 'error',
        text: 'La fecha de vencimiento del texto no se pudo interpretar.',
      });
    } else {
      setPasteMessage({ type: 'ok', text: 'Datos cargados desde el portapapeles.' });
      // Clear the manual textarea so reopening the fallback never re-applies
      // stale credentials from a previous paste.
      setPasteText('');
      setPasteFallbackOpen(false);
    }
  };

  // Auto-clear the paste feedback line (same timing pattern as the submit
  // "¡Cliente Cargado!" flash).
  useEffect(() => {
    if (!pasteMessage) return;
    const timer = setTimeout(() => setPasteMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [pasteMessage]);

  // Auto-clear the "consultar renovación" copy feedback (same timing as the
  // paste feedback line).
  useEffect(() => {
    if (!copyMessage) return;
    const timer = setTimeout(() => setCopyMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [copyMessage]);

  // Brief "Mensaje guardado" flash inside the template modal, then close. The
  // cleanup keeps a pending timer from force-closing a freshly reopened modal.
  useEffect(() => {
    if (!mensajeSaved) return;
    const timer = setTimeout(() => {
      setMensajeModalOpen(false);
      setMensajeSaved(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [mensajeSaved]);

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

  // Inline vencimiento editor: opens on the date cell, saves on blur/Enter,
  // Escape cancels. Only calls the API when the date actually changed.
  const startEditVencimiento = (c: LumixCliente) => {
    setEditingVencimientoId(c.id);
    setVencimientoDraft(c.vencimiento);
    setVencimientoEditCancelled(false);
    setRowError('');
  };

  const saveVencimiento = async (c: LumixCliente) => {
    const newDate = vencimientoDraft;
    setEditingVencimientoId(null);
    // Escape cancelled the edit: discard the draft instead of saving it.
    if (vencimientoEditCancelled) return;
    // Empty (cleared picker) or unchanged: nothing to persist.
    if (!newDate || newDate === c.vencimiento) return;
    // Re-entrancy guard: Enter unmounts the input, which fires a second blur
    // with the same draft; only one PUT should go out.
    if (vencimientoSavingId === c.id) return;
    setVencimientoSavingId(c.id);
    setRowError('');
    try {
      const updated = await updateLumixClienteVencimiento(c.id, newDate);
      // The backend returns the row with its new vencimiento; replace in place.
      setClientes((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
    } catch (err) {
      setRowError(err instanceof Error ? err.message : 'No se pudo actualizar el vencimiento.');
    } finally {
      setVencimientoSavingId(null);
    }
  };

  // Inline precio editor: same lifecycle as the vencimiento editor (save on
  // blur/Enter, Escape cancels, re-entrancy guard, rowError on failure). One
  // deliberate difference: an empty draft means "clear the price" (null),
  // because — unlike vencimiento — the column IS nullable and clearing is a
  // legitimate edit.
  const startEditPrecio = (c: LumixCliente) => {
    setEditingPrecioId(c.id);
    setPrecioDraft(c.precio !== null ? String(c.precio) : '');
    setPrecioEditCancelled(false);
    setRowError('');
  };

  const savePrecio = async (c: LumixCliente) => {
    const raw = precioDraft.trim();
    setEditingPrecioId(null);
    // Escape cancelled the edit: discard the draft instead of saving it.
    if (precioEditCancelled) return;
    // Empty → null (clears the price); otherwise must parse as a positive
    // es-AR number ("15.000" → 15000, "15000,50" → 15000.5).
    const target = parsePrecioInput(raw);
    if (raw !== '' && target === null) {
      setRowError('Precio inválido: debe ser un número mayor que 0.');
      return;
    }
    // Unchanged: nothing to persist.
    if (target === c.precio) return;
    // Re-entrancy guard: Enter unmounts the input, which fires a second blur
    // with the same draft; only one PUT should go out.
    if (precioSavingId === c.id) return;
    setPrecioSavingId(c.id);
    setRowError('');
    try {
      const updated = await updateLumixClientePrecio(c.id, target);
      // The backend returns the row with its new precio; replace in place.
      setClientes((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
    } catch (err) {
      setRowError(err instanceof Error ? err.message : 'No se pudo actualizar el precio.');
    } finally {
      setPrecioSavingId(null);
    }
  };

  // "Consultar renovación": opens WhatsApp with the prefilled renewal message
  // (built from the editable, server-persisted template) in a new tab. Rows
  // without a whatsapp number fall back to copying the message so the consult
  // never dead-ends silently.
  const handleConsultarRenovacion = (c: LumixCliente) => {
    const numero = sanitizarWhatsapp(c.whatsapp);
    if (!numero) {
      handleCopiarMensaje(c);
      return;
    }
    const mensaje = construirMensajeRenovacion(c, mensajeRenovacion);
    window.open(
      `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  const handleCopiarMensaje = async (c: LumixCliente) => {
    try {
      // Secure contexts only, same guard as the "Pegar datos" flow.
      if (typeof navigator === 'undefined' || !navigator.clipboard || !window.isSecureContext) {
        throw new Error('clipboard unavailable');
      }
      await navigator.clipboard.writeText(construirMensajeRenovacion(c, mensajeRenovacion));
      setCopyMessage({ id: c.id, type: 'ok', text: 'Mensaje copiado' });
    } catch {
      setCopyMessage({ id: c.id, type: 'error', text: 'No se pudo copiar el mensaje' });
    }
  };

  // Renovar: opens the modal with a default of 12 months (a full year).
  const openRenew = (c: LumixCliente) => {
    setRenewTarget(c);
    setRenewMeses(12);
    setRenewError('');
  };

  const closeRenew = () => {
    setRenewTarget(null);
    setRenewError('');
  };

  const handleRenewSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!renewTarget) return;
    setRenewing(true);
    setRenewError('');
    try {
      const updated = await renovarLumixCliente(renewTarget.id, renewMeses);
      // The new vencimiento was computed server-side; replace the row in place.
      setClientes((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setRenewTarget(null);
    } catch (err) {
      setRenewError(err instanceof Error ? err.message : 'No se pudo renovar la suscripción.');
    } finally {
      setRenewing(false);
    }
  };

  // Template editing modal: the draft always starts from the currently loaded
  // template (saved or default).
  const openMensajeModal = () => {
    setMensajeDraft(mensajeRenovacion);
    setMensajeError('');
    setMensajeSaved(false);
    setMensajeModalOpen(true);
  };

  const closeMensajeModal = () => {
    setMensajeModalOpen(false);
    setMensajeError('');
    setMensajeSaved(false);
  };

  const handleMensajeSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (mensajeLoadFailed) {
      // Never save blind: a failed GET means we do not know what the server
      // holds, so saving could silently replace a custom template with the
      // frontend default. Reload the page to retry the fetch.
      setMensajeError('No se pudo cargar el mensaje guardado. Recargá la página y volvé a intentar.');
      return;
    }
    const texto = mensajeDraft.trim();
    if (!texto) {
      setMensajeError('El mensaje no puede estar vacío.');
      return;
    }
    setMensajeSaving(true);
    setMensajeError('');
    try {
      const guardado = await updateMensajeRenovacion(texto);
      setMensajeRenovacion(guardado);
      // The effect below closes the modal after a brief "Mensaje guardado"
      // flash (same timing pattern as the submit "¡Cliente Cargado!" flash).
      setMensajeSaved(true);
    } catch (err) {
      // Keep the draft intact so the user can fix and retry.
      setMensajeError(err instanceof Error ? err.message : 'No se pudo guardar el mensaje.');
    } finally {
      setMensajeSaving(false);
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
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={openMensajeModal}
                title="Editar el texto del mensaje de renovación por WhatsApp"
                className="flex items-center gap-1.5 px-3 py-1.5 text-body-sm font-semibold text-on-surface-variant border border-outline-variant rounded-lg hover:bg-surface-container-low hover:text-secondary transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[18px]">edit_note</span>
                Mensaje de renovación
              </button>
              <span className="text-on-surface-variant font-body-sm">
                {clientes.length} {clientes.length === 1 ? 'cliente' : 'clientes'}
              </span>
            </div>
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
                  clientes.map((c) => {
                    const estado = clienteEstado(c.vencimiento, hoy);
                    return (
                      <tr key={c.id} className="hover:bg-surface-container-lowest transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {estado ? (
                            <Badge variant={ESTADO_BADGE[estado].variant}>
                              {ESTADO_BADGE[estado].label}
                            </Badge>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-6 py-4 text-on-surface-variant">{c.nombre_cliente}</td>
                        <td className="px-6 py-4 font-data-mono text-on-surface-variant whitespace-nowrap">
                          {c.usuario}
                        </td>
                      <td className="px-6 py-4 font-data-mono text-on-surface-variant whitespace-nowrap">
                        {c.contrasena}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingVencimientoId === c.id ? (
                          <input
                            type="date"
                            autoFocus
                            value={vencimientoDraft}
                            onChange={(e) => setVencimientoDraft(e.target.value)}
                            onBlur={() => saveVencimiento(c)}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') {
                                setVencimientoEditCancelled(true);
                                setEditingVencimientoId(null);
                              } else if (e.key === 'Enter') saveVencimiento(c);
                            }}
                            aria-label={`Nuevo vencimiento de ${c.usuario}`}
                            className="w-40 px-2 py-1 font-data-mono text-on-surface bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-secondary outline-none"
                          />
                        ) : vencimientoSavingId === c.id ? (
                          <span className="font-data-mono text-on-surface-variant">Guardando…</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEditVencimiento(c)}
                            title="Editar vencimiento"
                            aria-label={`Editar vencimiento de ${c.usuario}`}
                            className="flex items-center gap-1.5 font-data-mono text-on-surface-variant hover:text-primary transition-colors"
                          >
                            {formatLocalDate(c.vencimiento)}
                            <span className="material-symbols-outlined text-[16px]">edit_calendar</span>
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingPrecioId === c.id ? (
                          <input
                            type="number"
                            autoFocus
                            value={precioDraft}
                            onChange={(e) => setPrecioDraft(e.target.value)}
                            onBlur={() => savePrecio(c)}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') {
                                setPrecioEditCancelled(true);
                                setEditingPrecioId(null);
                              } else if (e.key === 'Enter') savePrecio(c);
                            }}
                            aria-label={`Nuevo precio de ${c.usuario}`}
                            className="w-32 px-2 py-1 font-data-mono text-on-surface bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-secondary outline-none"
                          />
                        ) : precioSavingId === c.id ? (
                          <span className="font-data-mono text-on-surface-variant">Guardando…</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEditPrecio(c)}
                            title="Editar precio"
                            aria-label={`Editar precio de ${c.usuario}`}
                            className="flex items-center gap-1.5 font-data-mono text-on-surface-variant hover:text-primary transition-colors"
                          >
                            {c.precio !== null ? formatCurrency(c.precio) : '—'}
                            <span className="material-symbols-outlined text-[16px]">payments</span>
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 font-data-mono text-on-surface-variant whitespace-nowrap">
                        {c.whatsapp || '—'}
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant whitespace-nowrap">
                        {c.dueno || '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleConsultarRenovacion(c)}
                            aria-label={`Consultar renovación de ${c.usuario} por WhatsApp`}
                            title="Consultar renovación por WhatsApp"
                            className="p-2 text-on-surface-variant hover:text-secondary hover:bg-secondary/5 rounded-lg transition-all"
                          >
                            <span className="material-symbols-outlined">chat</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopiarMensaje(c)}
                            aria-label={`Copiar mensaje de renovación de ${c.usuario}`}
                            title="Copiar mensaje de renovación"
                            className="p-2 text-on-surface-variant hover:text-secondary hover:bg-secondary/5 rounded-lg transition-all"
                          >
                            <span className="material-symbols-outlined">content_copy</span>
                          </button>
                          <div className="w-px h-6 mx-1 bg-outline-variant/50" />
                          <button
                            type="button"
                            onClick={() => openRenew(c)}
                            aria-label={`Renovar suscripción de ${c.usuario}`}
                            title="Renovar"
                            className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                          >
                            <span className="material-symbols-outlined">autorenew</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => startEditVencimiento(c)}
                            aria-label={`Editar vencimiento de ${c.usuario}`}
                            title="Editar vencimiento"
                            className="p-2 text-on-surface-variant hover:text-secondary hover:bg-secondary/5 rounded-lg transition-all"
                          >
                            <span className="material-symbols-outlined">edit_calendar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(c.id)}
                            aria-label={`Borrar cliente ${c.usuario}`}
                            title="Borrar cliente"
                            className="p-2 text-on-surface-variant hover:text-error hover:bg-error/5 rounded-lg transition-all"
                          >
                            <span className="material-symbols-outlined">delete</span>
                          </button>
                        </div>
                        {copyMessage?.id === c.id && (
                          <p
                            role={copyMessage.type === 'error' ? 'alert' : 'status'}
                            className={`font-body-sm flex items-center justify-end gap-1 ${
                              copyMessage.type === 'error' ? 'text-error' : 'text-on-surface-variant'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              {copyMessage.type === 'error' ? 'error' : 'check_circle'}
                            </span>
                            {copyMessage.text}
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                }))}
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

      {rowError && (
        <p role="alert" className="text-error font-body-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          {rowError}
        </p>
      )}

      {/* Cargar Cliente form */}
      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">add_circle</span>
            <h3 className="font-headline-md text-headline-md text-primary">Cargar Cliente</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-on-surface-variant font-body-sm">Datos en el servidor</span>
            <button
              type="button"
              onClick={handlePasteClick}
              title="Pegar los datos de la suscripción desde el portapapeles"
              className="flex items-center gap-1.5 px-3 py-1.5 text-body-sm font-semibold text-on-surface-variant border border-outline-variant rounded-lg hover:bg-surface-container-low hover:text-secondary transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">content_paste</span>
              Pegar datos
            </button>
          </div>
        </div>

        {pasteMessage && (
          <p
            role={pasteMessage.type === 'error' ? 'alert' : 'status'}
            className={`px-8 pt-4 font-body-sm flex items-center gap-2 ${
              pasteMessage.type === 'error' ? 'text-error' : 'text-on-surface-variant'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {pasteMessage.type === 'error' ? 'error' : 'check_circle'}
            </span>
            {pasteMessage.text}
          </p>
        )}

        {pasteFallbackOpen && (
          <div className="px-8 pt-4 space-y-3" role="group" aria-label="Pegar texto manualmente">
            <p className="text-on-surface-variant font-body-sm">
              El portapapeles no está disponible. Pegue el texto de la suscripción aquí:
            </p>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={4}
              placeholder="Texto de la suscripción…"
              className="w-full p-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-secondary outline-none font-body-sm"
            />
            <button
              type="button"
              onClick={() => aplicarDatosPegados(pasteText)}
              className="flex items-center gap-1.5 px-4 py-2 text-body-sm font-semibold bg-secondary text-on-secondary rounded-lg hover:bg-secondary-container transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">done</span>
              Aplicar
            </button>
          </div>
        )}

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
              label="Precio"
              type="number"
              value={precio}
              onChange={setPrecio}
              placeholder="Ej: 15000"
              helper="Opcional. Precio de la suscripción"
              step="0.01"
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
            {/* Vendedor — the UI label for the "de quién es el cliente" field;
                the backend field and DB column keep the original name dueno.
                Autocomplete over the sellers already loaded: shows on focus,
                no minimum chars. */}
            <div className="space-y-2">
              <label className="font-label-caps text-on-surface-variant uppercase">
                Vendedor
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

      {/* Renovar suscripción: the new vencimiento is computed server-side from
          the current one (or from today if it expired) plus the chosen months. */}
      <Modal open={renewTarget !== null} onClose={closeRenew} title="Renovar suscripción">
        <form onSubmit={handleRenewSubmit} className="p-8 space-y-6">
          {renewTarget && (
            <div className="text-on-surface-variant font-body-sm space-y-1">
              <p>
                Cliente: <span className="font-data-mono text-on-surface">{renewTarget.usuario}</span>
              </p>
              <p>
                Vencimiento actual:{' '}
                <span className="font-data-mono text-on-surface">{formatLocalDate(renewTarget.vencimiento)}</span>
              </p>
            </div>
          )}
          <div className="space-y-2">
            <label
              htmlFor="renew-meses"
              className="block font-label-caps text-label-caps text-on-surface-variant uppercase"
            >
              Meses
            </label>
            <select
              id="renew-meses"
              value={renewMeses}
              onChange={(e) => setRenewMeses(Number(e.target.value))}
              className="w-full h-12 px-4 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-2 focus:ring-secondary outline-none transition-all"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {m} {m === 1 ? 'mes' : 'meses'}
                </option>
              ))}
            </select>
            <p className="text-on-surface-variant font-body-sm">
              El nuevo vencimiento se calcula desde el vencimiento actual (o desde hoy si ya venció).
            </p>
          </div>

          {renewError && (
            <div role="alert" className="bg-error-container text-on-error-container text-body-sm rounded-lg px-4 py-2">
              {renewError}
            </div>
          )}

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={closeRenew}
              className="flex-1 px-6 py-3 border border-outline-variant text-on-surface-variant font-semibold rounded-lg hover:bg-surface-container-low transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={renewing}
              className="flex-1 px-6 py-3 bg-secondary text-on-secondary font-semibold rounded-lg hover:bg-secondary-container transition-all shadow-md active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {renewing ? (
                <>
                  <span className="material-symbols-outlined">autorenew</span>
                  Renovando…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">check_circle</span>
                  Renovar
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Mensaje de renovación: the WhatsApp message template is editable and
          persisted server-side; {fecha}/{precio}/{alias} are replaced per
          client, and [corchetes] mark parts omitted when the client lacks the
          data. */}
      <Modal
        open={mensajeModalOpen}
        onClose={closeMensajeModal}
        title="Mensaje de renovación"
      >
        <form onSubmit={handleMensajeSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="mensaje-renovacion"
              className="block font-label-caps text-label-caps text-on-surface-variant uppercase"
            >
              Mensaje
            </label>
            <textarea
              id="mensaje-renovacion"
              rows={6}
              maxLength={1000}
              value={mensajeDraft}
              onChange={(e) => setMensajeDraft(e.target.value)}
              placeholder={MENSAJE_RENOVACION_DEFAULT}
              className="w-full p-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-secondary outline-none font-body-sm"
            />
            <p className="text-on-surface-variant font-body-sm">
              Usa {'{fecha}'}, {'{precio}'} y {'{alias}'} para insertar la fecha de
              vencimiento, el precio y el alias del vendedor.
            </p>
            <p className="text-on-surface-variant font-body-sm">
              Las partes entre [corchetes] se omiten cuando el cliente no tiene ese dato.
            </p>
          </div>

          {mensajeError && (
            <div
              role="alert"
              className="bg-error-container text-on-error-container text-body-sm rounded-lg px-4 py-2"
            >
              {mensajeError}
            </div>
          )}

          {mensajeSaved && (
            <p
              role="status"
              className="text-on-surface-variant font-body-sm flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              Mensaje guardado
            </p>
          )}

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={closeMensajeModal}
              className="flex-1 px-6 py-3 border border-outline-variant text-on-surface-variant font-semibold rounded-lg hover:bg-surface-container-low transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mensajeSaving}
              className="flex-1 px-6 py-3 bg-secondary text-on-secondary font-semibold rounded-lg hover:bg-secondary-container transition-all shadow-md active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {mensajeSaving ? (
                <>
                  <span className="material-symbols-outlined">autorenew</span>
                  Guardando…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">check_circle</span>
                  Guardar
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
