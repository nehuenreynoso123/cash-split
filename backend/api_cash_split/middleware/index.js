import jwt from "jsonwebtoken";
import config from "../../config.js";

const SECRET = config.jwt.SECRET;

export function verifyToken(req, resp, next) {
  const token = req.cookies?.cs_token;

  if (!token) {
    const err = new Error("Token no proporcionado");
    err.statusCode = 401;
    return next(err);
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (_err) {
    const error = new Error("Token inválido o expirado");
    error.statusCode = 401;
    next(error);
  }
}
