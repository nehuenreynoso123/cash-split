import express from "express";
import controller from "./controller.js";
import response from "../../network/response.js";
import { verifyToken } from "../../middleware/index.js";

const router = express.Router();

// The WhatsApp renewal message template is a settings row: GET serves the saved
// value (falling back to the default) and PUT upserts it. Both require a valid
// session token, like every other authenticated endpoint.
router.get("/settings/lumix-mensaje-renovacion", [verifyToken], getMensajeRenovacion);
router.put("/settings/lumix-mensaje-renovacion", [verifyToken], updateMensajeRenovacion);

function getMensajeRenovacion(req, resp, next) {
  controller
    .getMensajeRenovacion()
    .then((data) => response.success(req, resp, data, 200))
    .catch(next);
}

function updateMensajeRenovacion(req, resp, next) {
  controller
    .updateMensajeRenovacion(req.body)
    .then((data) => response.success(req, resp, data, 200))
    .catch(next);
}

export default router;
