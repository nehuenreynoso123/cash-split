import controller from "./controller";
import express from "express";
import response from "./../../network/response";
import { verifyToken } from "../../middleware/index.js";

const router = express.Router();

router.get("/total-cajas", [verifyToken], getTotalCajas);

function getTotalCajas(req, resp, next) {
  controller
    .getTotalCajas()
    .then((data) => response.success(req, resp, data, 200))
    .catch(next);
}

export default router;
