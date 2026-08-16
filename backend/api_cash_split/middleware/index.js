import jwt from "jsonwebtoken";
import config from "../../config.js";

const SECRET = config.jwt.SECRET;
const TOKEN_PREFIX = "Bearer ";

// A JWT has three dot-separated segments (header.payload.signature).
function looksLikeJwt(value) {
  return typeof value === "string" && value.split(".").length === 3;
}

export function verifyToken(req, resp, next) {
  const authHeader = req.headers?.authorization;
  const headerToken =
    authHeader?.startsWith(TOKEN_PREFIX) && looksLikeJwt(authHeader.slice(TOKEN_PREFIX.length))
      ? authHeader.slice(TOKEN_PREFIX.length)
      : undefined;
  const token = headerToken || req.cookies?.cs_token;

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
