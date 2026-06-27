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

export default sql;
