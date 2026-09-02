import { add, list, remove, update } from "./store.js";

// Human-readable labels (Spanish UI copy) for the invalid-fields message.
const FIELD_LABELS = {
  fecha: "Fecha",
  hora: "Hora",
  monto: "Monto",
};

// Dates must be real calendar dates in ISO format ('YYYY-MM-DD'). The form
// sends date-only strings and the store serializes fecha back as 'YYYY-MM-DD'
// text via the ::text cast — otherwise postgres.js returns DATE as a JS Date
// and the API would emit ISO-with-time, which the UI can't render.
// The round-trip check rejects impossible dates that JS rolls over ("2026-02-30"
// → 2026-03-02, "2026-02-29" in a non-leap year) before they reach PG.
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function isValidDate(value) {
  if (typeof value !== "string" || !DATE_RE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return false;
  const [year, month, day] = value.split("-").map(Number);
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
}

// Times are 24h 'HH:MM' (the form sends minute precision); 'HH:MM:SS' is also
// accepted and stored as-is. Each part is range-checked so out-of-range values
// like '25:00' or '12:60' can't slip through the regex.
const TIME_RE = /^(\d{2}):(\d{2})(?::(\d{2}))?$/;
function isValidTime(value) {
  if (typeof value !== "string") return false;
  const match = TIME_RE.exec(value);
  if (!match) return false;
  const [, hour, minute, second] = match;
  if (Number(hour) > 23 || Number(minute) > 59) return false;
  return second === undefined || Number(second) <= 59;
}

// Required amount: a finite positive number rounded to cents, within column
// capacity (rejected after rounding, so sub-cent values can't round to 0.00).
// Non-strings must be actual numbers (true/[5]/null are rejected, not coerced).
// Strings are parsed comma-aware (es-AR): decimal comma with thousands dots
// ("1.234.567,89" → 1234567.89), bare decimal comma ("1500,50" → 1500.5),
// thousands dots ("15.000" → 15000, "1.234.567.89" → 1234567.89), or a plain
// decimal dot with at most 2 decimals ("0.50"). Exponential/radix notation
// ("1e3", "0x10") is rejected explicitly. Pushes "monto" into invalid and
// returns null when unusable.
const MONTO_MAX = 9_999_999_999.99; // NUMERIC(12,2) ceiling
function parseMonto(value, invalid) {
  // "invalid" is pushed here; the caller throws once all fields are checked.
  const invalidMonto = () => {
    invalid.push("monto");
    return null;
  };

  let numeric;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return invalidMonto();
    numeric = value;
  } else if (typeof value === "string" && value.trim() !== "") {
    const s = value.trim();
    // Reject exponential ("1e3") and radix-prefixed ("0x10", "0b11", "0o17")
    // notation before any separator logic sees them.
    if (/e|0x|0b|0o/i.test(s)) return invalidMonto();

    let normalized;
    if (s.includes(",")) {
      // Decimal comma (es-AR). Thousands dots are only stripped when the whole
      // string matches the grouped pattern, so "0,50" stays 0.5 while
      // "1.234.567,89" becomes 1234567.89.
      if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(s)) {
        normalized = s.replace(/\./g, "").replace(",", ".");
      } else {
        const plain = s.replace(",", ".");
        if (!/^\d+\.\d{1,2}$/.test(plain)) return invalidMonto();
        normalized = plain;
      }
    } else {
      // No comma: thousands dots ("15.000" → 15000) only when the integer part
      // is grouped in 3s AND is not zero — otherwise "0.500" would be read as
      // thousands and wrongly become 500. Anything else is a plain decimal with
      // at most 2 decimal places.
      const dotIdx = s.indexOf(".");
      const intPart = dotIdx === -1 ? s : s.slice(0, dotIdx);
      if (/^\d{1,3}(\.\d{3})+(\.\d{1,2})?$/.test(s) && Number(intPart) !== 0) {
        // Only dots followed by exactly 3 digits and then another dot/end are
        // thousands separators; a trailing 1-2 digit group is the decimals and
        // survives ("1.234.567.89" → 1234567.89, not 123456789).
        normalized = s.replace(/\.(?=\d{3}(?:\.|$))/g, "");
      } else {
        if (!/^\d+(\.\d{1,2})?$/.test(s)) return invalidMonto();
        normalized = s;
      }
    }

    numeric = Number(normalized);
    if (!Number.isFinite(numeric)) return invalidMonto();
  } else {
    return invalidMonto();
  }

  // Round to cents FIRST, then validate: 0.001–0.004 rounds to 0.00 and must
  // be rejected instead of persisting a zero row.
  const monto = Math.round(numeric * 100) / 100;
  if (!Number.isFinite(monto) || monto <= 0 || monto > MONTO_MAX) return invalidMonto();
  return monto;
}

// Reject with a user-safe 400 (no SQL/schema details) before hitting the DB.
const fail = (invalid) => {
  const labels = invalid.map((field) => FIELD_LABELS[field] ?? field);
  const err = new Error(`Datos inválidos: ${labels.join(", ")}`);
  err.statusCode = 400;
  throw err;
};

const addLiberacion = async (body) => {
  // Express leaves req.body undefined when no JSON body was sent.
  body = body ?? {};
  const payload = validateFields(body);
  return await add(payload);
};

const listLiberaciones = async () => {
  return await list();
};

// Full update: the form always sends all three fields, so they are all
// required and validated (same validation as create).
const updateLiberacion = async (idParam, body) => {
  const id = parseId(idParam);
  // Express leaves req.body undefined when no JSON body was sent.
  body = body ?? {};
  const payload = validateFields(body);

  const updated = await update({ id, ...payload });
  if (!updated) {
    const err = new Error("Liberación no encontrada");
    err.statusCode = 404;
    throw err;
  }

  return updated;
};

const removeLiberacion = async (idParam) => {
  const id = parseId(idParam);

  const deleted = await remove({ id });
  if (!deleted) {
    const err = new Error("Liberación no encontrada");
    err.statusCode = 404;
    throw err;
  }

  return deleted;
};

// Required fields, validated with user-safe 400s (no SQL/schema details).
const validateFields = (body) => {
  const invalid = [];

  // Required date: a real calendar date in ISO format.
  if (!isValidDate(body.fecha)) invalid.push("fecha");

  // Required time: 24h 'HH:MM' or 'HH:MM:SS'.
  if (!isValidTime(body.hora)) invalid.push("hora");

  // Required amount: a finite positive number within column capacity.
  const monto = parseMonto(body.monto, invalid);

  if (invalid.length > 0) fail(invalid);

  return { fecha: body.fecha, hora: body.hora, monto };
};

// The id comes from the URL as a string; reject anything that is not a plain
// digit string before Number() sees it, so "1e3", "0x10" and "1.0" can't
// coerce into a valid id (user-safe 400, no SQL details).
const parseId = (idParam) => {
  if (typeof idParam !== "string" || !/^\d+$/.test(idParam)) {
    const err = new Error("Datos inválidos: ID de liberación");
    err.statusCode = 400;
    throw err;
  }
  const id = Number(idParam);
  if (!Number.isSafeInteger(id) || id <= 0) {
    const err = new Error("Datos inválidos: ID de liberación");
    err.statusCode = 400;
    throw err;
  }
  return id;
};

export default {
  addLiberacion,
  listLiberaciones,
  updateLiberacion,
  removeLiberacion,
};