import sql from "../../../store/database.js";

export async function add({ descripcion, monto }) {
  await sql`INSERT INTO gastos (descripcion,monto,fecha) VALUES (${descripcion},${monto},NOW())`;
}

export async function list({ desde, hasta, limit, offset } = {}) {
  const pageLimit = Math.min(Math.max(Number(limit) || 15, 1), 100);
  const pageOffset = Math.max(Number(offset) || 0, 0);

  const conds = [];
  if (desde) conds.push(sql`fecha >= ${desde}`);
  if (hasta) conds.push(sql`fecha < (${hasta}::date + interval '1 day')`);
  const where = conds.length === 0
    ? sql`TRUE`
    : conds.length === 1
      ? conds[0]
      : sql`${conds[0]} AND ${conds[1]}`;

  const [items, countRows, sumRows] = await Promise.all([
    sql`SELECT id, descripcion, monto, fecha FROM gastos WHERE ${where} ORDER BY fecha DESC, id DESC LIMIT ${pageLimit} OFFSET ${pageOffset}`,
    sql`SELECT COUNT(*) AS total FROM gastos WHERE ${where}`,
    sql`SELECT COALESCE(SUM(monto), 0) AS total_monto FROM gastos WHERE ${where}`,
  ]);

  return {
    data: items,
    total: Number(countRows[0].total),
    totalMonto: Number(sumRows[0].total_monto),
  };
}
export async function remove({ id }) {
  await sql`DELETE FROM gastos WHERE id= ${id}`;
}

export async function update({ descripcion, monto, id }) {
  await sql`UPDATE gastos SET descripcion = ${descripcion} , monto=${monto} WHERE id=${id}`;
}

//export default { list, add, remove, update };
