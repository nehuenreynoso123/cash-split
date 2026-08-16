import { add, del, list, renovar, updatePrecio, updateVencimiento } from "./store.js";

// Schema-aligned max lengths for free-text fields (mirror store/init.sql and
// store/migrate.js).
const MAX_LENGTHS = {
  usuario: 100,
  contrasena: 100,
  nombre_cliente: 200,
  whatsapp: 30,
  dueno: 100,
};

// Human-readable labels (Spanish UI copy) for the invalid-fields message.
const FIELD_LABELS = {
  usuario: "Usuario",
  contrasena: "Contraseña",
  vencimiento: "Vencimiento",
  nombre_cliente: "Nombre del cliente",
  whatsapp: "Nro de WhatsApp",
  // "Vendedor" in the UI; the backend field and DB column keep the name dueno.
  dueno: "Vendedor",
  precio: "Precio",
};

// Dates must be real calendar dates in ISO format ('YYYY-MM-DD'). The form
// sends date-only strings, and the store serializes vencimiento back as
// 'YYYY-MM-DD' text via the ::text cast — otherwise postgres.js returns DATE
// as a JS Date and the API would emit ISO-with-time, which the UI can't render.
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function isValidDate(value) {
  if (typeof value !== "string" || !DATE_RE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime());
}

// Reject with a user-safe 400 (no SQL/schema details) before hitting the DB.
const fail = (invalid) => {
  const labels = invalid.map((field) => FIELD_LABELS[field] ?? field);
  const err = new Error(`Datos inválidos: ${labels.join(", ")}`);
  err.statusCode = 400;
  throw err;
};

// Optional price (column NUMERIC(10,2), nullable): absent/null/'' → null;
// otherwise a finite positive number rounded to cents, within column capacity.
// Numeric strings are accepted (same leniency as meses) and es-AR formats are
// normalized: "15.000" (thousands dot) → 15000, "15000,50" (decimal comma) →
// 15000.5. Pushes "precio" into invalid and returns null when unusable.
const PRECIO_MAX = 99_999_999.99; // NUMERIC(10,2) ceiling
function parsePrecio(value, invalid) {
  if (value === undefined || value === null || value === "") return null;
  const precio =
    typeof value === "string"
      ? Number(value.replace(/\.(?=\d{3}(,|$))/g, "").replace(",", "."))
      : Number(value);
  if (!Number.isFinite(precio) || precio <= 0 || precio > PRECIO_MAX) {
    invalid.push("precio");
    return null;
  }
  return Math.round(precio * 100) / 100;
}

const addCliente = async (body) => {
  // Express leaves req.body undefined when no JSON body was sent.
  body = body ?? {};

  const invalid = [];

  // Required free-text: non-empty after trim and within schema length.
  for (const field of ["usuario", "contrasena", "nombre_cliente"]) {
    const value = body[field];
    if (typeof value !== "string" || !value.trim()) invalid.push(field);
    else if (value.trim().length > MAX_LENGTHS[field]) invalid.push(field);
  }

  // Optional free-text: length-checked when present (empty/null allowed).
  for (const field of ["whatsapp", "dueno"]) {
    const value = body[field];
    if (value !== undefined && value !== null && value !== "") {
      if (typeof value !== "string" || value.trim().length > MAX_LENGTHS[field]) {
        invalid.push(field);
      }
    }
  }

  // Optional price: validated when present (empty/null allowed).
  const precio = parsePrecio(body.precio, invalid);

  // Required date: a real calendar date in ISO format.
  if (!isValidDate(body.vencimiento)) invalid.push("vencimiento");

  if (invalid.length > 0) fail(invalid);

  const payload = {
    usuario: body.usuario.trim(),
    // Stored as-is, plaintext, per user request (always visible in the UI).
    contrasena: body.contrasena.trim(),
    vencimiento: body.vencimiento,
    nombre_cliente: body.nombre_cliente.trim(),
    whatsapp: typeof body.whatsapp === "string" ? body.whatsapp.trim() : "",
    dueno: typeof body.dueno === "string" ? body.dueno.trim() : "",
    precio,
  };

  return await add(payload);
};

const listClientes = async () => {
  return await list();
};

// The id comes from the URL as a string; reject anything that is not a
// positive integer before hitting the DB (user-safe 400, no SQL details).
const parseId = (idParam) => {
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) {
    const err = new Error("Datos inválidos: ID de cliente");
    err.statusCode = 400;
    throw err;
  }
  return id;
};

const deleteCliente = async (idParam) => {
  const id = parseId(idParam);

  const deleted = await del(id);
  if (!deleted) {
    const err = new Error("Cliente no encontrado");
    err.statusCode = 404;
    throw err;
  }

  return deleted;
};

const updateVencimientoCliente = async (idParam, body) => {
  const id = parseId(idParam);
  // Express leaves req.body undefined when no JSON body was sent.
  body = body ?? {};

  // Required date: a real calendar date in ISO format.
  if (!isValidDate(body.vencimiento)) {
    const err = new Error("Datos inválidos: Vencimiento");
    err.statusCode = 400;
    throw err;
  }

  const updated = await updateVencimiento(id, body.vencimiento);
  if (!updated) {
    const err = new Error("Cliente no encontrado");
    err.statusCode = 404;
    throw err;
  }

  return updated;
};

const renovarCliente = async (idParam, body) => {
  const id = parseId(idParam);
  // Express leaves req.body undefined when no JSON body was sent.
  body = body ?? {};

  // meses must be a whole number between 1 and 12 (Number() also accepts the
  // string "3", which is fine — the wire format is JSON but the number of
  // months is an integer by nature).
  const meses = Number(body.meses);
  if (!Number.isInteger(meses) || meses < 1 || meses > 12) {
    const err = new Error(
      "Datos inválidos: Meses debe ser un número entero entre 1 y 12",
    );
    err.statusCode = 400;
    throw err;
  }

  const updated = await renovar(id, meses);
  if (!updated) {
    const err = new Error("Cliente no encontrado");
    err.statusCode = 404;
    throw err;
  }

  return updated;
};

// Precio is optional and nullable: null clears it, a value must be a finite
// positive number within column capacity (validated by parsePrecio).
const updatePrecioCliente = async (idParam, body) => {
  const id = parseId(idParam);
  // Express leaves req.body undefined when no JSON body was sent.
  body = body ?? {};

  const invalid = [];
  const precio = parsePrecio(body.precio, invalid);
  if (invalid.length > 0) fail(invalid);

  const updated = await updatePrecio(id, precio);
  if (!updated) {
    const err = new Error("Cliente no encontrado");
    err.statusCode = 404;
    throw err;
  }

  return updated;
};

export default {
  addCliente,
  listClientes,
  deleteCliente,
  updateVencimientoCliente,
  renovarCliente,
  updatePrecioCliente,
};
