/** home.tsx — 首页：超高级感视觉设计 */
import type { Lang } from './i18n'
import { t } from './i18n'
import { pageLayout } from './layout'
import type { Announcement } from './types'

export function homePage(profile: any, websites: any[], repos: any[], files: any[], lang: Lang = 'zh', announcements: Announcement[] = []) {
  const totalStars = repos.reduce((a: number, r: any) => a + (r.stars || 0), 0)

  const greeting = lang === 'zh' ? '你好，我是' : "Hi, I'm"
  const exploreText = lang === 'zh' ? '探索我的世界' : 'Explore my world'

  const content = (
    <main class="home-main">
      {/* ===== ANNOUNCEMENTS BANNER ===== */}
      {announcements.length > 0 && (
        <div class="announcements-bar" data-aos="0">
          {announcements.map((ann) => (
            <div class={`announcement-item announcement-${ann.type}`} key={ann.id}>
              <i class={`fa-solid ${ann.type === 'warning' ? 'fa-triangle-exclamation' : ann.type === 'success' ? 'fa-circle-check' : 'fa-circle-info'}`}></i>
              <span>{ann.content}</span>
              <button class="announcement-close" data-ann-id={ann.id} aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
            </div>
          ))}
        </div>
      )}

      {/* ===== SIDE DECORATIONS (widescreen) ===== */}
      <div class="home-side-decor home-side-decor-left">
        <div class="side-orb side-orb-1"></div>
        <div class="side-orb side-orb-3"></div>
        <div class="side-line side-line-1"></div>
        <div class="side-dot side-dot-1"></div>
        <div class="side-dot side-dot-2"></div>
      </div>
      <div class="home-side-decor home-side-decor-right">
        <div class="side-orb side-orb-2"></div>
        <div class="side-orb side-orb-4"></div>
        <div class="side-line side-line-2"></div>
        <div class="side-dot side-dot-3"></div>
      </div>

      {/* ===== HERO SECTION ===== */}
      <section class="hero" data-aos="1">
        <div class="hero-glow"></div>
        <div class="hero-glow-2"></div>
        <div class="hero-grain"></div>

        {/* Compact time widget — top-right corner */}
        <div class="hero-time" id="heroTime">
          <span class="hero-time-h">00</span>
          <span class="hero-time-sep">:</span>
          <span class="hero-time-m">00</span>
          <span class="hero-time-date" id="heroDate"></span>
        </div>

        <div class="hero-content">
          <div class="hero-avatar-wrap">
            <img src={profile.avatar} alt="Avatar" class="hero-avatar" />
            <span class="hero-status-dot"></span>
            <div class="hero-avatar-ring"></div>
          </div>
          <div class="hero-info">
            <p class="hero-greeting">{greeting}</p>
            <h1 class="hero-name">{profile.name}</h1>
            <p class="hero-tagline">{profile.tagline}</p>
            {profile.status && (
              <div class="hero-badge">
                <i class="fa-solid fa-bolt"></i>
                <span>{profile.status}</span>
              </div>
            )}
          </div>
        </div>

        <div class="hero-socials">
          {profile.socials?.github && <a href={profile.socials.github} class="hero-social" target="_blank" rel="noopener" title="GitHub"><i class="fa-brands fa-github"></i></a>}
          {profile.socials?.twitter && <a href={profile.socials.twitter} class="hero-social" target="_blank" rel="noopener" title="Twitter"><i class="fa-brands fa-x-twitter"></i></a>}
          {profile.email && <a href={`mailto:${profile.email}`} class="hero-social" title="Email"><i class="fa-solid fa-envelope"></i></a>}
        </div>
      </section>

      {/* ===== ABOUT STRIP ===== */}
      <section class="about-strip" data-aos="2">
        <p class="about-bio">{profile.bio}</p>
        <div class="about-meta">
          <span><i class="fa-solid fa-location-dot"></i> {profile.location}</span>
          {profile.currentlyReading && (
            <span><i class="fa-solid fa-book-open"></i> {profile.currentlyReading}</span>
          )}
        </div>
      </section>

      {/* ===== EXPLORE SECTION ===== */}
      <h2 class="explore-title" data-aos="3">
        <span class="explore-line"></span>
        <span>{exploreText}</span>
        <span class="explore-line"></span>
      </h2>

      <div class="nav-cards" data-aos="4">
        <a href="/projects" class="nav-card nav-card-projects">
          <div class="nav-card-icon"><i class="fa-solid fa-cube"></i></div>
          <div class="nav-card-body">
            <h3>{t('home', 'webProjects', lang)}</h3>
            <p>{websites.length} {t('home', 'websites', lang)}</p>
          </div>
          <span class="nav-card-arrow"><i class="fa-solid fa-arrow-right"></i></span>
        </a>
        <a href="/github" class="nav-card nav-card-github">
          <div class="nav-card-icon"><i class="fa-brands fa-github"></i></div>
          <div class="nav-card-body">
            <h3>{t('home', 'githubProjects', lang)}</h3>
            <p>{repos.length} {t('home', 'repos', lang)}</p>
          </div>
          <span class="nav-card-arrow"><i class="fa-solid fa-arrow-right"></i></span>
        </a>
        <a href="/downloads" class="nav-card nav-card-downloads">
          <div class="nav-card-icon"><i class="fa-solid fa-cloud-arrow-down"></i></div>
          <div class="nav-card-body">
            <h3>{t('home', 'downloadsTitle', lang)}</h3>
            <p>{files.length} {t('home', 'files', lang)}</p>
          </div>
          <span class="nav-card-arrow"><i class="fa-solid fa-arrow-right"></i></span>
        </a>
        <a href="/trending" class="nav-card nav-card-trending">
          <div class="nav-card-icon"><i class="fa-solid fa-fire-flame-curved"></i></div>
          <div class="nav-card-body">
            <h3>{t('nav', 'trending', lang)}</h3>
            <p>GitHub {lang === 'zh' ? '全站排行' : 'Trending'}</p>
          </div>
          <span class="nav-card-arrow"><i class="fa-solid fa-arrow-right"></i></span>
        </a>
      </div>

      {/* ===== SEO CONTENT SECTION ===== */}
      <section class="home-seo" data-aos="5">
        <h2 class="seo-heading">{lang === 'zh' ? '全栈开发者的数字空间' : 'A Full-Stack Developer\'s Digital Space'}</h2>
        <div class="seo-grid">
          <div class="seo-item">
            <i class="fa-solid fa-fire-flame-curved seo-icon"></i>
            <h3>{lang === 'zh' ? 'GitHub 排行榜' : 'GitHub Trending'}</h3>
            <p>{lang === 'zh'
              ? '实时追踪 GitHub 热门项目排行榜，每日更新今日最受欢迎的开源项目，帮你发现值得 Star 的优质仓库。'
              : 'Real-time GitHub trending rankings, daily updated hot open source projects.'}</p>
          </div>
          <div class="seo-item">
            <i class="fa-solid fa-cube seo-icon"></i>
            <h3>{lang === 'zh' ? '好的项目推荐' : 'Best Project Picks'}</h3>
            <p>{lang === 'zh'
              ? '精选优质开源项目与网站推荐，全栈开发者亲自筛选，每个项目都值得收藏和学习。'
              : 'Curated quality projects and websites, hand-picked by a full-stack developer.'}</p>
          </div>
          <div class="seo-item">
            <i class="fa-solid fa-cloud-arrow-down seo-icon"></i>
            <h3>{lang === 'zh' ? '软件库 & 文件库' : 'Software & File Library'}</h3>
            <p>{lang === 'zh'
              ? '免费软件资源下载中心，提供开发工具、编程资源、实用软件等文件的免费下载。'
              : 'Free software downloads, dev tools, programming resources and utilities.'}</p>
          </div>
          <div class="seo-item">
            <i class="fa-brands fa-github seo-icon"></i>
            <h3>{lang === 'zh' ? '开源项目展示' : 'Open Source Showcase'}</h3>
            <p>{lang === 'zh'
              ? '全栈开发者的 GitHub 开源项目作品集，涵盖前端、后端、工具链等方向。'
              : 'Full-stack developer GitHub portfolio, covering frontend, backend, and tooling.'}</p>
          </div>
        </div>
      </section>

      {/* ===== QUOTE ===== */}
      <section class="home-quote" data-aos="5">
        <i class="fa-solid fa-quote-left home-quote-mark"></i>
        <blockquote class="home-quote-text">{profile.quote || 'The best way to predict the future is to invent it.'}</blockquote>
        <cite class="home-quote-author">— {profile.quoteAuthor || 'Alan Kay'}</cite>
      </section>
    </main>
  )

  return pageLayout({ lang, activePage: 'home', children: content })
}
