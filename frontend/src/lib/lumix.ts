// Lumix (TV-app subscription) client helpers: pure, timezone-free date and
// parsing utilities used by the Lumix section UI. Kept separate from the
// component so the logic stays unit-testable and the component stays lean.

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
