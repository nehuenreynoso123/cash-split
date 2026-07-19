import sql from "../../../store/database.js";

export async function add({ descripcion, monto }) {
  await sql`INSERT INTO gastos (descripcion,monto,fecha) VALUES (${descripcion},${monto},NOW())`;
}

export async function list({ desde, hasta } = {}) {
  if (!desde && !hasta) {
    return sql`SELECT id, descripcion, monto, fecha FROM gastos ORDER BY fecha DESC, id DESC`;
  }

  const desdeCond = desde ? sql`fecha >= ${desde}` : null;
  const hastaCond = hasta ? sql`fecha < (${hasta}::date + interval '1 day')` : null;

  const where = desdeCond && hastaCond
    ? sql`WHERE ${desdeCond} AND ${hastaCond}`
    : sql`WHERE ${desdeCond || hastaCond}`;

  return sql`SELECT id, descripcion, monto, fecha FROM gastos ${where} ORDER BY fecha DESC, id DESC`;
}
export async function remove({ id }) {
  await sql`DELETE FROM gastos WHERE id= ${id}`;
}

export async function update({ descripcion, monto, id }) {
  await sql`UPDATE gastos SET descripcion = ${descripcion} , monto=${monto} WHERE id=${id}`;
}

//export default { list, add, remove, update };
