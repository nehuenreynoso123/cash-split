import express from "express";
import controller from "./controller.js";
import response from "../../network/response.js";
import config from "../../../config.js";

const router = express.Router();

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.env === "production",
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: "/",
};

router.post("/signup", signup);
router.post("/signin", signin);

function signup(req, resp, next) {
  controller
    .signup(req.body)
    .then((data) => {
      resp.cookie("cs_token", data.token, COOKIE_OPTIONS);
      response.success(req, resp, { user: data.user }, 201);
    })
    .catch(next);
}

function signin(req, resp, next) {
  controller
    .signin(req.body)
    .then((data) => {
      resp.cookie("cs_token", data.token, COOKIE_OPTIONS);
      response.success(req, resp, { user: data.user }, 200);
    })
    .catch(next);
}

export default router;
