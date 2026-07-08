import sql from "../../../store/database.js";

export async function add({ descripcion, monto, tipo }) {
  await sql`INSERT INTO liquidez (descripcion, monto, tipo, fecha) VALUES (${descripcion}, ${monto}, ${tipo}, NOW())`;
}

export async function list({ desde, hasta } = {}) {
  const conditions = [];
  if (desde) conditions.push(sql`fecha >= ${desde}`);
  if (hasta) conditions.push(sql`fecha < ${hasta} + interval '1 day'`);

  const where = conditions.length > 0
    ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
    : sql``;

  const items = await sql`
    SELECT id, descripcion, monto, tipo, fecha
    FROM liquidez
    ${where}
    ORDER BY fecha DESC, id DESC
  `;
  return items;
}

export async function listWithTotal({ desde, hasta } = {}) {
  const conditions = [];
  if (desde) conditions.push(sql`fecha >= ${desde}`);
  if (hasta) conditions.push(sql`fecha < ${hasta} + interval '1 day'`);

  const where = conditions.length > 0
    ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
    : sql``;

  const [items, totalRows] = await Promise.all([
    sql`
      SELECT id, descripcion, monto, tipo, fecha
      FROM liquidez
      ${where}
      ORDER BY fecha DESC, id DESC
    `,
    sql`
      SELECT COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE -monto END), 0) AS total
      FROM liquidez
      ${where}
    `,
  ]);

  return { data: items, total: Number(totalRows[0].total) };
}

export async function remove({ id }) {
  await sql`DELETE FROM liquidez WHERE id = ${id}`;
}

export async function update({ descripcion, monto, tipo, id }) {
  await sql`UPDATE liquidez SET descripcion = ${descripcion}, monto = ${monto}, tipo = ${tipo} WHERE id = ${id}`;
}
