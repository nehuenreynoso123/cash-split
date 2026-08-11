import express from "express";
import "../store/database.js";
import { runMigrations } from "../store/migrate.js";
import routes from "./routes.js";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errors } from "./network/error.js";
import config from "../config.js";

const app = express();

// Apply schema migrations on module load: idempotent DDL that no-ops once the
// column exists. Runs at Vercel cold start and at local boot before any route
// is served. Fails loudly if a statement throws.
await runMigrations();

app.use(cors({ origin: config.cors.ORIGIN, credentials: true }));
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
routes(app);
app.use(errors);

export default app;
