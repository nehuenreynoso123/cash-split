import app from "../api_cash_split/app.js";
import serverless from "serverless-http";

export const handler = serverless(app);
