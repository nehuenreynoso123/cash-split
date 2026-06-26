import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "cash_split_dev_secret";

export function verifyToken(req, resp, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    const err = new Error("Token no proporcionado");
    err.statusCode = 401;
    return next(err);
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    const err = new Error("Formato de token inválido. Use: Bearer <token>");
    err.statusCode = 401;
    return next(err);
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (_err) {
    const error = new Error("Token inválido o expirado");
    error.statusCode = 401;
    next(error);
  }
}
