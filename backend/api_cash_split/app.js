import express from "express";
import "../store/database.js";
import routes from "./routes.js";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errors } from "./network/error.js";
import config from "../config.js";

const app = express();

app.use(cors({ origin: config.cors.ORIGIN, credentials: true }));
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
routes(app);
app.use(errors);

export default app;
