import express from "express";
import controller from "./controller.js";
import response from "../../network/response.js";
import { verifyToken } from "../../middleware/index.js";

const router = express.Router();

router.get("/venta", [verifyToken], listVentas);
router.post("/venta", [verifyToken], addVenta);
router.delete("/venta/:id", [verifyToken], removeVenta);
router.put("/venta", [verifyToken], editVenta);

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

function removeVenta(req, resp, next) {
  controller
    .removeVenta(req.params.id)
    .then((data) => response.success(req, resp, data, 200))
    .catch(next);
}

function editVenta(req, resp, next) {
  controller
    .editVenta(req.body)
    .then((data) => response.success(req, resp, data, 200))
    .catch(next);
}

export default router;
