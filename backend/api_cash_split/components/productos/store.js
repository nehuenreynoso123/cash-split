import sql from "../../../store/database.js";

export async function list({ activo } = {}) {
  const list =
    activo === false
      ? await sql`SELECT id, nombre, precio, stock, activo, fecha_carga::date::text AS fecha_carga, fecha_agotado::date::text AS fecha_agotado FROM productos WHERE activo = false ORDER BY (stock > 0) DESC, nombre ASC, id ASC`
      : await sql`SELECT id, nombre, precio, stock, activo, fecha_carga::date::text AS fecha_carga, fecha_agotado::date::text AS fecha_agotado FROM productos WHERE activo = true ORDER BY (stock > 0) DESC, nombre ASC, id ASC`;
  return list;
}

// Ventas agregadas por producto, para la sección de rotación.
//
// LEFT JOIN desde productos y no desde ventas: la rotación tiene que mostrar
// también lo que NO vendió (incluido lo agotado, que es justo lo que hay que
// reponer). Un INNER JOIN los escondería y el ranking mentiría.
//
// Usa ventas.ganancia —el costo congelado en el momento de la venta— y no el
// recálculo con productos.precio que hacen dashboard y flujoFondos: acá el
// margen histórico tiene que ser el que sespo realmente en su día, no uno que
// cambia cada vez que se edita el precio de un producto.
//
// El rango es opcional: sin fechas devuelve el histórico completo.
export async function listVentasPorProducto({ desde, hasta } = {}) {
  const dateConds = [];
  if (desde) dateConds.push(sql`v.created_at >= ${desde}`);
  if (hasta) dateConds.push(sql`v.created_at < (${hasta}::date + interval '1 day')`);

  // Mismo patrón que en cajaGastosOperativos: sin condiciones, TRUE.
  const where = dateConds.length === 0
    ? sql`TRUE`
    : dateConds.reduce((acc, cond) => sql`${acc} AND ${cond}`);

  const rows = await sql`
    SELECT
      p.id AS producto_id,
      COALESCE(SUM(v.cantidad), 0) AS unidades,
      COALESCE(SUM(v.ganancia), 0) AS margen,
      COALESCE(SUM(v.precio::numeric), 0) AS ingresos
        FROM productos p
        LEFT JOIN ventas v ON p.id = v.producto_id AND ${where}
       WHERE p.activo = true
       GROUP BY p.id
  `;

  return rows.map((row) => ({
    producto_id: Number(row.producto_id),
    unidades: Number(row.unidades),
    margen: Number(row.margen),
    ingresos: Number(row.ingresos),
  }));
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
