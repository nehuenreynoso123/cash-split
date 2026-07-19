import controller from "./controller.js";
import express from "express";
import response from "../../network/response.js";
import { verifyToken } from "../../middleware/index.js";

const router = express.Router();

router.post("/gastos", [verifyToken], addGastos);
router.get("/gastos", [verifyToken], listGastos);
router.put("/gastos", [verifyToken], editCajaGastos);
router.delete("/gastos", [verifyToken], removeCajaGastos);

function addGastos(req, resp, next) {
  controller
    .addCajaGastos(req.body)
    .then((data) => response.success(req, resp, data, 201))
    .catch(next);
}

function listGastos(req, resp, next) {
  const { desde, hasta } = req.query;
  controller
    .getCajaGastos({ desde, hasta })
    .then((data) => response.success(req, resp, data, 200))
    .catch(next);
}

function editCajaGastos(req, resp, next) {
  controller
    .editCajaGastos(req.body)
    .then((data) => response.success(req, resp, data, 200))
    .catch(next);
}

function removeCajaGastos(req, resp, next) {
  controller
    .removeCajaGastos(req.params.id)
    .then((data) => response.success(req, resp, data, 200))
    .catch(next);
}

export default router;
