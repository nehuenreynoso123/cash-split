import app from "./app.js";
import http from "http";
import config from "../config.js";

const server = http.createServer(app);
const port = Number(config.service.api_cash_splice.PORT);

server.listen(port, () => {
  console.log("api corriendo en http://localhost:" + port);
});
