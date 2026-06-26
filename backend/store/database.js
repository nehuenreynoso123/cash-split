import postgres from "postgres";
import config from "../config.js";

const connectionString = process.env.DATABASE_URL;

const sql = connectionString
  ? postgres(connectionString)
  : postgres({
      host: config.db.HOST,
      port: Number(config.db.PORT),
      database: config.db.NAME,
      username: config.db.USER,
      password: config.db.PASSWORD,
    });

// En lugar de await directo, creamos una función de prueba
async function checkConnection() {
  try {
    await sql`SELECT 1`;
    console.log("✅ Conexión a PostgreSQL exitosa");
  } catch (error) {
    console.error("❌ Error de conexión:", error.message);
  }
}

// La ejecutamos
checkConnection();

export default sql;
