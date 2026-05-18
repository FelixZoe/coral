/** index.tsx — Main application entry point (modular architecture) */
import { Hono } from 'hono'
import { renderer } from './renderer'
import type { AppEnv } from './types'

// Route modules
import pages from './routes/pages'
import auth from './routes/auth'
import adminRoutes from './routes/admin'
import shareRoutes from './routes/share'
import fileRoutes from './routes/files'
import trendingRoutes from './routes/trending'
import sidebarRoutes from './routes/sidebar'

// Middleware
import { securityHeaders, additionalSecurity, pathProtection } from './middleware/security'
import { rateLimit } from './middleware/rate-limit'
import { antiBot } from './middleware/anti-bot'

const app = new Hono<AppEnv>()

// ==================== Global Error Handler ====================
app.onError((err, c) => {
  const reqId = crypto.randomUUID().slice(0, 8)
  console.error(`[Error:${reqId}]`, err.message, err.stack)
  if (c.req.path.startsWith('/api/') || c.req.path.startsWith('/admin/api/')) {
    return c.json({ error: 'Internal server error', requestId: reqId }, 500)
  }
  return c.html(`<!DOCTYPE html><html><body style="font-family:system-ui;padding:40px;text-align:center">
    <h1>500</h1><p>Something went wrong. Please try again later.</p>
    <p style="color:#999;font-size:0.8rem">Request ID: ${reqId}</p>
    <a href="/" style="color:#6366F1">Go Home</a></body></html>`, 500)
})

// ==================== Middlewares ====================
app.use('*', securityHeaders)
app.use('*', additionalSecurity)
app.use('/api/*', rateLimit)
app.use('*', antiBot)
app.use('*', pathProtection)

// Request size limiting (prevent oversized payloads)
app.use('/api/*', async (c, next) => {
  const contentLength = c.req.header('Content-Length')
  if (contentLength) {
    const size = parseInt(contentLength, 10)
    // Max 1MB for API requests (excluding file uploads which have their own limits)
    if (size > 1048576 && !c.req.path.startsWith('/admin/api/files')) {
      return c.json({ error: 'Payload too large' }, 413)
    }
  }
  return next()
})

// Renderer
app.use(renderer)

// ==================== Mount Route Modules ====================
app.route('/', pages)
app.route('/', auth)
app.route('/', adminRoutes)
app.route('/', shareRoutes)
app.route('/', fileRoutes)
app.route('/', trendingRoutes)
app.route('/', sidebarRoutes)

export default app
