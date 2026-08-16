import sql from "../../../store/database.js";

// DATE columns are cast to text on read (vencimiento::text):
// postgres.js parses DATE (oid 1082) into a JS Date, which would serialize as
// "2026-01-05T00:00:00.000Z" — the frontend renders date-only strings and
// would show "Invalid Date". The ::text cast keeps the YYYY-MM-DD round-trip.

// Column list shared by list() and the INSERT RETURNING so both shapes match.
const LUMIX_CLIENTES_COLUMNS = `
    id,
    usuario,
    contrasena,
    vencimiento::text AS vencimiento,
    nombre_cliente,
    whatsapp,
    dueno,
    created_at
`;

export async function list() {
  return await sql`
        SELECT ${sql.unsafe(LUMIX_CLIENTES_COLUMNS)}
        FROM clientes_lumix
        ORDER BY nombre_cliente ASC, id ASC
    `;
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

export async function add({
  usuario,
  contrasena,
  vencimiento,
  nombre_cliente,
  whatsapp,
  dueno,
}) {
  // whatsapp/dueno are optional: empty strings are stored as NULL so "absent"
  // is a single shape on read (the frontend renders '—' for null).
  const [row] = await sql`
        INSERT INTO clientes_lumix (
            usuario, contrasena, vencimiento, nombre_cliente, whatsapp, dueno
        )
        VALUES (
            ${usuario}, ${contrasena}, ${vencimiento}, ${nombre_cliente},
            ${whatsapp || null}, ${dueno || null}
        )
        RETURNING ${sql.unsafe(LUMIX_CLIENTES_COLUMNS)}
    `;
  return row;
}
