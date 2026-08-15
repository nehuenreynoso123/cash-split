import sql from "../../../store/database.js";

// DATE columns are cast to text on read (fecha::text, fecha_factura::text):
// postgres.js parses DATE (oid 1082) into a JS Date, which would serialize as
// "2024-01-05T00:00:00.000Z" — the frontend renders date-only strings and
// would show "Invalid Date". The ::text cast keeps the YYYY-MM-DD round-trip.

// Column list shared by list() and the INSERT RETURNING so both shapes match.
const FACTURACION_COLUMNS = `
    id,
    'V-' || LPAD(id::text, 4, '0') AS numero,
    producto,
    fecha::text AS fecha,
    cantidad,
    precio_venta,
    comision_venta,
    comision_cuota,
    envio_ml,
    envio_flex,
    descuento,
    retenciones,
    total_recibido,
    importe,
    nro_factura,
    fecha_factura::text AS fecha_factura,
    codigo_postal,
    localidad,
    provincia,
    dni_cuit,
    nombre_apellido,
    nombre_factura,
    link,
    created_at
`;

export async function list() {
  // numero (V-0001, V-0002...) is derived from the row id — never stored as a
  // column, so it is recomputed on every read.
  return await sql`
        SELECT ${sql.unsafe(FACTURACION_COLUMNS)}
        FROM ventas_facturacion
        ORDER BY id ASC
    `;
}

export async function add({
  producto,
  fecha,
  cantidad,
  precio_venta,
  comision_venta,
  comision_cuota,
  envio_ml,
  envio_flex,
  descuento,
  retenciones,
  total_recibido,
  importe,
  fecha_factura,
  codigo_postal,
  localidad,
  provincia,
  dni_cuit,
  nombre_apellido,
  nombre_factura,
  nro_factura_base,
  link,
}) {
  // nro_factura is computed per name inside a transaction, never sent by the
  // client. Each name numbers its own invoices from its own base (almendra →
  // 202, nehuen → 8, any other → 1); the advisory lock serializes concurrent
  // inserts of the SAME name so two transactions can never compute the same
  // MAX+1 (different names hash to different keys and proceed in parallel).
  //
  // The series key is CASEFOLDED (lower()) in both the lock and the MAX query,
  // matching the case-insensitive base lookup in the controller and the
  // functional unique index (lower(nombre_factura), nro_factura) from
  // migrate.js — "Almendra" and "ALMENDRA" are ONE series, never two parallel
  // ones. The INSERT below keeps the display name exactly as sent (trimmed,
  // original casing): display is preserved, only the series key is folded.
  return await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(hashtext(lower(${nombre_factura}))::bigint)`;

    const [row] = await tx`
        SELECT COALESCE(MAX(nro_factura), ${nro_factura_base - 1}) + 1 AS next
        FROM ventas_facturacion
        WHERE lower(nombre_factura) = lower(${nombre_factura})
    `;

    const [venta] = await tx`
        INSERT INTO ventas_facturacion (
            producto, fecha, cantidad, precio_venta, comision_venta, comision_cuota,
            envio_ml, envio_flex, descuento, retenciones, total_recibido, importe,
            nro_factura, fecha_factura, codigo_postal, localidad, provincia,
            dni_cuit, nombre_apellido, nombre_factura, link
        )
        VALUES (
            ${producto}, ${fecha}, ${cantidad}, ${precio_venta}, ${comision_venta}, ${comision_cuota},
            ${envio_ml}, ${envio_flex}, ${descuento}, ${retenciones}, ${total_recibido}, ${importe},
            ${row.next}, ${fecha_factura},
            ${codigo_postal || null}, ${localidad || null}, ${provincia || null},
            ${dni_cuit || null}, ${nombre_apellido || null}, ${nombre_factura}, ${link || null}
        )
        RETURNING ${sql.unsafe(FACTURACION_COLUMNS)}
    `;

    return venta;
  });
}
