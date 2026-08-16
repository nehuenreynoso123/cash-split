import express from "express";
import controller from "./controller.js";
import response from "../../network/response.js";
import { verifyToken } from "../../middleware/index.js";

const router = express.Router();

router.get("/lumix-clientes", [verifyToken], listClientes);
router.post("/lumix-clientes", [verifyToken], addCliente);
router.delete("/lumix-clientes/:id", [verifyToken], deleteCliente);

function listClientes(req, resp, next) {
  controller
    .listClientes()
    .then((data) => response.success(req, resp, data, 200))
    .catch(next);
}

function addCliente(req, resp, next) {
  controller
    .addCliente(req.body)
    .then((data) => response.success(req, resp, data, 201))
    .catch(next);
}

function deleteCliente(req, resp, next) {
  controller
    .deleteCliente(req.params.id)
    .then((data) => response.success(req, resp, data, 200))
    .catch(next);
}

export default router;
