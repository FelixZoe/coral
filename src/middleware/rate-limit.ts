import type { MiddlewareHandler } from 'hono'
import { kvGet, kvPut } from '../lib/kv'
import type { AppEnv } from '../types'

const API_RATE_LIMIT = 60
const API_RATE_WINDOW_S = 60
const GUESTBOOK_RATE_LIMIT = 5
const GUESTBOOK_RATE_WINDOW_S = 300

export const rateLimit: MiddlewareHandler<AppEnv> = async (c, next) => {
  const ip = c.req.header('x-real-ip')
    || c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
    || c.req.header('cf-connecting-ip')
    || 'unknown'
  const path = c.req.path
  const method = c.req.method

  if (method === 'GET' && !path.includes('/admin/')) {
    return next()
  }

  if (path === '/api/sidebar/guestbook' && method === 'POST') {
    const key = `rl:guestbook:${ip}`
    const raw = await kvGet(c.env.KV, key)
    const count = raw ? parseInt(raw, 10) : 0
    if (count >= GUESTBOOK_RATE_LIMIT) {
      c.header('Retry-After', String(GUESTBOOK_RATE_WINDOW_S))
      return c.json({ error: 'Too many requests. Please try again later.' }, 429)
    }
    await kvPut(c.env.KV, key, String(count + 1), { expirationTtl: GUESTBOOK_RATE_WINDOW_S })
    return next()
  }

  if (['POST', 'PUT', 'DELETE'].includes(method)) {
    const key = `rl:api:${ip}`
    const raw = await kvGet(c.env.KV, key)
    const count = raw ? parseInt(raw, 10) : 0
    if (count >= API_RATE_LIMIT) {
      c.header('Retry-After', String(API_RATE_WINDOW_S))
      return c.json({ error: 'Rate limit exceeded. Please slow down.' }, 429)
    }
    await kvPut(c.env.KV, key, String(count + 1), { expirationTtl: API_RATE_WINDOW_S })
  }

  return next()
}
