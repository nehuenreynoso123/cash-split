import sql from "../../../store/database.js";

export async function list({ activo } = {}) {
  const list =
    activo === false
      ? await sql`SELECT id, nombre, precio, stock, activo, fecha_carga::date::text AS fecha_carga FROM productos WHERE activo = false`
      : await sql`SELECT id, nombre, precio, stock, activo, fecha_carga::date::text AS fecha_carga FROM productos WHERE activo = true`;
  return list;
}

export async function add({ nombre, precio, stock }) {
  await sql`INSERT INTO productos (nombre,precio,stock) VALUES (${nombre},${precio},${stock})`;
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
}

export async function remove({ id }) {
  await sql`UPDATE productos SET activo = false WHERE id=${id}`;
}
