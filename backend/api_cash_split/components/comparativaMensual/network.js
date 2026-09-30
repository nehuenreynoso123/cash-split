import controller from "./controller.js";
import express from "express";
import response from "./../../network/response.js";
import { verifyToken } from "../../middleware/index.js";

const router = express.Router();

// Ruta propia (no un sub-recurso de ventas ni de gastos): la comparativa es un
// agregado que cruza las tres tablas.
router.get("/comparativa-mensual", [verifyToken], getComparativaMensual);

function getComparativaMensual(req, resp, next) {
  const { meses } = req.query;
  controller
    .listComparativaMensual({ meses })
    .then((data) => response.success(req, resp, data, 200))
    .catch(next);
}

export default router;
