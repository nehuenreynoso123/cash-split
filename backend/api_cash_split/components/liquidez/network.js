import controller from "./controller.js";
import express from "express";
import response from "../../network/response.js";
import { verifyToken } from "../../middleware/index.js";

const router = express.Router();

router.post("/liquidez", [verifyToken], addLiquidez);
router.get("/liquidez", [verifyToken], listLiquidez);
router.put("/liquidez", [verifyToken], editLiquidez);
router.delete("/liquidez/:id", [verifyToken], removeLiquidez);

function addLiquidez(req, resp, next) {
  controller
    .addLiquidez(req.body)
    .then((data) => response.success(req, resp, data, 201))
    .catch(next);
}

function listLiquidez(req, resp, next) {
  const { desde, hasta } = req.query;
  controller
    .getLiquidez({ desde, hasta })
    .then((data) => response.success(req, resp, data, 200))
    .catch(next);
}

function editLiquidez(req, resp, next) {
  controller
    .editLiquidez(req.body)
    .then((data) => response.success(req, resp, data, 200))
    .catch(next);
}

function removeLiquidez(req, resp, next) {
  controller
    .removeLiquidez(req.params.id)
    .then((data) => response.success(req, resp, data, 200))
    .catch(next);
}

export default router;
