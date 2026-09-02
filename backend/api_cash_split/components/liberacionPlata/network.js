import express from "express";
import controller from "./controller.js";
import response from "../../network/response.js";
import { verifyToken } from "../../middleware/index.js";

const router = express.Router();

router.post("/liberacion-plata", [verifyToken], addLiberacion);
router.get("/liberacion-plata", [verifyToken], listLiberaciones);
router.put("/liberacion-plata/:id", [verifyToken], updateLiberacion);
router.delete("/liberacion-plata/:id", [verifyToken], removeLiberacion);

function addLiberacion(req, resp, next) {
  controller
    .addLiberacion(req.body)
    .then((data) => response.success(req, resp, data, 201))
    .catch(next);
}

function listLiberaciones(req, resp, next) {
  controller
    .listLiberaciones()
    .then((data) => response.success(req, resp, data, 200))
    .catch(next);
}

function updateLiberacion(req, resp, next) {
  controller
    .updateLiberacion(req.params.id, req.body)
    .then((data) => response.success(req, resp, data, 200))
    .catch(next);
}

function removeLiberacion(req, resp, next) {
  controller
    .removeLiberacion(req.params.id)
    .then((data) => response.success(req, resp, data, 200))
    .catch(next);
}

export default router;