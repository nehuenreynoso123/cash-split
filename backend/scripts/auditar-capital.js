// Auditoría de datos para el Dashboard comparativo. SOLO LECTURA: este script
// contiene exclusivamente SELECT. No escribe, no migra, no modifica nada.
//
// Preguntas que responde:
//   1. ¿El capital histórico es reconstruible desde liquidez, o arrancamos de hoy?
//   2. ¿Cuántas ventas tienen ganancia = 0 (ventas heredadas, el bug que se
//      acaba de corregir)?
//   3. ¿Hay huecos de cobertura antes de cierta fecha?
//   4. ¿La ganancia del mes es comparable entre meses, o hay que esperar al día 20?
//
// Uso:  node --env-file=backend/.env backend/scripts/auditar-capital.js
// (desde la raíz del repo)

import sql from "../store/database.js";

const q = async (label, fn) => {
  try {
    const rows = await fn();
    console.log(`\n=== ${label} ===`);
    console.table(rows);
    return rows;
  } catch (err) {
    console.log(`\n=== ${label} === ERROR: ${err.message}`);
    return [];
  }
};

// 1. Cobertura temporal: ¿desde cuándo hay datos en cada tabla?
const cobertura = await q("Cobertura temporal por tabla", () => sql`
  SELECT 'liquidez' AS tabla, COUNT(*) AS registros, MIN(fecha)::date::text AS desde, MAX(fecha)::date::text AS hasta FROM liquidez
  UNION ALL
  SELECT 'gastos', COUNT(*), MIN(fecha)::date::text, MAX(fecha)::date::text FROM gastos
  UNION ALL
  SELECT 'ventas', COUNT(*), MIN(created_at)::date::text, MAX(created_at)::date::text FROM ventas
  UNION ALL
  SELECT 'productos', COUNT(*), MIN(fecha_carga)::date::text, MAX(fecha_carga)::date::text FROM productos
`);

// 2. LA PREGUNTA CLAVE: ¿hay egresos registrados en liquidez?
// El usuario dijo que no los carga. Si egress = 0, entonces Σingresos ES el
// saldo, y la curva de capital histórico se reconstruye directo de esta tabla.
const composition = await q("Composición de liquidez (ingresos vs egresos)", () => sql`
  SELECT
    COUNT(*) FILTER (WHERE tipo = 'ingreso') AS ingresos,
    COALESCE(SUM(monto) FILTER (WHERE tipo = 'ingreso'), 0) AS total_ingresos,
    COUNT(*) FILTER (WHERE tipo = 'egreso') AS egresos,
    COALESCE(SUM(monto) FILTER (WHERE tipo = 'egreso'), 0) AS total_egresos,
    COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE -monto END), 0) AS neto
      FROM liquidez
`);

// 3. Reality check contra los 7M declarados.
// capital = plata (neto liquidez) + mercadería a costo actual
const capitalHoy = await q("Capital hoy: plata + mercadería a costo", () => sql`
  SELECT
    ROUND(COALESCE((SELECT SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE -monto END) FROM liquidez), 0), 0) AS plata,
    ROUND(COALESCE((SELECT SUM(precio::numeric * stock) FROM productos WHERE activo = true), 0), 0) AS mercaderia_costo,
    ROUND(COALESCE((SELECT SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE -monto END) FROM liquidez), 0)
        + COALESCE((SELECT SUM(precio::numeric * stock) FROM productos WHERE activo = true), 0), 0) AS capital_total,
    7000000 AS capital_declarado
`);

// 4. Curva de capital acumulado por mes.
// Si las fechas de liquidez son reales, esta serie ES el histórico pedido.
// Un backfill dejaría todo amontonado en un solo mes.
const curvaCapital = await q("Capital acumulado por mes (¿histórico real?)", () => sql`
  WITH mensual AS (
    SELECT
      date_trunc('month', fecha) AS mes,
      SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE -monto END) AS delta_mes
        FROM liquidez
       GROUP BY 1
  )
  SELECT
    mes::date::text AS mes,
    ROUND(delta_mes, 0) AS delta_del_mes,
    ROUND(SUM(delta_mes) OVER (ORDER BY mes), 0) AS acumulado
      FROM mensual
     ORDER BY mes
`);

// 5. Tamaño del bug de ventas heredadas (ganancia = 0).
const heredadas = await q("Ventas heredadas (ganancia = 0)", () => sql`
  SELECT
    COUNT(*) AS ventas_totales,
    COUNT(*) FILTER (WHERE ganancia = 0) AS sin_costo_congelado,
    ROUND(100.0 * COUNT(*) FILTER (WHERE ganancia = 0) / NULLIF(COUNT(*), 0), 1) AS porcentaje,
    ROUND(COALESCE(SUM(CASE WHEN ganancia = 0 THEN precio ELSE 0 END), 0), 0) AS plata_inflada_como_costo
      FROM ventas
`);

// 6. Impacto real del bug: cuánto costo estaba inflado antes del fix.
const impactoBug = await q("Impacto del bug de costo heredado, por mes", () => sql`
  SELECT
    date_trunc('month', v.created_at)::date::text AS mes,
    COUNT(*) FILTER (WHERE v.ganancia = 0) AS ventas_sin_costo,
    ROUND(COALESCE(SUM(CASE WHEN v.ganancia = 0 THEN v.precio ELSE 0 END), 0), 0) AS costo_inflado
      FROM ventas v
     WHERE v.ganancia = 0
     GROUP BY 1
     ORDER BY 1
`);

// 7. Ganancia por mes con el criterio CORRECTO (costo congelado).
// Sirve para ver contra qué número vamos a comparar mes a mes.
const gananciaMensual = await q("Ganancia mensual con costo congelado", () => sql`
  SELECT
    date_trunc('month', created_at)::date::text AS mes,
    COUNT(*) AS ventas,
    ROUND(COALESCE(SUM(precio::numeric), 0), 0) AS ingresos,
    ROUND(COALESCE(SUM(CASE WHEN ganancia > 0 THEN precio::numeric - ganancia::numeric
                             ELSE (SELECT p.precio::numeric * v.cantidad FROM productos p WHERE p.id = v.producto_id) END), 0), 0) AS costo_mercaderia,
    ROUND(COALESCE(SUM(CASE WHEN ganancia > 0 THEN ganancia::numeric
                             ELSE v.precio::numeric - (SELECT p.precio::numeric * v.cantidad FROM productos p WHERE p.id = v.producto_id) END), 0), 0) AS ganancia
      FROM ventas v
     GROUP BY 1
     ORDER BY 1
`);

// 8. Gastos por mes: ¿el día 20 rompe la comparación?
const gastosMensual = await q("Gastos por mes (¿concentrados en el día 20?)", () => sql`
  SELECT
    date_trunc('month', fecha)::date::text AS mes,
    COUNT(*) AS gastos,
    EXTRACT(DAY FROM fecha)::int AS dia_del_mes,
    ROUND(SUM(monto::numeric), 0) AS total,
    COUNT(*) FILTER (WHERE tipo IS NULL) AS sin_clasificar
      FROM gastos
     GROUP BY 1, 3
     ORDER BY 1, 3
`);

// 9. Cobertura de fecha_cobro: define si "ingresos del mes" es caja o facturación.
const cobros = await q("Estado de cobros en ventas", () => sql`
  SELECT
    COUNT(*) AS ventas,
    COUNT(*) FILTER (WHERE fecha_cobro IS NULL) AS sin_fecha_cobro,
    COUNT(*) FILTER (WHERE fecha_cobro > CURRENT_DATE) AS a_cobrar_futuro,
    COUNT(*) FILTER (WHERE fecha_cobro <= CURRENT_DATE) AS ya_cobradas,
    ROUND(COALESCE(SUM(precio::numeric) FILTER (WHERE fecha_cobro IS NULL OR fecha_cobro > CURRENT_DATE), 0), 0) AS plata_por_cobrar
      FROM ventas
`);

// 10. Antigüedad de la mercadería: ¿hay capital atascado?
const antiguedad = await q("Mercadería por antigüedad", () => sql`
  SELECT
    CASE
      WHEN CURRENT_DATE - fecha_carga <= 30 THEN '0-30 días'
      WHEN CURRENT_DATE - fecha_carga <= 90 THEN '31-90 días'
      WHEN CURRENT_DATE - fecha_carga <= 180 THEN '91-180 días'
      ELSE 'más de 180 días'
    END AS tramo,
    COUNT(*) AS productos,
    SUM(stock) AS unidades,
    ROUND(SUM(precio::numeric * stock), 0) AS valor_costo
      FROM productos
     WHERE activo = true AND stock > 0
     GROUP BY 1
     ORDER BY 1
`);

// ─── Veredicto ────────────────────────────────────────────────────────────────
console.log(`\n${"=".repeat(64)}`);
const [comp] = composition;
const [cap] = capitalHoy;
const [her] = heredadas;

const tieneEgresos = Number(comp.egresos) > 0;
const capitalReal = Number(cap.capital_total);
const declarado = Number(cap.capital_declarado);
const diferencia = capitalReal - declarado;
const pct = (diferencia / declarado) * 100;

console.log(`Registros en liquidez: ${comp.ingresos} ingresos / ${comp.egresos} egresos`);
console.log(`Capital calculado:    ${capitalReal.toLocaleString('es-AR')}`);
console.log(`Capital declarado:    ${declarado.toLocaleString('es-AR')}`);
console.log(`Diferencia:           ${diferencia.toLocaleString('es-AR')} (${pct.toFixed(1)}%)`);
console.log(`Ventas sin costo:     ${her.sin_costo_congelado} de ${her.ventas_totales} (${her.porcentaje}%)`);

console.log(`\n--- VEREDICTO ---`);
console.log(
  tieneEgresos
    ? "liquidez tiene EGRESOS registrados → el neto es un saldo real."
    : "liquidez SIN egresos → Σingresos ES el saldo. La curva de capital es\n   reconstruible desde esta tabla si las fechas son reales (ver arriba).",
);
console.log(
  Math.abs(pct) <= 15
    ? "El capital calculado coincide con el declarado (±15%): lectura CONFIRMADA."
    : `El capital calculado difiere ${pct.toFixed(1)}% del declarado. Hay que revisar\n   qué incluye "liquidez" antes de construir la vista comparativa.`,
);
console.log("=".repeat(64));

await sql.end();
