import sql from "../../../store/database.js";

// Encadena condiciones WHERE ya parametrizadas: TRUE con lista vacía, la única
// condición cuando hay una, y AND entre todas. El listado y los totales por
// categoría comparten el filtro de fechas pero no el de categoría, así que cada
// uno arma su propia lista y las pasa por acá.
const andWhere = (conds) => {
  if (conds.length === 0) return sql`TRUE`;
  return conds.reduce((acc, cond) => sql`${acc} AND ${cond}`);
};

export async function add({ descripcion, monto, categoria }) {
  // categoria llega vacía (sin categoría elegida) o como slug. Se normaliza a
  // NULL: postgres.js no acepta undefined y la columna es nullable.
  await sql`INSERT INTO gastos (descripcion,monto,categoria,fecha) VALUES (${descripcion},${monto},${categoria || null},NOW())`;
}

export async function list({ desde, hasta, limit, offset, categoria } = {}) {
  const pageLimit = Math.min(Math.max(Number(limit) || 15, 1), 100);
  const pageOffset = Math.max(Number(offset) || 0, 0);

  const dateConds = [];
  if (desde) dateConds.push(sql`fecha >= ${desde}`);
  if (hasta) dateConds.push(sql`fecha < (${hasta}::date + interval '1 day')`);

  // El filtro de categoría va en SQL (la paginación depende del total filtrado),
  // pero los totales por categoría se calculan SOLO con el rango de fechas: atarlos
  // al filtro mostraría un breakdown de una parte, y atarlos a la paginación uno de
  // 15 filas. La UI siempre muestra las 3 categorías para que el breakdown nunca se
  // oculte.
  const conds = [...dateConds];
  if (categoria) conds.push(sql`categoria = ${categoria}`);

  const where = andWhere(conds);
  const whereFechas = andWhere(dateConds);

  const [items, countRows, sumRows, catRows] = await Promise.all([
    sql`SELECT id, descripcion, monto, categoria, fecha FROM gastos WHERE ${where} ORDER BY fecha DESC, id DESC LIMIT ${pageLimit} OFFSET ${pageOffset}`,
    // El COUNT sigue el filtro de categoría: la paginación depende del total de
    // filas coincidentes, no del total del período.
    sql`SELECT COUNT(*) AS total FROM gastos WHERE ${where}`,
    // El totalMonto del encabezado NO sigue el filtro de categoría, a propósito:
    // es el total del período (desde/hasta) y tiene que seguir cuadrando con la
    // suma de las tarjetas de desglose, que tampoco se filtran. Usar `where`
    // acá haría que el número grande dejara de descomponerse al filtrar.
    sql`SELECT COALESCE(SUM(monto), 0) AS total_monto FROM gastos WHERE ${whereFechas}`,
    sql`SELECT categoria, COALESCE(SUM(monto), 0) AS total_monto FROM gastos WHERE ${whereFechas} GROUP BY categoria`,
  ]);

  return {
    data: items,
    total: Number(countRows[0].total),
    totalMonto: Number(sumRows[0].total_monto),
    // Un item por categoría presente en el rango; el frontend lo cruza con su
    // lista canónica de labels. La categoría NULL son los gastos sin clasificar
    // (legacy), y la UI los muestra como "Sin categoría".
    totalesPorCategoria: catRows.map((row) => ({
      categoria: row.categoria,
      totalMonto: Number(row.total_monto),
    })),
  };
}
export async function remove({ id }) {
  await sql`DELETE FROM gastos WHERE id= ${id}`;
}

export async function update({ descripcion, monto, categoria, id }) {
  await sql`UPDATE gastos SET descripcion = ${descripcion} , monto=${monto} , categoria=${categoria || null} WHERE id=${id}`;
}

//export default { list, add, remove, update };
