import controller from "./controller.js";
import express from "express";
import response from "../../network/response.js";
import { verifyToken } from "../../middleware/index.js";

const router = express.Router();

// Ruta propia (no un sub-recurso de gastos): el punto de equilibrio es un
// modelo agregado que cruza ventas, facturación y gastos.
router.get("/punto-equilibrio", [verifyToken], getPuntoEquilibrio);

function getPuntoEquilibrio(req, resp, next) {
  const { desde, hasta } = req.query;
  controller
    .getPuntoEquilibrio({ desde, hasta })
    .then((data) => response.success(req, resp, data, 200))
    .catch(next);
}

export default router;
