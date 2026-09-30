// Ejercita la comparativa contra la base real. SOLO LECTURA: el store que
// llama no tiene ni un INSERT, ni un UPDATE, ni un DELETE.
//
// Uso:  node --env-file=backend/.env backend/scripts/probar-comparativa.js

import sql from "../store/database.js";
import { listComparativaMensual } from "../api_cash_split/components/comparativaMensual/store.js";

const data = await listComparativaMensual({ meses: 6 });

const fmt = (v) => (v === null ? "null" : Number(v).toLocaleString("es-AR", { maximumFractionDigits: 2 }));
const pct = (v) => (v === null ? "null" : `${(v * 100).toFixed(1)}%`);

console.log(`ventana: ${data.ventana.meses} meses · ${data.ventana.desde} → ${data.ventana.hasta}`);
console.log(`generadoEn: ${data.generadoEn}`);
console.log(`avisos:`, data.avisos);

console.log("\n=== Capital (stock de hoy, fuera de la serie) ===");
console.table([data.capital]);

console.log("\n=== Filas (de la más reciente a la más antigua) ===");
console.table(
  data.filas.map((f) => ({
    mes: f.mes,
    sinDatos: f.sinDatos,
    unidades: f.unidades,
    ingresos: fmt(f.ingresos),
    costoMercaderia: fmt(f.costoMercaderia),
    margenBruto: fmt(f.margenBruto),
    gastosNegocio: fmt(f.gastosNegocio),
    fijos: fmt(f.gastosFijos),
    variables: fmt(f.gastosVariables),
    sinClasificar: `${fmt(f.gastosSinClasificar)} (${f.cantidadGastosSinClasificar})`,
    personales: fmt(f.gastosPersonales),
    gananciaNegocio: fmt(f.gananciaNegocio),
    peorCaso: fmt(f.gananciaNegocioPeorCaso),
    costoVentaFact: fmt(f.costosVentaFacturacion),
    facturas: f.facturas,
  })),
);

console.log("\n=== Variaciones contra el mes anterior ===");
console.table(
  data.filas.map((f) => ({
    mes: f.mes,
    "Δ ingresos": f.variacion.ingresos.absoluta === null ? "null" : fmt(f.variacion.ingresos.absoluta),
    "Δ ingresos %": pct(f.variacion.ingresos.porcentual),
    "Δ ganancia": f.variacion.gananciaNegocio.absoluta === null ? "null" : fmt(f.variacion.gananciaNegocio.absoluta),
    "Δ ganancia %": pct(f.variacion.gananciaNegocio.porcentual),
    "Δ sinClasificar %": pct(f.variacion.gastosSinClasificar.porcentual),
  })),
);

// ── Chequeos de invariantes ──────────────────────────────────────────────────
// Si alguno falla, el número de la pantalla es mentira y hay que saberlo.
const fallos = [];
for (const f of data.filas) {
  if (Math.abs(f.ingresos - f.costoMercaderia - f.margenBruto) > 0.01) {
    fallos.push(`${f.mes}: margenBruto != ingresos - costoMercaderia`);
  }
  if (Math.abs(f.gastosFijos + f.gastosVariables - f.gastosNegocio) > 0.01) {
    fallos.push(`${f.mes}: gastosNegocio != fijos + variables`);
  }
  if (Math.abs(f.margenBruto - f.gastosNegocio - f.gananciaNegocio) > 0.01) {
    fallos.push(`${f.mes}: gananciaNegocio != margenBruto - gastosNegocio`);
  }
  if (Math.abs(f.gananciaNegocio - f.gastosSinClasificar - f.gananciaNegocioPeorCaso) > 0.01) {
    fallos.push(`${f.mes}: peorCaso != gananciaNegocio - sinClasificar`);
  }
  // Los personales jamás pueden estar dentro de gastosNegocio, y los sin
  // clasificar nunca pueden imputarse a fijos ni a variables: los cuatro
  // baldes tienen que sumar exactamente el total del mes.
  const porBalde = f.gastosFijos + f.gastosVariables + f.gastosSinClasificar + f.gastosPersonales;
  const porFormula = f.gastosNegocio + f.gastosSinClasificar + f.gastosPersonales;
  if (Math.abs(porBalde - porFormula) > 0.01) {
    fallos.push(`${f.mes}: los buckets de gastos no cierran (${porBalde} vs ${porFormula})`);
  }
  if (f.gastosSinClasificar > 0 && f.cantidadGastosSinClasificar === 0) {
    fallos.push(`${f.mes}: hay monto sin clasificar pero la cantidad es 0`);
  }
  if (!Number.isFinite(f.gananciaNegocio)) fallos.push(`${f.mes}: gananciaNegocio no es finito`);
  // Un costo de mercadería de 0 con ingresos > 0 es la firma de un campo leído
  // con el nombre equivocado: la fórmula sigue cerrando (ingresos - 0 - 0 =
  // ingresos) y ningún invariante interno lo detecta. Se chequea aparte.
  if (f.ingresos > 0 && f.costoMercaderia === 0) {
    fallos.push(`${f.mes}: costoMercaderia = 0 con ingresos > 0 — campo mal leído o costo congelado roto`);
  }
  if (f.ingresos > 0 && f.costoMercaderia > f.ingresos) {
    fallos.push(`${f.mes}: costoMercaderia > ingresos — margen negativo imposible con costo de catálogo`);
  }
}
// División por cero: nunca Infinity, siempre null.
for (const f of data.filas) {
  for (const [clave, v] of Object.entries(f.variacion)) {
    if (v.porcentual !== null && !Number.isFinite(v.porcentual)) {
      fallos.push(`${f.mes}.${clave}: porcentual no finito (${v.porcentual})`);
    }
  }
  // Si el mes anterior fue 0, el porcentaje NO puede existir.
  const anterior = data.filas[data.filas.indexOf(f) + 1];
  if (anterior) {
    for (const [clave, v] of Object.entries(f.variacion)) {
      const campoAnterior = anterior[clave];
      if (campoAnterior === 0 && v.porcentual !== null) {
        fallos.push(`${f.mes}.${clave}: el mes anterior fue 0 y el porcentaje no es null`);
      }
    }
  }
}

// ── Contraste contra la auditoría de T3 ──────────────────────────────────────
// Las invariantes de arriba verifican que las cuentas CIERREN, no que sean
// CORRECTAS: una cuenta puede cerrar perfectamente con el campo equivocado. Este
// bloque las ata a números que ya se verificaron a mano contra Neon, así una
// regresión de lectura se ve aunque las fórmulas sigan cuadrando.
//
// Cifras de odd/tasks/dashboard-comparativo.md §"Hallazgos de la auditoría".
// Tolerancia de 1 peso por redondeo de `::numeric` a float.
const AUDITADO = {
  "2026-07": { ingresos: 4820968, margenBruto: 997540 },
  "2026-08": { ingresos: 8900980, margenBruto: 2429522 },
  "2026-09": { ingresos: 8244466, margenBruto: 2644943 },
};
for (const f of data.filas) {
  const ref = AUDITADO[f.mes];
  if (!ref) continue;
  if (Math.abs(f.ingresos - ref.ingresos) > 1) {
    fallos.push(`${f.mes}: ingresos ${f.ingresos} != auditado ${ref.ingresos}`);
  }
  if (Math.abs(f.margenBruto - ref.margenBruto) > 1) {
    fallos.push(`${f.mes}: margenBruto ${f.margenBruto} != auditado ${ref.margenBruto}`);
  }
}
if (Math.abs(data.capital.total - 7118443) > 1) {
  fallos.push(`capital ${data.capital.total} != auditado 7118443`);
}
if (data.capital.historicoDisponible !== false) {
  fallos.push("capital.historicoDisponible debería ser false mientras no existan snapshots");
}
if (Math.abs(data.avisos.gastosSinClasificarTotal - 751181.22) > 1) {
  fallos.push(`sin clasificar ${data.avisos.gastosSinClasificarTotal} != auditado 751181.22`);
}
if (data.avisos.gastosSinClasificarCantidad !== 13) {
  fallos.push(`sin clasificar ${data.avisos.gastosSinClasificarCantidad} gastos != auditado 13`);
}
// El capital es un stock: no puede aparecer como una fila mensual.
if (data.filas.some((f) => 'capital' in f || 'capitalTotal' in f)) {
  fallos.push("el capital se coló dentro de la serie mensual: eso es sumar un stock con flujos");
}

console.log(`\n=== Invariantes + contraste con la auditoría ===`);
console.log(fallos.length === 0 ? "OK: todas las cuentas cierran y coinciden con la auditoría." : `FALLOS:\n - ${fallos.join("\n - ")}`);

await sql.end();
