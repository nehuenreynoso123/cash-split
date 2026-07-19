import sql from "../../../store/database.js";

export async function add({ descripcion, monto, tipo }) {
  await sql`INSERT INTO liquidez (descripcion, monto, tipo, fecha) VALUES (${descripcion}, ${monto}, ${tipo}, NOW())`;
}

export async function list({ desde, hasta } = {}) {
  if (!desde && !hasta) {
    return sql`SELECT id, descripcion, monto, tipo, fecha FROM liquidez ORDER BY fecha DESC, id DESC`;
  }

  const desdeCond = desde ? sql`fecha >= ${desde}` : null;
  const hastaCond = hasta ? sql`fecha < (${hasta}::date + interval '1 day')` : null;

  const where = desdeCond && hastaCond
    ? sql`WHERE ${desdeCond} AND ${hastaCond}`
    : sql`WHERE ${desdeCond || hastaCond}`;

  return sql`SELECT id, descripcion, monto, tipo, fecha FROM liquidez ${where} ORDER BY fecha DESC, id DESC`;
}

export async function listWithTotal({ desde, hasta } = {}) {
  if (!desde && !hasta) {
    const [items, totalRows] = await Promise.all([
      sql`SELECT id, descripcion, monto, tipo, fecha FROM liquidez ORDER BY fecha DESC, id DESC`,
      sql`SELECT COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE -monto END), 0) AS total FROM liquidez`,
    ]);
    return { data: items, total: Number(totalRows[0].total) };
  }

  const desdeCond = desde ? sql`fecha >= ${desde}` : null;
  const hastaCond = hasta ? sql`fecha < (${hasta}::date + interval '1 day')` : null;

  const where = desdeCond && hastaCond
    ? sql`WHERE ${desdeCond} AND ${hastaCond}`
    : sql`WHERE ${desdeCond || hastaCond}`;

  const [items, totalRows] = await Promise.all([
    sql`SELECT id, descripcion, monto, tipo, fecha FROM liquidez ${where} ORDER BY fecha DESC, id DESC`,
    sql`SELECT COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE -monto END), 0) AS total FROM liquidez ${where}`,
  ]);

  return { data: items, total: Number(totalRows[0].total) };
}

export async function remove({ id }) {
  await sql`DELETE FROM liquidez WHERE id = ${id}`;
}

export async function update({ descripcion, monto, tipo, id }) {
  await sql`UPDATE liquidez SET descripcion = ${descripcion}, monto = ${monto}, tipo = ${tipo} WHERE id = ${id}`;
}
