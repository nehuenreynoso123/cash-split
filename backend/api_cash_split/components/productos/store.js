import sql from "../../../store/database.js";

export async function list({ activo } = {}) {
  const list =
    activo === false
      ? await sql`SELECT id, nombre, precio, stock, activo, fecha_carga::date::text AS fecha_carga, fecha_agotado::date::text AS fecha_agotado FROM productos WHERE activo = false ORDER BY (stock > 0) DESC, nombre ASC, id ASC`
      : await sql`SELECT id, nombre, precio, stock, activo, fecha_carga::date::text AS fecha_carga, fecha_agotado::date::text AS fecha_agotado FROM productos WHERE activo = true ORDER BY (stock > 0) DESC, nombre ASC, id ASC`;
  return list;
}

export async function add({ nombre, precio, stock }) {
  // Stamp fecha_agotado with the DB's CURRENT_DATE (same source as every other
  // date here) when the product is created already out of stock.
  await sql`INSERT INTO productos (nombre, precio, stock, fecha_agotado) VALUES (${nombre}, ${precio}, ${stock}, CASE WHEN ${stock} <= 0 THEN CURRENT_DATE END)`;
}

// Contract: fecha_carga is only set when the caller sends a truthy value.
// Callers that omit fecha_carga (older clients) or send an empty value must
// NOT wipe the column.
export async function edit({ id, nombre, precio, stock, fecha_carga }) {
  if (fecha_carga) {
    await sql`UPDATE productos SET nombre=${nombre}, precio=${precio}, stock=${stock}, fecha_carga=${fecha_carga} WHERE id = ${id}`;
  } else {
    await sql`UPDATE productos SET nombre=${nombre}, precio=${precio}, stock=${stock} WHERE id = ${id}`;
  }

  // Reconcile fecha_agotado against the FINAL stock in a SEPARATE UPDATE: inside
  // a single statement PostgreSQL evaluates SET clauses left-to-right, so reading
  // `stock` in a second SET clause would already see the adjusted value.
  await sql`UPDATE productos SET fecha_agotado = CASE WHEN stock <= 0 THEN COALESCE(fecha_agotado, CURRENT_DATE) ELSE NULL END WHERE id = ${id}`;
}

export async function remove({ id }) {
  await sql`UPDATE productos SET activo = false WHERE id=${id}`;
}
