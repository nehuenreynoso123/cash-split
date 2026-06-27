import express from "express";
import controller from "./controller.js";
import response from "../../network/response.js";
import { verifyToken } from "../../middleware/index.js";

const router = express.Router();

router.get("/reposicion-stock", [verifyToken], listCajaReposicionStock);
router.post("/reposicion-stock", [verifyToken], addCajaReposicionStock);
router.delete("/reposicion-stock/:id", [verifyToken], removeCajaReposicionStock);
router.put("/reposicion-stock", [verifyToken], editCajaReposicionStock);

function listCajaReposicionStock(req, resp, next) {
  controller
    .listCajaReposicionStock()
    .then((data) => response.success(req, resp, data, 200))
    .catch(next);
}

function addCajaReposicionStock(req, resp, next) {
  controller
    .addCajaReposicionStock(req.body)
    .then((data) => response.success(req, resp, data, 201))
    .catch(next);
}

function editCajaReposicionStock(req, resp, next) {
  controller
    .editCajaReposicionStock(req.body)
    .then((data) => response.success(req, resp, data, 200))
    .catch(next);
}

function removeCajaReposicionStock(req, resp, next) {
  controller
    .removeCajaReposicionStock(req.params.id)
    .then((data) => response.success(req, resp, data, 200))
    .catch(next);
}

export default router;
