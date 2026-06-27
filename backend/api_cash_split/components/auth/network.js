import express from "express";
import controller from "./controller.js";
import response from "../../network/response.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/signin", signin);

function signup(req, resp, next) {
  controller
    .signup(req.body)
    .then((data) => response.success(req, resp, data, 201))
    .catch(next);
}

function signin(req, resp, next) {
  controller
    .signin(req.body)
    .then((data) => response.success(req, resp, data, 200))
    .catch(next);
}

export default router;
