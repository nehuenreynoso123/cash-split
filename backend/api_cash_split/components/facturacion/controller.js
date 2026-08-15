import { add, list } from "./store.js";

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

const listVenta = async () => {
  const listVentas = await list();
  return listVentas;
};

export default {
  addVenta,
  listVenta,
};
