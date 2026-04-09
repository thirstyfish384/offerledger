import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { config } from './config.js'
import { errorHandler } from './middleware/errorHandler.js'
import { authMiddleware } from './middleware/auth.js'
import authRouter from './routes/auth.js'
import sheetsRouter from './routes/sheets.js'
import applicationsRouter from './routes/applications.js'
import syncRouter from './routes/sync.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()

// Middleware
app.use(cors({ origin: config.frontendUrl }))
app.use(express.json({ limit: '5mb' }))

// Public routes
app.use('/api/auth', authRouter)

// Protected routes
app.use('/api/sheets', authMiddleware, sheetsRouter)
app.use('/api/applications', authMiddleware, applicationsRouter)
app.use('/api/sync', authMiddleware, syncRouter)

// Serve frontend static files in production
const publicDir = path.resolve(__dirname, '../public')
app.use(express.static(publicDir))
app.get('{*path}', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'))
})

// Error handler
app.use(errorHandler)

app.listen(config.port, () => {
  console.log(`[offerledger] Server running on port ${config.port}`)
})
