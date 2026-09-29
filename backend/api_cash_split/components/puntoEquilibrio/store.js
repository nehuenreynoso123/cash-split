import sql from "../../../store/database.js";

// Punto de equilibrio del emprendimiento.
//
// Arma el modelo de contribución sobre un período y devuelve los NÚMEROS que
// la UI necesita para dibujar la regla de equilibrio y correr el simulador.
// Toda la aritmética se hace acá, en el servidor, con datos reales: la UI sólo
// simula "y si el usuario cambia estos dos parámetros".
//
// ── Semántica de período ──────────────────────────────────────────────────────
// ventas se filtra por created_at, IGUAL que listFlujoFondos
// (flujoFondos/store.js). Usar fecha_cobro acá haría que esta sección y Flujo
// de Fondos mostraran números distintos para el mismo período, y el usuario
// no podría sumar ninguno de los dos. ventas_facturacion se filtra por `fecha`
// (la fecha de la venta) porque es un documento de venta, no un movimiento de
// stock.
//
// ── De dónde sale cada número ────────────────────────────────────────────────
// ingresos ........... SUM(ventas.precio)         (total de línea, no unitario)
// costoMercaderia ... SUM(ventas.precio - ventas.ganancia)   ← costo CONGELADO
//   Es el mismo criterio que flujoFondos: usar el costo congelado y no el precio
//   actual del producto evita que cambiar el costo de un producto reescriba
//   cuánta plata se gastó en meses ya cerrados.
// operativos .......... de ventas_facturacion, POR VENTA
//
// El costo operativo entra como TASA, no como monto (ver calcularModelo): si la
// facturación del período cubre sólo algunas ventas, tomar el monto absoluto
// subestimaría el costo de todas. La tasa se mide sobre lo facturado y se aplica
// a los ingresos del período.

const N = (v) => Number(v ?? 0);

// Los gastos del negocio son los de categoría 'emprendimiento' y 'servicios'.
// 'personal' NO entra acá: no es costo del negocio, es el segundo umbral que el
// equilibrio personal exige cubrir. Se_constant evita repetir el array.
const CATEGORIAS_NEGOCIO = ["emprendimiento", "servicios"];

// Filtro de rango de fechas sobre una columna, replicando la convención del
// resto del código: `hasta` es INCLUSIVO, así que se compara contra el día
// siguiente (cajaGastosOperativos/store.js hace lo mismo).
function rangoFechas(columna, desde, hasta) {
  const conds = [];
  if (desde) conds.push(sql`${columna} >= ${desde}`);
  if (hasta) conds.push(sql`${columna} < (${hasta}::date + interval '1 day')`);
  if (conds.length === 0) return sql`TRUE`;
  return conds.reduce((acc, cond) => sql`${acc} AND ${cond}`);
}

export async function getPuntoEquilibrio({ desde, hasta } = {}) {
  const condVentas = rangoFechas(sql`v.created_at`, desde, hasta);
  const condFacturacion = rangoFechas(sql`f.fecha`, desde, hasta);
  const condGastos = rangoFechas(sql`g.fecha`, desde, hasta);

  // Las tres sumas son independientes: un solo round-trip. Cada una devuelve
  // exactamente UNA fila (los agregados sin GROUP BY), así que [0] es seguro.
  const [ventasRows, operRows, gastosRows] = await Promise.all([
    sql`
      SELECT
        COALESCE(SUM(v.cantidad), 0) AS unidades,
        COALESCE(SUM(v.precio::numeric), 0) AS ingresos,
        -- COALESCE defensivo, igual que flujoFondos: una venta vieja sin margen
        -- congelado cuenta como costo total (margen 0) en vez de romper el SUM.
        COALESCE(SUM(COALESCE(v.precio::numeric - v.ganancia::numeric, v.precio::numeric)), 0) AS costo_mercaderia
      FROM ventas v
      WHERE ${condVentas}
    `,
    sql`
      SELECT
        COALESCE(SUM(f.comision_venta::numeric + f.comision_cuota::numeric), 0) AS comisiones,
        COALESCE(SUM(f.retenciones::numeric), 0) AS retenciones,
        COALESCE(SUM(f.envio_ml::numeric + f.envio_flex::numeric), 0) AS envios,
        COALESCE(SUM(f.descuento::numeric), 0) AS descuentos,
        COALESCE(SUM(f.importe::numeric), 0) AS ingresos_facturacion,
        COUNT(*) AS facturas
      FROM ventas_facturacion f
      WHERE ${condFacturacion}
    `,
    sql`
      SELECT
        g.categoria,
        g.tipo,
        COALESCE(SUM(g.monto::numeric), 0) AS total_monto
      FROM gastos g
      WHERE ${condGastos}
      GROUP BY g.categoria, g.tipo
    `,
  ]);

  return calcularModelo({
    desde,
    hasta,
    ventas: ventasRows[0],
    operativos: operRows[0],
    gastos: gastosRows,
  });
}

// Puro: no toca la base. Existe separado del store para que la aritmética sea
// legible (y testeable a mano) sin pasar por SQL.
export function calcularModelo({ desde, hasta, ventas, operativos, gastos }) {
  const unidades = N(ventas?.unidades);
  const ingresos = N(ventas?.ingresos);
  const costoMercaderia = N(ventas?.costo_mercaderia);
  const margenBruto = ingresos - costoMercaderia;

  const ingresosFacturacion = N(operativos?.ingresos_facturacion);
  const costoOperativoFacturado =
    N(operativos?.comisiones) +
    N(operativos?.retenciones) +
    N(operativos?.envios) +
    N(operativos?.descuentos);
  const facturas = N(operativos?.facturas);

  // ── Reparto de gastos por categoría × tipo ─────────────────────────────────
  let fijosNegocio = 0;
  let variablesNegocio = 0;
  let sinTipoNegocio = 0;
  let personal = 0;
  let sinCategoria = 0;

  for (const row of gastos ?? []) {
    const total = N(row.total_monto);
    const esNegocio = CATEGORIAS_NEGOCIO.includes(row.categoria);

    if (row.categoria === "personal") {
      personal += total;
      continue;
    }
    if (esNegocio) {
      if (row.tipo === "fijo") fijosNegocio += total;
      else if (row.tipo === "variable") variablesNegocio += total;
      else sinTipoNegocio += total;
      continue;
    }
    // categoria === null: gastos cargados antes de la columna categoria. No se
    // pueden asignar solos (nada dice si eran personales o del negocio) y
    // metirlos en un bucket sería mentir. Se los reporta aparte.
    sinCategoria += total;
  }

  // ── Tasa de costo operativo ───────────────────────────────────────────────
  // Se mide sobre lo FACTURADO y se aplica a los ingresos del período, para que
  // una facturación parcial no subestime el costo de todo lo vendido.
  const sinDatosFacturacion = ingresosFacturacion === 0 && facturas === 0;
  const tasaOperativa = ingresosFacturacion > 0 ? costoOperativoFacturado / ingresosFacturacion : 0;
  const costoOperativo = ingresos * tasaOperativa;

  // ── Margen de contribución ────────────────────────────────────────────────
  // Ingresos menos TODO lo que crece con la venta: mercadería, costo operativo
  // por venta y los gastos que el usuario marcó como variables.
  const costosVariables = costoMercaderia + costoOperativo + variablesNegocio;
  const margenContribucion = ingresos - costosVariables;
  const tasaVariable = ingresos > 0 ? costosVariables / ingresos : 0;
  const tasaContribucion = ingresos > 0 ? margenContribucion / ingresos : 0;

  // Gastos personales son FIJOS respecto de las ventas: no cambian si vendés el
  // doble. Son el segundo umbral, no un costo variable.
  const costosFijos = fijosNegocio;
  const umbralPersonal = fijosNegocio + personal;

  // ── Guard clauses: el equilibrio puede no existir ──────────────────────────
  // Si cada venta deja <= 0, no hay punto de equilibrio: vender más hace
  // perder más plata. Se devuelve el flag y la UI lo dice con todas las letras.
  // Nunca Infinity ni NaN en el payload (JSON los convierte a null y la UI
  // mostraría "null" o se rompería al multiplicar).
  const equilibrioAlcanzable = tasaContribucion > 0 && ingresos > 0;
  const equilibrioNegocio = equilibrioAlcanzable ? costosFijos / tasaContribucion : null;
  const equilibrioPersonal = equilibrioAlcanzable ? umbralPersonal / tasaContribucion : null;

  // Precio unitario promedio: convierte el equilibrio en pesos a unidades.
  // Con unidades === 0 e ingresos > 0 el promedio no existe, así que se omite
  // en vez de dividir por cero.
  const precioUnitarioMedio = unidades > 0 ? ingresos / unidades : null;
  const unidadesEquilibrioNegocio =
    equilibrioNegocio !== null && precioUnitarioMedio ? equilibrioNegocio / precioUnitarioMedio : null;
  const unidadesEquilibrioPersonal =
    equilibrioPersonal !== null && precioUnitarioMedio ? equilibrioPersonal / precioUnitarioMedio : null;

  // Resultado con los números reales del período. El equilibrio se calcula
  // arriba; acá se compares para que la UI no tenga que restar.
  const resultadoNegocio = ingresos - costosVariables - costosFijos;
  const resultadoPersonal = resultadoNegocio - personal;

  return {
    periodo: { desde: desde ?? null, hasta: hasta ?? null },
    ventas: {
      unidades,
      ingresos,
      costoMercaderia,
      margenBruto,
    },
    operativos: {
      ingresosFacturacion,
      facturas,
      comisiones: N(operativos?.comisiones),
      retenciones: N(operativos?.retenciones),
      envios: N(operativos?.envios),
      descuentos: N(operativos?.descuentos),
      total: costoOperativoFacturado,
      tasa: tasaOperativa,
    },
    gastos: {
      fijosNegocio,
      variablesNegocio,
      sinTipoNegocio,
      personal,
      sinCategoria,
      // Desglose crudo (categoría × tipo) para que la UI pueda mostrar de dónde
      // sale cada número en vez de pedirle fe.
      desglose: (gastos ?? []).map((row) => ({
        categoria: row.categoria ?? null,
        tipo: row.tipo ?? null,
        totalMonto: N(row.total_monto),
      })),
    },
    modelo: {
      costosVariables,
      costosOperativosAplicados: costoOperativo,
      margenContribucion,
      tasaContribucion,
      tasaVariable,
      costosFijos,
      umbralPersonal,
      precioUnitarioMedio,
      equilibrioAlcanzable,
      equilibrioNegocio,
      equilibrioPersonal,
      unidadesEquilibrioNegocio,
      unidadesEquilibrioPersonal,
      resultadoNegocio,
      resultadoPersonal,
      // Con cobertura total, tus ventas pagan todos tus gastos y te sobra plata.
      // Con saldo negativo, estás financiando al negocio con tu sueldo.
      cubreNegocio: resultadoNegocio >= 0,
      cubrePersonal: resultadoPersonal >= 0,
    },
    // Señales de honestidad: la UI las muestra como avisos, no las esconde.
    avisos: {
      sinDatosFacturacion,
      gastosSinClasificar: sinTipoNegocio,
      gastosSinCategoria: sinCategoria,
      gastosClasificados: sinTipoNegocio === 0,
      equilibrioNoAlcanzable: !equilibrioAlcanzable && ingresos > 0,
    },
  };
}
