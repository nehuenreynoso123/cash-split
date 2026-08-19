import sql from "../../../store/database.js";

// DATE columns are cast to text on read (fecha::text, fecha_factura::text):
// postgres.js parses DATE (oid 1082) into a JS Date, which would serialize as
// "2024-01-05T00:00:00.000Z" — the frontend renders date-only strings and
// would show "Invalid Date". The ::text cast keeps the YYYY-MM-DD round-trip.

// Column list shared by list() and the INSERT RETURNING so both shapes match.
// numero is the manually-typed ID de venta when the user provided one (numero
// column); COALESCE falls back to the auto V-#### derivation from the row id
// so rows without a manual value keep their historical rendering.
const FACTURACION_COLUMNS = `
    id,
    COALESCE(numero, 'V-' || LPAD(id::text, 4, '0')) AS numero,
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
    factura_id,
    created_at
`;

export async function list() {
  // numero is the manual ID de venta when the user typed one, else the auto
  // V-0001-style derivation from the row id (COALESCE in the shared column
  // list above keeps both paths in one shape).
  return await sql`
        SELECT ${sql.unsafe(FACTURACION_COLUMNS)}
        FROM ventas_facturacion
        ORDER BY id ASC
    `;
}

export async function del(id) {
  // Deletes the row and returns it; null means no row matched the id.
  const [row] = await sql`
        DELETE FROM ventas_facturacion
        WHERE id = ${id}
        RETURNING id
    `;
  return row ?? null;
}

export async function add({
  numero,
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
    // Manual ID de venta (numero) is unique when provided — the partial unique
    // index on the DB enforces it too; the pre-check turns the raw index
    // violation into a user-safe 409 message. Empty/null falls back to the
    // auto V-#### derivation in the SELECT.
    if (numero) {
      const [dup] = await tx`
        SELECT 1 FROM ventas_facturacion WHERE numero = ${numero}
      `;
      if (dup) {
        const err = new Error("Ya existe una venta con ese ID de venta");
        err.statusCode = 409;
        throw err;
      }
    }

    await tx`SELECT pg_advisory_xact_lock(hashtext(lower(${nombre_factura}))::bigint)`;

    const [row] = await tx`
        SELECT COALESCE(MAX(nro_factura), ${nro_factura_base - 1}) + 1 AS next
        FROM ventas_facturacion
        WHERE lower(nombre_factura) = lower(${nombre_factura})
    `;

    // The partial unique index on numero is the REAL guarantee; the pre-check
    // above is only the fast path. A concurrent insert with the same numero
    // can slip past the SELECT and surface here as a unique-violation (23505)
    // — translate it into the same user-safe 409 instead of leaking PG text.
    let venta;
    try {
      [venta] = await tx`
          INSERT INTO ventas_facturacion (
              numero, producto, fecha, cantidad, precio_venta, comision_venta, comision_cuota,
              envio_ml, envio_flex, descuento, retenciones, total_recibido, importe,
              nro_factura, fecha_factura, codigo_postal, localidad, provincia,
              dni_cuit, nombre_apellido, nombre_factura, link
          )
          VALUES (
              ${numero || null}, ${producto}, ${fecha}, ${cantidad}, ${precio_venta}, ${comision_venta}, ${comision_cuota},
              ${envio_ml}, ${envio_flex}, ${descuento}, ${retenciones}, ${total_recibido}, ${importe},
              ${row.next}, ${fecha_factura},
              ${codigo_postal || null}, ${localidad || null}, ${provincia || null},
              ${dni_cuit || null}, ${nombre_apellido || null}, ${nombre_factura}, ${link || null}
          )
          RETURNING ${sql.unsafe(FACTURACION_COLUMNS)}
      `;
    } catch (err) {
      if (err?.code === "23505") {
        const conflict = new Error("Ya existe una venta con ese ID de venta");
        conflict.statusCode = 409;
        throw conflict;
      }
      throw err;
    }

    return venta;
  });
}

// ── Add multi-product factura (one row per product, same factura_id) ────
// items: [{ producto, cantidad, precio_venta }]
// Shared fields apply to ALL items in the factura.
export async function addFactura({
  items,
  factura_id,
  numero,
  fecha,
  comision_venta,
  comision_cuota,
  envio_ml,
  envio_flex,
  descuento,
  retenciones,
  total_recibido,
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
  return await sql.begin(async (tx) => {
    // Check manual numero uniqueness (only for the first item; shared across items)
    if (numero) {
      const [dup] = await tx`
        SELECT 1 FROM ventas_facturacion WHERE numero = ${numero}
      `;
      if (dup) {
        const err = new Error("Ya existe una venta con ese ID de venta");
        err.statusCode = 409;
        throw err;
      }
    }

    await tx`SELECT pg_advisory_xact_lock(hashtext(lower(${nombre_factura}))::bigint)`;

    const [row] = await tx`
      SELECT COALESCE(MAX(nro_factura), ${nro_factura_base - 1}) + 1 AS next
      FROM ventas_facturacion
      WHERE lower(nombre_factura) = lower(${nombre_factura})
    `;

    const inserted = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      // Each product gets its own auto-generated numero (V-####) based on row id.
      // All products share the same nro_factura for the invoice.

      try {
        const [venta] = await tx`
          INSERT INTO ventas_facturacion (
            numero, producto, fecha, cantidad, precio_venta, comision_venta, comision_cuota,
            envio_ml, envio_flex, descuento, retenciones, total_recibido, importe,
            nro_factura, fecha_factura, codigo_postal, localidad, provincia,
            dni_cuit, nombre_apellido, nombre_factura, link, factura_id
          )
          VALUES (
            NULL, ${item.producto}, ${fecha}, ${item.cantidad}, ${item.precio_venta}, ${comision_venta}, ${comision_cuota},
            ${envio_ml}, ${envio_flex}, ${descuento}, ${retenciones}, ${total_recibido}, ${item.cantidad * item.precio_venta},
            ${row.next}, ${fecha_factura},
            ${codigo_postal || null}, ${localidad || null}, ${provincia || null},
            ${dni_cuit || null}, ${nombre_apellido || null}, ${nombre_factura}, ${link || null}, ${factura_id}
          )
          RETURNING ${sql.unsafe(FACTURACION_COLUMNS)}
        `;
        inserted.push(venta);
      } catch (err) {
        if (err?.code === "23505") {
          const conflict = new Error("Ya existe una venta con ese ID de venta");
          conflict.statusCode = 409;
          throw conflict;
        }
        throw err;
      }
    }

    return inserted;
  });
}
