import sql from "../../../store/database.js";

export async function findByEmail(email) {
  const [user] = await sql`SELECT * FROM usuarios WHERE email = ${email}`;
  return user;
}

export async function create({ nombre, email, password }) {
  const [user] = await sql`
    INSERT INTO usuarios (nombre, email, password)
    VALUES (${nombre}, ${email}, ${password})
    RETURNING id, nombre, email, created_at
  `;
  return user;
}
