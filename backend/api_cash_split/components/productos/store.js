import sql from "../../../store/database";

export async function list({ activo } = {}) {
  const list =
    activo === false
      ? await sql`SELECT * FROM productos WHERE activo = false`
      : await sql`SELECT * FROM productos WHERE activo = true`;
  return list;
}

export async function add({ nombre, precio, stock }) {
  await sql`INSERT INTO productos (nombre,precio,stock) VALUES (${nombre},${precio},${stock})`;
}

export async function edit({ id, nombre, precio, stock }) {
  await sql`UPDATE productos SET nombre=${nombre}, precio=${precio}, stock=${stock} WHERE id = ${id}`;
}

export async function remove({ id }) {
  await sql`UPDATE productos SET activo = false WHERE id=${id}`;
}
