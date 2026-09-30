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
      -- Costo y ganancia CONGELADOS en la venta, no recalculados con p.precio.
      --
      -- "Cuánto gané en septiembre" es una pregunta sobre el pasado: si se
      -- recalculara con el precio actual del producto, editar un costo
      -- reescribiría meses ya cerrados y cualquier comparación mes a mes
      -- quedaría falseada sin aviso.
      --
      -- ventas.precio y ventas.ganancia son TOTALES DE LÍNEA (no unitarios):
      -- ver ventas/store.js add() → ganancia = precio - (producto.precio * cantidad).
      -- Por lo tanto costo + ganancia = precio siempre, en ambas ramas.
      --
      -- La rama se decide por el VALOR, no por NULL: la columna es
      -- NOT NULL DEFAULT 0 (init.sql), así que una venta anterior a la columna
      -- tiene ganancia = 0 y un COALESCE sobre NULL nunca cae al fallback.
      -- Con COALESCE, esas ventas deflactaban a costo = precio (el 100% de la
      -- venta) y el margen de esos meses quedaba destruido sin error visible.
      -- ganancia > 0 → hay costo congelado. ganancia = 0 → no lo hay, y la
      -- única referencia disponible es el costo actual por cantidad.
      COALESCE(SUM(CASE WHEN v.id IS NULL THEN 0
                        WHEN v.ganancia::numeric > 0 THEN v.precio::numeric - v.ganancia::numeric
                        ELSE p.precio::numeric * v.cantidad END), 0) AS costo_mercaderia_vendida,
      COALESCE(SUM(CASE WHEN v.id IS NULL THEN 0
                        WHEN v.ganancia::numeric > 0 THEN v.ganancia::numeric
                        ELSE v.precio::numeric - (p.precio::numeric * v.cantidad) END), 0) AS ganancia_real_total,
      COALESCE(SUM(CASE WHEN v.id IS NULL THEN 0
                        WHEN v.fecha_cobro IS NULL OR v.fecha_cobro > CURRENT_DATE
                          THEN CASE WHEN v.ganancia::numeric > 0 THEN v.ganancia::numeric
                                    ELSE v.precio::numeric - (p.precio::numeric * v.cantidad) END
                        ELSE 0 END), 0) AS ganancia_por_cobrar_total,
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
