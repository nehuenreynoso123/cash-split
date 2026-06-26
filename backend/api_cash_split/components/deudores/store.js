import sql from "../../../store/database";

export async function list() {
  const deudores = await sql`SELECT id, nombre, descripcion, monto, fecha FROM deudores ORDER BY fecha DESC, id DESC`;
  return deudores;
}

export async function add({ nombre, descripcion, monto }) {
  await sql`INSERT INTO deudores (nombre,descripcion,monto,fecha) VALUES (${nombre},${descripcion},${monto},NOW())`;
}

export async function update({ nombre, descripcion, monto, id }) {
  await sql`UPDATE deudores SET nombre=${nombre}, descripcion = ${descripcion} , monto = ${monto} WHERE id=${id}`;
}
export async function remove({ id }) {
  await sql`DELETE FROM deudores WHERE id=${id}`;
}

//export default { list, remove, update, add };
