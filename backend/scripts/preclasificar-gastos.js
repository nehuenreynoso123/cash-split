// Pre-clasificación de gastos. NO ESCRIBE NADA salvo que se pase --apply
// explícitamente. El flujo normal es: correr, revisar la tabla, decidir.
//
// Uso:
//   node --env-file=backend/.env backend/scripts/preclasificar-gastos.js
//   node --env-file=backend/.env backend/scripts/preclasificar-gastos.js --apply --confirm
//
// Contexto: los 116 gastos tienen `tipo` NULL en el 100% de las filas, así que
// Punto de Equilibrio no puede separar fijos de variables y adivina. Además 70
// de 116 (2.016.370) no tienen ni categoría, con negocio y personal mezclados
// en el mismo pozo (carrefour al lado de monotributo).
//
// La clasificación usa:
//   1. La categoría que el usuario YA puso → se respeta siempre (es su decisión).
//   2. Patrón sobre la descripción, sólo para las filas sin categoría.
//
// Cada propuesta lleva `confianza`:
//   alta  → el patrón es inequívoco, se puede aplicar sin mirar
//   media → razonable pero conviene que la revise
//   baja  → NO se propone nada; requiere decisión humana

import sql from "../store/database.js";

const APLICAR = process.argv.includes('--apply');
const CONFIRMAR = process.argv.includes('--confirm');

// ─── Reglas ───────────────────────────────────────────────────────────────────
// El orden importa: gana la primera que matchea. Personal va primero porque
// "comida", "nafta" y "carrefour" nunca son del negocio aunque la categoría
// actual diga otra cosa.
const REGLAS = [
  // --- Personal: no es costo del negocio, es distribución de utilidad ---
  { cat: 'personal', tipo: null, confianza: 'alta', nota: 'consumo personal',
    patrones: [/carrefour/, /\bcomida\b/, /^comida/, /pizza/, /hamburgues/, /empanad/, /^chino/, /verduleria/, /^coto/,
               /carbon/, /carbon$/, /parrilla/, /^asado/, /^cancha/, /futbol/, /quinta/, /chipa/,
               /yt music/, /youtube/, /gamepass/, /^xbox/, /almendra juegos/, /modulo ian/, /redragon/] },
  { cat: 'personal', tipo: null, confianza: 'media', nota: 'combustible / uso diario',
    patrones: [/nafta/, /^nadta/, /mas nafta/] },
  { cat: 'personal', tipo: null, confianza: 'media', nota: 'póliza personal',
    patrones: [/seguro auto/] },
  { cat: 'personal', tipo: null, confianza: 'baja', nota: 'arreglo doméstico vs herramienta de trabajo',
    patrones: [/lavarropa/, /valvula/] },

  // --- Emprendimiento ---
  // Monotributo: cuota fija, se paga haya vendido lo que haya. FIJO.
  { cat: 'emprendimiento', tipo: 'fijo', confianza: 'alta', nota: 'cuota fija mensual',
    patrones: [/monotributo/] },
  // Percepciones: retención sobre una venta puntual. Proporcional a ESA venta. VARIABLE.
  { cat: 'emprendimiento', tipo: 'variable', confianza: 'alta', nota: 'retención proporcional a la venta',
    patrones: [/percepcion/] },
  // Envíos/embalaje/logística: escala con la cantidad de envíos. VARIABLE.
  { cat: 'emprendimiento', tipo: 'variable', confianza: 'media', nota: 'logística, escala con los envíos',
    patrones: [/ecoflex/, /embalaje/, /devolucion/, /^envio/, /paseyenvio/] },
  { cat: 'emprendimiento', tipo: null, confianza: 'baja', nota: 'plataforma, definí el tipo',
    patrones: [/uso de ml/, /^adela/, /^creditos/] },
  // Impuestos: NO se puede clasificar sin saber cuál es cada uno.
  { cat: 'emprendimiento', tipo: null, confianza: 'baja', nota: 'definí cuál impuesto es: fijo o % sobre venta',
    patrones: [/impuesto/] },

  // --- Servicios ---
  { cat: 'servicios', tipo: 'fijo', confianza: 'media', nota: 'servicio mensual recurrente',
    patrones: [/telecentro/, /^5g/] },
];

function reglaDe(descripcion) {
  const d = (descripcion || '').trim().toLowerCase();
  for (const r of REGLAS) {
    if (r.patrones.some((p) => p.test(d))) return r;
  }
  return null;
}

function clasificar(descripcion, categoriaActual) {
  const d = (descripcion || '').trim().toLowerCase();
  const regla = reglaDe(d);

  // 1. La categoría que el usuario ya cargó es su decisión: nunca se toca.
  const categoria = categoriaActual || (regla ? regla.cat : null);

  // 2. El tipo (fijo/variable) se decide por patrón SÍ O SÍ, incluso en las filas
  //    que ya tenían categoría. Antes de este fix no se hacía, y las 12 filas que
  //    el usuario ya había clasificado como 'emprendimiento' quedaban con tipo
  //    NULL: el monotributo no se marcaba fijo y las percepciones no se marcaban
  //    variables. Se perdía la mitad del objetivo justo en los gastos que el
  //    usuario ya había hecho bien.
  //
  //    El tipo sólo tiene sentido para costos del negocio. En 'personal' no se
  //    asigna: no entra al cálculo de Punto de Equilibrio.
  const esNegocio = categoria === 'emprendimiento' || categoria === 'servicios';
  const tipo = esNegocio && regla ? regla.tipo : null;

  let confianza;
  let nota;
  if (!regla && categoriaActual) {
    confianza = 'respetada';
    nota = 'categoría ya cargada por el usuario; tipo sin regla';
  } else if (!regla) {
    confianza = 'baja';
    nota = 'sin regla que matchee';
  } else {
    confianza = regla.confianza;
    nota = categoriaActual ? `${regla.nota} (categoría ya cargada)` : regla.nota;
  }

  return { categoria, tipo, confianza, nota };
}

const gastos = await sql`
  SELECT id, descripcion, categoria, tipo, monto, fecha
    FROM gastos
   ORDER BY fecha, id
`;

const propuestas = gastos.map((g) => {
  const c = clasificar(g.descripcion, g.categoria);
  return { ...g, catActual: g.categoria, tipoActual: g.tipo, ...c,
           cambia: g.categoria !== c.categoria || (c.tipo !== null && g.tipo !== c.tipo) };
});

// ─── Reporte ─────────────────────────────────────────────────────────────────
console.log(`\n${'='.repeat(100)}`);
console.log('PROPUESTA DE CLASIFICACIÓN — NO SE ESCRIÓ NADA');
console.log('='.repeat(100));

const alta = propuestas.filter((p) => p.cambia && p.confianza === 'alta');
const media = propuestas.filter((p) => p.cambia && p.confianza === 'media');
const baja = propuestas.filter((p) => p.cambia && p.confianza === 'baja');
const yaOk = propuestas.filter((p) => !p.cambia);

const suma = (arr) => arr.reduce((s, p) => s + Number(p.monto), 0);

console.log(`\nTotal gastos: ${propuestas.length}`);
console.log(`  confianza alta (aplicable sin mirar): ${alta.length}  ${suma(alta).toLocaleString('es-AR')}`);
console.log(`  confianza media (revisar):             ${media.length}  ${suma(media).toLocaleString('es-AR')}`);
console.log(`  confianza baja  (decisión humana):     ${baja.length}  ${suma(baja).toLocaleString('es-AR')}`);
console.log(`  ya estaban bien:                       ${yaOk.length}  ${suma(yaOk).toLocaleString('es-AR')}`);

const tabla = (arr, titulo) => {
  if (arr.length === 0) return;
  console.log(`\n--- ${titulo} ---`);
  console.table(arr.map((p) => ({
    id: p.id,
    descripcion: p.descripcion.trim(),
    categoria: `${p.catActual ?? '—'} → ${p.categoria ?? 'SIN PROPUESTA'}`,
    tipo: `${p.tipoActual ?? '—'} → ${p.tipo ?? '—'}`,
    monto: Number(p.monto),
    nota: p.nota,
  })));
};

tabla(alta, 'ALTA — se pueden aplicar sin mirar');
tabla(media, 'MEDIA — revisá que做出 sense');
tabla(baja, 'BAJA — necesitan que decidas vos');

// ─── Impacto: qué pasa con los números del negocio ───────────────────────────
console.log(`\n--- IMPACTO EN EL NEGOCIO ---`);
const resumen = {};
for (const p of propuestas) {
  const cat = p.confianza === 'respetada' ? p.categoria : (p.categoria ?? 'SIN CLASIFICAR');
  if (!resumen[cat]) resumen[cat] = { registros: 0, total: 0 };
  resumen[cat].registros++;
  resumen[cat].total += Number(p.monto);
}
console.table(Object.entries(resumen).map(([categoria, v]) => ({
  categoria, registros: v.registros, total: v.total.toLocaleString('es-AR'),
})).sort((a, b) => Number(b.total.replace(/\D/g, '')) - Number(a.total.replace(/\D/g, ''))));

const negocio = propuestas.filter((p) => {
  const cat = p.confianza === 'respetada' ? p.categoria : p.categoria;
  return cat === 'emprendimiento' || cat === 'servicios';
}).reduce((s, p) => s + Number(p.monto), 0);
const personal = propuestas.filter((p) => (p.confianza === 'respetada' ? p.categoria : p.categoria) === 'personal')
  .reduce((s, p) => s + Number(p.monto), 0);
const sinClas = propuestas.filter((p) => (p.confianza === 'respetada' ? p.categoria : p.categoria) === null)
  .reduce((s, p) => s + Number(p.monto), 0);

console.log(`\nDel negocio:   ${negocio.toLocaleString('es-AR')}`);
console.log(`Personales:    ${personal.toLocaleString('es-AR')}`);
console.log(`Sin clasificar:${String(sinClas).padStart(12)}`);

if (!APLICAR) {
  console.log(`\nNada se escribió. Revisá la tabla y, si está bien, corré:`);
  console.log(`  node --env-file=backend/.env backend/scripts/preclasificar-gastos.js --apply --confirm`);
  await sql.end();
  process.exit(0);
}

if (!CONFIRMAR) {
  console.log('\nFalta --confirm. No se escribe nada.');
  await sql.end();
  process.exit(1);
}

// ─── Aplicar ─────────────────────────────────────────────────────────────────
// Sólo confianza alta y media. La baja queda sin tocar a propósito: son
// decisiones del usuario, no inferencias del script.
const aplicables = [...alta, ...media];
if (aplicables.length === 0) {
  console.log('\nNada aplicable.');
  await sql.end();
  process.exit(0);
}

for (const p of aplicables) {
  await sql`
    UPDATE gastos
       SET categoria = ${p.categoria},
           tipo = CASE WHEN ${p.tipo}::text IS NULL THEN tipo ELSE ${p.tipo} END
     WHERE id = ${p.id}
  `;
}
console.log(`\nActualizados ${aplicables.length} gastos (alta + media). La confianza baja quedó sin tocar.`);
await sql.end();
