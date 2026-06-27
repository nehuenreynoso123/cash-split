import response from "./response.js";

export const errors = (err, req, resp, next) => {
  const message = err.message || "Error internal";
  const status = err.statusCode || 500;
  console.error(err);
  response.error(req, resp, message, status);
};
