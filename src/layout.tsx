/** layout.tsx — Modern minimal layout: clean header + floating dock nav */
import type { Lang } from './i18n'
import { t } from './i18n'

interface LayoutProps {
  lang: Lang
  activePage: 'home' | 'projects' | 'github' | 'downloads' | 'trending'
  children: any
}

export function pageLayout({ lang, activePage, children }: LayoutProps) {
  const otherLang = lang === 'zh' ? 'en' : 'zh'
  const langLabel = lang === 'zh' ? 'EN' : '中'

  return (
    <div class="portal site">
      {/* Skip to main content — accessibility */}
      <a href="#main-content" class="skip-link">
        {lang === 'zh' ? '跳至主要内容' : 'Skip to main content'}
      </a>

      {/* ===== MINIMAL HEADER — logo + utils only ===== */}
      <header class="header" id="siteHeader" role="banner">
        <div class="header-inner">
          <a href="/" class="logo" aria-label={lang === 'zh' ? '回到首页' : 'Go to home'}>portal<span class="logo-dot">.</span></a>

          <div class="header-actions">
            <a href="/admin" class="header-btn header-icon-btn admin-entry" title={lang === 'zh' ? '后台管理' : 'Admin'} aria-label={lang === 'zh' ? '后台管理' : 'Admin panel'}>
              <i class="fa-solid fa-gear" aria-hidden="true"></i>
            </a>
            <a href={`/api/set-lang?lang=${otherLang}`} class="header-btn header-icon-btn lang-toggle" id="langToggle" title={lang === 'zh' ? 'Switch to English' : '切换到中文'} aria-label={lang === 'zh' ? 'Switch to English' : '切换到中文'}>
              {langLabel}
            </a>
            <button class="header-btn header-icon-btn theme-toggle" id="themeToggle" type="button" aria-label={lang === 'zh' ? '切换主题' : 'Toggle theme'} aria-live="polite">
              <i class="fa-solid fa-circle-half-stroke" aria-hidden="true"></i>
            </button>
          </div>
        </div>
      </header>

      {/* ===== FLOATING DOCK NAV — macOS Dock style ===== */}
      <nav class="dock-nav" id="dockNav" role="navigation" aria-label={lang === 'zh' ? '主导航' : 'Main navigation'}>
        <a href="/" class={`dock-item ${activePage === 'home' ? 'active' : ''}`} aria-current={activePage === 'home' ? 'page' : undefined} data-tooltip={lang === 'zh' ? '首页' : 'Home'}>
          <i class="fa-solid fa-house"></i>
        </a>
        <a href="/projects" class={`dock-item ${activePage === 'projects' ? 'active' : ''}`} aria-current={activePage === 'projects' ? 'page' : undefined} data-tooltip={lang === 'zh' ? '项目' : 'Projects'}>
          <i class="fa-solid fa-cube"></i>
        </a>
        <a href="/github" class={`dock-item ${activePage === 'github' ? 'active' : ''}`} aria-current={activePage === 'github' ? 'page' : undefined} data-tooltip="GitHub">
          <i class="fa-brands fa-github"></i>
        </a>
        <a href="/downloads" class={`dock-item ${activePage === 'downloads' ? 'active' : ''}`} aria-current={activePage === 'downloads' ? 'page' : undefined} data-tooltip={lang === 'zh' ? '下载' : 'Downloads'}>
          <i class="fa-solid fa-cloud-arrow-down"></i>
        </a>
        <a href="/trending" class={`dock-item ${activePage === 'trending' ? 'active' : ''}`} aria-current={activePage === 'trending' ? 'page' : undefined} data-tooltip={lang === 'zh' ? '排行榜' : 'Trending'}>
          <i class="fa-solid fa-fire-flame-curved"></i>
        </a>
      </nav>

      {/* ===== MAIN CONTENT ===== */}
      <main class="main" id="main-content" role="main">
        <div id="pageContent" class="page-transition" data-page={activePage}>
          {children}
        </div>
      </main>

      {/* ===== FOOTER ===== */}
      <footer class="site-footer" role="contentinfo">
        <div class="footer-inner">
          <span class="footer-brand" aria-hidden="true">portal<span class="footer-dot">.</span></span>
          <p class="footer-text">{t('home', 'builtWith', lang)} <i class="fa-solid fa-heart" style="color: var(--accent)" aria-hidden="true"></i> {t('home', 'and', lang)} <a href="https://hono.dev" target="_blank" rel="noopener noreferrer">Hono</a></p>
        </div>
      </footer>

      {/* ===== RIGHT SIDEBAR WIDGETS (preserved) ===== */}
      <aside class="sidebar-widgets" id="sidebarWidgets" aria-label={lang === 'zh' ? '侧边栏工具' : 'Sidebar widgets'}>
        <div class="sw-toolbar" role="toolbar" aria-label={lang === 'zh' ? '小工具' : 'Widgets'}>
          <button class="sw-btn" data-widget="music" type="button" title={lang === 'zh' ? '音乐' : 'Music'} aria-label={lang === 'zh' ? '音乐播放器' : 'Music player'}>
            <i class="fa-solid fa-music" aria-hidden="true"></i>
          </button>
          <button class="sw-btn" data-widget="pet" type="button" title={lang === 'zh' ? '小宠物' : 'Pet'} aria-label={lang === 'zh' ? '虚拟宠物' : 'Virtual pet'}>
            <i class="fa-solid fa-cat" aria-hidden="true"></i>
          </button>
          <button class="sw-btn" data-widget="visitors" type="button" title={lang === 'zh' ? '访客地图' : 'Visitors'} aria-label={lang === 'zh' ? '访客分布地图' : 'Visitor map'}>
            <i class="fa-solid fa-earth-asia" aria-hidden="true"></i>
          </button>
          <button class="sw-btn" data-widget="guestbook" type="button" title={lang === 'zh' ? '留言墙' : 'Guestbook'} aria-label={lang === 'zh' ? '留言墙' : 'Guestbook'}>
            <i class="fa-solid fa-comment-dots" aria-hidden="true"></i>
          </button>
          <button class="sw-btn" data-widget="quote" type="button" title={lang === 'zh' ? '每日一言' : 'Quote'} aria-label={lang === 'zh' ? '每日一言' : 'Daily quote'}>
            <i class="fa-solid fa-lightbulb" aria-hidden="true"></i>
          </button>
        </div>

        <div class="sw-panel" id="swPanel-music" role="dialog" aria-label={lang === 'zh' ? '音乐播放器' : 'Music player'}>
          <div class="sw-panel-header">
            <span><i class="fa-solid fa-music" aria-hidden="true"></i> {lang === 'zh' ? '音乐' : 'Music'}</span>
            <button class="sw-panel-close" type="button" aria-label={lang === 'zh' ? '关闭' : 'Close'}><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
          </div>
          <div class="sw-panel-body sw-music-body">
            <div class="sw-music-cover" id="swMusicCover"><i class="fa-solid fa-compact-disc" aria-hidden="true"></i></div>
            <div class="sw-music-info">
              <div class="sw-music-title" id="swMusicTitle">Chill Vibes</div>
              <div class="sw-music-bars" id="swMusicBars" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div>
            </div>
            <div class="sw-music-controls">
              <button class="sw-music-prev" id="swMusicPrev" type="button" aria-label={lang === 'zh' ? '上一首' : 'Previous'}><i class="fa-solid fa-backward-step" aria-hidden="true"></i></button>
              <button class="sw-music-play" id="swMusicPlay" type="button" aria-label={lang === 'zh' ? '播放/暂停' : 'Play/Pause'}><i class="fa-solid fa-play" aria-hidden="true"></i></button>
              <button class="sw-music-next" id="swMusicNext" type="button" aria-label={lang === 'zh' ? '下一首' : 'Next'}><i class="fa-solid fa-forward-step" aria-hidden="true"></i></button>
            </div>
          </div>
        </div>

        <div class="sw-panel" id="swPanel-pet" role="dialog" aria-label={lang === 'zh' ? '虚拟宠物' : 'Virtual pet'}>
          <div class="sw-panel-header">
            <span><i class="fa-solid fa-cat" aria-hidden="true"></i> {lang === 'zh' ? '小猫咪' : 'Kitty'}</span>
            <button class="sw-panel-close" type="button" aria-label={lang === 'zh' ? '关闭' : 'Close'}><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
          </div>
          <div class="sw-panel-body sw-pet-body">
            <canvas id="swPetCanvas" width="200" height="160" aria-label={lang === 'zh' ? '像素猫咪' : 'Pixel cat'}></canvas>
            <div class="sw-pet-status" id="swPetStatus">{lang === 'zh' ? '点我玩耍！' : 'Click me!'}</div>
          </div>
        </div>

        <div class="sw-panel sw-panel-map" id="swPanel-visitors" role="dialog" aria-label={lang === 'zh' ? '访客地图' : 'Visitor map'}>
          <div class="sw-panel-header">
            <span><i class="fa-solid fa-map-location-dot" aria-hidden="true"></i> {lang === 'zh' ? '访客分布' : 'Visitor Map'}</span>
            <span class="sw-visitors-badge"><span id="swVisitorTotal">0</span> {lang === 'zh' ? '访客' : 'visitors'}</span>
            <button class="sw-panel-close" type="button" aria-label={lang === 'zh' ? '关闭' : 'Close'}><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
          </div>
          <div class="sw-panel-body sw-visitors-body">
            <div class="sw-visitors-map" id="swVisitorMap" role="img" aria-label={lang === 'zh' ? '中国访客分布热力图' : 'China visitor heat map'}></div>
            <div class="sw-visitors-list" id="swVisitorList"></div>
          </div>
        </div>

        <div class="sw-panel" id="swPanel-guestbook" role="dialog" aria-label={lang === 'zh' ? '留言墙' : 'Guestbook'}>
          <div class="sw-panel-header">
            <span><i class="fa-solid fa-comment-dots" aria-hidden="true"></i> {lang === 'zh' ? '留言墙' : 'Guestbook'}</span>
            <button class="sw-panel-close" type="button" aria-label={lang === 'zh' ? '关闭' : 'Close'}><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
          </div>
          <div class="sw-panel-body sw-guestbook-body">
            <div class="sw-gb-messages" id="swGbMessages" role="log" aria-live="polite"></div>
            <div class="sw-gb-input">
              <div class="sw-gb-emoji-row" role="radiogroup" aria-label={lang === 'zh' ? '选择表情' : 'Choose emoji'}>
                <button class="sw-gb-emoji active" data-emoji="😊" type="button" role="radio" aria-checked="true" aria-label="😊">😊</button>
                <button class="sw-gb-emoji" data-emoji="😎" type="button" role="radio" aria-checked="false" aria-label="😎">😎</button>
                <button class="sw-gb-emoji" data-emoji="🚀" type="button" role="radio" aria-checked="false" aria-label="🚀">🚀</button>
                <button class="sw-gb-emoji" data-emoji="❤️" type="button" role="radio" aria-checked="false" aria-label="❤️">❤️</button>
                <button class="sw-gb-emoji" data-emoji="👍" type="button" role="radio" aria-checked="false" aria-label="👍">👍</button>
                <button class="sw-gb-emoji" data-emoji="🌟" type="button" role="radio" aria-checked="false" aria-label="🌟">🌟</button>
              </div>
              <div class="sw-gb-row">
                <input type="text" id="swGbInput" maxlength="60" placeholder={lang === 'zh' ? '说点什么...' : 'Say something...'} aria-label={lang === 'zh' ? '留言内容' : 'Message'} />
                <button id="swGbSend" type="button" aria-label={lang === 'zh' ? '发送' : 'Send'}><i class="fa-solid fa-paper-plane" aria-hidden="true"></i></button>
              </div>
            </div>
          </div>
        </div>

        <div class="sw-panel" id="swPanel-quote" role="dialog" aria-label={lang === 'zh' ? '每日一言' : 'Daily quote'}>
          <div class="sw-panel-header">
            <span><i class="fa-solid fa-lightbulb" aria-hidden="true"></i> {lang === 'zh' ? '每日一言' : 'Quote'}</span>
            <button class="sw-panel-close" type="button" aria-label={lang === 'zh' ? '关闭' : 'Close'}><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
          </div>
          <div class="sw-panel-body sw-quote-body">
            <div class="sw-quote-text" id="swQuoteText" aria-live="polite">Loading...</div>
            <div class="sw-quote-author" id="swQuoteAuthor"></div>
            <button class="sw-quote-refresh" id="swQuoteRefresh" type="button">
              <i class="fa-solid fa-rotate" aria-hidden="true"></i> {lang === 'zh' ? '换一个' : 'Another'}
            </button>
          </div>
        </div>
      </aside>
    </div>
  )
}
