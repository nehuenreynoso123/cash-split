import sql from "../../../store/database.js";

export async function add({ nombre, descripcion, monto }) {
  const [inversion] =
    await sql`INSERT INTO caja_inversion (nombre,descripcion,monto,fecha) VALUES (${nombre},${descripcion},${monto},NOW())`;
  return inversion;
}

export async function remove({ id }) {
  const [inversion] = await sql`DELETE FROM caja_inversion WHERE id=${id}`;
  return inversion;
}

export async function list() {
  const inversion = await sql`SELECT * FROM caja_inversion`;
  return inversion;
}

export async function update({ nombre, descripcion, monto, id }) {
  const [inversion] =
    await sql`UPDATE caja_inversion SET nombre = ${nombre}, descripcion = ${descripcion} , monto = ${monto} WHERE id = ${id} RETURNING *`;
  return inversion;
}
