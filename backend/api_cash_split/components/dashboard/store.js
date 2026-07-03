import sql from "../../../store/database.js";

export async function listTotalCajas({ desde, hasta } = {}) {
  const conditions = [];
  if (desde) conditions.push(sql`v.created_at >= ${desde}`);
  if (hasta) conditions.push(sql`v.created_at < ${hasta} + interval '1 day'`);

  const joinFilter = conditions.length > 0
    ? sql`LEFT JOIN ventas v ON p.id = v.producto_id AND ${sql.join(conditions, sql` AND `)}`
    : sql`LEFT JOIN ventas v ON p.id = v.producto_id`;

  const result = await sql`
    SELECT 
      p.id AS producto_id,
      p.nombre AS producto,
      (p.precio::numeric * p.stock) AS costo_invertido_stock,
      COALESCE(SUM(v.cantidad), 0) AS unidades_vendidas,
      COALESCE(SUM(v.precio::numeric), 0) AS ingresos_totales,
      COALESCE(SUM(p.precio::numeric * v.cantidad), 0) AS costo_reposicion_total,
      COALESCE(SUM(v.precio::numeric - (p.precio::numeric * v.cantidad)), 0) AS ganancia_real_total
    FROM productos p
    ${joinFilter}
    GROUP BY p.id, p.nombre
  `;
  return result;
}
