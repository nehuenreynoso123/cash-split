export const success = (req, resp, menssage, status = 200) => {
  resp.status(status).json({
    error: false,
    status,
    body: menssage,
  });
};

export const error = (req, resp, menssage, status = 500) => {
  resp.status(status).json({
    error: true,
    status,
    body: menssage,
  });
};

export default { success, error };
