import sql from "../../../store/database.js";

export async function listTotalCajas() {
  const result = await sql`SELECT 
    p.id AS producto_id,
    p.nombre AS producto,
    COALESCE(SUM(v.cantidad), 0) AS unidades_vendidas,
    COALESCE(SUM(v.precio::numeric), 0) AS ingresos_totales,
    COALESCE(SUM(p.precio::numeric * v.cantidad), 0) AS costo_reposicion_total,
    COALESCE(SUM(v.precio::numeric - (p.precio::numeric * v.cantidad)), 0) AS ganancia_real_total
FROM productos p
LEFT JOIN ventas v ON p.id = v.producto_id
GROUP BY p.id, p.nombre;`;
  return result;
}
