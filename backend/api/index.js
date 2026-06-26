import express from 'express'

const app = express()

app.all('*', (req, res) => {
  res.json({ method: req.method, url: req.url, path: req.path })
})

export default app
