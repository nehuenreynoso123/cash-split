import express from "express";
import http from "http";
import "../store/database";
import routes from "./routes";

import morgan from "morgan";
import cors from "cors";

const app = express();

import { errors } from "./network/error";

import config from "../config.js";

const server = http.createServer(app);
const port = Number(config.service.api_cash_splice.PORT);

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
routes(app);
app.use(errors);

server.listen(port, () => {
  console.log("api corriendo en http://localhost:" + port);
});

export default app;
