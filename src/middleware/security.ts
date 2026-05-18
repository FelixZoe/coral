import { secureHeaders } from 'hono/secure-headers'
import type { MiddlewareHandler } from 'hono'
import { kvGet, kvPut } from '../lib/kv'

export const securityHeaders = secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdn.jsdelivr.net"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.loli.net"],
    fontSrc: ["'self'", "https://cdn.jsdelivr.net", "https://gstatic.loli.net", "https://fonts.gstatic.com", "data:"],
    imgSrc: ["'self'", "https:", "data:"],
    connectSrc: ["'self'", "https://api.github.com"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    upgradeInsecureRequests: [],
  },
  xContentTypeOptions: 'nosniff',
  xFrameOptions: 'DENY',
  referrerPolicy: 'strict-origin-when-cross-origin',
  strictTransportSecurity: 'max-age=63072000; includeSubDomains; preload',
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: 'same-origin',
  crossOriginResourcePolicy: 'cross-origin',
})

export const additionalSecurity: MiddlewareHandler = async (c, next) => {
  await next()
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), interest-cohort=()')
  c.header('X-Permitted-Cross-Domain-Policies', 'none')
  c.res.headers.delete('X-Powered-By')
  c.res.headers.delete('Server')

  const path = c.req.path
  if (path.startsWith('/admin')) {
    c.header('Cache-Control', 'no-store, no-cache, must-revalidate, private, max-age=0')
    c.header('Pragma', 'no-cache')
    c.header('Expires', '0')
  } else if (path.startsWith('/api/')) {
    c.header('Cache-Control', 'no-store, private')
  } else if (path.startsWith('/static/') && (path.includes('?v=') || path.match(/\.(woff2?|ttf|eot|svg|png|jpg|ico)$/))) {
    c.header('Cache-Control', 'public, max-age=31536000, immutable')
  } else if (path.startsWith('/static/')) {
    c.header('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800')
  } else if (c.res.headers.get('Content-Type')?.includes('text/html')) {
    c.header('Cache-Control', 'no-cache, must-revalidate')
  }
}

export const pathProtection: MiddlewareHandler = async (c, next) => {
  const path = c.req.path
  if (path.includes('..') || path.includes('\\') || path.includes('%2e%2e') || path.includes('%252e')) {
    return c.text('Forbidden', 403)
  }
  if (path.match(/\/\.[^/]/) && !path.startsWith('/.well-known')) {
    return c.text('Forbidden', 403)
  }
  if (path.match(/\.(php|asp|aspx|jsp|cgi|env|git|svn|bak|old|sql|log|ini|conf|yml|yaml|toml|xml)$/i)) {
    return c.text('Not Found', 404)
  }
  return next()
}
