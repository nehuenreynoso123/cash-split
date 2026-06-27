import controller from "./controller.js";
import express from "express";
import response from "../../network/response.js";
import { verifyToken } from "../../middleware/index.js";

const router = express.Router();

router.post("/inversion", [verifyToken], addInversion);
router.delete("/inversion/:id", [verifyToken], delInversion);
router.put("/inversion", [verifyToken], editInversion);
router.get("/inversion", [verifyToken], getCajaInversion);

function addInversion(req, resp, next) {
  controller
    .addCajaInversion(req.body)
    .then((data) => response.success(req, resp, data, 201))
    .catch(next);
}

function delInversion(req, resp, next) {
  controller
    .removeCajaInversion(req.params.id)
    .then((data) => response.success(req, resp, data, 200))
    .catch(next);
}

function editInversion(req, resp, next) {
  controller
    .editCajaInversion(req.body)
    .then((data) => response.success(req, resp, data, 200))
    .catch(next);
}

function getCajaInversion(req, resp, next) {
  controller
    .listCajaInversion()
    .then((data) => response.success(req, resp, data, 200))
    .catch(next);
}

export default router;
