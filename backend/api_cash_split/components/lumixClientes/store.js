import sql from "../../../store/database.js";

// DATE columns are cast to text on read (vencimiento::text):
// postgres.js parses DATE (oid 1082) into a JS Date, which would serialize as
// "2026-01-05T00:00:00.000Z" — the frontend renders date-only strings and
// would show "Invalid Date". The ::text cast keeps the YYYY-MM-DD round-trip.

// Column list shared by list() and the INSERT RETURNING so both shapes match.
// precio is NUMERIC: postgres.js returns it as a string (same wire shape as
// productos/ventas money), and the frontend api layer normalizes to number.
const LUMIX_CLIENTES_COLUMNS = `
    id,
    usuario,
    contrasena,
    vencimiento::text AS vencimiento,
    nombre_cliente,
    whatsapp,
    dueno,
    precio,
    created_at
`;

export async function list() {
  return await sql`
        SELECT ${sql.unsafe(LUMIX_CLIENTES_COLUMNS)}
        FROM clientes_lumix
        ORDER BY nombre_cliente ASC, id ASC
    `;
}

export async function getById(id) {
  const [row] = await sql`
        SELECT ${sql.unsafe(LUMIX_CLIENTES_COLUMNS)}
        FROM clientes_lumix
        WHERE id = ${id}
    `;
  return row ?? null;
}

export async function del(id) {
  // Deletes the row and returns it; null means no row matched the id.
  const [row] = await sql`
        DELETE FROM clientes_lumix
        WHERE id = ${id}
        RETURNING id
    `;
  return row ?? null;
}

// Persists a new vencimiento and returns the updated row; null means no row
// matched the id.
export async function updateVencimiento(id, vencimiento) {
  const [row] = await sql`
        UPDATE clientes_lumix
        SET vencimiento = ${vencimiento}
        WHERE id = ${id}
        RETURNING ${sql.unsafe(LUMIX_CLIENTES_COLUMNS)}
    `;
  return row ?? null;
}

// Persists a new precio (null clears it) and returns the updated row; null
// means no row matched the id.
export async function updatePrecio(id, precio) {
  const [row] = await sql`
        UPDATE clientes_lumix
        SET precio = ${precio}
        WHERE id = ${id}
        RETURNING ${sql.unsafe(LUMIX_CLIENTES_COLUMNS)}
    `;
  return row ?? null;
}

// Renewal business rule (server-side): the client only sends how many months
// to add. Base date is the current vencimiento while it is still valid
// (>= today), otherwise today. The computed date is clamped to the
// destination month's last day and persisted, then the updated row is
// returned; null means no row matched the id.
export async function renovar(id, meses) {
  const row = await getById(id);
  if (!row) return null;

  const today = localTodayISO();
  const base = row.vencimiento >= today ? row.vencimiento : today;

  return await updateVencimiento(id, addMonthsClamped(base, meses));
}

// Today as a local 'YYYY-MM-DD' string (same convention as the frontend's
// todayISO): subtract the UTC offset so the date does not shift to the
// previous day in negative-offset timezones.
function localTodayISO() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .split("T")[0];
}

// Adds N months to a date-only string ('YYYY-MM-DD'), clamping the result to
// the destination month's last day: 31 Jan + 1 month -> 28 Feb (29 in leap
// years), 31 Aug + 1 month -> 30 Sep. A naive setMonth() would overflow into
// the following month because JS Date rolls 31 Jan + 1 month into 3 Mar.
// Built on local Date parts so the result is the calendar date regardless of
// the server timezone.
function addMonthsClamped(dateStr, months) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const targetMonthIndex = month - 1 + months;
  const resultYear = year + Math.floor(targetMonthIndex / 12);
  const resultMonthIndex = ((targetMonthIndex % 12) + 12) % 12;
  // Day 0 of the following month is the last day of the destination month
  // (JS Date handles February/leap years natively).
  const lastDay = new Date(resultYear, resultMonthIndex + 1, 0).getDate();
  const pad = (n) => String(n).padStart(2, "0");
  return `${resultYear}-${pad(resultMonthIndex + 1)}-${pad(Math.min(day, lastDay))}`;
}

export async function add({
  usuario,
  contrasena,
  vencimiento,
  nombre_cliente,
  whatsapp,
  dueno,
  precio,
}) {
  // whatsapp/dueno are optional: empty strings are stored as NULL so "absent"
  // is a single shape on read (the frontend renders '—' for null). precio is
  // optional too: the controller normalizes it to null when absent; the ??
  // guard keeps the store safe against undefined callers.
  const [row] = await sql`
        INSERT INTO clientes_lumix (
            usuario, contrasena, vencimiento, nombre_cliente, whatsapp, dueno, precio
        )
        VALUES (
            ${usuario}, ${contrasena}, ${vencimiento}, ${nombre_cliente},
            ${whatsapp || null}, ${dueno || null}, ${precio ?? null}
        )
        RETURNING ${sql.unsafe(LUMIX_CLIENTES_COLUMNS)}
    `;
  return row;
}
