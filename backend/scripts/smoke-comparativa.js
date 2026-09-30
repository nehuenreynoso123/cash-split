// Smoke test HTTP de la ruta /api/comparativa-mensual. SOLO LECTURA.
//
// NO arranca api_cash_split/server.js a propósito: app.js llama a
// runMigrations() en el import, y eso es DDL. Este script monta los mismos
// routers sobre una app de express sin migraciones y golpea el endpoint con un
// token firmado, para comprobar la cadena completa sin escribir nada.
//
// Uso:  node --env-file=backend/.env backend/scripts/smoke-comparativa.js

import express from "express";
import jwt from "jsonwebtoken";
import routes from "../api_cash_split/routes.js";
import sql from "../store/database.js";
import config from "../config.js";

const app = express();
app.use(express.json());
routes(app);

const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}/api`;

// SELECT sobre usuarios: nada más. El token se firma con el mismo secreto que
// usa el middleware, así que el endpoint corre exactamente como en producción.
const [usuario] = await sql`SELECT id, email FROM usuarios ORDER BY id LIMIT 1`;
if (!usuario) {
  console.log("No hay usuarios para autenticar. Abortando.");
  server.close();
  await sql.end();
  process.exit(1);
}
const token = jwt.sign({ id: usuario.id, email: usuario.email }, config.jwt.SECRET, { expiresIn: "1h" });
console.log(`usuario de prueba: ${usuario.email}`);

const pegar = async (params) => {
  const res = await fetch(`${base}/comparativa-mensual${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { status: res.status, body: await res.json() };
};

// 1. Sin token: la ruta existe y el middleware responde.
const sinToken = await fetch(`${base}/comparativa-mensual`);
console.log(`\n[1] sin token -> HTTP ${sinToken.status}`);

// 2. Con token: el payload completo.
const ok = await pegar("?meses=6");
console.log(`[2] con token -> HTTP ${ok.status}`);
if (ok.status !== 200) {
  console.log(JSON.stringify(ok.body));
} else {
  const d = ok.body.body ?? ok.body;
  console.log(`    ventana: ${d.ventana.meses} meses · ${d.ventana.desde} → ${d.ventana.hasta}`);
  console.log(`    filas: ${d.filas.length} (con datos: ${d.avisos.mesesConDatos}, primer mes: ${d.avisos.primerMesConDatos})`);
  console.log(`    capital: ${d.capital.total} al ${d.capital.fecha} · historicoDisponible=${d.capital.historicoDisponible}`);
  console.log(`    sin clasificar: ${d.avisos.gastosSinClasificarTotal} (${d.avisos.gastosSinClasificarCantidad} gastos)`);
  console.table(
    d.filas.map((f) => ({
      mes: f.mes,
      ingresos: f.ingresos,
      costoMercaderia: f.costoMercaderia,
      margenBruto: f.margenBruto,
      gastosNegocio: f.gastosNegocio,
      sinClasificar: f.gastosSinClasificar,
      personales: f.gastosPersonales,
      gananciaNegocio: f.gananciaNegocio,
      "Δ ganancia %": f.variacion.gananciaNegocio.porcentual,
      costoVentaFact: f.costosVentaFacturacion,
      facturas: f.facturas,
    })),
  );
}

// 3. `meses` fuera de rango se acota, no rompe.
for (const q of ["?meses=0", "?meses=999", "?meses=abc", "?meses=-3", ""]) {
  const r = await pegar(q);
  const d = r.body.body ?? r.body;
  console.log(`[3] ${(q || "(sin query)").padEnd(14)} -> HTTP ${r.status} · filas=${d?.filas?.length ?? "?"}`);
}

server.close();
await sql.end();
