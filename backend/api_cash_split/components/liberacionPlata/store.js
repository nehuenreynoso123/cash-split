import sql from "../../../store/database.js";

// DATE and TIME columns are formatted to text on read: postgres.js parses DATE
// (oid 1082) into a JS Date, which would serialize as "2026-01-05T00:00:00.000Z"
// — the frontend renders date-only strings and would show "Invalid Date".
// hora is shaped with to_char(hora, 'HH24:MI') because PostgreSQL's TIME text
// output always appends seconds ("14:30" → "14:30:00"), and the form sends
// minute precision and expects a stable "HH:MM" back. monto is NUMERIC:
// postgres.js returns it as a string (same wire shape as productos/ventas
// money), and the frontend api layer normalizes to number.

// Column list shared by list() and the INSERT/UPDATE/DELETE RETURNING so all
// shapes match.
const LIBERACION_PLATA_COLUMNS = `
    id,
    fecha::text AS fecha,
    to_char(hora, 'HH24:MI') AS hora,
    monto,
    created_at
`;

// Persists a new row and returns it (including id).
export async function add({ fecha, hora, monto }) {
  const [row] = await sql`
        INSERT INTO liberacion_plata (fecha, hora, monto)
        VALUES (${fecha}, ${hora}, ${monto})
        RETURNING ${sql.unsafe(LIBERACION_PLATA_COLUMNS)}
    `;
  return row;
}

// Newest first; id DESC breaks ties between rows with the same fecha/hora.
export async function list() {
  return await sql`
        SELECT ${sql.unsafe(LIBERACION_PLATA_COLUMNS)}
        FROM liberacion_plata
        ORDER BY fecha DESC, hora DESC, id DESC
    `;
}

// Full update of the three editable fields; returns the updated row, or null
// when no row matched the id.
export async function update({ id, fecha, hora, monto }) {
  const [row] = await sql`
        UPDATE liberacion_plata
        SET fecha = ${fecha}, hora = ${hora}, monto = ${monto}
        WHERE id = ${id}
        RETURNING ${sql.unsafe(LIBERACION_PLATA_COLUMNS)}
    `;
  return row ?? null;
}

// Deletes the row and returns it; null means no row matched the id.
export async function remove({ id }) {
  const [row] = await sql`
        DELETE FROM liberacion_plata
        WHERE id = ${id}
        RETURNING ${sql.unsafe(LIBERACION_PLATA_COLUMNS)}
    `;
  return row ?? null;
}