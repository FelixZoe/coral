/** routes/sidebar.ts — Sidebar widget APIs: visitor map, guestbook, random quote */
import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { kvGet, kvPut } from '../lib/kv'

const sidebar = new Hono<AppEnv>()

// ==================== VISITOR MAP (China Provinces) ====================
// Valid province names for data cleanup
const validProvs = new Set([
  '北京','天津','上海','重庆','河北','山西','辽宁','吉林','黑龙江',
  '江苏','浙江','安徽','福建','江西','山东','河南','湖北','湖南',
  '广东','海南','四川','贵州','云南','陕西','甘肃','青海','台湾',
  '内蒙古','广西','西藏','宁夏','新疆','香港','澳门','海外',
])

/** Helper: get visitor data from KV, clean invalid keys */
async function getVisitorData(kv: KVNamespace) {
  const raw = await kvGet(kv, 'sidebar:visitors-v2')
  const data: { provinces: Record<string, number>; total: number } = raw
    ? JSON.parse(raw)
    : { provinces: {}, total: 0 }

  // Clean up invalid province keys
  let cleaned = false
  for (const key of Object.keys(data.provinces)) {
    if (!validProvs.has(key)) {
      delete data.provinces[key]
      cleaned = true
    }
  }
  if (cleaned) {
    data.total = Object.values(data.provinces).reduce((s, n) => s + n, 0)
    await kvPut(kv, 'sidebar:visitors-v2', JSON.stringify(data))
  }
  return data
}

/** GET /api/sidebar/visitors — read-only, returns current visitor data */
sidebar.get('/api/sidebar/visitors', async (c) => {
  const data = await getVisitorData(c.env.KV)
  return c.json(data)
})

/** POST /api/sidebar/visitors/track — record a visit (called once per page load) */
sidebar.post('/api/sidebar/visitors/track', async (c) => {
  const kv = c.env.KV
  const ip = c.req.header('x-real-ip') || c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || ''

  // Deduplicate: use IP hash to prevent counting same visitor multiple times per hour
  const ipHash = await hashIP(ip)
  const dedupeKey = `sidebar:visitor-seen:${ipHash}`
  const alreadySeen = await kvGet(kv, dedupeKey)
  if (alreadySeen) {
    // Already counted this IP recently, just return current data
    const data = await getVisitorData(kv)
    return c.json(data)
  }

  // Resolve province from IP
  let province = ''
  if (ip && ip !== '127.0.0.1' && !ip.startsWith('192.168.') && !ip.startsWith('10.')) {
    province = await resolveProvinceFromIP(ip).catch(() => '')
  }
  if (!province) {
    province = '未知'
  }

  // Get existing visitor data
  const data = await getVisitorData(kv)

  // Increment
  data.provinces[province] = (data.provinces[province] || 0) + 1
  data.total = (data.total || 0) + 1

  // Save
  await kvPut(kv, 'sidebar:visitors-v2', JSON.stringify(data))

  // Mark this IP as seen for 1 hour (prevents double counting on page refreshes)
  await kvPut(kv, dedupeKey, '1', { expirationTtl: 3600 })

  return c.json(data)
})

// ==================== GUESTBOOK ====================
sidebar.get('/api/sidebar/guestbook', async (c) => {
  const raw = await kvGet(c.env.KV, 'sidebar:guestbook')
  const messages: any[] = raw ? JSON.parse(raw) : []
  return c.json({ messages: messages.slice(-50) })
})

sidebar.post('/api/sidebar/guestbook', async (c) => {
  const { text, emoji } = await c.req.json<{ text: string; emoji?: string }>()

  if (!text || text.trim().length === 0) {
    return c.json({ error: 'Message cannot be empty' }, 400)
  }
  if (text.length > 60) {
    return c.json({ error: 'Message too long (max 60 chars)' }, 400)
  }

  const ip = c.req.header('x-real-ip') || c.req.header('x-forwarded-for') || 'unknown'
  const ipHash = await hashIP(ip)
  const rlKey = `sidebar:guestbook-rl:${ipHash}`
  const lastPost = await kvGet(c.env.KV, rlKey)
  if (lastPost) {
    return c.json({ error: 'Please wait a few minutes before posting again' }, 429)
  }

  const raw = await kvGet(c.env.KV, 'sidebar:guestbook')
  const messages: any[] = raw ? JSON.parse(raw) : []

  // Also get province for the message
  let province = ''
  if (ip && ip !== 'unknown') {
    province = await resolveProvinceFromIP(ip).catch(() => '')
  }

  const msg = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    text: text.trim().slice(0, 60),
    emoji: (emoji || '😊').slice(0, 2),
    time: Date.now(),
    province: province || '未知',
  }

  messages.push(msg)
  const trimmed = messages.slice(-200)
  await kvPut(c.env.KV, 'sidebar:guestbook', JSON.stringify(trimmed))
  await kvPut(c.env.KV, rlKey, '1', { expirationTtl: 300 })

  return c.json({ ok: true, message: msg })
})

// ==================== RANDOM QUOTE ====================
const QUOTES = [
  { text: 'The best way to predict the future is to invent it.', author: 'Alan Kay' },
  { text: 'Talk is cheap. Show me the code.', author: 'Linus Torvalds' },
  { text: 'First, solve the problem. Then, write the code.', author: 'John Johnson' },
  { text: 'Code is like humor. When you have to explain it, it\'s bad.', author: 'Cory House' },
  { text: 'Make it work, make it right, make it fast.', author: 'Kent Beck' },
  { text: 'Simplicity is the soul of efficiency.', author: 'Austin Freeman' },
  { text: 'Any fool can write code that a computer can understand. Good programmers write code that humans can understand.', author: 'Martin Fowler' },
  { text: 'Programs must be written for people to read, and only incidentally for machines to execute.', author: 'Harold Abelson' },
  { text: 'The only way to learn a new programming language is by writing programs in it.', author: 'Dennis Ritchie' },
  { text: 'It\'s not a bug — it\'s an undocumented feature.', author: 'Anonymous' },
  { text: 'In order to be irreplaceable, one must always be different.', author: 'Coco Chanel' },
  { text: 'Stay hungry, stay foolish.', author: 'Steve Jobs' },
  { text: 'The computer was born to solve problems that did not exist before.', author: 'Bill Gates' },
  { text: 'Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away.', author: 'Antoine de Saint-Exupéry' },
  { text: 'Debugging is twice as hard as writing the code in the first place.', author: 'Brian Kernighan' },
  { text: '生活不止眼前的 bug，还有远方的 feature。', author: '匿名程序员' },
  { text: '世上无难事，只要肯放弃。', author: '互联网智慧' },
  { text: '代码写得好，头发掉得少。', author: '程序员格言' },
  { text: '不要重复造轮子，除非你想学习轮子是怎么造的。', author: '开源社区' },
  { text: '最好的代码是不存在的代码。', author: 'Jeff Atwood' },
]

sidebar.get('/api/sidebar/quote', (c) => {
  const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)]
  return c.json(quote)
})

// ==================== Helpers ====================
async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(ip + 'sidebar-salt-2024')
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('')
}

/** Resolve province from IP via Baidu IP API (accessible from Chinese servers) */
const ipProvinceCache = new Map<string, { prov: string; ts: number }>()
async function resolveProvinceFromIP(ip: string): Promise<string> {
  const cached = ipProvinceCache.get(ip)
  if (cached && Date.now() - cached.ts < 3600000) return cached.prov

  try {
    // Baidu opendata API — works from Chinese servers, no key needed
    const res = await fetch(
      `https://opendata.baidu.com/api.php?query=${ip}&co=&resource_id=6006&oe=utf8`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (res.ok) {
      const json = await res.json() as any
      const location: string = json?.data?.[0]?.location || ''
      // location format: "广东省广州市 电信" or "上海市上海市 联通" or "美国 加利福尼亚"
      let prov = extractProvince(location)
      if (prov) {
        ipProvinceCache.set(ip, { prov, ts: Date.now() })
        if (ipProvinceCache.size > 500) {
          const oldest = [...ipProvinceCache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0]
          if (oldest) ipProvinceCache.delete(oldest[0])
        }
        return prov
      }
    }
  } catch {}
  return '未知'
}

/** Extract province name from Baidu location string */
function extractProvince(location: string): string {
  if (!location) return ''
  // Direct municipality matches
  const municipalities = ['北京', '天津', '上海', '重庆']
  for (const m of municipalities) {
    if (location.includes(m)) return m
  }
  // Match "XX省" pattern
  const provMatch = location.match(/^(.{2,3}?)省/)
  if (provMatch) return provMatch[1]
  // Match autonomous regions
  const autoMatch = location.match(/^(内蒙古|广西|西藏|宁夏|新疆)/)
  if (autoMatch) return autoMatch[1]
  // Match SARs
  if (location.includes('香港')) return '香港'
  if (location.includes('澳门')) return '澳门'
  if (location.includes('台湾')) return '台湾'
  // "中国" without province detail — treat as unknown domestic
  if (location.startsWith('中国')) return ''
  // Anything else is foreign (e.g. "美国", "日本", "澳大利亚") → "海外"
  return '海外'
}

export default sidebar
