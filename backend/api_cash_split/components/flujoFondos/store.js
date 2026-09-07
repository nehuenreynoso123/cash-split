import sql from "../../../store/database.js";

export async function listFlujoFondos({ desde, hasta } = {}) {
  let joinFilter;

  if (!desde && !hasta) {
    joinFilter = sql`LEFT JOIN ventas v ON p.id = v.producto_id`;
  } else {
    const desdeCond = desde ? sql`v.created_at >= ${desde}` : null;
    const hastaCond = hasta ? sql`v.created_at < (${hasta}::date + interval '1 day')` : null;

    joinFilter = desdeCond && hastaCond
      ? sql`LEFT JOIN ventas v ON p.id = v.producto_id AND ${desdeCond} AND ${hastaCond}`
      : sql`LEFT JOIN ventas v ON p.id = v.producto_id AND ${desdeCond || hastaCond}`;
  }

  const result = await sql`
    SELECT 
      p.id AS producto_id,
      p.nombre AS producto,
      (p.precio::numeric * p.stock) AS costo_invertido_stock,
      COALESCE(SUM(v.cantidad), 0) AS unidades_vendidas,
      COALESCE(SUM(v.precio::numeric), 0) AS ingresos_totales,
      COALESCE(SUM(p.precio::numeric * v.cantidad), 0) AS costo_reposicion_total,
      COALESCE(SUM(v.precio::numeric - (p.precio::numeric * v.cantidad)), 0) AS ganancia_real_total,
      COALESCE(SUM(CASE WHEN v.fecha_cobro IS NULL OR v.fecha_cobro > CURRENT_DATE THEN v.precio::numeric - (p.precio::numeric * v.cantidad) ELSE 0 END), 0) AS ganancia_por_cobrar_total,
      COALESCE(SUM(CASE WHEN v.fecha_cobro IS NULL OR v.fecha_cobro > CURRENT_DATE THEN v.cantidad ELSE 0 END), 0) AS unidades_por_cobrar
    FROM productos p
    ${joinFilter}
    WHERE p.activo = true
    GROUP BY p.id, p.nombre
  `;
  return result;
}

// Pending total sales amount (gross revenue) grouped by ISO week
// (Monday-based) of fecha_cobro. Only dated future collections are
// included; sales without fecha_cobro stay out of this breakdown and
// remain covered by listFlujoFondos.
// No JOIN to productos on purpose: the projection only needs ventas
// columns, and an inner join would silently drop orphaned ventas while
// listFlujoFondos (LEFT JOIN) still counts them.
// semana uses ::text to stay 'YYYY-MM-DD': postgres.js would otherwise parse
// DATE into a JS Date and res.json() would emit a full ISO timestamp, which
// never matches the frontend's 'YYYY-MM-DD' week keys (same convention as
// fecha::text in facturacion/lumixClientes stores).
export async function listVentasPorCobrarSemanas() {
  const result = await sql`
    SELECT
      date_trunc('week', v.fecha_cobro)::date::text AS semana,
      COALESCE(SUM(v.precio::numeric), 0) AS total_ventas,
      COALESCE(SUM(v.cantidad), 0) AS unidades_por_cobrar
    FROM ventas v
    WHERE v.fecha_cobro IS NOT NULL AND v.fecha_cobro > CURRENT_DATE
    GROUP BY 1
    ORDER BY 1
  `;
  return result;
}
