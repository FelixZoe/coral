import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'
import { renderer } from './renderer'
import { adminPage } from './admin'
import { homePage } from './home'
import { projectsPage } from './projects'
import { githubPage } from './github'
import { downloadsPage } from './downloads'
import { trendingPage } from './trending'
import { parseLang, t } from './i18n'
import type { Lang } from './i18n'

type Bindings = {
  KV: KVNamespace
}

const app = new Hono<{ Bindings: Bindings }>()

// ==================== 安全中间件 ====================

// 1. Security Headers (CSP, XSS, anti-clickjacking, anti-sniffing)
app.use('*', secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdn.jsdelivr.net"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
    fontSrc: ["'self'", "https://cdn.jsdelivr.net", "https://fonts.gstatic.com"],
    imgSrc: ["'self'", "https:", "data:"],
    connectSrc: ["'self'"],
  },
  xContentTypeOptions: 'nosniff',
  xFrameOptions: 'DENY',
  referrerPolicy: 'strict-origin-when-cross-origin',
}))

// 2. Anti-crawler: block common bot User-Agents on non-API routes
app.use('*', async (c, next) => {
  const ua = (c.req.header('User-Agent') || '').toLowerCase()
  const path = c.req.path
  // Allow API, admin, and static asset paths
  if (path.startsWith('/api/') || path.startsWith('/admin') || path.startsWith('/static/')) {
    return next()
  }
  // Only block aggressive crawler/scraper UAs, not generic tools
  const botPatterns = ['scrapy', 'python-requests', 'go-http-client', 'libwww-perl', 'httpclient/']
  const isBot = botPatterns.some(p => ua.includes(p))
  if (isBot) {
    return c.text('Access Denied', 403)
  }
  return next()
})

// 3. Rate limiting for admin login (brute-force protection)
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>()

function checkLoginRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = loginAttempts.get(ip)
  if (!entry) return true
  // Reset after 5 minutes
  if (now - entry.lastAttempt > 5 * 60 * 1000) {
    loginAttempts.delete(ip)
    return true
  }
  return entry.count < 5 // max 5 attempts per 5 minutes
}

function recordLoginAttempt(ip: string) {
  const now = Date.now()
  const entry = loginAttempts.get(ip)
  if (entry && now - entry.lastAttempt < 5 * 60 * 1000) {
    entry.count++
    entry.lastAttempt = now
  } else {
    loginAttempts.set(ip, { count: 1, lastAttempt: now })
  }
}

// 4. Password hashing utilities (PBKDF2 via Web Crypto API)
async function hashPassword(password: string, salt?: string): Promise<string> {
  const s = salt || crypto.randomUUID().replace(/-/g, '').slice(0, 16)
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(s), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  )
  const hashArr = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('')
  return `pbkdf2:${s}:${hashArr}`
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored.startsWith('pbkdf2:')) {
    // Legacy plaintext comparison (for migration)
    return password === stored
  }
  const [, salt] = stored.split(':')
  const rehash = await hashPassword(password, salt)
  return rehash === stored
}

// 5. Input sanitization helper
function sanitize(str: string): string {
  return str.replace(/[<>"'&]/g, (ch) => {
    const map: Record<string, string> = { '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '&': '&amp;' }
    return map[ch] || ch
  })
}

app.use(renderer)

// ==================== 默认数据 ====================
const DEFAULT_PROFILE = {
  name: 'Alex Chen',
  tagline: 'Builder · Dreamer · Explorer',
  avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Felix&backgroundColor=transparent',
  bio: '热爱构建美好的数字产品，用代码把想法变成现实。相信好的设计能让世界更有趣。',
  location: 'Shanghai, China',
  email: 'hello@example.com',
  status: '正在探索 WebAssembly 的无限可能',
  currentlyReading: '《Designing Data-Intensive Applications》',
  quote: 'The best way to predict the future is to invent it.',
  quoteAuthor: 'Alan Kay',
  socials: {
    github: 'https://github.com',
    twitter: 'https://twitter.com',
  },
}

const DEFAULT_WEBSITES = [
  { id: '1', title: 'Cloudflare Dashboard', description: '一个现代化的云服务管理面板，支持实时监控和数据可视化', url: 'https://dash.cloudflare.com', tags: 'Hono,TypeScript,D1', color: '#F6A623', icon: 'fa-solid fa-cloud' },
  { id: '2', title: 'AI Writing Studio', description: '基于 AI 的智能写作助手，让创作更高效', url: 'https://example.com', tags: 'React,OpenAI,TailwindCSS', color: '#7C5CFC', icon: 'fa-solid fa-wand-magic-sparkles' },
  { id: '3', title: 'Photo Gallery', description: '极简风格的在线相册，支持图片压缩和 CDN 加速', url: 'https://example.com', tags: 'Astro,R2,WASM', color: '#22C55E', icon: 'fa-solid fa-camera-retro' },
]

const DEFAULT_REPOS = [
  { id: '1', name: 'hono-starter', description: '一套开箱即用的 Hono + Cloudflare Pages 项目模板', language: 'TypeScript', stars: 128, forks: 32, url: 'https://github.com' },
  { id: '2', name: 'bento-css', description: '纯 CSS 实现的 Bento Grid 布局库，零依赖', language: 'CSS', stars: 256, forks: 45, url: 'https://github.com' },
  { id: '3', name: 'mini-orm', description: '轻量级 D1 数据库 ORM，支持类型安全查询', language: 'TypeScript', stars: 89, forks: 12, url: 'https://github.com' },
  { id: '4', name: 'pixel-weather', description: '像素风格的天气小组件，可嵌入任何网页', language: 'JavaScript', stars: 67, forks: 8, url: 'https://github.com' },
]

const DEFAULT_SETTINGS = {
  storageMode: 'kv', // kv | local | external
  localServerUrl: '',
  localStoragePath: '/data/portal/files',
  externalUploadUrl: '',
  externalDownloadPrefix: '',
  maxFileSize: 25, // MB, KV 单值上限 25MB
}

// ==================== 辅助函数 ====================

// 内存 fallback 存储 — 当 KV 不可用时使用
// Workers isolate 在同一边缘节点上会被复用，所以内存数据有一定持久性
const memStore = new Map<string, string>()

/** KV 操作封装：KV 优先，fallback 到内存 */
async function kvGet(kv: KVNamespace | undefined, key: string): Promise<string | null> {
  if (kv) {
    try { return await kv.get(key) } catch { /* fall through */ }
  }
  return memStore.get(key) || null
}

async function kvPut(kv: KVNamespace | undefined, key: string, value: string, opts?: { expirationTtl?: number }): Promise<void> {
  if (kv) {
    try { await kv.put(key, value, opts); return } catch { /* fall through */ }
  }
  memStore.set(key, value)
  // 内存 TTL 自动清理
  if (opts?.expirationTtl) {
    setTimeout(() => memStore.delete(key), opts.expirationTtl * 1000)
  }
}

async function kvDelete(kv: KVNamespace | undefined, key: string): Promise<void> {
  if (kv) {
    try { await kv.delete(key); return } catch { /* fall through */ }
  }
  memStore.delete(key)
}

async function getData(kv: KVNamespace | undefined, key: string, fallback: any) {
  const val = await kvGet(kv, key)
  if (val) {
    try { return JSON.parse(val) } catch { return fallback }
  }
  await kvPut(kv, key, JSON.stringify(fallback))
  return fallback
}

// ==================== 语言切换 API ====================
app.get('/api/set-lang', (c) => {
  const lang = c.req.query('lang') === 'en' ? 'en' : 'zh'
  const referer = c.req.header('Referer') || '/'
  return new Response(null, {
    status: 302,
    headers: {
      'Location': referer,
      'Set-Cookie': `portal_lang=${lang}; Path=/; SameSite=Lax; Max-Age=${365 * 24 * 3600}`,
    },
  })
})

// ==================== 前台首页 ====================
app.get('/', async (c) => {
  const lang = parseLang(c.req.header('Cookie'))
  const profile = await getData(c.env.KV, 'profile', DEFAULT_PROFILE)
  const websites = await getData(c.env.KV, 'websites', DEFAULT_WEBSITES)
  const repos = await getData(c.env.KV, 'repos', DEFAULT_REPOS)
  const files = await getData(c.env.KV, 'files', [])
  return c.render(homePage(profile, websites, repos, files, lang), { title: `${profile.name} — Portal`, lang })
})

// ==================== 项目页 ====================
app.get('/projects', async (c) => {
  const lang = parseLang(c.req.header('Cookie'))
  const websites = await getData(c.env.KV, 'websites', DEFAULT_WEBSITES)
  const profile = await getData(c.env.KV, 'profile', DEFAULT_PROFILE)
  return c.render(projectsPage(websites, lang), { title: `${t('home', 'webProjects', lang)} — ${profile.name}`, lang })
})

// ==================== GitHub 页 ====================
app.get('/github', async (c) => {
  const lang = parseLang(c.req.header('Cookie'))
  const repos = await getData(c.env.KV, 'repos', DEFAULT_REPOS)
  const profile = await getData(c.env.KV, 'profile', DEFAULT_PROFILE)
  return c.render(githubPage(repos, lang), { title: `${t('home', 'githubProjects', lang)} — ${profile.name}`, lang })
})

// ==================== 下载页 ====================
app.get('/downloads', async (c) => {
  const lang = parseLang(c.req.header('Cookie'))
  const files = await getData(c.env.KV, 'files', [])
  const profile = await getData(c.env.KV, 'profile', DEFAULT_PROFILE)
  return c.render(downloadsPage(files, lang), { title: `${t('home', 'downloadsTitle', lang)} — ${profile.name}`, lang })
})

// ==================== API: 公开数据 ====================
app.get('/api/data', async (c) => {
  const profile = await getData(c.env.KV, 'profile', DEFAULT_PROFILE)
  const websites = await getData(c.env.KV, 'websites', DEFAULT_WEBSITES)
  const repos = await getData(c.env.KV, 'repos', DEFAULT_REPOS)
  const files = await getData(c.env.KV, 'files', [])
  return c.json({ profile, websites, repos, files })
})

// ==================== API: 文件下载 ====================

// ==================== GitHub Trending — 直接爬取 HTML (无需 Token, 全自动) ====================
const CACHE_TTL = 3600 // 数据缓存 1 小时
const RATE_LIMIT_WINDOW = 3600 // 限流窗口 1 小时 (秒)
const RATE_LIMIT_MAX = 30 // 每 IP 每小时最多刷新 30 次

function parseNum(s: string | undefined): number {
  return s ? parseInt(s.replace(/,/g, '')) || 0 : 0
}

/** 爬取 github.com/trending 页面，解析仓库列表 — 无需任何 API Token */
async function scrapeGitHubTrending(langFilter: string, since: string = 'daily'): Promise<{ items: any[]; apiStatus: string }> {
  try {
    const langPath = langFilter ? `/${encodeURIComponent(langFilter)}` : ''
    const url = `https://github.com/trending${langPath}?since=${since}`

    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })

    if (!resp.ok) {
      return { items: [], apiStatus: `scrape_error_${resp.status}` }
    }

    const html = await resp.text()
    const articles = html.split('<article class="Box-row">').slice(1)

    const repos = articles.map((a: string) => {
      // Owner / Name
      const nameMatch = a.match(/text-normal[^>]*>\s*([^<\/]+)\s*\/\s*<\/span>\s*([^\s<]+)/s)
      const owner = nameMatch?.[1]?.trim() || ''
      const name = nameMatch?.[2]?.trim() || ''
      // Description
      const descMatch = a.match(/col-9 color-fg-muted my-1[^>]*>\s*([\s\S]*?)\s*<\/p>/)
      // Language
      const langMatch = a.match(/itemprop="programmingLanguage">([^<]+)/)
      // Stars
      const starsMatch = a.match(/\/stargazers[^>]*>[\s\S]*?<\/svg>\s*([\d,]+)/)
      // Forks
      const forksMatch = a.match(/\/forks[^>]*>[\s\S]*?<\/svg>\s*([\d,]+)/)
      // Stars today/this week/this month
      const trendMatch = a.match(/([\d,]+)\s*stars?\s*(today|this week|this month)/i)

      return {
        full_name: `${owner}/${name}`,
        name,
        owner: { login: owner },
        description: descMatch?.[1]?.trim() || '',
        language: langMatch?.[1] || '',
        stargazers_count: parseNum(starsMatch?.[1]),
        forks_count: parseNum(forksMatch?.[1]),
        html_url: `https://github.com/${owner}/${name}`,
        _starsToday: parseNum(trendMatch?.[1]),
        _trendPeriod: trendMatch?.[2] || 'today',
      }
    }).filter((r: any) => r.name) // 过滤掉解析失败的

    return { items: repos, apiStatus: 'ok' }
  } catch (e: any) {
    return { items: [], apiStatus: 'scrape_failed' }
  }
}

/** 获取热门仓库 (daily trending) */
async function getHotRepos(langFilter: string) {
  return scrapeGitHubTrending(langFilter, 'daily')
}

/** 获取新星仓库 (weekly trending) */
async function getRisingRepos(langFilter: string) {
  return scrapeGitHubTrending(langFilter, 'weekly')
}

/** IP 频率限制检查 */
async function checkRateLimit(kv: KVNamespace | undefined, ip: string): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  if (!kv) return { allowed: true, remaining: RATE_LIMIT_MAX, resetAt: 0 }
  const key = `ratelimit:${ip}`
  const raw = await kv.get(key).catch(() => null)
  const now = Math.floor(Date.now() / 1000)

  if (raw) {
    const data = JSON.parse(raw) as { count: number; windowStart: number }
    if (now - data.windowStart >= RATE_LIMIT_WINDOW) {
      const newData = { count: 1, windowStart: now }
      await kv.put(key, JSON.stringify(newData), { expirationTtl: RATE_LIMIT_WINDOW }).catch(() => {})
      return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetAt: now + RATE_LIMIT_WINDOW }
    }
    if (data.count >= RATE_LIMIT_MAX) {
      return { allowed: false, remaining: 0, resetAt: data.windowStart + RATE_LIMIT_WINDOW }
    }
    data.count++
    const ttl = RATE_LIMIT_WINDOW - (now - data.windowStart)
    await kv.put(key, JSON.stringify(data), { expirationTtl: ttl > 0 ? ttl : 1 }).catch(() => {})
    return { allowed: true, remaining: RATE_LIMIT_MAX - data.count, resetAt: data.windowStart + RATE_LIMIT_WINDOW }
  }

  const newData = { count: 1, windowStart: now }
  await kv.put(key, JSON.stringify(newData), { expirationTtl: RATE_LIMIT_WINDOW }).catch(() => {})
  return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetAt: now + RATE_LIMIT_WINDOW }
}

interface CachedData {
  repos: any[]
  timestamp: string
  apiStatus: string
}

async function getCachedTrending(kv: KVNamespace | undefined, tab: string, langFilter: string, forceRefresh: boolean = false) {
  const cacheKey = `trending:${tab}:${langFilter || 'all'}`

  // 尝试读取缓存
  if (!forceRefresh && kv) {
    const cached = await kv.get(cacheKey).catch(() => null)
    if (cached) {
      try {
        const data: CachedData = JSON.parse(cached)
        return { repos: data.repos, cacheAge: data.timestamp, tokenUsed: 'scrape', apiStatus: data.apiStatus || 'cached' }
      } catch { /* ignore */ }
    }
  }

  // 爬取新数据
  const result = tab === 'rising'
    ? await getRisingRepos(langFilter)
    : await getHotRepos(langFilter)

  const payload: CachedData = {
    repos: result.items,
    timestamp: new Date().toISOString(),
    apiStatus: result.apiStatus,
  }
  if (kv) await kv.put(cacheKey, JSON.stringify(payload), { expirationTtl: CACHE_TTL }).catch(() => {})
  return { repos: payload.repos, cacheAge: payload.timestamp, tokenUsed: 'scrape', apiStatus: payload.apiStatus }
}

/** 获取客户端 IP */
function getClientIP(c: any): string {
  return c.req.header('CF-Connecting-IP')
    || c.req.header('X-Real-IP')
    || c.req.header('X-Forwarded-For')?.split(',')[0]?.trim()
    || '0.0.0.0'
}

/** 获取 API 状态概览 (后台用) */
function getApiStatusInfo() {
  return {
    mode: 'html_scrape',
    description: 'Scrapes github.com/trending directly — no API tokens needed',
    rateLimitMax: RATE_LIMIT_MAX,
    rateLimitWindow: RATE_LIMIT_WINDOW,
    cacheTtl: CACHE_TTL,
  }
}

// --- Trending 路由 ---

app.get('/trending', async (c) => {
  const lang = parseLang(c.req.header('Cookie'))
  const tab = c.req.query('tab') || 'hot'
  const langFilter = c.req.query('lang_filter') || ''
  const refresh = c.req.query('refresh') === '1'
  const ip = getClientIP(c)
  let hotRepos: any[] = []
  let risingRepos: any[] = []
  let cacheAge = ''
  let apiStatus = 'cached'
  let rateLimitInfo = { allowed: true, remaining: RATE_LIMIT_MAX, resetAt: 0 }

  try {
    // 如果是强制刷新，检查限流
    if (refresh) {
      rateLimitInfo = await checkRateLimit(c.env.KV, ip)
      if (!rateLimitInfo.allowed) {
        // 限流了，不刷新，用缓存
        apiStatus = 'rate_limited_user'
      }
    }

    const forceRefresh = refresh && rateLimitInfo.allowed

    if (tab === 'rising') {
      const result = await getCachedTrending(c.env.KV, 'rising', langFilter, forceRefresh)
      risingRepos = result.repos
      cacheAge = result.cacheAge
      apiStatus = result.apiStatus
      const hotResult = await getCachedTrending(c.env.KV, 'hot', langFilter)
      hotRepos = hotResult.repos
    } else {
      const result = await getCachedTrending(c.env.KV, 'hot', langFilter, forceRefresh)
      hotRepos = result.repos
      cacheAge = result.cacheAge
      apiStatus = result.apiStatus
      const risingResult = await getCachedTrending(c.env.KV, 'rising', langFilter)
      risingRepos = risingResult.repos
    }
  } catch {
    // On error, show empty
  }

  // 不刷新也获取一下限流剩余信息展示
  if (!refresh) {
    const key = `ratelimit:${ip}`
    const raw = await kvGet(c.env.KV, key)
    if (raw) {
      const data = JSON.parse(raw) as { count: number; windowStart: number }
      const now = Math.floor(Date.now() / 1000)
      if (now - data.windowStart < RATE_LIMIT_WINDOW) {
        rateLimitInfo = {
          allowed: data.count < RATE_LIMIT_MAX,
          remaining: Math.max(0, RATE_LIMIT_MAX - data.count),
          resetAt: data.windowStart + RATE_LIMIT_WINDOW,
        }
      }
    }
  }

  const title = lang === 'zh' ? 'GitHub 排行榜 — Portal' : 'GitHub Trending — Portal'
  return c.render(
    trendingPage(hotRepos, risingRepos, lang, tab, langFilter, cacheAge, apiStatus, rateLimitInfo),
    { title, lang }
  )
})

app.get('/api/trending', async (c) => {
  const tab = c.req.query('tab') || 'hot'
  const langFilter = c.req.query('lang_filter') || ''
  const refresh = c.req.query('refresh') === '1'
  const ip = getClientIP(c)

  if (refresh) {
    const rl = await checkRateLimit(c.env.KV, ip)
    if (!rl.allowed) {
      return c.json({ error: 'rate_limited', remaining: 0, resetAt: rl.resetAt }, 429)
    }
  }

  try {
    const result = await getCachedTrending(c.env.KV, tab, langFilter, refresh)
    const rl = await checkRateLimit(c.env.KV, ip).catch(() => ({ remaining: RATE_LIMIT_MAX, resetAt: 0, allowed: true }))
    return c.json({
      repos: result.repos,
      cacheAge: result.cacheAge,
      apiStatus: result.apiStatus,
      rateLimit: { remaining: rl.remaining, max: RATE_LIMIT_MAX, resetAt: rl.resetAt },
    })
  } catch {
    return c.json({ repos: [], cacheAge: '' })
  }
})

// --- 后台 Token 管理 API ---

app.get('/admin/api/github-tokens', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401)
  const info = getApiStatusInfo()
  return c.json(info)
})

// Token management routes kept for backward compatibility but no longer needed
// Trending data is now fetched by scraping github.com/trending (no tokens required)
app.post('/admin/api/github-tokens', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401)
  return c.json({ ok: true, message: 'Tokens no longer needed — using HTML scraping mode' })
})

app.post('/admin/api/github-tokens/add', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401)
  return c.json({ ok: true, message: 'Tokens no longer needed — using HTML scraping mode' })
})

app.post('/admin/api/github-tokens/remove', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401)
  return c.json({ ok: true, message: 'Tokens no longer needed — using HTML scraping mode' })
})

app.get('/api/download/:key', async (c) => {
  const key = c.req.param('key')
  const files: any[] = await getData(c.env.KV, 'files', [])
  const fileMeta = files.find((f: any) => f.key === key)
  if (!fileMeta) return c.json({ error: 'File not found' }, 404)

  const settings = await getData(c.env.KV, 'settings', DEFAULT_SETTINGS)

  // 外链模式
  if (fileMeta.isExternal && fileMeta.externalUrl) {
    return c.redirect(fileMeta.externalUrl)
  }

  // 本地存储模式：代理到本地文件服务器
  if (fileMeta.storageType === 'local' && settings.localServerUrl) {
    const serverUrl = settings.localServerUrl.replace(/\/$/, '')
    const storagePath = (settings.localStoragePath || '/data/portal/files').replace(/\/$/, '')
    const fileUrl = `${serverUrl}${storagePath}/${fileMeta.storedName || key}`
    try {
      const resp = await fetch(fileUrl)
      if (!resp.ok) return c.json({ error: 'File not found on local server' }, 404)
      const headers = new Headers()
      headers.set('Content-Type', fileMeta.type || 'application/octet-stream')
      headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(fileMeta.originalName || key)}"`)
      return new Response(resp.body, { headers })
    } catch (e) {
      return c.json({ error: 'Local server unreachable' }, 502)
    }
  }

  // KV 存储模式
  const b64 = await kvGet(c.env.KV, `file:${key}`)
  if (!b64) return c.json({ error: 'File data not found' }, 404)

  const binary = Uint8Array.from(atob(b64), ch => ch.charCodeAt(0))
  const headers = new Headers()
  headers.set('Content-Type', fileMeta.type || 'application/octet-stream')
  headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(fileMeta.originalName || key)}"`)
  headers.set('Content-Length', String(binary.length))
  return new Response(binary, { headers })
})

// ==================== 后台认证 ====================
async function checkAuth(c: any): Promise<boolean> {
  const cookie = c.req.header('Cookie') || ''
  const match = cookie.match(/portal_session=([^;]+)/)
  if (!match) return false
  try {
    const stored = await kvGet(c.env.KV, 'session:' + match[1])
    return !!stored
  } catch {
    return false
  }
}

// ==================== 后台登录 ====================
app.get('/admin/login', (c) => {
  const lang = parseLang(c.req.header('Cookie'))
  return c.render(adminPage('login', { lang }), { title: lang === 'zh' ? '后台登录' : 'Admin Login', lang })
})

app.post('/admin/login', async (c) => {
  const lang = parseLang(c.req.header('Cookie'))
  const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown'
  
  // Rate limiting check
  if (!checkLoginRateLimit(ip)) {
    return c.render(adminPage('login', { error: lang === 'zh' ? '尝试次数过多，请5分钟后再试' : 'Too many attempts, try again in 5 minutes', lang }), { title: lang === 'zh' ? '后台登录' : 'Admin Login', lang })
  }
  
  const body = await c.req.parseBody()
  const password = sanitize((body.password as string) || '')
  
  let storedPw = await kvGet(c.env.KV, 'admin_password')
  
  if (!storedPw) {
    // First time: hash the default password and store it
    const hashed = await hashPassword('admin123')
    await kvPut(c.env.KV, 'admin_password', hashed)
    storedPw = hashed
  }
  
  // Migrate plaintext passwords to hashed
  if (storedPw && !storedPw.startsWith('pbkdf2:')) {
    const hashed = await hashPassword(storedPw)
    await kvPut(c.env.KV, 'admin_password', hashed)
    storedPw = hashed
  }
  
  const valid = await verifyPassword(password, storedPw)
  if (!valid) {
    recordLoginAttempt(ip)
    return c.render(adminPage('login', { error: t('adminLogin', 'wrongPw', lang), lang }), { title: lang === 'zh' ? '后台登录' : 'Admin Login', lang })
  }
  
  const sessionId = crypto.randomUUID()
  await kvPut(c.env.KV, 'session:' + sessionId, '1', { expirationTtl: 86400 })
  return new Response(null, {
    status: 302,
    headers: { 'Location': '/admin', 'Set-Cookie': `portal_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=86400` }
  })
})

app.get('/admin/logout', async (c) => {
  const cookie = c.req.header('Cookie') || ''
  const match = cookie.match(/portal_session=([^;]+)/)
  if (match) await kvDelete(c.env.KV, 'session:' + match[1])
  return new Response(null, {
    status: 302,
    headers: { 'Location': '/admin/login', 'Set-Cookie': 'portal_session=; Path=/; Max-Age=0' }
  })
})

// ==================== 后台面板 ====================
app.get('/admin', async (c) => {
  if (!await checkAuth(c)) return c.redirect('/admin/login')
  const lang = parseLang(c.req.header('Cookie'))
  const profile = await getData(c.env.KV, 'profile', DEFAULT_PROFILE)
  const websites = await getData(c.env.KV, 'websites', DEFAULT_WEBSITES)
  const repos = await getData(c.env.KV, 'repos', DEFAULT_REPOS)
  const files = await getData(c.env.KV, 'files', [])
  const settings = await getData(c.env.KV, 'settings', DEFAULT_SETTINGS)
  return c.render(adminPage('dashboard', { profile, websites, repos, files, settings, lang }), { title: lang === 'zh' ? '管理面板' : 'Admin Panel', lang })
})

// ==================== 后台 API ====================
app.post('/admin/api/profile', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401)
  const data = await c.req.json()
  await kvPut(c.env.KV, 'profile', JSON.stringify(data))
  return c.json({ ok: true })
})

app.post('/admin/api/websites', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401)
  const data = await c.req.json()
  await kvPut(c.env.KV, 'websites', JSON.stringify(data))
  return c.json({ ok: true })
})

app.post('/admin/api/repos', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401)
  const data = await c.req.json()
  await kvPut(c.env.KV, 'repos', JSON.stringify(data))
  return c.json({ ok: true })
})

app.post('/admin/api/upload', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401)
  const formData = await c.req.formData()
  const file = formData.get('file') as File
  const displayName = (formData.get('displayName') as string) || file.name
  if (!file) return c.json({ error: 'No file' }, 400)

  const settings = await getData(c.env.KV, 'settings', DEFAULT_SETTINGS)
  const key = Date.now() + '-' + file.name.replace(/[^a-zA-Z0-9._-]/g, '_')

  if (settings.storageMode === 'local' && settings.localServerUrl) {
    // 本地存储模式：转发到本地文件服务器
    const serverUrl = settings.localServerUrl.replace(/\/$/, '')
    const storagePath = (settings.localStoragePath || '/data/portal/files').replace(/\/$/, '')
    const uploadUrl = `${serverUrl}/upload`
    try {
      const proxyForm = new FormData()
      proxyForm.append('file', file)
      proxyForm.append('path', storagePath)
      proxyForm.append('filename', key)
      const resp = await fetch(uploadUrl, { method: 'POST', body: proxyForm })
      if (!resp.ok) {
        const errText = await resp.text().catch(() => 'Upload failed')
        return c.json({ error: `Local server error: ${errText}` }, 502)
      }
    } catch (e) {
      return c.json({ error: 'Local server unreachable' }, 502)
    }

    // 文件元数据仍存 KV
    const files: any[] = await getData(c.env.KV, 'files', [])
    files.push({
      key,
      displayName,
      originalName: file.name,
      storedName: key,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString(),
      storageType: 'local',
    })
    await kvPut(c.env.KV, 'files', JSON.stringify(files))
    return c.json({ ok: true, key })
  }

  // KV 存储模式
  const maxBytes = (settings.maxFileSize || 25) * 1024 * 1024
  if (file.size > maxBytes) {
    return c.json({ error: `File too large. Max ${settings.maxFileSize}MB` }, 400)
  }

  const buf = await file.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  const b64 = btoa(binary)
  await kvPut(c.env.KV, `file:${key}`, b64)

  const files: any[] = await getData(c.env.KV, 'files', [])
  files.push({
    key,
    displayName,
    originalName: file.name,
    size: file.size,
    type: file.type,
    uploadedAt: new Date().toISOString(),
    storageType: 'kv',
  })
  await kvPut(c.env.KV, 'files', JSON.stringify(files))
  return c.json({ ok: true, key })
})

app.post('/admin/api/add-link', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401)
  const { displayName, originalName, externalUrl, size, type } = await c.req.json()
  if (!displayName || !externalUrl) return c.json({ error: 'Missing fields' }, 400)

  const key = Date.now() + '-link-' + (originalName || 'file').replace(/[^a-zA-Z0-9._-]/g, '_')
  const files: any[] = await getData(c.env.KV, 'files', [])
  files.push({
    key,
    displayName,
    originalName: originalName || displayName,
    externalUrl,
    size: size || 0,
    type: type || 'application/octet-stream',
    uploadedAt: new Date().toISOString(),
    isExternal: true,
  })
  await kvPut(c.env.KV, 'files', JSON.stringify(files))
  return c.json({ ok: true, key })
})

app.post('/admin/api/delete-file', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401)
  const { key } = await c.req.json()
  await kvDelete(c.env.KV, `file:${key}`)
  const files: any[] = await getData(c.env.KV, 'files', [])
  const newFiles = files.filter((f: any) => f.key !== key)
  await kvPut(c.env.KV, 'files', JSON.stringify(newFiles))
  return c.json({ ok: true })
})

app.post('/admin/api/settings', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401)
  const data = await c.req.json()
  await kvPut(c.env.KV, 'settings', JSON.stringify(data))
  return c.json({ ok: true })
})

app.post('/admin/api/password', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401)
  const lang = parseLang(c.req.header('Cookie'))
  const { oldPassword, newPassword } = await c.req.json()
  
  let stored = await kvGet(c.env.KV, 'admin_password')
  if (!stored) {
    stored = await hashPassword('admin123')
    await kvPut(c.env.KV, 'admin_password', stored)
  }
  
  const valid = await verifyPassword(sanitize(oldPassword || ''), stored)
  if (!valid) return c.json({ error: lang === 'zh' ? '旧密码错误' : 'Incorrect old password' }, 400)
  
  // Hash the new password before storing
  const hashedNew = await hashPassword(sanitize(newPassword || ''))
  await kvPut(c.env.KV, 'admin_password', hashedNew)
  return c.json({ ok: true })
})

export default app
