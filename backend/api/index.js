import express from 'express'

const app = express()

app.get('/api/status', (req, res) => {
  res.json({ error: false, status: 200, body: { status: 'OK' } })
})

export default app
