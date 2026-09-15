import express from "express";
import controller from "./controller.js";
import response from "../../network/response.js";
import { verifyToken } from "../../middleware/index.js";

const router = express.Router();

router.get("/venta", [verifyToken], listVentas);
router.get("/venta/grouped", [verifyToken], listVentasGrouped);
router.post("/venta", [verifyToken], addVenta);
router.post("/venta/factura", [verifyToken], addFactura);
router.delete("/venta/factura/:factura_id", [verifyToken], removeVentaFactura);
router.put("/venta/factura/:factura_id", [verifyToken], updateFacturaVenta);
router.delete("/venta/:id", [verifyToken], removeVenta);
router.put("/venta", [verifyToken], editVenta);

function listVentas(req, resp, next) {
  controller
    .listVenta()
    .then((data) => response.success(req, resp, data, 200))
    .catch(next);
}

function listVentasGrouped(req, resp, next) {
  controller
    .listVentaGrouped()
    .then((data) => response.success(req, resp, data, 200))
    .catch(next);
}

function addVenta(req, resp, next) {
  controller
    .addVenta(req.body)
    .then((data) => response.success(req, resp, data, 201))
    .catch(next);
}

function addFactura(req, resp, next) {
  controller
    .addFacturaVenta(req.body)
    .then((data) => response.success(req, resp, data, 201))
    .catch(next);
}

function removeVenta(req, resp, next) {
  controller
    .removeVenta(req.params.id)
    .then((data) => response.success(req, resp, data, 200))
    .catch(next);
}

function removeVentaFactura(req, resp, next) {
  controller
    .removeVentaFactura(req.params.factura_id)
    .then((data) => response.success(req, resp, data, 200))
    .catch(next);
}

function updateFacturaVenta(req, resp, next) {
  controller
    .updateFacturaVenta({ ...req.body, factura_id: req.params.factura_id })
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
