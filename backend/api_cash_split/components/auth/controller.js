import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { findByEmail, create } from "./store.js";

const JWT_SECRET = process.env.JWT_SECRET || "cash_split_dev_secret";
const JWT_EXPIRES_IN = "7d";

export async function signup({ nombre, email, password }) {
  if (!nombre || !email || !password) {
    const err = new Error("nombre, email y password son requeridos");
    err.statusCode = 400;
    throw err;
  }

  const existing = await findByEmail(email);
  if (existing) {
    const err = new Error("El email ya está registrado");
    err.statusCode = 409;
    throw err;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await create({ nombre, email, password: hashedPassword });

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  return { token, user: { id: user.id, nombre: user.nombre, email: user.email } };
}

export async function signin({ email, password }) {
  if (!email || !password) {
    const err = new Error("email y password son requeridos");
    err.statusCode = 400;
    throw err;
  }

  const user = await findByEmail(email);
  if (!user) {
    const err = new Error("Usuario no encontrado");
    err.statusCode = 404;
    throw err;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    const err = new Error("Clave incorrecta");
    err.statusCode = 401;
    throw err;
  }

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  return { token, user: { id: user.id, nombre: user.nombre, email: user.email } };
}

export default { signup, signin };
