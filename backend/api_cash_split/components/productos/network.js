import express from "express";
import controller from "./controller.js";
import response from "../../network/response.js";
import { verifyToken } from "../../middleware/index.js";

const router = express.Router();

router.post("/producto", [verifyToken], addProducto);
router.delete("/producto/:id", [verifyToken], removeProducto);
router.put("/producto", [verifyToken], editProducto);
router.get("/producto", [verifyToken], listProducto);

function addProducto(req, resp, next) {
  controller
    .addProducto(req.body)
    .then((data) => response.success(req, resp, data, 201))
    .catch(next);
}

function removeProducto(req, resp, next) {
  controller
    .removeProducto(req.params.id)
    .then((data) => response.success(req, resp, data, 200))
    .catch(next);
}

function editProducto(req, resp, next) {
  controller
    .editProducto(req.body)
    .then((data) => response.success(req, resp, data, 201))
    .catch(next);
}

function listProducto(req, resp, next) {
  controller
    .listProducto()
    .then((data) => response.success(req, resp, data, 201))
    .catch(next);
}

export default router;
