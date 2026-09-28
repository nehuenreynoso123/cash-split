// Auditoría de datos para la feature de rotación. SOLO LECTURA: este script
// contiene exclusivamente SELECT. No escribe, no migra, no modifica nada.
//
// Pregunta que responde: ¿la columna productos.fecha_carga tiene fechas reales
// o fue backfilleada a CURRENT_DATE? De eso depende si la velocidad de venta
// es un dato o ruido.
//
// Uso:  node --env-file=backend/.env backend/scripts/auditar-rotacion.js
// (desde la raíz del repo)

import sql from "../store/database.js";

const q = async (label, fn) => {
  const rows = await fn();
  console.log(`\n=== ${label} ===`);
  console.table(rows);
  return rows;
};

// 1. Veredicto principal: cuántas fechas de carga hay realmente distintas.
const fechas = await q("Fechas de carga distintas (top 15)", () => sql`
  SELECT fecha_carga::text AS fecha_carga, COUNT(*) AS productos
    FROM productos
   GROUP BY fecha_carga
   ORDER BY productos DESC, fecha_carga DESC
   LIMIT 15
`);

// 2. Reparto: real vs sospechosa. Un backfill deja muchas filas pegadas a la
//    fecha en que corrió la migración; las reales están repartidas.
const veredicto = await q("Reparto real vs backfill", () => sql`
  WITH comun AS (
    SELECT fecha_carga FROM productos GROUP BY fecha_carga
    ORDER BY COUNT(*) DESC LIMIT 1
  )
  SELECT
    COUNT(*) FILTER (WHERE fecha_carga = (SELECT fecha_carga FROM comun)) AS en_fecha_comun,
    COUNT(*) FILTER (WHERE fecha_carga <> (SELECT fecha_carga FROM comun)) AS en_otras_fechas,
    COUNT(*) AS total,
    (SELECT fecha_carga::text FROM comun) AS fecha_comun
      FROM productos
`);

// 3. Antigüedad: dónde se concentran los días en stock. Si casi todo cae en
//    0-7 días, la columna está backfilleada y no sirve para velocidad.
const antiguedad = await q("Antigüedad (días desde fecha_carga, productos en stock)", () => sql`
  SELECT
    CASE
      WHEN CURRENT_DATE - fecha_carga <= 7  THEN '0-7 días'
      WHEN CURRENT_DATE - fecha_carga <= 30 THEN '8-30 días'
      WHEN CURRENT_DATE - fecha_carga <= 90 THEN '31-90 días'
      WHEN CURRENT_DATE - fecha_carga <= 180 THEN '91-180 días'
      ELSE 'más de 180 días'
    END AS tramo_antiguedad,
    COUNT(*) AS productos
      FROM productos
     WHERE stock > 0
     GROUP BY 1
     ORDER BY 1
`);

// 4. ¿Hay datos de venta para calcular rotación? Sin ventas en la ventana, la
//    columna de unidades y margen no tiene nada que mostrar.
const ventas = await q("Ventas registradas (todo el histórico)", () => sql`
  SELECT
    COUNT(*) AS ventas,
    COALESCE(SUM(cantidad), 0) AS unidades,
    MIN(created_at)::date::text AS primera,
    MAX(created_at)::date::text AS ultima,
    COUNT(DISTINCT producto_id) AS productos_con_venta
      FROM ventas
`);

// 5. Los 10 productos más vendidos: el orden que la columna nueva mostraría.
const top = await q("Top 10 por unidades vendidas (histórico)", () => sql`
  SELECT
    p.nombre,
    p.stock,
    SUM(v.cantidad) AS unidades,
    ROUND(SUM(v.ganancia)::numeric, 0) AS margen
      FROM ventas v
      JOIN productos p ON p.id = v.producto_id
     GROUP BY p.id, p.nombre, p.stock
     ORDER BY unidades DESC
     LIMIT 10
`);

const [f] = veredicto;
const total = Number(f.total) || 1;
const sospecha = (Number(f.en_fecha_comun) / total) * 100;

console.log(`\n${"=".repeat(60)}`);
console.log(`Fecha de carga más común: ${f.fecha_comun}`);
console.log(`Productos en esa fecha:   ${f.en_fecha_comun} de ${f.total} (${sospecha.toFixed(1)}%)`);
console.log(
  sospecha >= 50
    ? "\nVEREDICTO: fecha_carga parece BACKFILLEADA. La velocidad de venta sería ruido."
    : "\nVEREDICTO: fecha_carga parece REAL. La velocidad de venta es usable.",
);
console.log(`Fechas distintas encontradas: ${fechas.length}`);
console.log(`${"=".repeat(60)}`);

await sql.end();
