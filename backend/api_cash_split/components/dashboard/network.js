import controller from "./controller.js";
import express from "express";
import response from "./../../network/response.js";
import { verifyToken } from "../../middleware/index.js";

const router = express.Router();

router.get("/total-cajas", [verifyToken], getTotalCajas);

function getTotalCajas(req, resp, next) {
  const { desde, hasta } = req.query;
  controller
    .getTotalCajas({ desde, hasta })
    .then((data) => response.success(req, resp, data, 200))
    .catch(next);
}

export default router;
