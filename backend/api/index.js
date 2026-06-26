import express from 'express'
import serverless from 'serverless-http'

const app = express()

app.all('*', (req, res) => {
  res.json({ method: req.method, url: req.url, path: req.path })
})

export const handler = serverless(app)
