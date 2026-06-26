export default (req, res) => {
  res.status(200).json({
    url: req.url,
    path: req.path ?? 'n/a',
    method: req.method,
    headers: req.headers,
  })
}
