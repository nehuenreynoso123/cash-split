import express from "express";
import "../store/database.js";
import routes from "./routes.js";
import morgan from "morgan";
import cors from "cors";
import { errors } from "./network/error.js";

const app = express();

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
routes(app);
app.use(errors);

export default app;
