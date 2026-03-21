import { Hono } from 'hono'
import { renderer } from './renderer'
import { raw } from 'hono/html'

const app = new Hono()

app.use(renderer)

// ==================== 配置数据 ====================
// 在这里修改你的个人信息
const CONFIG = {
  name: 'Alex Chen',
  tagline: 'Builder · Dreamer · Explorer',
  avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Felix&backgroundColor=transparent',
  bio: '热爱构建美好的数字产品，用代码把想法变成现实。相信好的设计能让世界更有趣。',
  location: '🌏 Shanghai, China',
  email: 'hello@example.com',
  socials: {
    github: 'https://github.com',
    twitter: 'https://twitter.com',
    email: 'mailto:hello@example.com',
  },
  // 网站项目展示
  websites: [
    {
      title: 'Cloudflare Dashboard',
      description: '一个现代化的云服务管理面板，支持实时监控和数据可视化',
      url: 'https://dash.cloudflare.com',
      tags: ['Hono', 'TypeScript', 'D1'],
      color: '#F6A623',
      icon: 'fa-solid fa-cloud',
    },
    {
      title: 'AI Writing Studio',
      description: '基于 AI 的智能写作助手，让创作更高效',
      url: 'https://example.com',
      tags: ['React', 'OpenAI', 'TailwindCSS'],
      color: '#7C5CFC',
      icon: 'fa-solid fa-wand-magic-sparkles',
    },
    {
      title: 'Photo Gallery',
      description: '极简风格的在线相册，支持图片压缩和 CDN 加速',
      url: 'https://example.com',
      tags: ['Astro', 'R2', 'WASM'],
      color: '#22C55E',
      icon: 'fa-solid fa-camera-retro',
    },
  ],
  // GitHub 项目
  githubProjects: [
    {
      name: 'hono-starter',
      description: '⚡ 一套开箱即用的 Hono + Cloudflare Pages 项目模板',
      language: 'TypeScript',
      stars: 128,
      forks: 32,
      url: 'https://github.com',
    },
    {
      name: 'bento-css',
      description: '🎨 纯 CSS 实现的 Bento Grid 布局库，零依赖',
      language: 'CSS',
      stars: 256,
      forks: 45,
      url: 'https://github.com',
    },
    {
      name: 'mini-orm',
      description: '🗃️ 轻量级 D1 数据库 ORM，支持类型安全查询',
      language: 'TypeScript',
      stars: 89,
      forks: 12,
      url: 'https://github.com',
    },
    {
      name: 'pixel-weather',
      description: '🌤️ 像素风格的天气小组件，可嵌入任何网页',
      language: 'JavaScript',
      stars: 67,
      forks: 8,
      url: 'https://github.com',
    },
  ],
  // 可下载文件
  downloads: [
    {
      name: '个人简历 2025',
      filename: 'resume-2025.pdf',
      size: '2.3 MB',
      icon: 'fa-solid fa-file-pdf',
      color: '#EF4444',
    },
    {
      name: '作品集 Portfolio',
      filename: 'portfolio.zip',
      size: '15.8 MB',
      icon: 'fa-solid fa-file-zipper',
      color: '#F59E0B',
    },
    {
      name: '设计规范文档',
      filename: 'design-spec.pdf',
      size: '4.1 MB',
      icon: 'fa-solid fa-palette',
      color: '#8B5CF6',
    },
  ],
  // 当前状态
  status: '🔭 正在探索 WebAssembly 的无限可能',
  currentlyReading: '《Designing Data-Intensive Applications》',
}

// ==================== 语言颜色映射 ====================
const langColors: Record<string, string> = {
  TypeScript: '#3178C6',
  JavaScript: '#F7DF1E',
  CSS: '#563D7C',
  HTML: '#E34C26',
  Python: '#3776AB',
  Rust: '#DEA584',
  Go: '#00ADD8',
}

// ==================== 主页面 ====================
app.get('/', (c) => {
  return c.render(
    <div class="portal">
      {/* 背景装饰 */}
      <div class="bg-decor">
        <div class="blob blob-1"></div>
        <div class="blob blob-2"></div>
        <div class="blob blob-3"></div>
        <div class="grain"></div>
      </div>

      <div class="container">
        {/* Header */}
        <header class="header">
          <div class="header-left">
            <span class="logo-dot"></span>
            <span class="logo-text">portal</span>
          </div>
          <nav class="header-nav">
            <a href="#projects" class="nav-link">Projects</a>
            <a href="#github" class="nav-link">GitHub</a>
            <a href="#downloads" class="nav-link">Downloads</a>
          </nav>
          <button class="theme-toggle" id="themeToggle" aria-label="Toggle theme">
            <i class="fa-solid fa-sun"></i>
          </button>
        </header>

        {/* Bento Grid */}
        <main class="bento-grid">

          {/* ===== Card 1: Profile - 大卡片 ===== */}
          <div class="card card-profile" data-aos="1">
            <div class="card-inner">
              <div class="profile-top">
                <div class="avatar-wrap">
                  <img src={CONFIG.avatar} alt="Avatar" class="avatar" />
                  <span class="status-dot"></span>
                </div>
                <div class="profile-info">
                  <h1 class="profile-name">{CONFIG.name}</h1>
                  <p class="profile-tagline">{CONFIG.tagline}</p>
                </div>
              </div>
              <p class="profile-bio">{CONFIG.bio}</p>
              <div class="profile-meta">
                <span class="meta-item">
                  <i class="fa-solid fa-location-dot"></i> {CONFIG.location}
                </span>
                <span class="meta-item">
                  <i class="fa-solid fa-book-open"></i> {CONFIG.currentlyReading}
                </span>
              </div>
              <div class="profile-status">
                <span class="status-badge">{CONFIG.status}</span>
              </div>
              <div class="profile-socials">
                {CONFIG.socials.github && (
                  <a href={CONFIG.socials.github} class="social-btn" target="_blank" rel="noopener">
                    <i class="fa-brands fa-github"></i>
                  </a>
                )}
                {CONFIG.socials.twitter && (
                  <a href={CONFIG.socials.twitter} class="social-btn" target="_blank" rel="noopener">
                    <i class="fa-brands fa-x-twitter"></i>
                  </a>
                )}
                {CONFIG.socials.email && (
                  <a href={CONFIG.socials.email} class="social-btn">
                    <i class="fa-solid fa-envelope"></i>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* ===== Card 2: Now Playing / 时间 ===== */}
          <div class="card card-time" data-aos="2">
            <div class="card-inner">
              <div class="time-display" id="timeDisplay">
                <span class="time-hour">00</span>
                <span class="time-sep">:</span>
                <span class="time-min">00</span>
              </div>
              <p class="time-date" id="dateDisplay">Loading...</p>
              <div class="time-deco">
                <div class="sun-graphic">
                  <div class="sun-core"></div>
                  <div class="sun-ray ray-1"></div>
                  <div class="sun-ray ray-2"></div>
                  <div class="sun-ray ray-3"></div>
                  <div class="sun-ray ray-4"></div>
                  <div class="sun-ray ray-5"></div>
                  <div class="sun-ray ray-6"></div>
                  <div class="sun-ray ray-7"></div>
                  <div class="sun-ray ray-8"></div>
                </div>
              </div>
            </div>
          </div>

          {/* ===== Card 3: Quick Stats ===== */}
          <div class="card card-stats" data-aos="3">
            <div class="card-inner">
              <h3 class="card-label">Quick Stats</h3>
              <div class="stats-grid">
                <div class="stat-item">
                  <span class="stat-num">{CONFIG.websites.length}</span>
                  <span class="stat-label">Websites</span>
                </div>
                <div class="stat-item">
                  <span class="stat-num">{CONFIG.githubProjects.length}</span>
                  <span class="stat-label">Repos</span>
                </div>
                <div class="stat-item">
                  <span class="stat-num">{CONFIG.githubProjects.reduce((a, p) => a + p.stars, 0)}</span>
                  <span class="stat-label">Stars</span>
                </div>
                <div class="stat-item">
                  <span class="stat-num">{CONFIG.downloads.length}</span>
                  <span class="stat-label">Files</span>
                </div>
              </div>
            </div>
          </div>

          {/* ===== Section: 网站项目 ===== */}
          <div class="section-title" id="projects" data-aos="4">
            <h2><i class="fa-solid fa-globe"></i> Web Projects</h2>
          </div>

          {CONFIG.websites.map((site, i) => (
            <a href={site.url} target="_blank" rel="noopener" class="card card-website" data-aos={5 + i} key={site.title}>
              <div class="card-inner">
                <div class="website-icon" style={`--accent: ${site.color}`}>
                  <i class={site.icon}></i>
                </div>
                <h3 class="website-title">{site.title}</h3>
                <p class="website-desc">{site.description}</p>
                <div class="website-tags">
                  {site.tags.map((tag) => (
                    <span class="tag" key={tag}>{tag}</span>
                  ))}
                </div>
                <span class="card-arrow">
                  <i class="fa-solid fa-arrow-up-right-from-square"></i>
                </span>
              </div>
            </a>
          ))}

          {/* ===== Section: GitHub 项目 ===== */}
          <div class="section-title" id="github" data-aos="8">
            <h2><i class="fa-brands fa-github"></i> GitHub Projects</h2>
          </div>

          {CONFIG.githubProjects.map((repo, i) => (
            <a href={repo.url} target="_blank" rel="noopener" class="card card-repo" data-aos={9 + i} key={repo.name}>
              <div class="card-inner">
                <div class="repo-header">
                  <i class="fa-solid fa-book-bookmark repo-icon"></i>
                  <h3 class="repo-name">{repo.name}</h3>
                </div>
                <p class="repo-desc">{repo.description}</p>
                <div class="repo-meta">
                  <span class="repo-lang">
                    <span class="lang-dot" style={`background: ${langColors[repo.language] || '#888'}`}></span>
                    {repo.language}
                  </span>
                  <span class="repo-stat">
                    <i class="fa-solid fa-star"></i> {repo.stars}
                  </span>
                  <span class="repo-stat">
                    <i class="fa-solid fa-code-fork"></i> {repo.forks}
                  </span>
                </div>
              </div>
            </a>
          ))}

          {/* ===== Section: 下载 ===== */}
          <div class="section-title" id="downloads" data-aos="13">
            <h2><i class="fa-solid fa-cloud-arrow-down"></i> Downloads</h2>
          </div>

          {CONFIG.downloads.map((file, i) => (
            <div class="card card-download" data-aos={14 + i} key={file.filename}>
              <div class="card-inner">
                <div class="download-icon" style={`--accent: ${file.color}`}>
                  <i class={file.icon}></i>
                </div>
                <div class="download-info">
                  <h3 class="download-name">{file.name}</h3>
                  <p class="download-meta">{file.filename} · {file.size}</p>
                </div>
                <a href={`/api/download/${file.filename}`} class="download-btn" download>
                  <i class="fa-solid fa-download"></i>
                  <span>Download</span>
                </a>
              </div>
            </div>
          ))}

          {/* ===== Card: Quote / 格言 ===== */}
          <div class="card card-quote" data-aos="17">
            <div class="card-inner">
              <blockquote class="quote-text">
                "The best way to predict the future is to invent it."
              </blockquote>
              <cite class="quote-author">— Alan Kay</cite>
            </div>
          </div>

          {/* ===== Card: Footer ===== */}
          <div class="card card-footer" data-aos="18">
            <div class="card-inner">
              <p>Built with <i class="fa-solid fa-heart" style="color: #EF4444"></i> &amp; <a href="https://hono.dev" target="_blank" rel="noopener">Hono</a></p>
              <p class="footer-sub">Deployed on Cloudflare Pages</p>
            </div>
          </div>

        </main>
      </div>
    </div>,
    { title: `${CONFIG.name} — Portal` }
  )
})

// ==================== API: 文件下载 ====================
// 示例：返回一个提示（实际中可接入 R2 / KV 存储文件）
app.get('/api/download/:filename', (c) => {
  const filename = c.req.param('filename')
  // 在实际场景中，这里可以从 R2 存储桶获取文件
  // const object = await c.env.R2.get(`downloads/${filename}`)
  // 这里返回一个示例提示
  return c.json({
    message: `文件 "${filename}" 的下载链接`,
    tip: '将文件放入 R2 存储桶后，此 API 会直接提供文件下载。当前为演示模式。',
    filename,
  })
})

// ==================== API: 项目数据 ====================
app.get('/api/projects', (c) => {
  return c.json({
    websites: CONFIG.websites,
    github: CONFIG.githubProjects,
    downloads: CONFIG.downloads,
  })
})

export default app
