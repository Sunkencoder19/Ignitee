// The IGNITE server. Run it with:  npm run dev   (restarts itself when a file changes)
// It reads its settings from .env (see .env.example) and serves the API under /api.

import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { router as authRoutes } from './auth.js'
import { router as classRoutes } from './classes.js'
import { router as contentRoutes } from './content.js'
import { router as progressRoutes } from './progress.js'
import { router as reportRoutes } from './reports.js'
import { connect, isConnected } from './db.js'

for (const name of ['MONGODB_URI', 'JWT_SECRET']) {
  if (!process.env[name]) {
    console.log(`Missing ${name} in server/.env. Copy server/.env.example to server/.env and fill it in.`)
    process.exit(1)
  }
}

const app = express()

// The React dev server (Vite) forwards /api here, so the browser never calls
// this server directly. cors is only for calling it from localhost:5173 by hand.
app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json({ limit: '200kb' }))

// GET /api/health   anyone. Quick check that the server and database are up.
app.get('/api/health', (req, res) => {
  res.json({ server: 'running', database: isConnected() ? 'connected' : 'not connected' })
})

// Every other route needs the database. Say so clearly instead of hanging.
app.use('/api', (req, res, next) => {
  if (isConnected()) return next()
  res.status(503).json({ error: 'The database isn’t running. Start it with: brew services start mongodb-community' })
})

app.use('/api/auth', authRoutes)
app.use('/api', classRoutes)
app.use('/api', contentRoutes)
app.use('/api', progressRoutes)
app.use('/api', reportRoutes)

app.use('/api', (req, res) => res.status(404).json({ error: 'There is no such API route.' }))

// Anything that throws inside a route ends up here.
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'The request body isn’t valid JSON.' })
  console.error(err)
  res.status(500).json({ error: 'Something went wrong on the server.' })
})

const port = Number(process.env.PORT) || 4000
app.listen(port, () => console.log(`IGNITE server on http://localhost:${port}`))
connect(process.env.MONGODB_URI)
