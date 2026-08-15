import express from "express";
import controller from "./controller.js";
import response from "../../network/response.js";
import { verifyToken } from "../../middleware/index.js";

const router = express.Router();

router.get("/facturacion-ventas", [verifyToken], listVentas);
router.post("/facturacion-ventas", [verifyToken], addVenta);
router.delete("/facturacion-ventas/:id", [verifyToken], deleteVenta);

function listVentas(req, resp, next) {
  controller
    .listVenta()
    .then((data) => response.success(req, resp, data, 200))
    .catch(next);
}

function addVenta(req, resp, next) {
  controller
    .addVenta(req.body)
    .then((data) => response.success(req, resp, data, 201))
    .catch(next);
}

function deleteVenta(req, resp, next) {
  controller
    .deleteVenta(req.params.id)
    .then((data) => response.success(req, resp, data, 200))
    .catch(next);
}

export default router;
