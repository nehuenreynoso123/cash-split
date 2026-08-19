import { add, addFactura, del, list } from "./store.js";

// Schema-aligned max lengths for free-text fields (mirror store/init.sql).
const MAX_LENGTHS = {
  producto: 200,
  nombre_apellido: 200,
  nombre_factura: 100,
  link: 500,
  localidad: 100,
  provincia: 100,
  dni_cuit: 50,
  codigo_postal: 20,
  numero: 50,
};

// Invoice numbering starts per name: almendra → 202, nehuen → 8, any other
// name → 1. The key is matched case-insensitively after trim; the autocomplete
// surfaces the exact stored names so users pick the canonical spelling.
const NRO_FACTURA_BASES = { almendra: 202, nehuen: 8 };
const DEFAULT_NRO_FACTURA_BASE = 1;

// Optional money fields: must be finite and >= 0 when present.
const OPTIONAL_MONEY = [
  "comision_venta",
  "comision_cuota",
  "envio_ml",
  "envio_flex",
  "descuento",
  "retenciones",
];

// Human-readable labels (Spanish UI copy) for the invalid-fields message.
const FIELD_LABELS = {
  producto: "Producto",
  fecha: "Fecha de venta",
  cantidad: "Cantidad",
  precio_venta: "Precio de venta",
  total_recibido: "Total recibido",
  fecha_factura: "Fecha de factura",
  nombre_apellido: "Nombre y apellido",
  nombre_factura: "Nombre de quien factura",
  codigo_postal: "Código postal",
  localidad: "Localidad",
  provincia: "Provincia",
  dni_cuit: "DNI/CUIT",
  link: "Link de la venta",
  numero: "ID de venta",
  numero_reservado: "ID de venta reservado para numeración automática",
  comision_venta: "Comisión por venta",
  comision_cuota: "Comisión por cuota",
  envio_ml: "Envío ML",
  envio_flex: "Envío Flex",
  descuento: "Descuento",
  retenciones: "Retenciones",
};

// Dates must be real calendar dates in ISO format ('YYYY-MM-DD'). The form
// sends date-only strings, and the store serializes fecha/fecha_factura back
// as 'YYYY-MM-DD' text via ::text casts — otherwise postgres.js returns DATE
// as a JS Date and the API would emit ISO-with-time, which the UI can't render.
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function isValidDate(value) {
  if (typeof value !== "string" || !DATE_RE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime());
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// NUMERIC(10,2) bounds the money columns at 99,999,999.99 and INTEGER at
// 2,147,483,647 — exceeding either would surface a DB error with PG text.
const MAX_MONEY = 99999999.99;
const MAX_CANTIDAD = 2147483647;

// Reject with a user-safe 400 (no SQL/schema details) before hitting the DB.
const fail = (invalid) => {
  const labels = invalid.map((field) => FIELD_LABELS[field] ?? field);
  const err = new Error(`Datos inválidos: ${labels.join(", ")}`);
  err.statusCode = 400;
  throw err;
};

const addVenta = async (body) => {
  // Express leaves req.body undefined when no JSON body was sent.
  body = body ?? {};

  const invalid = [];

  // Required free-text: non-empty after trim and within schema length.
  for (const field of [
    "producto",
    "nombre_apellido",
    "nombre_factura",
    "dni_cuit",
    "codigo_postal",
    "localidad",
    "provincia",
  ]) {
    const value = body[field];
    if (typeof value !== "string" || !value.trim()) invalid.push(field);
    else if (value.trim().length > MAX_LENGTHS[field]) invalid.push(field);
  }

  // Optional free-text: length-checked when present (empty/null allowed).
  for (const field of ["link"]) {
    const value = body[field];
    if (value !== undefined && value !== null && value !== "") {
      if (typeof value !== "string" || value.trim().length > MAX_LENGTHS[field]) {
        invalid.push(field);
      }
    }
  }

  // Optional manual ID de venta (numero): typed by the user and stored as-is
  // (max 50 chars); empty/absent falls back to the auto V-#### derivation in
  // the store's SELECT. A manual value is NOT free-form text — it labels the
  // sale — but it still cannot exceed the column's VARCHAR(50).
  const numero = typeof body.numero === "string" ? body.numero.trim() : "";
  if (numero.length > MAX_LENGTHS.numero) invalid.push("numero");

  // The V-#### shape is RESERVED for auto-derived numeros: the derivation
  // ('V-' || LPAD(id::text, 4, '0')) is computed in the SELECT and NEVER
  // stored, so the unique index on numero cannot see a collision with a
  // manually-typed 'V-0001'. Reject the reserved pattern outright so a manual
  // value can never shadow an auto-derived display value.
  if (numero && /^V-\d{4}$/i.test(numero)) invalid.push("numero_reservado");

  // Link, when present, must be a parseable http(s) URL (defense in depth —
  // the frontend already guards rendering, but data should be safe at rest).
  const link = typeof body.link === "string" ? body.link.trim() : "";
  if (link && !isValidHttpUrl(link)) invalid.push("link");

  // Required dates: real calendar dates in ISO format.
  if (!isValidDate(body.fecha)) invalid.push("fecha");
  if (!isValidDate(body.fecha_factura)) invalid.push("fecha_factura");

  // Required quantity: positive integer within INTEGER range.
  const cantidad = Number(body.cantidad);
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > MAX_CANTIDAD) {
    invalid.push("cantidad");
  }

  // Required money: finite and within (0, 99,999,999.99]. This rejects NaN,
  // Infinity (JSON.parse accepts 1e999) and '' — all of which slip through a
  // raw `> 0` check — and anything that would overflow NUMERIC(10,2).
  const precioVenta = Number(body.precio_venta);
  if (!Number.isFinite(precioVenta) || precioVenta <= 0 || precioVenta > MAX_MONEY) {
    invalid.push("precio_venta");
  }

  // Optional money: Total Recibido defaults to 0 when absent/empty (the form
  // may leave it blank), but must be finite and within [0, 99,999,999.99]
  // when present.
  const totalRecibido = Number(body.total_recibido ?? 0);
  if (!Number.isFinite(totalRecibido) || totalRecibido < 0 || totalRecibido > MAX_MONEY) {
    invalid.push("total_recibido");
  }

  // Optional money: finite and within [0, 99,999,999.99] (defaults to 0 when
  // absent).
  for (const field of OPTIONAL_MONEY) {
    const n = Number(body[field] ?? 0);
    if (!Number.isFinite(n) || n < 0 || n > MAX_MONEY) invalid.push(field);
  }

  if (invalid.length > 0) fail(invalid);

  // Importe IS Precio de Venta — the facturación table just names the column
  // Importe. The server owns that value: it is forced from precio_venta and
  // the client can never send a different one.
  const nombreFactura = body.nombre_factura.trim();
  const payload = {
    numero,
    producto: body.producto.trim(),
    fecha: body.fecha,
    cantidad,
    precio_venta: precioVenta,
    comision_venta: Number(body.comision_venta ?? 0),
    comision_cuota: Number(body.comision_cuota ?? 0),
    envio_ml: Number(body.envio_ml ?? 0),
    envio_flex: Number(body.envio_flex ?? 0),
    descuento: Number(body.descuento ?? 0),
    retenciones: Number(body.retenciones ?? 0),
    total_recibido: totalRecibido,
    importe: precioVenta,
    fecha_factura: body.fecha_factura,
    codigo_postal: body.codigo_postal.trim(),
    localidad: body.localidad.trim(),
    provincia: body.provincia.trim(),
    dni_cuit: body.dni_cuit.trim(),
    nombre_apellido: body.nombre_apellido.trim(),
    nombre_factura: nombreFactura,
    nro_factura_base: NRO_FACTURA_BASES[nombreFactura.toLowerCase()] ?? DEFAULT_NRO_FACTURA_BASE,
    link,
  };

  return await add(payload);
};

const addFacturaVenta = async (body) => {
  body = body ?? {};

  // items is required and must be a non-empty array
  if (!Array.isArray(body.items) || body.items.length === 0) {
    const err = new Error("Datos inválidos: se requiere al menos un producto");
    err.statusCode = 400;
    throw err;
  }

  const invalid = [];

  // Validate shared fields (same as addVenta)
  for (const field of [
    "nombre_apellido",
    "nombre_factura",
    "dni_cuit",
    "codigo_postal",
    "localidad",
    "provincia",
  ]) {
    const value = body[field];
    if (typeof value !== "string" || !value.trim()) invalid.push(field);
    else if (value.trim().length > MAX_LENGTHS[field]) invalid.push(field);
  }

  const link = typeof body.link === "string" ? body.link.trim() : "";
  if (link && !isValidHttpUrl(link)) invalid.push("link");

  if (!isValidDate(body.fecha)) invalid.push("fecha");
  if (!isValidDate(body.fecha_factura)) invalid.push("fecha_factura");

  const numero = typeof body.numero === "string" ? body.numero.trim() : "";
  if (numero.length > MAX_LENGTHS.numero) invalid.push("numero");
  if (numero && /^V-\d{4}$/i.test(numero)) invalid.push("numero_reservado");

  // Optional money
  const totalRecibido = Number(body.total_recibido ?? 0);
  if (!Number.isFinite(totalRecibido) || totalRecibido < 0 || totalRecibido > MAX_MONEY) {
    invalid.push("total_recibido");
  }

  for (const field of OPTIONAL_MONEY) {
    const n = Number(body[field] ?? 0);
    if (!Number.isFinite(n) || n < 0 || n > MAX_MONEY) invalid.push(field);
  }

  // Validate each item
  const validatedItems = [];
  for (let i = 0; i < body.items.length; i++) {
    const item = body.items[i];
    if (typeof item.producto !== "string" || !item.producto.trim()) {
      invalid.push(`items[${i}].producto`);
    } else if (item.producto.trim().length > MAX_LENGTHS.producto) {
      invalid.push(`items[${i}].producto`);
    }

    const cantidad = Number(item.cantidad);
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > MAX_CANTIDAD) {
      invalid.push(`items[${i}].cantidad`);
    }

    const precioVenta = Number(item.precio_venta);
    if (!Number.isFinite(precioVenta) || precioVenta <= 0 || precioVenta > MAX_MONEY) {
      invalid.push(`items[${i}].precio_venta`);
    }

    validatedItems.push({
      producto: item.producto.trim(),
      cantidad,
      precio_venta: precioVenta,
    });
  }

  if (invalid.length > 0) fail(invalid);

  const nombreFactura = body.nombre_factura.trim();

  return await addFactura({
    items: validatedItems,
    factura_id: body.factura_id || null,
    numero,
    fecha: body.fecha,
    comision_venta: Number(body.comision_venta ?? 0),
    comision_cuota: Number(body.comision_cuota ?? 0),
    envio_ml: Number(body.envio_ml ?? 0),
    envio_flex: Number(body.envio_flex ?? 0),
    descuento: Number(body.descuento ?? 0),
    retenciones: Number(body.retenciones ?? 0),
    total_recibido: totalRecibido,
    fecha_factura: body.fecha_factura,
    codigo_postal: body.codigo_postal.trim(),
    localidad: body.localidad.trim(),
    provincia: body.provincia.trim(),
    dni_cuit: body.dni_cuit.trim(),
    nombre_apellido: body.nombre_apellido.trim(),
    nombre_factura: nombreFactura,
    nro_factura_base: NRO_FACTURA_BASES[nombreFactura.toLowerCase()] ?? DEFAULT_NRO_FACTURA_BASE,
    link,
  });
};

const listVenta = async () => {
  const listVentas = await list();
  return listVentas;
};

const deleteVenta = async (idParam) => {
  // The id comes from the URL as a string; reject anything that is not a
  // positive integer before hitting the DB (user-safe 400, no SQL details).
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) {
    const err = new Error("Datos inválidos: ID de venta");
    err.statusCode = 400;
    throw err;
  }

  const deleted = await del(id);
  if (!deleted) {
    const err = new Error("Venta no encontrada");
    err.statusCode = 404;
    throw err;
  }

  return deleted;
};

export default {
  addVenta,
  addFacturaVenta,
  listVenta,
  deleteVenta,
};
