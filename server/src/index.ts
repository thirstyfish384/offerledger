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
  const phSnippet = config.posthogKey
    ? `<script>!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]);t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+" (stub)"},o="capture identify alias reset get_distinct_id getGroups get_session_id get_session_replay_url set_config startSessionRecording stopSessionRecording".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);posthog.init("${config.posthogKey}",{api_host:"https://us.i.posthog.com",person_profiles:"identified_only"})</script>`
    : ''
  const injected = html.replace('<head>', `<head>${phSnippet}`)
  res.type('html').send(injected)
})

// Error handler
app.use(errorHandler)

app.listen(config.port, () => {
  console.log(`[offerledger] Server running on port ${config.port}`)
})
