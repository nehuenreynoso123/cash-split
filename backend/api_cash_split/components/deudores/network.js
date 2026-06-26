import controller from "./controller";
import express from "express";
import response from "../../network/response";
import { verifyToken } from "../../middleware/index.js";

const router = express.Router();

router.get("/deudores", [verifyToken], listDeudores);
router.delete("/deudores", [verifyToken], removeDeudores);
router.post("/deudores", [verifyToken], addDeudores);
router.put("/deudores", [verifyToken], editDeudores);

function listDeudores(req, resp, next) {
  controller
    .listDeudores()
    .then((data) => response.success(req, resp, data, 200))
    .catch(next);
}

function removeDeudores(req, resp, next) {
  controller
    .removeDeudores(req.params.id)
    .then((data) => response.success(req, resp, data, 200))
    .catch(next);
}

function addDeudores(req, resp, next) {
  controller
    .addDeudores(req.body)
    .then((data) => response.success(req, resp, data, 200))
    .catch(next);
}

function editDeudores(req, resp, next) {
  controller
    .editDeudores(req.body)
    .then((data) => response.success(req, resp, data, 200))
    .catch(next);
}

export default router;
