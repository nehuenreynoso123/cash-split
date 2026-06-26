import controller from "./controller";
import express from "express";
import response from "../../network/response";

const router = express.Router();

router.get("/status", getStatusServer);

function getStatusServer(req, resp, next) {
  controller
    .getStatusServer()
    .then((data) => response.success(req, resp, data, 200))
    .catch(next);
}

export default router;
