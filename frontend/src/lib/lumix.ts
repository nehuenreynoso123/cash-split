// Lumix (TV-app subscription) client helpers: pure, timezone-free date and
// parsing utilities used by the Lumix section UI. Kept separate from the
// component so the logic stays unit-testable and the component stays lean.

import type { LumixCliente } from './api';
import { formatCurrency, formatLocalDate } from './data';

// ── Estado del cliente ────────────────────────────────────────────────────────

// Clients expiring within this many days of today are flagged "Vence pronto"
// (user-chosen threshold: expiring today or in the next 7 days counts).
export const VENCE_PRONTO_DIAS = 7;

export type EstadoCliente = 'activo' | 'vence_pronto' | 'vencido';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Whole days since the epoch for a YYYY-MM-DD string. Building the date via
// Date.UTC keeps the math timezone-free (no local-midnight surprises).
function diasDesdeEpoch(isoDate: string): number {
  const [anio, mes, dia] = isoDate.split('-').map(Number);
  return Math.floor(Date.UTC(anio, mes - 1, dia) / 86_400_000);
}

// Estado of a subscription on a given day. Both arguments are date-only
// 'YYYY-MM-DD' strings compared as whole days:
//   - 'vencido':       vencimiento < hoy
//   - 'vence_pronto':  hoy <= vencimiento <= hoy + 7 days (expiring today
//                      counts as "vence pronto", never as "activo")
//   - 'activo':        vencimiento > hoy + 7 days
// Returns null when either argument does not have the YYYY-MM-DD shape. The
// date values are assumed to be real calendar dates: callers get them from the
// backend DATE column or from parseFechaVencimiento, both of which validate.
export function clienteEstado(vencimiento: string, hoy: string): EstadoCliente | null {
  if (!ISO_DATE.test(vencimiento) || !ISO_DATE.test(hoy)) return null;
  const dias = diasDesdeEpoch(vencimiento) - diasDesdeEpoch(hoy);
  if (dias < 0) return 'vencido';
  if (dias <= VENCE_PRONTO_DIAS) return 'vence_pronto';
  return 'activo';
}

// ── Pegar datos (subscription clipboard parsing) ──────────────────────────────

export interface DatosSuscripcionPegados {
  usuario?: string;
  contrasena?: string;
  vencimiento?: string; // 'YYYY-MM-DD' when the date was valid
  vencimientoError?: string; // raw Vence value when the date was malformed
}

// Known field labels, matched case-insensitively. Each line may start with any
// non-word content (emojis, spaces) and the label may be wrapped in
// *asterisks* (WhatsApp-style markdown) with the colon inside or outside them:
// "👤 *Usuario:* user@tv.com" or "*Usuario*: user@tv.com". Trailing asterisks
// after the colon are consumed only when followed by whitespace, so a value
// genuinely starting with "*" (e.g. a password "*abc") is not corrupted.
// Only the part after the colon is kept, trimmed.
const CAMPO_SUSCRIPCION = /^\s*[^\w]*?\*{0,2}(usuario|contraseña|vence)\*{0,2}\s*[:：]\s*(?:\*+\s+)?(.+)$/i;

// Parse a dd/mm/yyyy value — optionally followed by a time, e.g.
// "05/09/2026 19:58" — into 'YYYY-MM-DD'. The time part (and anything after
// the date) is ignored: the backend column is DATE-only. Returns null when the
// value is not a real calendar date (month 13, 31/02, …).
export function parseFechaVencimiento(valor: string): string | null {
  const m = valor.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = Number(m[2]);
  const anio = Number(m[3]);
  // Round-trip through UTC: a real date must reproduce the same components,
  // which rejects impossible dates like 31/02/2026.
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  if (
    fecha.getUTCFullYear() !== anio ||
    fecha.getUTCMonth() !== mes - 1 ||
    fecha.getUTCDate() !== dia
  ) {
    return null;
  }
  return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

// Extract usuario / contraseña / vencimiento from an arbitrary pasted text (a
// WhatsApp-style subscription message). Everything else — the banner, extra
// lines, the time part of the date — is discarded. Fields the text does not
// contain are left undefined so the caller can keep existing form values.
export function parseSuscripcionText(texto: string): DatosSuscripcionPegados {
  const datos: DatosSuscripcionPegados = {};
  for (const linea of texto.split(/\r?\n/)) {
    const m = linea.match(CAMPO_SUSCRIPCION);
    if (!m) continue; // banner lines, empty lines, anything unrecognized
    const etiqueta = m[1].toLowerCase();
    const valor = m[2].trim();
    if (etiqueta === 'usuario') {
      datos.usuario = valor;
    } else if (etiqueta === 'contraseña') {
      datos.contrasena = valor;
    } else if (etiqueta === 'vence') {
      const iso = parseFechaVencimiento(valor);
      if (iso) {
        datos.vencimiento = iso;
        // A later valid line wins; clear any earlier malformed-date flag so the
        // UI never shows a loaded date plus a contradictory error.
        delete datos.vencimientoError;
      } else {
        datos.vencimientoError = valor;
      }
    }
  }
  return datos;
}

// ── Precio ────────────────────────────────────────────────────────────────────

// Parses an es-AR price string into a positive number (rounded to cents), or
// null when the input is empty or unusable. es-AR formats: thousands separator
// is ".", decimal separator is "," — so "15.000" means fifteen thousand and
// "15000,50" means fifteen thousand and fifty cents. A bare "." with fewer
// than three trailing digits is treated as a decimal point for leniency
// ("15000.5" → 15000.5). This mirrors the backend NUMERIC(10,2) validation so
// the form can never submit what the API would reject.
export function parsePrecioInput(raw: string): number | null {
  const text = raw.trim();
  if (text === '') return null;
  // Strip thousands dots ("15.000" → "15000") and map decimal comma → dot.
  const normalized = text
    .replace(/\.(?=\d{3}(,|$))/g, '')
    .replace(',', '.');
  const n = Number(normalized);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

// ── Consulta de renovación (mensaje de WhatsApp) ─────────────────────────────

// Vendedor → alias de transferencia. The dueno column is free text, so the
// match is case-insensitive and tolerant of extra words ("Nehuen Reynoso"
// still maps to nehuen); any other value yields null and the caller omits the
// line instead of inventing an alias.
const ALIASES_DUENO: Array<{ clave: string; alias: string }> = [
  { clave: 'almendra', alias: 'almendramicol.mp' },
  { clave: 'nehuen', alias: 'nehuenreynoso.mp' },
];

export function aliasDeDueno(dueno: string | null | undefined): string | null {
  // NFD-strip accents so "Nehuén" (accented, the canonical spelling) still
  // matches the unaccented key "nehuen".
  const nombre = (dueno ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const match = ALIASES_DUENO.find(({ clave }) => nombre.includes(clave));
  return match?.alias ?? null;
}

// WhatsApp numbers: strip everything that is not a digit for the wa.me link
// ("+54 9 11 1234-5678" → "5491112345678"). Returns '' when there is no number.
export function sanitizarWhatsapp(whatsapp: string | null | undefined): string {
  return (whatsapp ?? '').replace(/\D/g, '');
}

// WhatsApp renewal message template: {fecha} / {precio} / {alias} are replaced
// per client; parts wrapped in [corchetes] are kept only when every placeholder
// inside them has a value — so the default omits the price/alias clauses for
// rows without that data, never leaving a dangling "El precio es .". The same
// string is seeded server-side (settings table) so both sides agree; keep the
// backend copy (api_cash_split/components/settings/controller.js — imported by
// the migrate.js seed) in sync when the wording changes.
export const MENSAJE_RENOVACION_DEFAULT =
  '¡Hola! 😊 ¿Cómo andás? Te escribo porque tu suscripción vence el {fecha} 📅 ¿Te interesa renovar? 🚀 [El precio es {precio}.] [Te dejo mi alias para transferencia: {alias} 🙌] ¡Gracias!';

const PLACEHOLDER_RE = /\{(fecha|precio|alias)\}/g;

// Short, attractive renewal pitch in Spanish (emojis welcome here — the user
// asked for an appealing message; the rest of the UI stays emoji-free). The
// template is editable from the UI and persisted server-side; this function
// only substitutes the per-client data:
//   - {fecha}  → formatLocalDate(vencimiento)
//   - {precio} → formatCurrency(precio), or '' when the row has no price
//   - {alias}  → aliasDeDueno(dueno), or '' when the seller is unknown
// Optional segments: "[text {placeholder} text]" stays only when every
// placeholder inside it has a value; otherwise the whole segment (brackets
// included) is dropped. Brackets without a placeholder inside are literal
// text. Unknown {placeholders} are left untouched. Falls back to the default
// template when the caller passes nothing.
export function construirMensajeRenovacion(
  cliente: LumixCliente,
  template: string = MENSAJE_RENOVACION_DEFAULT,
): string {
  const valores: Record<string, string> = {
    fecha: formatLocalDate(cliente.vencimiento),
    precio:
      cliente.precio !== null && cliente.precio !== undefined
        ? formatCurrency(cliente.precio)
        : '',
    alias: aliasDeDueno(cliente.dueno) ?? '',
  };

  // First resolve optional segments (on the raw template, before substitution),
  // then substitute the surviving placeholders.
  return template
    .replace(/\[([^[\]]*)\]/g, (segmento, contenido) => {
      const usados = contenido.match(PLACEHOLDER_RE);
      if (!usados) return segmento; // literal brackets, not an optional marker
      const algunoVacio = usados.some((ph) => valores[ph.slice(1, -1)] === '');
      return algunoVacio ? '' : contenido;
    })
    .replace(PLACEHOLDER_RE, (ph) => valores[ph.slice(1, -1)])
    // A dropped segment can leave two spaces behind ("🚀  ¡Gracias!"); collapse
    // runs of spaces/tabs globally so user-authored templates stay tidy too
    // (intentional double spacing in a custom template would also be collapsed).
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}
