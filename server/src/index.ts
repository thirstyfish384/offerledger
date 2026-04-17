import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
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
app.use(cors({ origin: config.frontendUrl ?? true }))
app.use(express.json({ limit: '5mb' }))

// Public routes
app.use('/api/auth', authRouter)

// Protected routes
app.use('/api/sheets', authMiddleware, sheetsRouter)
app.use('/api/applications', authMiddleware, applicationsRouter)
app.use('/api/sync', authMiddleware, syncRouter)

// Serve frontend static files in production
const publicDir = path.resolve(__dirname, '../public')
app.use(express.static(publicDir, { index: false }))
app.get('{*path}', (_req, res) => {
  const indexPath = path.join(publicDir, 'index.html')
  const html = fs.readFileSync(indexPath, 'utf-8')
  const injected = html.replace(
    '<head>',
    `<head><script>window.__POSTHOG_KEY__="${config.posthogKey}"</script>`
  )
  res.type('html').send(injected)
})

// Error handler
app.use(errorHandler)

app.listen(config.port, () => {
  console.log(`[offerledger] Server running on port ${config.port}`)
})
