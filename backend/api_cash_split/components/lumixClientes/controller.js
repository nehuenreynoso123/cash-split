import { add, del, list } from "./store.js";

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
  dueno: "De quién es el cliente",
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
  };

  return await add(payload);
};

const listClientes = async () => {
  return await list();
};

const deleteCliente = async (idParam) => {
  // The id comes from the URL as a string; reject anything that is not a
  // positive integer before hitting the DB (user-safe 400, no SQL details).
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) {
    const err = new Error("Datos inválidos: ID de cliente");
    err.statusCode = 400;
    throw err;
  }

  const deleted = await del(id);
  if (!deleted) {
    const err = new Error("Cliente no encontrado");
    err.statusCode = 404;
    throw err;
  }

  return deleted;
};

export default {
  addCliente,
  listClientes,
  deleteCliente,
};
