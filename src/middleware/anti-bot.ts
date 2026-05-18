import type { MiddlewareHandler } from 'hono'

export const antiBot: MiddlewareHandler = async (c, next) => {
  const ua = (c.req.header('User-Agent') || '').toLowerCase()
  const path = c.req.path
  if (path.startsWith('/api/') || path.startsWith('/admin') || path.startsWith('/static/')) return next()

  const allowedBots = ['googlebot', 'bingbot', 'baiduspider', 'yandexbot', 'slurp', 'duckduckbot', 'sogou']
  if (allowedBots.some(b => ua.includes(b))) {
    return next()
  }

  const botPatterns = [
    'scrapy', 'python-requests', 'go-http-client', 'libwww-perl',
    'httpclient/', 'java/', 'ahrefsbot',
    'semrushbot', 'dotbot', 'mj12bot', 'bytespider',
    'petalbot',
  ]
  if (botPatterns.some(p => ua.includes(p))) {
    return c.text('Access Denied', 403)
  }

  if ((!ua || ua.length < 5) && !path.startsWith('/api/') && path !== '/' && !path.startsWith('/static/')) {
    return c.text('Access Denied', 403)
  }

  return next()
}
