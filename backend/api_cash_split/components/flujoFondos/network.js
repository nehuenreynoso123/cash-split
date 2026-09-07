import controller from "./controller.js";
import express from "express";
import response from "./../../network/response.js";
import { verifyToken } from "../../middleware/index.js";

const router = express.Router();

router.get("/flujo-fondos", [verifyToken], getFlujoFondos);
router.get("/flujo-fondos/por-cobrar-semanas", [verifyToken], getVentasPorCobrarSemanas);

function getFlujoFondos(req, resp, next) {
  const { desde, hasta } = req.query;
  controller
    .getFlujoFondos({ desde, hasta })
    .then((data) => response.success(req, resp, data, 200))
    .catch(next);
}

function getVentasPorCobrarSemanas(req, resp, next) {
  controller
    .getVentasPorCobrarSemanas()
    .then((data) => response.success(req, resp, data, 200))
    .catch(next);
}

export default router;
