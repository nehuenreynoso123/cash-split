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
  link,
}) {
  // nro_factura is supplied by the ventas_facturacion_nro_factura_seq sequence
  // default (starts at 202, safe under concurrent inserts) — never sent by the
  // client. Optional text fields are normalized to NULL instead of empty strings.
  const [venta] = await sql`
        INSERT INTO ventas_facturacion (
            producto, fecha, cantidad, precio_venta, comision_venta, comision_cuota,
            envio_ml, envio_flex, descuento, retenciones, total_recibido, importe,
            fecha_factura, codigo_postal, localidad, provincia,
            dni_cuit, nombre_apellido, link
        )
        VALUES (
            ${producto}, ${fecha}, ${cantidad}, ${precio_venta}, ${comision_venta}, ${comision_cuota},
            ${envio_ml}, ${envio_flex}, ${descuento}, ${retenciones}, ${total_recibido}, ${importe},
            ${fecha_factura},
            ${codigo_postal || null}, ${localidad || null}, ${provincia || null},
            ${dni_cuit || null}, ${nombre_apellido || null}, ${link || null}
        )
        RETURNING ${sql.unsafe(FACTURACION_COLUMNS)}
    `;

  return venta;
}
