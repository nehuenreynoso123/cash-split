import { get, set } from "./store.js";

// Default renewal message — duplicated from the frontend constant
// MENSAJE_RENOVACION_DEFAULT (frontend/src/lib/lumix.ts); keep the copies in
// sync when the wording changes. Backend single-source: the migrate.js seed
// imports this constant instead of duplicating the string. [corchetes] mark
// parts omitted when the client has no price/alias.
export const MENSAJE_RENOVACION_DEFAULT =
  "¡Hola! 😊 ¿Cómo andás? Te escribo porque tu suscripción vence el {fecha} 📅 ¿Te interesa renovar? 🚀 [El precio es {precio}.] [Te dejo mi alias para transferencia: {alias} 🙌] ¡Gracias!";

// Max template length (chars) accepted by the PUT endpoint; mirrors the
// frontend textarea limit so the UI and the API agree.
const MENSAJE_MAX_LENGTH = 1000;

const SETTINGS_KEY = "lumix_mensaje_renovacion";

// GET: serve the saved template, falling back to the frontend default when no
// row exists yet (fresh DB before the first save) or when the stored value is
// empty (defensive — validation never stores an empty string).
const getMensajeRenovacion = async () => {
  const mensaje = await get(SETTINGS_KEY);
  return { mensaje: mensaje || MENSAJE_RENOVACION_DEFAULT };
};

// PUT: upsert with validation — must be a non-empty string after trim, at most
// MENSAJE_MAX_LENGTH characters.
const updateMensajeRenovacion = async (body) => {
  // Express leaves req.body undefined when no JSON body was sent.
  body = body ?? {};

  const mensaje = body.mensaje;
  if (
    typeof mensaje !== "string" ||
    !mensaje.trim() ||
    mensaje.trim().length > MENSAJE_MAX_LENGTH
  ) {
    const err = new Error(
      `Datos inválidos: Mensaje debe ser un texto de hasta ${MENSAJE_MAX_LENGTH} caracteres`,
    );
    err.statusCode = 400;
    throw err;
  }

  const guardado = await set(SETTINGS_KEY, mensaje.trim());
  return { mensaje: guardado };
};

export default {
  getMensajeRenovacion,
  updateMensajeRenovacion,
};
