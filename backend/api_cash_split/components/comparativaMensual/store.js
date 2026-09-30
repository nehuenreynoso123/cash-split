import sql from "../../../store/database.js";

// Comparativa mes a mes del negocio.
//
// ── La regla que gobierna este archivo ────────────────────────────────────────
//
// Un STOCK y un FLUJO nunca se suman en la misma fórmula.
//
//   · Flujo  (se mide en un PERÍODO): ingresos, costo de mercadería vendida,
//     gastos, ganancia del mes. Cambia con las fechas, y DEBE cambiar: es lo que
//     pasó en ese mes.
//   · Stock  (se mide en un INSTANTE): plata en mano, mercadería en el estante,
//     capital total. No tiene eje temporal.
//
// El bug que esto arregla (DashboardClient.tsx:43) sumaba las dos cosas:
// `totalInversion - totalGastos + netoLiquidezManual`, donde el primer término es
// el valor de la mercadería de HOY y los otros dos son flujos del período. El
// resultado cambiaba al tocar el filtro sin que hubiera cambiado ni la plata ni
// el estante. Por eso acá `capital` NO es parte de `filas`: vive aparte, con su
// fecha, y se declara explícitamente como no disponible para meses pasados.
//
// ── De dónde sale cada número ────────────────────────────────────────────────
//
// ventas ......... fecha = created_at (la fecha de la venta), igual que
//                  listFlujoFondos y getPuntoEquilibrio. Usar fecha_cobro acá
//                  haría que esta pantalla y Flujo de Fondos no sumaran.
// gastos ......... fecha = gastos.fecha (la fecha del gasto).
// facturación .... fecha = ventas_facturacion.fecha (fecha de la venta del
//                  documento, no la de emisión de la factura).
//
// ── El costo de mercadería es CONGELADO ──────────────────────────────────────
//
// Se usa `ventas.precio - ventas.ganancia`, no `productos.precio * cantidad`:
// editar hoy el costo de un producto no puede reescribir cuánto se gastó en un
// mes ya cerrado. La rama se decide por el VALOR de `ganancia`, no por NULL: la
// columna es NOT NULL DEFAULT 0, así que una venta anterior a la columna tiene
// ganancia = 0 y un COALESCE sobre NULL nunca caería al fallback. Ver el
// comentario largo en flujoFondos/store.js, que es la referencia de este patrón.

const N = (v) => Number(v ?? 0);

// Gastos del negocio. `personal` NO entra acá: es consumo propio, no costo de
// operar, y por eso se informa en su propia línea y no resta de la ganancia del
// negocio. Coincide con la lista de puntoEquilibrio/store.js.
const CATEGORIAS_NEGOCIO = ["emprendimiento", "servicios"];

// Límite duro del parámetro `meses`. No es un capricho: cada mes agrega una fila
// y la tabla se vuelve ilegible muy por encima de 12.
const MESES_MAX = 12;
const MESES_DEFAULT = 6;

// ── Helpers puros ────────────────────────────────────────────────────────────

// Ventana de claves 'YYYY-MM', de la más reciente a la más antigua. Se ancla en
// el mes que dice la base (CURRENT_DATE) y no en el del servidor: la diferencia
// de zona horaria entre la app y Neon corría el día 1 del mes.
export function ventanaDeMeses(mesActual, cantidad) {
  const [anio, mes] = mesActual.split("-").map(Number);
  const claves = [];
  for (let i = 0; i < cantidad; i += 1) {
    // Date.UTC normaliza los meses negativos: mes 0 del año anterior cae bien.
    const d = new Date(Date.UTC(anio, mes - 1 - i, 1));
    claves.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return claves;
}

// Límites de la ventana COMPLETA: del día 1 del mes más antiguo al último día
// del mes más reciente. `claves` viene de la más reciente a la más antigua, así
// que el mes más antiguo es el último elemento.
function limitesDeVentana(claves) {
  const masAntigua = claves[claves.length - 1];
  const masReciente = claves[0];
  const [anioViejo, mesViejo] = masAntigua.split("-").map(Number);
  const [anioNuevo, mesNuevo] = masReciente.split("-").map(Number);
  // Date.UTC(anio, mes, 0) es el último día de ese mes (día 0 del mes siguiente).
  const ultimoDiaNuevo = new Date(Date.UTC(anioNuevo, mesNuevo, 0)).getUTCDate();
  return {
    desde: `${masAntigua}-01`,
    hasta: `${masReciente}-${String(ultimoDiaNuevo).padStart(2, "0")}`,
  };
}

// Variación contra el mes anterior.
//
// `porcentual` es null cuando el mes anterior fue 0, no Infinity ni 0: dividir
// por cero no tiene respuesta, y devolver 0 haría leer "no cambió nada" a un mes
// que pasó de 0 a cualquier cosa. El denominador es Math.abs(anterior) a
// propósito: en gananciaNegocio el mes anterior puede ser negativo (el negocio
// daba pérdida), y con el signo puesto un passage de -100.000 a +50.000 salía
// -150% leído como "empeoró" cuando es lo contrario.
function variacion(actual, anterior) {
  if (anterior === null || anterior === undefined) return { absoluta: null, porcentual: null };
  const absoluta = actual - anterior;
  return {
    absoluta,
    porcentual: anterior !== 0 ? absoluta / Math.abs(anterior) : null,
  };
}

// ── Store ────────────────────────────────────────────────────────────────────

export async function listComparativaMensual({ meses } = {}) {
  const cantidad = Math.min(Math.max(Number(meses) || MESES_DEFAULT, 1), MESES_MAX);

  const [hoyRows, ventasRows, gastosRows, facturacionRows, capitalRows] = await Promise.all([
    // El "mes actual" lo define la base, no el servidor: en la frontera de mes
    // el reloj de Vercel y el de Neon pueden no coincidir.
    sql`SELECT to_char(CURRENT_DATE, 'YYYY-MM') AS mes, CURRENT_DATE::text AS hoy`,
    sql`
      SELECT
        to_char(date_trunc('month', v.created_at), 'YYYY-MM') AS mes,
        COUNT(*) AS unidades,
        COALESCE(SUM(v.precio::numeric), 0) AS ingresos,
        -- Costo CONGELADO, misma ramificación por valor que flujoFondos/store.js.
        -- LEFT JOIN (no INNER) para que una venta cuyo producto faltara no
        -- desaparezca del período sin avisar.
        COALESCE(SUM(CASE WHEN v.ganancia::numeric > 0
                          THEN v.precio::numeric - v.ganancia::numeric
                          ELSE p.precio::numeric * v.cantidad END), 0) AS costo_mercaderia
        FROM ventas v
        LEFT JOIN productos p ON p.id = v.producto_id
       GROUP BY 1
    `,
    sql`
      SELECT
        to_char(date_trunc('month', g.fecha), 'YYYY-MM') AS mes,
        g.categoria,
        g.tipo,
        COUNT(*) AS cantidad,
        COALESCE(SUM(g.monto::numeric), 0) AS total_monto
          FROM gastos g
         GROUP BY 1, 2, 3
    `,
    // Costo operativo POR VENTA (comisiones, envíos, retenciones, descuentos).
    // Vive en ventas_facturacion y NO está dentro de ventas.ganancia — se
    // informa aparte y no se resta de gananciaNegocio. Ver el bloque de abajo.
    sql`
      SELECT
        to_char(date_trunc('month', f.fecha), 'YYYY-MM') AS mes,
        COUNT(*) AS facturas,
        COALESCE(SUM(
          f.comision_venta::numeric + f.comision_cuota::numeric
          + f.envio_ml::numeric + f.envio_flex::numeric
          + f.retenciones::numeric + f.descuento::numeric
        ), 0) AS total
          FROM ventas_facturacion f
         GROUP BY 1
    `,
    // Capital de HOY. Es un stock: se lee una sola vez, fuera de la serie
    // mensual, y viaja con su propia fecha.
    sql`
      SELECT
        CURRENT_DATE::text AS fecha,
        COALESCE((SELECT SUM(CASE WHEN tipo = 'ingreso' THEN monto::numeric ELSE -monto::numeric END)
                    FROM liquidez), 0) AS plata,
        COALESCE((SELECT SUM(precio::numeric * stock)
                    FROM productos WHERE activo = true), 0) AS mercaderia
    `,
  ]);

  const hoy = hoyRows[0] ?? {};
  const claves = ventanaDeMeses(hoy.mes ?? "1970-01", cantidad);

  return calcularComparativa({
    claves,
    ventana: limitesDeVentana(claves),
    hoy: hoy.hoy ?? null,
    ventas: ventasRows,
    gastos: gastosRows,
    facturacion: facturacionRows,
    capital: capitalRows[0],
  });
}

// ── Aritmética ───────────────────────────────────────────────────────────────

// Puro: no toca la base. Existe separado del store para que la aritmética sea
// legible y testeable a mano sin pasar por SQL.
export function calcularComparativa({ claves, ventana, hoy, ventas, gastos, facturacion, capital }) {
  const porMesVentas = indexar(ventas);
  const porMesFacturacion = indexar(facturacion);

  // Los gastos llegan aplanados por mes × categoría × tipo. Se recorren una vez
  // y cada fila cae en EXACTAMENTE un balde.
  const porMesGastos = new Map();
  for (const row of gastos ?? []) {
    const mes = String(row.mes);
    if (!porMesGastos.has(mes)) porMesGastos.set(mes, bucketVacio());
    repartirGasto(porMesGastos.get(mes), row);
  }

  // `claves` viene de la más reciente a la más antigua; se recorre en ese orden
  // para que el índice i-1 sea siempre "el mes anterior" del mes i.
  const filas = claves.map((mes) => {
    // Mapeo EXPLÍCITO snake_case → camelCase, no un spread. El store devuelve
    // el payload que consume la UI, y mezclar las dos convenciones en el mismo
    // objeto es la forma más rápida de que un campo se lea `undefined` y valga
    // 0 sin que ninguna fórmula se queje.
    const v = porMesVentas.get(mes);
    const f = porMesFacturacion.get(mes);
    const g = porMesGastos.get(mes) ?? bucketVacio();

    const unidades = N(v?.unidades);
    const ingresos = N(v?.ingresos);
    const costoMercaderia = N(v?.costo_mercaderia);
    const margenBruto = ingresos - costoMercaderia;

    // `gastosNegocio` son SÓLO losftimegastos del negocio con tipo conocido.
    // Los que no tienen tipo no entran: no se sabe si escalan con la venta, y
    // meterlos en un balde sería inventar. Quedan en `gastosSinClasificar`, a la
    // vista, y `gananciaNegocioPeorCaso` da el piso si fueran todos del negocio.
    const gastosNegocio = g.fijos + g.variables;
    const gananciaNegocio = margenBruto - gastosNegocio;
    const gastosSinClasificar = g.sinClasificar;

    const sinDatos = unidades === 0 && g.totalGastos === 0 && N(f?.facturas) === 0;

    return {
      mes,
      sinDatos,
      unidades,
      ingresos,
      costoMercaderia,
      margenBruto,
      gastosNegocio,
      gastosFijos: g.fijos,
      gastosVariables: g.variables,
      // Se INFORMA, no se imputa: ni a fijos ni a variables, ni dentro de
      // gastosNegocio. La app no sabe qué son, y fingir que lo sabe es peor que
      // mostrar el hueco.
      gastosSinClasificar,
      cantidadGastosSinClasificar: g.sinClasificarCantidad,
      // Los personales se informan aparte y NO restan: son consumo propio.
      gastosPersonales: g.personal,
      gananciaNegocio,
      // Piso de la ganancia del mes si TODO lo que falta clasificar resultara
      // ser gasto del negocio. No es un número real: es el borde inferior
      // honesto, y por eso viaja con su propio nombre.
      gananciaNegocioPeorCaso: gananciaNegocio - gastosSinClasificar,
      // Costo operativo de cada venta, por separado. Ver la nota de alcance.
      costosVentaFacturacion: N(f?.total),
      facturas: N(f?.facturas),
    };
  });

  // Variaciones contra el mes anterior, ahora que las filas están completas.
  // La más antigua de la ventana no tiene anterior: sus dos campos van null.
  for (let i = 0; i < filas.length; i += 1) {
    const anterior = i === filas.length - 1 ? null : filas[i + 1];
    filas[i].variacion = {
      ingresos: variacion(filas[i].ingresos, anterior?.ingresos ?? null),
      costoMercaderia: variacion(filas[i].costoMercaderia, anterior?.costoMercaderia ?? null),
      margenBruto: variacion(filas[i].margenBruto, anterior?.margenBruto ?? null),
      gastosNegocio: variacion(filas[i].gastosNegocio, anterior?.gastosNegocio ?? null),
      gastosSinClasificar: variacion(filas[i].gastosSinClasificar, anterior?.gastosSinClasificar ?? null),
      gastosPersonales: variacion(filas[i].gastosPersonales, anterior?.gastosPersonales ?? null),
      gananciaNegocio: variacion(filas[i].gananciaNegocio, anterior?.gananciaNegocio ?? null),
    };
  }

  const conActividad = filas.filter((f) => !f.sinDatos);
  const totalSinClasificar = filas.reduce((s, f) => s + f.gastosSinClasificar, 0);

  return {
    ventana: { meses: filas.length, desde: ventana.desde, hasta: ventana.hasta },
    generadoEn: hoy,
    filas,
    // Capital: un SOLO número, el de hoy, fuera de la serie mensual.
    capital: {
      fecha: capital?.fecha ?? hoy,
      plata: N(capital?.plata),
      mercaderia: N(capital?.mercaderia),
      total: N(capital?.plata) + N(capital?.mercaderia),
      // Falso a propósito, hasta que existan snapshots. `liquidez` tiene 6 filas
      // y su `fecha` es el NOW() del insert, no la del movimiento: no hay forma
      // de saber cuánta plata había en junio. Decir "no disponible" es la única
      // respuesta honesta; inventar un backfill sería fabricar capital.
      historicoDisponible: false,
      motivoHistorico:
        "No hay histórico de capital: la tabla liquidez guarda la fecha del insert, no la del movimiento. Capital de meses anteriores a hoy no está disponible.",
    },
    avisos: {
      mesesPedidos: filas.length,
      mesesConDatos: conActividad.length,
      hayMesesSinDatos: conActividad.length < filas.length,
      // El primero con datos, para que la UI pueda decir "empezaste en julio"
      // en vez de dejar filas vacías sin explicación.
      primerMesConDatos: conActividad.length > 0 ? conActividad[conActividad.length - 1].mes : null,
      gastosSinClasificarTotal: totalSinClasificar,
      gastosSinClasificarCantidad: filas.reduce((s, f) => s + f.cantidadGastosSinClasificar, 0),
      gastosClasificados: totalSinClasificar === 0,
    },
  };
}

function bucketVacio() {
  return {
    fijos: 0,
    variables: 0,
    personal: 0,
    sinClasificar: 0,
    sinClasificarCantidad: 0,
    totalGastos: 0,
  };
}

// Cada fila de gastos cae en un balde y sólo en uno. El orden de las
// condiciones importa: `personal` se prueba PRIMERO para que un gasto personal
// sin tipo no se cuele en "sin clasificar" (ya está fuera del negocio, se
// informa aparte, no es un hueco de clasificación que haya que resolver).
function repartirGasto(bucket, row) {
  const total = N(row.total_monto);
  const cantidad = N(row.cantidad);
  const categoria = row.categoria ?? null;
  const tipo = row.tipo ?? null;

  bucket.totalGastos += cantidad;

  if (categoria === "personal") {
    bucket.personal += total;
    return;
  }
  if (!categoria || !CATEGORIAS_NEGOCIO.includes(categoria)) {
    // Sin categoría (o con una que no existe): no se puede saber si era del
    // negocio o personal. No se lo asigna a nadie.
    bucket.sinClasificar += total;
    bucket.sinClasificarCantidad += cantidad;
    return;
  }
  if (tipo === "fijo") {
    bucket.fijos += total;
    return;
  }
  if (tipo === "variable") {
    bucket.variables += total;
    return;
  }
  // Categoría del negocio sin tipo: sabemos que es del negocio, pero no si
  // escala con la venta. Se declara incompleto, igual que el caso anterior.
  bucket.sinClasificar += total;
  bucket.sinClasificarCantidad += cantidad;
}

function indexar(rows) {
  const map = new Map();
  for (const row of rows ?? []) map.set(String(row.mes), row);
  return map;
}

// ── Sobre `costosVentaFacturacion` (y por qué NO se resta) ────────────────────
//
// `ventas.ganancia` es `ventas.precio - productos.precio * cantidad`: el margen
// bruto de la mercadería, y nada más. NO contiene comisiones, envíos,
// retenciones ni descuentos — esos viven sólo en ventas_facturacion. Verificado
// sobre los datos: en 159 de 161 ventas, `precio - ganancia` es EXACTAMENTE igual
// al costo de catálogo; si las comisiones ya estuvieran descontadas, sería
// sistemáticamente mayor. Las 2 que difieren son las ventas anteriores a la
// columna `ganancia` (ganancia = 0), no un descuento de comisión.
//
// O sea: sumarlos NO sería doble conteo. Y aun así este archivo NO los resta de
// `gananciaNegocio`, por dos razones que son de datos, no de fórmula:
//
//   1. `ventas_facturacion` no cubre las mismas ventas que `ventas`. En
//      septiembre hay 73 ventas y 49 facturas; en julio, 19 y 1. En agosto los
//      conteos coinciden (69 y 69) pero los montos no: 8.900.980 contra
//      13.037.000. Aplicar el costo operativo de una población incompleta y
//      valuada distinto sobre una población completa produce un número sin
//      definición.
//   2. No hay llave para unirlos. De 119 filas de facturación sólo 4 tienen
//      `factura_id`, y el cruce con `ventas.factura_id` da 0 filas. No se puede
//      atribuir una comisión a la venta que la generó.
//
// Sumarlo además duplicaría los 6 gastos de "plataformas" (166.000) que siguen
// sin clasificar justamente por esa misma sospecha. Por eso el costo se
// INFORMA por mes, con su conteo de facturas al lado para que se vea la
// cobertura, y la decisión de restarlo queda a la vista en vez de enterrada en
// una fórmula.
