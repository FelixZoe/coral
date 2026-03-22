// ========================================
// PORTAL — Frontend Interactions + SPA Router
// Smooth sliding page transitions
// ========================================

(() => {
  'use strict';

  // === SPA Route definitions ===
  const SPA_ROUTES = ['/', '/projects', '/github', '/downloads', '/trending'];
  const ROUTE_ORDER = { '/': 0, '/projects': 1, '/github': 2, '/downloads': 3, '/trending': 4 };

  // === State ===
  let lang = document.body.getAttribute('data-lang') || 'zh';
  let isTransitioning = false;
  let clockInterval = null;
  let prefetchCache = {};
  let allPagesCache = {}; // Persistent cache for all SPA pages

  // === Top progress bar for navigation feedback ===
  const progressBar = (() => {
    const bar = document.createElement('div');
    bar.id = 'spaProgressBar';
    Object.assign(bar.style, {
      position: 'fixed', top: '0', left: '0', height: '2.5px',
      background: 'var(--accent)', zIndex: '99999',
      width: '0%', opacity: '0',
      transition: 'none', pointerEvents: 'none',
      borderRadius: '0 2px 2px 0',
      boxShadow: '0 0 8px var(--accent)'
    });
    document.body.appendChild(bar);

    let raf = null;
    let progress = 0;

    return {
      start() {
        progress = 0;
        bar.style.transition = 'none';
        bar.style.width = '0%';
        bar.style.opacity = '1';
        // Quickly jump to 30% then crawl
        requestAnimationFrame(() => {
          bar.style.transition = 'width 0.15s ease-out';
          bar.style.width = '30%';
          progress = 30;
          // Then slowly crawl to 80% over time
          const crawl = () => {
            if (progress < 80) {
              progress += (80 - progress) * 0.03;
              bar.style.width = progress + '%';
              raf = requestAnimationFrame(crawl);
            }
          };
          raf = requestAnimationFrame(crawl);
        });
      },
      finish(instant) {
        if (raf) { cancelAnimationFrame(raf); raf = null; }
        if (instant) {
          bar.style.transition = 'none';
          bar.style.width = '0%';
          bar.style.opacity = '0';
          return;
        }
        bar.style.transition = 'width 0.12s ease-out';
        bar.style.width = '100%';
        setTimeout(() => {
          bar.style.transition = 'opacity 0.2s ease';
          bar.style.opacity = '0';
          setTimeout(() => { bar.style.width = '0%'; }, 200);
        }, 80);
      },
      cancel() {
        if (raf) { cancelAnimationFrame(raf); raf = null; }
        bar.style.transition = 'none';
        bar.style.width = '0%';
        bar.style.opacity = '0';
      }
    };
  })();

  // ==============================================
  //  THEME
  // ==============================================
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

  function getTheme() {
    const stored = localStorage.getItem('portal-theme');
    if (stored === 'auto' || !stored) return prefersDark.matches ? 'dark' : 'light';
    return stored;
  }

  function getThemeMode() {
    return localStorage.getItem('portal-theme') || 'auto';
  }

  let themeAnimating = false;

  function applyTheme(mode, clickEvent) {
    localStorage.setItem('portal-theme', mode);
    const actual = mode === 'auto' ? (prefersDark.matches ? 'dark' : 'light') : mode;
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const iconClass = mode === 'auto' ? 'fa-solid fa-circle-half-stroke' : actual === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';

    // No visual change — just update icon
    if (actual === currentTheme) {
      document.querySelectorAll('.theme-toggle i').forEach(i => i.className = iconClass);
      return;
    }

    // No animation on initial load (clickEvent === null)
    if (!clickEvent) {
      document.documentElement.setAttribute('data-theme', actual);
      document.documentElement.style.colorScheme = actual === 'dark' ? 'dark only' : 'light only';
      document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', actual === 'dark' ? 'dark only' : 'light only');
      document.querySelectorAll('.theme-toggle i').forEach(i => i.className = iconClass);
      return;
    }

    if (themeAnimating) return;
    themeAnimating = true;

    // Spin icon
    document.querySelectorAll('.theme-toggle i').forEach(i => {
      i.className = iconClass + ' theme-icon-spin';
    });

    // Lightweight fade overlay — single element, GPU opacity only
    const overlay = document.createElement('div');
    overlay.className = 'theme-fade-overlay';
    overlay.style.background = actual === 'dark' ? '#0F0F0F' : '#FBF8F3';
    document.body.appendChild(overlay);

    // Phase 1: fade in overlay (280ms)
    requestAnimationFrame(() => {
      overlay.classList.add('active');
    });

    // Phase 2: switch theme while overlay covers screen
    setTimeout(() => {
      document.documentElement.setAttribute('data-theme', actual);
      document.documentElement.style.colorScheme = actual === 'dark' ? 'dark only' : 'light only';
      document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', actual === 'dark' ? 'dark only' : 'light only');
    }, 200);

    // Phase 3: fade out overlay
    setTimeout(() => {
      overlay.classList.remove('active');
    }, 320);

    // Cleanup
    setTimeout(() => {
      overlay.remove();
      themeAnimating = false;
      document.querySelectorAll('.theme-toggle i').forEach(i => {
        i.classList.remove('theme-icon-spin');
      });
    }, 600);
  }

  // Listen for system theme changes (for auto mode)
  prefersDark.addEventListener('change', () => {
    if (getThemeMode() === 'auto') applyTheme('auto', null);
  });

  applyTheme(getThemeMode(), null);

  // ==============================================
  //  HEADER SCROLL
  // ==============================================
  function initHeaderScroll() {
    const header = document.getElementById('siteHeader');
    if (!header) return;
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          header.classList.toggle('scrolled', window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.removeEventListener('scroll', onScroll);
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // ==============================================
  //  MOBILE MENU — instant touch response
  // ==============================================
  function initMobileMenu() {
    const btn = document.getElementById('mobileMenuBtn');
    const nav = document.getElementById('headerNav');
    if (!btn || !nav) return;

    function closeMenu() {
      btn.classList.remove('open');
      nav.classList.remove('mobile-open');
    }

    // Use both touchstart (instant on mobile) and click (fallback for desktop)
    let touchHandled = false;
    const toggleMenu = (e) => {
      if (e.type === 'touchstart') {
        touchHandled = true;
        e.preventDefault();
      } else if (touchHandled) {
        touchHandled = false;
        return; // Skip click if touch already handled
      }
      e.stopPropagation();
      btn.classList.toggle('open');
      nav.classList.toggle('mobile-open');
    };
    btn.addEventListener('touchstart', toggleMenu, { passive: false });
    btn.addEventListener('click', toggleMenu);

    // Nav links: close menu instantly on touchstart for zero delay
    nav.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('touchstart', () => {
        closeMenu();
      }, { passive: true });
      link.addEventListener('click', () => {
        closeMenu();
      });
    });

    document.addEventListener('click', (e) => {
      if (!nav.contains(e.target) && !btn.contains(e.target)) {
        closeMenu();
      }
    });

    // Close menu on touchstart outside (instant on mobile)
    document.addEventListener('touchstart', (e) => {
      if (nav.classList.contains('mobile-open') && !nav.contains(e.target) && !btn.contains(e.target)) {
        closeMenu();
      }
    }, { passive: true });
  }

  // ==============================================
  //  NAV INDICATOR
  // ==============================================
  let indicatorTimer = null;
  let indicatorLocked = false; // true after click-nav, keeps indicator on active

  function moveIndicator(el) {
    const ind = document.getElementById('navIndicator');
    if (!ind || !el) return;
    if (indicatorTimer) { clearTimeout(indicatorTimer); indicatorTimer = null; }
    const nav = el.parentElement;
    const navRect = nav.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    ind.style.width = elRect.width + 'px';
    ind.style.left = (elRect.left - navRect.left) + 'px';
    ind.classList.add('visible');
  }

  function clearIndicator() {
    // Just stay where we are — no snap-back at all.
    // The indicator will move naturally when the user hovers another link
    // or when the page changes (updateNavActive).
  }

  function initNavIndicator() {
    document.querySelectorAll('.header-nav .nav-link').forEach(link => {
      link.addEventListener('mouseenter', () => {
        indicatorLocked = false;
        moveIndicator(link);
      });
    });
    const navContainer = document.querySelector('.header-nav');
    if (navContainer) navContainer.addEventListener('mouseleave', () => {
      // Smoothly return to active after mouse leaves nav area
      indicatorTimer = setTimeout(() => {
        indicatorTimer = null;
        const active = document.querySelector('.nav-link.active');
        if (active) moveIndicator(active);
        indicatorLocked = true;
      }, 300);
    });

    const active = document.querySelector('.nav-link.active');
    if (active) requestAnimationFrame(() => { moveIndicator(active); indicatorLocked = true; });
  }

  function updateNavActive(path) {
    document.querySelectorAll('.header-nav .nav-link').forEach(link => {
      const href = link.getAttribute('href');
      link.classList.toggle('active', href === path);
    });
    requestAnimationFrame(() => {
      const active = document.querySelector('.nav-link.active');
      if (active) moveIndicator(active);
      indicatorLocked = true;
    });
  }

  // ==============================================
  //  LIVE CLOCK
  // ==============================================
  function initClock() {
    if (clockInterval) { clearInterval(clockInterval); clockInterval = null; }

    function tick() {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');

      // New hero compact clock
      const hh = document.querySelector('.hero-time-h');
      const mm = document.querySelector('.hero-time-m');
      const dd = document.getElementById('heroDate');
      if (hh) hh.textContent = h;
      if (mm) mm.textContent = m;
      if (dd) {
        if (lang === 'zh') {
          const wd = ['日','一','二','三','四','五','六'];
          dd.textContent = `${now.getMonth()+1}/${now.getDate()} 周${wd[now.getDay()]}`;
        } else {
          dd.textContent = now.toLocaleDateString('en-US', { month:'short', day:'numeric', weekday:'short' });
        }
      }

      // Legacy support (old time-hour/time-min)
      const hourEl = document.querySelector('.time-hour');
      const minEl = document.querySelector('.time-min');
      const dateEl = document.getElementById('dateDisplay');
      if (hourEl) hourEl.textContent = h;
      if (minEl) minEl.textContent = m;
      if (dateEl) {
        if (lang === 'zh') {
          const wd = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
          dateEl.textContent = `${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日 ${wd[now.getDay()]}`;
        } else {
          dateEl.textContent = now.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });
        }
      }
    }

    if (document.querySelector('.hero-time-h') || document.querySelector('.time-hour')) {
      tick();
      clockInterval = setInterval(tick, 1000);
    }
  }

  // ==============================================
  //  CARD EFFECTS
  // ==============================================
  function initCardEffects() {
    document.querySelectorAll('.card, .nav-card').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const cx = rect.width / 2, cy = rect.height / 2;
        const rx = ((y - cy) / cy) * -2;
        const ry = ((x - cx) / cx) * 2;
        card.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-2px)`;
      });
      card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });
  }

  // ==============================================
  //  STAT COUNT UP
  // ==============================================
  function initStatCountUp() {
    const statsRow = document.querySelector('.stats-row') || document.querySelector('.card-stats');
    if (!statsRow) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.querySelectorAll('.stat-pill-num, .stat-num').forEach(n => {
            const target = parseInt(n.textContent, 10);
            if (!isNaN(target) && !n.dataset.animated) {
              n.dataset.animated = 'true';
              let cur = 0;
              const step = Math.max(1, Math.ceil(target / 40));
              const iv = setInterval(() => {
                cur += step;
                if (cur >= target) { cur = target; clearInterval(iv); }
                n.textContent = cur;
              }, 30);
            }
          });
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    obs.observe(statsRow);
  }

  // ==============================================
  //  DOWNLOAD BUTTON FEEDBACK
  // ==============================================
  function initDownloadButtons() {
    const prepTxt = lang === 'zh' ? '准备中...' : 'Preparing...';
    const readyTxt = lang === 'zh' ? '完成!' : 'Ready!';

    document.querySelectorAll('.download-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const icon = btn.querySelector('i');
        const text = btn.querySelector('span');
        if (icon && text) {
          const oi = icon.className, ot = text.textContent;
          icon.className = 'fa-solid fa-spinner fa-spin';
          text.textContent = prepTxt;
          setTimeout(() => {
            icon.className = 'fa-solid fa-check';
            text.textContent = readyTxt;
            setTimeout(() => { icon.className = oi; text.textContent = ot; }, 1500);
          }, 1000);
        }
      });
    });
  }

  // ==============================================
  //  DOWNLOAD SEARCH — Relevance-based fuzzy search
  // ==============================================
  function initDownloadSearch() {
    const input = document.getElementById('dlSearch');
    const clearBtn = document.getElementById('dlSearchClear');
    const list = document.getElementById('dlList');
    const hint = document.getElementById('dlSearchHint');
    const noResults = document.getElementById('dlNoResults');
    const countBadge = document.getElementById('dlCount');

    if (!input || !list) return;

    const cards = Array.from(list.querySelectorAll('.download-card'));
    const totalCount = cards.length;

    // Build search index
    const index = cards.map(card => {
      const raw = (card.getAttribute('data-search') || '').toLowerCase();
      const name = (card.querySelector('.download-name')?.textContent || '').toLowerCase();
      return { el: card, raw, name };
    });

    // Relevance scoring: higher = better match
    function score(entry, terms) {
      let s = 0;
      const { raw, name } = entry;
      for (const t of terms) {
        if (!t) continue;
        // Exact name match → highest
        if (name === t) { s += 100; continue; }
        // Name starts with term
        if (name.startsWith(t)) { s += 60; continue; }
        // Name contains term
        if (name.includes(t)) { s += 40; continue; }
        // Raw data (type/ext/tags) contains term
        if (raw.includes(t)) { s += 20; continue; }
        // Fuzzy: check if all chars of term appear in order
        let fi = 0;
        for (let ci = 0; ci < raw.length && fi < t.length; ci++) {
          if (raw[ci] === t[fi]) fi++;
        }
        if (fi === t.length) { s += 5; continue; }
        // No match at all for this term → penalize heavily
        s -= 50;
      }
      return s;
    }

    function doSearch() {
      const query = input.value.trim().toLowerCase();
      clearBtn.style.display = query ? 'flex' : 'none';

      if (!query) {
        // Show all
        cards.forEach(c => { c.style.display = ''; c.style.order = ''; });
        if (hint) hint.textContent = '';
        if (noResults) noResults.style.display = 'none';
        list.style.display = '';
        if (countBadge) countBadge.textContent = countBadge.getAttribute('data-original') || countBadge.textContent;
        return;
      }

      // Save original count text
      if (countBadge && !countBadge.getAttribute('data-original')) {
        countBadge.setAttribute('data-original', countBadge.textContent);
      }

      const terms = query.split(/\s+/).filter(Boolean);
      const scored = index.map((entry, i) => ({ i, s: score(entry, terms) }));
      scored.sort((a, b) => b.s - a.s);

      let visibleCount = 0;
      scored.forEach(({ i, s }, order) => {
        const card = cards[i];
        if (s > 0) {
          card.style.display = '';
          card.style.order = String(order);
          visibleCount++;
        } else {
          card.style.display = 'none';
          card.style.order = '';
        }
      });

      if (noResults) noResults.style.display = visibleCount === 0 ? '' : 'none';
      list.style.display = visibleCount === 0 ? 'none' : '';

      if (hint) {
        hint.textContent = visibleCount > 0
          ? (lang === 'zh' ? `找到 ${visibleCount} 个匹配文件` : `${visibleCount} file${visibleCount !== 1 ? 's' : ''} found`)
          : '';
      }

      if (countBadge) {
        countBadge.textContent = lang === 'zh'
          ? `${visibleCount} / ${totalCount} 个文件`
          : `${visibleCount} / ${totalCount} files`;
      }
    }

    // Debounced input
    let timer;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(doSearch, 150);
    });

    // Clear button
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        input.value = '';
        doSearch();
        input.focus();
      });
      clearBtn.style.display = 'none';
    }

    // Enter key → no form submit
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { input.value = ''; doSearch(); }
    });
  }

  // ==============================================
  //  TRENDING TABS — Local tab switching with animation
  // ==============================================
  function initTrendingTabs() {
    const tabsWrap = document.getElementById('trendingTabs');
    if (!tabsWrap) return;

    const buttons = tabsWrap.querySelectorAll('.trending-tab[data-tab]');
    const hotList = document.getElementById('trendingList-hot');
    const risingList = document.getElementById('trendingList-rising');
    if (!hotList || !risingList) return;

    const lists = { hot: hotList, rising: risingList };

    function animateListSwitch(curTab, toTab) {
      const dir = toTab === 'rising' ? 'left' : 'right';
      const hideList = lists[curTab];
      const showList = lists[toTab];

      hideList.classList.add('tab-fade-out-' + dir);
      const onOutDone = () => {
        hideList.classList.remove('tab-fade-out-' + dir);
        hideList.style.display = 'none';
        showList.style.display = '';
        showList.classList.add('tab-fade-in-' + dir);
        const onInDone = () => { showList.classList.remove('tab-fade-in-' + dir); };
        showList.addEventListener('animationend', onInDone, { once: true });
        setTimeout(onInDone, 240);
      };
      hideList.addEventListener('animationend', onOutDone, { once: true });
      setTimeout(onOutDone, 240);
    }

    function updateURL() {
      const tab = tabsWrap.getAttribute('data-current-tab');
      const filtersWrap = document.getElementById('trendingFilters');
      const langVal = filtersWrap ? filtersWrap.getAttribute('data-current-lang') : '';
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      if (langVal) url.searchParams.set('lang_filter', langVal);
      else url.searchParams.delete('lang_filter');
      history.replaceState({ path: url.pathname + url.search }, '', url.toString());

      // Update refresh button href
      const refreshBtn = document.querySelector('.trending-refresh-btn');
      if (refreshBtn) {
        const u = new URL(url.toString());
        u.searchParams.set('refresh', '1');
        refreshBtn.setAttribute('href', u.pathname + u.search);
      }
    }

    buttons.forEach(btn => {
      if (btn.dataset.trendTabBound) return;
      btn.dataset.trendTabBound = 'true';

      btn.addEventListener('click', () => {
        const toTab = btn.getAttribute('data-tab');
        const curTab = tabsWrap.getAttribute('data-current-tab');
        if (toTab === curTab) return;

        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        tabsWrap.setAttribute('data-current-tab', toTab);

        animateListSwitch(curTab, toTab);
        updateURL();
      });
    });
  }

  // ==============================================
  //  TRENDING LANGUAGE FILTER — Direct navigation
  // ==============================================
  function initTrendingLangFilter() {
    const filtersWrap = document.getElementById('trendingFilters');
    if (!filtersWrap) return;

    const filterBtns = filtersWrap.querySelectorAll('.filter-tag[data-lang]');
    const tabsWrap = document.getElementById('trendingTabs');

    filterBtns.forEach(btn => {
      if (btn.dataset.langBound) return;
      btn.dataset.langBound = 'true';

      btn.addEventListener('click', () => {
        const newLang = btn.getAttribute('data-lang');
        const curLang = filtersWrap.getAttribute('data-current-lang');
        if (newLang === curLang) return;

        // Visual feedback
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Direct navigation — server renders correct filtered result
        const tab = tabsWrap ? tabsWrap.getAttribute('data-current-tab') || 'hot' : 'hot';
        let href = `/trending?tab=${tab}`;
        if (newLang) href += `&lang_filter=${encodeURIComponent(newLang)}`;
        window.location.href = href;
      });
    });
  }

  // ==============================================
  //  CARD ENTRANCE ANIMATION
  // ==============================================
  function initAOS() {
    const cards = document.querySelectorAll('[data-aos]');
    if (!cards.length) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('aos-in');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -30px 0px' });
    cards.forEach(c => obs.observe(c));
  }

  // ==============================================
  //  FILE SHARING MODAL
  // ==============================================
  function initShareModal() {
    const modal = document.getElementById('shareModal');
    if (!modal) return;

    let currentFileKey = '';
    const closeModal = () => { modal.style.display = 'none'; };

    // Close button
    document.getElementById('shareModalClose')?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // Share buttons (delegated)
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.share-btn');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      currentFileKey = btn.getAttribute('data-filekey');
      const filename = btn.getAttribute('data-filename');
      document.getElementById('shareFileName').textContent = filename;
      document.getElementById('sharePassword').value = '';
      document.getElementById('shareExpires').value = '0';
      document.getElementById('shareMaxDownloads').value = '0';
      document.getElementById('shareResult').style.display = 'none';
      modal.style.display = 'flex';
    });

    // Create share link
    document.getElementById('shareCreateBtn')?.addEventListener('click', async () => {
      const password = document.getElementById('sharePassword').value.trim();
      const expiresIn = parseInt(document.getElementById('shareExpires').value) || 0;
      const maxDownloads = parseInt(document.getElementById('shareMaxDownloads').value) || 0;

      const btn = document.getElementById('shareCreateBtn');
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

      try {
        // Get CSRF token from admin data if available
        const csrfToken = (window.__DATA__ && window.__DATA__.csrfToken) || '';
        const resp = await fetch('/admin/api/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
          credentials: 'same-origin',
          body: JSON.stringify({ fileKey: currentFileKey, password, expiresIn, maxDownloads }),
        });
        const data = await resp.json();
        if (data.ok) {
          const fullUrl = window.location.origin + data.shareUrl;
          document.getElementById('shareUrl').value = fullUrl;
          document.getElementById('shareResult').style.display = 'block';
        } else {
          alert(data.error || 'Failed to create share link');
        }
      } catch (err) {
        alert('Network error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-link"></i> ' + (lang === 'zh' ? '生成分享链接' : 'Generate Share Link');
      }
    });

    // Copy button
    document.getElementById('shareCopyBtn')?.addEventListener('click', () => {
      const url = document.getElementById('shareUrl');
      url.select();
      navigator.clipboard.writeText(url.value).then(() => {
        const btn = document.getElementById('shareCopyBtn');
        btn.innerHTML = '<i class="fa-solid fa-check"></i>';
        setTimeout(() => { btn.innerHTML = '<i class="fa-solid fa-copy"></i>'; }, 1500);
      });
    });
  }

  // ==============================================
  //  RE-INIT ALL PAGE-SPECIFIC BEHAVIORS
  // ==============================================
  function initPageBehaviors() {
    initClock();
    initCardEffects();
    initStatCountUp();
    initDownloadButtons();
    initDownloadSearch();
    initTrendingTabs();
    initTrendingLangFilter();
    initShareModal();
    initAOS();
    filterDismissedAnnouncements();
  }

  // Hide previously dismissed announcements
  function filterDismissedAnnouncements() {
    const dismissed = JSON.parse(localStorage.getItem('dismissed-announcements') || '[]');
    if (dismissed.length === 0) return;
    document.querySelectorAll('.announcement-close').forEach(btn => {
      const id = btn.getAttribute('data-ann-id');
      if (id && dismissed.includes(id)) {
        const item = btn.closest('.announcement-item');
        if (item) item.style.display = 'none';
      }
    });
  }

  // ==============================================
  //  SPA ROUTER — Sliding Page Transitions
  // ==============================================

  function isSPARoute(href) {
    if (!href) return false;
    try {
      const url = new URL(href, window.location.origin);
      if (url.origin !== window.location.origin) return false;
      return SPA_ROUTES.includes(url.pathname);
    } catch { return false; }
  }

  function getDirection(fromPath, toPath) {
    const from = ROUTE_ORDER[fromPath] ?? -1;
    const to = ROUTE_ORDER[toPath] ?? -1;
    return to > from ? 'left' : 'right'; // 'left' = slide out left, new comes from right
  }

  // Prefetch on hover for instant transitions
  function prefetchPage(href) {
    if (allPagesCache[href] || prefetchCache[href]) return;
    prefetchCache[href] = fetch(href, { credentials: 'same-origin' })
      .then(r => r.ok ? r.text() : null)
      .then(html => { if (html) allPagesCache[href] = html; return html; })
      .catch(() => null);
  }

  // Eagerly prefetch all SPA routes at load for instant navigation
  function prefetchAllRoutes() {
    const current = window.location.pathname;
    SPA_ROUTES.forEach(route => {
      if (route !== current && !allPagesCache[route]) {
        fetch(route, { credentials: 'same-origin' })
          .then(r => r.ok ? r.text() : null)
          .then(html => { if (html) allPagesCache[route] = html; })
          .catch(() => {});
      }
    });
  }

  async function navigateTo(href, pushState = true) {
    if (isTransitioning) return;

    const url = new URL(href, window.location.origin);
    const toPath = url.pathname;
    const fromPath = window.location.pathname;

    if (toPath === fromPath && !url.search) return;

    isTransitioning = true;

    // Check persistent cache first — if cached, skip progress bar entirely
    const isCached = !!(allPagesCache[href] || allPagesCache[toPath]);
    if (!isCached) progressBar.start();

    // Immediately update nav active state for instant visual feedback
    updateNavActive(toPath);

    const container = document.getElementById('pageContent');
    if (!container) {
      progressBar.cancel();
      window.location.href = href;
      return;
    }

    const dir = getDirection(fromPath, toPath);
    const isMobile = window.innerWidth <= 768;
    const animOut = isMobile ? 100 : 180;
    const animIn = isMobile ? 120 : 200;

    // Check persistent cache first for instant navigation
    let html = allPagesCache[href] || allPagesCache[toPath] || null;

    // If not in persistent cache, try prefetch cache or fetch
    const fetchPromise = html ? Promise.resolve(html) : (async () => {
      try {
        if (prefetchCache[href]) {
          const cached = await prefetchCache[href];
          delete prefetchCache[href];
          return cached;
        }
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), isMobile ? 4000 : 6000);
        const resp = await fetch(href, { credentials: 'same-origin', signal: controller.signal });
        clearTimeout(timeout);
        const text = resp.ok ? await resp.text() : null;
        if (text) allPagesCache[href] = text; // Cache for future
        return text;
      } catch { return null; }
    })();

    // Animate out in parallel with fetch
    container.style.animation = `slideOut${dir === 'left' ? 'Left' : 'Right'} ${animOut}ms cubic-bezier(0.4,0,0.6,1) forwards`;
    container.style.pointerEvents = 'none';

    // If we already have cached HTML, just wait for slideOut then swap immediately
    if (html) {
      await new Promise(r => setTimeout(r, animOut));
    } else {
      // Wait for animation, then race fetch
      await new Promise(r => setTimeout(r, animOut));
      const raceResult = await Promise.race([
        fetchPromise.then(h => ({ html: h, done: true })),
        new Promise(r => setTimeout(r, 30)).then(() => ({ done: false }))
      ]);
      if (raceResult.done) {
        html = raceResult.html;
      } else {
        container.innerHTML = '<div class="spa-loading"><div class="spa-loading-spinner"></div></div>';
        container.style.animation = '';
        container.style.opacity = '1';
        html = await fetchPromise;
      }
    }

    if (!html) {
      container.style.animation = '';
      container.style.pointerEvents = '';
      isTransitioning = false;
      progressBar.cancel();
      window.location.href = href;
      return;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const newContent = doc.getElementById('pageContent');

    if (!newContent) {
      container.style.animation = '';
      container.style.pointerEvents = '';
      isTransitioning = false;
      progressBar.cancel();
      window.location.href = href;
      return;
    }

    const newTitle = doc.querySelector('title');
    if (newTitle) document.title = newTitle.textContent;

    // === SWAP CONTENT ===
    container.innerHTML = newContent.innerHTML;
    container.setAttribute('data-page', newContent.getAttribute('data-page') || '');
    window.scrollTo({ top: 0, behavior: 'instant' });

    // === ANIMATE IN ===
    container.style.animation = `slideIn${dir === 'left' ? 'Right' : 'Left'} ${animIn}ms cubic-bezier(0,0,0.2,1) forwards`;

    progressBar.finish(isCached);

    // Don't await slideIn — let it play while we re-init behaviors
    setTimeout(() => {
      container.style.animation = '';
      container.style.pointerEvents = '';
    }, animIn);

    // === POST-TRANSITION UPDATES ===
    if (pushState) {
      history.pushState({ path: href }, '', href);
    }

    initPageBehaviors();
    attachSPALinks();

    isTransitioning = false;

    // Re-cache this page's HTML for future back-nav
    allPagesCache[toPath] = html;
    // Refresh cache for the page we left (data may have changed)
    delete allPagesCache[fromPath];
    fetch(fromPath, { credentials: 'same-origin' })
      .then(r => r.ok ? r.text() : null)
      .then(h => { if (h) allPagesCache[fromPath] = h; })
      .catch(() => {});
  }

  // Attach SPA click handlers to all qualifying links
  function attachSPALinks() {
    document.querySelectorAll('a[href]').forEach(link => {
      if (link.dataset.spaAttached) return;
      const href = link.getAttribute('href');

      // Skip external links, admin, api, download links
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('javascript:')) return;
      if (link.getAttribute('target') === '_blank') return;
      if (href.startsWith('/admin') || href.startsWith('/api/')) return;

      // Check if this is a SPA route
      let fullHref;
      try {
        fullHref = new URL(href, window.location.origin).pathname;
      } catch { return; }

      // Match exact SPA routes (also /trending?tab=... etc.)
      const pathOnly = fullHref.split('?')[0];
      if (!SPA_ROUTES.includes(pathOnly)) return;

      link.dataset.spaAttached = 'true';

      // Prefetch on hover (desktop) and touchstart (mobile)
      link.addEventListener('mouseenter', () => {
        prefetchPage(href);
      }, { passive: true });

      // Track touch position to distinguish taps from scrolls
      let touchStartX = 0, touchStartY = 0, touchMoved = false;
      link.addEventListener('touchstart', (e) => {
        prefetchPage(href);
        const t = e.touches[0];
        touchStartX = t.clientX;
        touchStartY = t.clientY;
        touchMoved = false;
      }, { passive: true });

      link.addEventListener('touchmove', (e) => {
        if (touchMoved) return;
        const t = e.touches[0];
        const dx = Math.abs(t.clientX - touchStartX);
        const dy = Math.abs(t.clientY - touchStartY);
        // If finger moved more than 10px, it's a scroll not a tap
        if (dx > 10 || dy > 10) touchMoved = true;
      }, { passive: true });

      // Use touchend for instant mobile navigation — only if not scrolling
      let touchNavHandled = false;
      link.addEventListener('touchend', (e) => {
        if (touchMoved) { touchMoved = false; return; }
        if (e.cancelable) e.preventDefault();
        touchNavHandled = true;
        navigateTo(href);
      });

      link.addEventListener('click', (e) => {
        if (touchNavHandled) { touchNavHandled = false; e.preventDefault(); return; }
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        navigateTo(href);
      });
    });
  }

  // Handle browser back/forward
  window.addEventListener('popstate', (e) => {
    const path = window.location.pathname + window.location.search;
    if (isSPARoute(path)) {
      navigateTo(path, false);
    }
  });

  // ==============================================
  //  GLOBAL EVENT DELEGATION (survives DOM swaps)
  // ==============================================
  document.addEventListener('click', (e) => {
    // Theme toggle (delegated) — circular reveal animation
    const themeBtn = e.target.closest('.theme-toggle');
    if (themeBtn) {
      const mode = getThemeMode();
      // Cycle: light → dark → auto → light
      const next = mode === 'light' ? 'dark' : mode === 'dark' ? 'auto' : 'light';
      applyTheme(next, e);
      return;
    }

    // Language toggle (delegated) — smooth crossfade then reload
    const langBtn = e.target.closest('.lang-toggle');

    // Announcement close button
    const annClose = e.target.closest('.announcement-close');
    if (annClose) {
      const item = annClose.closest('.announcement-item');
      if (item) {
        item.style.opacity = '0';
        item.style.transform = 'translateY(-10px)';
        item.style.transition = 'all 0.3s ease';
        setTimeout(() => item.remove(), 300);
        // Remember dismissed announcements
        const id = annClose.getAttribute('data-ann-id');
        if (id) {
          const dismissed = JSON.parse(localStorage.getItem('dismissed-announcements') || '[]');
          dismissed.push(id);
          localStorage.setItem('dismissed-announcements', JSON.stringify(dismissed));
        }
      }
      return;
    }

    if (langBtn) {
      e.preventDefault();
      const newLang = lang === 'zh' ? 'en' : 'zh';
      document.cookie = `portal_lang=${newLang}; path=/; max-age=${365 * 24 * 3600}; samesite=lax`;

      // Smooth blur-dissolve transition
      const portal = document.querySelector('.portal') || document.body;
      portal.classList.add('lang-switch-out');

      // Start fetching new page content during animation
      const fetchNew = fetch(window.location.href, { credentials: 'same-origin' })
        .then(r => r.ok ? r.text() : null).catch(() => null);

      // After fade-out, swap content and fade-in
      setTimeout(async () => {
        const html = await fetchNew;
        if (html) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          // Swap head elements that change (title)
          const newTitle = doc.querySelector('title');
          if (newTitle) document.title = newTitle.textContent;
          // Swap body content
          document.body.innerHTML = doc.body.innerHTML;
          document.body.setAttribute('data-lang', newLang);
          document.documentElement.setAttribute('lang', newLang === 'zh' ? 'zh-CN' : 'en');
          // Restore theme
          const actual = getTheme();
          document.documentElement.setAttribute('data-theme', actual);
          // Fade in
          const newPortal = document.querySelector('.portal') || document.body;
          newPortal.classList.add('lang-switch-in');
          setTimeout(() => newPortal.classList.remove('lang-switch-in'), 400);
          // Re-init all behaviors
          lang = newLang;
          initHeaderScroll();
          initMobileMenu();
          initNavIndicator();
          initPageBehaviors();
          attachSPALinks();
          initSidebarWidgets();
          // Update all pages cache
          Object.keys(allPagesCache).forEach(k => delete allPagesCache[k]);
          prefetchAllRoutes();
        } else {
          window.location.reload();
        }
      }, 320);
      return;
    }
  });

  // ==============================================
  //  INIT ON LOAD
  // ==============================================
  initHeaderScroll();
  initMobileMenu();
  initNavIndicator();
  initPageBehaviors();
  attachSPALinks();

  // Store initial history state
  history.replaceState({ path: window.location.pathname + window.location.search }, '');

  // Eagerly prefetch all SPA routes after a short delay
  // This ensures instant navigation on mobile
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => prefetchAllRoutes());
  } else {
    setTimeout(prefetchAllRoutes, 1500);
  }

  // ==============================================
  //  SIDEBAR WIDGETS
  // ==============================================
  function initSidebarWidgets() {
    const sidebar = document.getElementById('sidebarWidgets');
    if (!sidebar) return;

    let activePanel = null;

    // --- Panel toggle ---
    sidebar.addEventListener('click', (e) => {
      const btn = e.target.closest('.sw-btn');
      const closeBtn = e.target.closest('.sw-panel-close');

      if (closeBtn) {
        closePanel();
        return;
      }

      if (btn) {
        const widget = btn.dataset.widget;
        if (activePanel === widget) {
          closePanel();
        } else {
          openPanel(widget);
        }
      }
    });

    // Close on outside click (use a named handler to avoid duplicates)
    if (!window._swOutsideClickBound) {
      window._swOutsideClickBound = true;
      document.addEventListener('click', (e) => {
        if (window._swClosePanel && !e.target.closest('.sidebar-widgets')) {
          window._swClosePanel();
        }
      });
    }

    function openPanel(name) {
      closePanel(true);
      const panel = document.getElementById('swPanel-' + name);
      const btn = sidebar.querySelector(`.sw-btn[data-widget="${name}"]`);
      if (!panel || !btn) return;

      btn.classList.add('active');
      panel.classList.add('visible');

      // Position panel vertically centered on the button
      const btnRect = btn.getBoundingClientRect();
      const sidebarRect = sidebar.getBoundingClientRect();
      const panelH = panel.offsetHeight || 280;
      let top = btnRect.top - sidebarRect.top - panelH / 2 + 19;
      top = Math.max(-sidebarRect.top + 80, Math.min(top, window.innerHeight - sidebarRect.top - panelH - 20));
      if (window.innerWidth <= 768) {
        panel.style.top = 'auto';
      } else {
        panel.style.top = top + 'px';
      }

      activePanel = name;

      // Load data on first open
      if (name === 'visitors') loadVisitors();
      if (name === 'guestbook') loadGuestbook();
      if (name === 'quote') loadQuote();
      if (name === 'pet') initPet();
    }

    function closePanel(skipAnim) {
      if (!activePanel && !skipAnim) return;
      sidebar.querySelectorAll('.sw-btn.active').forEach(b => b.classList.remove('active'));
      sidebar.querySelectorAll('.sw-panel.visible').forEach(p => p.classList.remove('visible'));
      activePanel = null;
    }
    // Expose closePanel for outside-click handler
    window._swClosePanel = () => { if (activePanel) closePanel(); };

    // ========== MUSIC PLAYER ==========
    const TRACKS = [
      { title: 'Chill Vibes', freq: [220, 330, 440] },
      { title: 'Ocean Waves', freq: [196, 262, 392] },
      { title: 'Night Drive', freq: [247, 370, 494] },
      { title: 'Sunset Glow', freq: [262, 349, 523] },
      { title: 'Morning Dew', freq: [294, 392, 587] },
    ];
    let musicIdx = 0, audioCtx = null, isPlaying = false, oscNodes = [], gainNode = null;

    function initAudioCtx() {
      if (audioCtx) return;
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      gainNode = audioCtx.createGain();
      gainNode.gain.value = 0.06;
      gainNode.connect(audioCtx.destination);
    }

    function playTrack() {
      initAudioCtx();
      stopTrack(true);
      const track = TRACKS[musicIdx];
      oscNodes = track.freq.map((f, i) => {
        const osc = audioCtx.createOscillator();
        osc.type = ['sine', 'triangle', 'sine'][i] || 'sine';
        osc.frequency.value = f;
        const g = audioCtx.createGain();
        g.gain.value = [0.08, 0.05, 0.03][i] || 0.04;
        osc.connect(g).connect(gainNode);
        osc.start();
        return { osc, gain: g };
      });
      isPlaying = true;
      updateMusicUI();
    }

    function stopTrack(keepState) {
      oscNodes.forEach(n => { try { n.osc.stop(); } catch {} });
      oscNodes = [];
      if (!keepState) { isPlaying = false; updateMusicUI(); }
    }

    function updateMusicUI() {
      const title = document.getElementById('swMusicTitle');
      const bars = document.getElementById('swMusicBars');
      const cover = document.getElementById('swMusicCover');
      const playBtn = document.getElementById('swMusicPlay');
      if (title) title.textContent = TRACKS[musicIdx].title;
      if (bars) bars.classList.toggle('playing', isPlaying);
      if (cover) cover.classList.toggle('spinning', isPlaying);
      if (playBtn) playBtn.innerHTML = isPlaying ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';
    }

    sidebar.querySelector('#swMusicPlay')?.addEventListener('click', () => {
      if (isPlaying) stopTrack(); else playTrack();
    });
    sidebar.querySelector('#swMusicPrev')?.addEventListener('click', () => {
      musicIdx = (musicIdx - 1 + TRACKS.length) % TRACKS.length;
      if (isPlaying) playTrack(); else updateMusicUI();
    });
    sidebar.querySelector('#swMusicNext')?.addEventListener('click', () => {
      musicIdx = (musicIdx + 1) % TRACKS.length;
      if (isPlaying) playTrack(); else updateMusicUI();
    });
    updateMusicUI();

    // ========== PIXEL PET ==========
    let petInited = false;
    function initPet() {
      if (petInited) return;
      petInited = true;

      const canvas = document.getElementById('swPetCanvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const W = canvas.width, H = canvas.height;

      let mood = 'idle'; // idle, happy, sleep, play
      let frame = 0, eyeBlink = 0;
      let px = W / 2 - 16, py = H / 2;

      const COLORS = { body: '#FFB347', eye: '#333', nose: '#FF6B6B', mouth: '#333', ear: '#FF9500', blush: 'rgba(255,107,107,0.3)' };

      function drawCat() {
        ctx.clearRect(0, 0, W, H);
        const bounce = mood === 'play' ? Math.sin(frame * 0.3) * 3 : (mood === 'happy' ? Math.sin(frame * 0.15) * 1.5 : 0);
        const cy = py + bounce;

        // Body
        ctx.fillStyle = COLORS.body;
        ctx.beginPath();
        ctx.ellipse(px, cy + 8, 20, 16, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.beginPath();
        ctx.ellipse(px, cy - 10, 16, 14, 0, 0, Math.PI * 2);
        ctx.fill();

        // Ears
        ctx.fillStyle = COLORS.ear;
        ctx.beginPath();
        ctx.moveTo(px - 12, cy - 20);
        ctx.lineTo(px - 6, cy - 32);
        ctx.lineTo(px - 2, cy - 18);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(px + 12, cy - 20);
        ctx.lineTo(px + 6, cy - 32);
        ctx.lineTo(px + 2, cy - 18);
        ctx.fill();

        // Inner ears
        ctx.fillStyle = '#FFD1A4';
        ctx.beginPath();
        ctx.moveTo(px - 10, cy - 21);
        ctx.lineTo(px - 7, cy - 29);
        ctx.lineTo(px - 4, cy - 19);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(px + 10, cy - 21);
        ctx.lineTo(px + 7, cy - 29);
        ctx.lineTo(px + 4, cy - 19);
        ctx.fill();

        // Eyes
        ctx.fillStyle = COLORS.eye;
        if (mood === 'sleep') {
          // Closed eyes
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = COLORS.eye;
          ctx.beginPath();
          ctx.arc(px - 6, cy - 10, 3, 0, Math.PI);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(px + 6, cy - 10, 3, 0, Math.PI);
          ctx.stroke();
          // Zzz
          ctx.font = '10px sans-serif';
          ctx.fillStyle = 'var(--text-tertiary, #aaa)';
          ctx.fillText('z', px + 18, cy - 20 + Math.sin(frame * 0.1) * 3);
          ctx.font = '7px sans-serif';
          ctx.fillText('z', px + 24, cy - 27 + Math.sin(frame * 0.1 + 1) * 2);
        } else if (eyeBlink > 0) {
          ctx.fillRect(px - 8, cy - 11, 4, 1.5);
          ctx.fillRect(px + 4, cy - 11, 4, 1.5);
          eyeBlink--;
        } else {
          const eyeSize = mood === 'happy' ? 3.5 : 3;
          ctx.beginPath();
          ctx.arc(px - 6, cy - 10, eyeSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(px + 6, cy - 10, eyeSize, 0, Math.PI * 2);
          ctx.fill();
          // Eye shine
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(px - 5, cy - 11.5, 1.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(px + 7, cy - 11.5, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Nose
        ctx.fillStyle = COLORS.nose;
        ctx.beginPath();
        ctx.ellipse(px, cy - 5, 2, 1.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Mouth
        ctx.strokeStyle = COLORS.mouth;
        ctx.lineWidth = 1;
        if (mood === 'happy' || mood === 'play') {
          ctx.beginPath();
          ctx.arc(px, cy - 2, 4, 0.1 * Math.PI, 0.9 * Math.PI);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(px - 3, cy - 3);
          ctx.lineTo(px, cy - 2);
          ctx.lineTo(px + 3, cy - 3);
          ctx.stroke();
        }

        // Blush
        if (mood === 'happy') {
          ctx.fillStyle = COLORS.blush;
          ctx.beginPath();
          ctx.ellipse(px - 12, cy - 6, 4, 2.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(px + 12, cy - 6, 4, 2.5, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // Tail
        ctx.strokeStyle = COLORS.body;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        const tailWag = Math.sin(frame * 0.15) * 8;
        ctx.beginPath();
        ctx.moveTo(px + 18, cy + 12);
        ctx.quadraticCurveTo(px + 30 + tailWag, cy + 5, px + 28 + tailWag, cy - 5);
        ctx.stroke();

        // Paws
        ctx.fillStyle = '#FFD1A4';
        ctx.beginPath();
        ctx.ellipse(px - 10, cy + 22, 5, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(px + 10, cy + 22, 5, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        frame++;
        if (frame % 80 === 0 && mood !== 'sleep') eyeBlink = 4;
      }

      let animId;
      function animate() {
        drawCat();
        animId = requestAnimationFrame(animate);
      }
      animate();

      const statusEl = document.getElementById('swPetStatus');
      const zhLang = document.body.getAttribute('data-lang') === 'zh';

      canvas.addEventListener('click', () => {
        const moods = ['happy', 'play', 'sleep', 'idle'];
        const labels = zhLang
          ? ['开心！喵~', '玩耍中...', '困了...zzZ', '发呆中...']
          : ['Happy! Meow~', 'Playing...', 'Sleepy...zzZ', 'Idle...'];
        const idx = moods.indexOf(mood);
        const next = (idx + 1) % moods.length;
        mood = moods[next];
        if (statusEl) statusEl.textContent = labels[next];
      });
    }

    // ========== VISITORS (China Province Map) ==========
    // Track visitor once per page load (POST — records IP, deduplicates on server)
    let visitorTracked = false;
    function trackVisitor() {
      if (visitorTracked) return;
      visitorTracked = true;
      fetch('/api/sidebar/visitors/track', { method: 'POST' }).catch(() => {});
    }
    // Track on first page load
    trackVisitor();

    // China province SVG paths (viewBox 0 0 500 400, from Aliyun GeoJSON)
    const provPaths = {
      '\u5317\u4eac':'M351.7,109.2L353.0,108.6L348.7,108.2L346.7,106.7L346.6,105.6L344.7,106.1L344.9,106.7L343.8,106.5L344.7,107.8L343.1,107.6L342.5,108.6L339.3,109.5L340.9,111.6L336.9,113.4L337.8,115.0L336.8,115.3L337.1,116.3L339.7,117.4L340.5,116.7L342.7,116.8L344.6,117.9L344.3,117.2L345.3,116.7L347.3,116.7L348.6,115.3L347.3,114.5L347.3,113.4L350.6,113.1L352.0,112.2L350.7,110.8L350.6,109.8L351.7,109.2Z',
      '\u5929\u6d25':'M354.9,118.2L355.8,118.1L356.3,116.9L354.1,116.9L352.9,114.4L353.2,113.6L355.2,113.6L353.3,111.8L352.2,111.7L350.5,113.1L350.4,116.3L348.5,115.9L347.3,117.0L348.3,120.4L346.7,121.8L347.0,123.1L349.3,123.6L349.8,124.4L350.6,124.0L351.0,124.7L354.7,123.7L354.0,122.6L355.6,122.4L355.5,120.8L357.3,119.5L355.3,118.4L353.0,118.5L354.9,118.2Z',
      '\u6cb3\u5317':'M352.6,108.7L350.7,110.8L355.0,113.2L353.9,116.7L360.6,122.0L371.4,113.9L363.4,107.3L366.4,103.6L359.5,103.4L355.1,93.6L335.8,101.5L332.3,101.4L331.8,97.2L328.3,98.7L324.2,105.2L329.7,111.0L324.9,113.5L330.0,116.9L322.2,124.6L326.7,131.4L322.4,140.7L336.2,143.4L341.0,134.0L355.0,127.9L354.0,124.1L347.0,123.1L347.5,116.6L336.8,115.5L344.7,106.1L352.6,108.7Z',
      '\u5c71\u897f':'M297.4,154.9L322.7,147.0L321.4,138.8L326.7,131.4L322.2,124.6L330.0,116.9L324.9,113.5L329.7,111.0L326.6,108.0L312.4,111.7L309.5,116.5L303.3,118.1L298.4,127.4L300.6,132.3L297.4,136.4L297.4,154.9Z',
      '\u5185\u8499\u53e4':'M194.5,92.3L203.6,109.3L217.3,106.9L217.8,111.5L212.1,114.5L223.1,118.2L224.1,121.7L230.3,123.9L231.3,120.4L248.4,118.1L249.2,121.4L242.7,128.6L249.1,133.4L261.4,130.4L263.0,122.0L269.1,118.3L270.7,121.7L267.0,126.5L284.9,131.3L295.6,117.8L303.2,118.5L309.5,116.5L312.4,111.7L326.1,109.6L324.6,102.7L330.0,97.3L335.8,101.5L355.1,93.6L359.7,103.6L366.1,103.8L368.5,95.4L373.1,100.7L387.5,93.1L400.2,90.7L398.8,81.8L396.7,79.2L390.1,81.1L389.3,72.1L385.2,69.7L386.7,67.6L393.7,70.0L395.8,63.4L400.7,62.2L398.1,60.1L395.9,62.3L391.2,57.5L405.6,48.4L407.7,51.4L409.8,44.0L413.4,42.4L413.3,36.4L419.6,29.3L412.3,24.5L406.7,27.5L395.8,27.2L394.1,20.0L385.7,19.5L381.6,17.4L385.5,12.5L378.8,12.2L372.6,16.0L378.1,17.8L378.5,20.7L365.5,34.2L367.3,36.0L355.3,40.9L346.8,38.4L337.5,51.3L340.7,54.9L361.2,52.6L371.7,62.7L352.3,63.3L345.7,65.5L342.5,70.2L330.3,72.3L322.7,77.4L310.0,74.7L305.5,80.3L309.6,85.4L290.9,94.7L274.7,94.8L255.5,101.5L223.2,93.2L194.5,92.3Z',
      '\u8fbd\u5b81':'M399.9,115.2L404.7,115.6L416.7,107.7L410.4,89.7L407.2,91.9L401.9,87.0L397.5,92.0L387.5,93.1L373.1,100.7L371.1,96.7L366.4,96.8L367.7,102.4L363.4,107.3L371.2,113.7L381.5,106.9L389.9,109.6L381.9,117.0L385.8,118.8L381.2,123.4L399.9,115.2Z',
      '\u5409\u6797':'M447.2,95.2L449.9,90.6L455.3,95.1L453.5,92.8L459.0,91.4L460.6,86.9L453.5,85.7L453.1,82.7L441.5,86.6L437.6,79.1L433.0,82.5L431.3,78.7L427.3,78.7L426.6,74.4L406.6,72.1L403.2,65.6L394.1,67.2L393.7,70.0L386.7,67.6L385.2,69.7L389.3,72.1L390.1,81.1L396.7,79.2L399.0,87.6L407.2,91.9L410.4,89.7L417.5,104.7L415.9,106.8L426.4,99.8L435.6,103.2L435.0,98.3L447.2,95.2Z',
      '\u9ed1\u9f99\u6c5f':'M400.2,66.1L403.2,65.6L406.6,72.1L426.6,74.4L427.3,78.7L431.3,78.7L433.0,82.5L437.6,79.1L441.5,86.6L453.1,82.7L453.5,85.7L459.2,87.4L457.8,76.6L465.0,72.8L474.8,74.4L482.8,57.6L487.5,54.7L486.8,50.5L490.0,49.2L470.2,54.7L458.0,54.7L455.6,45.8L431.1,38.6L423.5,20.9L416.3,13.8L399.8,10.0L384.0,11.7L386.5,13.8L381.6,17.4L394.1,20.0L395.8,27.2L406.7,27.5L412.3,24.5L419.6,29.3L413.3,36.4L413.4,42.4L409.8,44.0L407.7,51.4L405.6,48.4L391.2,57.5L395.9,62.3L400.5,61.0L395.8,63.4L400.2,66.1Z',
      '\u4e0a\u6d77':'M379.4,182.2L380.1,182.3L380.1,183.6L382.3,184.8L385.5,183.8L387.5,184.1L387.9,183.4L387.8,182.3L385.8,180.1L382.8,178.5L381.0,179.5L380.8,181.2L379.2,181.3L379.4,182.2Z',
      '\u6c5f\u82cf':'M351.4,155.2L347.3,152.0L344.0,154.0L357.7,161.2L356.3,165.4L359.7,169.2L366.0,168.4L359.8,174.2L363.0,180.6L376.3,184.2L383.1,178.2L381.7,176.0L387.7,177.7L379.9,170.1L374.8,157.1L366.4,153.4L366.8,150.9L359.7,156.3L351.4,155.2Z',
      '\u6d59\u6c5f':'M360.2,203.1L363.0,203.5L363.8,209.4L369.3,207.8L376.2,211.9L381.0,204.2L385.4,202.8L384.9,196.4L387.7,197.3L386.6,192.7L389.1,191.0L380.9,186.1L379.8,182.1L376.2,184.2L369.8,181.1L367.7,187.2L363.6,187.6L357.4,195.4L360.2,203.1Z',
      '\u5b89\u5fbd':'M345.9,159.3L342.4,161.7L338.1,159.2L335.8,166.0L332.6,166.1L335.0,170.2L340.5,170.4L340.5,176.2L336.3,179.7L341.6,182.3L339.3,184.8L342.2,191.4L346.4,189.4L346.8,193.3L350.7,190.6L359.2,194.4L369.5,182.2L362.4,180.2L363.5,177.6L359.6,175.3L361.2,170.3L365.2,171.3L366.0,168.4L359.7,169.2L356.3,165.4L357.7,161.2L342.7,155.1L345.9,159.3Z',
      '\u798f\u5efa':'M364.6,228.4L366.3,224.6L371.3,224.7L368.3,223.4L372.0,217.9L369.1,215.8L373.4,215.7L375.7,211.0L369.3,207.8L363.8,209.4L362.4,202.9L351.2,206.3L340.3,228.7L347.5,230.9L352.0,239.3L357.7,231.5L364.6,228.4Z',
      '\u6c5f\u897f':'M358.3,194.6L350.7,190.6L346.8,193.3L346.4,189.4L325.2,197.0L327.6,202.9L322.3,208.8L327.5,219.4L325.2,224.8L331.4,226.1L327.1,230.8L340.0,231.6L345.4,214.4L350.3,210.7L349.0,208.2L360.5,202.8L358.3,194.6Z',
      '\u5c71\u4e1c':'M344.1,154.6L347.3,152.0L350.3,156.1L359.7,156.3L373.8,142.6L392.1,137.3L393.5,133.5L378.1,130.2L367.1,135.7L363.8,127.8L356.0,126.6L347.5,130.1L336.2,139.4L336.2,145.9L342.0,143.3L332.0,151.4L337.7,155.1L344.1,154.6Z',
      '\u6cb3\u5357':'M315.6,172.0L323.3,171.5L324.5,175.9L332.1,178.9L340.5,176.2L340.5,170.4L335.0,170.2L332.6,166.1L335.8,166.0L338.1,159.2L342.4,161.7L346.2,160.2L345.7,157.4L332.0,151.4L342.0,143.3L336.2,145.9L337.0,142.9L323.5,141.4L320.2,148.6L297.4,154.9L304.2,168.0L315.6,172.0Z',
      '\u6e56\u5317':'M302.6,165.8L290.1,165.9L295.7,168.9L290.5,172.4L296.0,181.2L289.4,186.3L282.2,186.3L281.7,191.2L287.7,196.4L301.1,189.1L312.3,193.7L317.0,191.6L318.9,194.2L322.3,191.2L324.6,197.4L342.2,191.4L340.2,181.3L325.5,176.6L323.3,171.5L312.6,172.3L302.6,165.8Z',
      '\u6e56\u5357':'M310.2,230.2L311.5,226.8L316.8,229.0L316.7,225.6L325.2,224.8L327.5,219.4L322.3,208.8L327.6,202.9L326.8,199.0L323.2,197.1L322.3,191.2L318.4,194.3L318.0,191.8L312.3,193.7L298.3,189.6L298.4,192.4L290.0,193.6L290.2,208.6L285.0,212.3L290.3,211.9L288.7,218.1L292.0,221.5L304.4,218.5L306.0,221.7L302.0,228.4L310.2,230.2Z',
      '\u5e7f\u4e1c':'M322.2,249.5L323.5,245.5L329.5,247.8L331.1,245.1L332.5,247.0L345.1,244.0L350.5,239.2L347.5,230.9L340.3,228.7L340.0,231.6L328.7,232.1L326.9,230.6L331.3,227.3L329.8,225.0L319.6,224.3L316.8,229.0L311.5,226.8L305.0,244.3L292.4,254.1L293.7,264.6L298.6,263.2L295.9,259.6L297.7,257.3L322.2,249.5Z',
      '\u5e7f\u897f':'M290.4,220.3L283.7,225.9L281.6,224.1L277.0,227.3L272.6,223.6L263.4,231.0L256.9,228.3L251.7,231.8L263.6,235.2L264.4,239.1L259.9,243.0L269.8,245.0L268.7,251.4L292.8,255.3L305.0,244.3L310.5,232.9L310.2,230.2L305.7,230.8L305.1,227.2L302.0,228.4L306.0,221.7L304.4,218.5L290.4,220.3Z',
      '\u6d77\u5357':'M295.3,266.2L289.0,267.0L283.9,271.4L284.2,278.3L291.2,280.6L298.3,276.7L302.6,268.2L299.8,265.2L295.3,266.2Z',
      '\u91cd\u5e86':'M266.2,201.3L276.9,196.1L287.3,203.9L289.1,197.2L282.2,192.0L282.0,186.7L295.1,183.9L295.4,179.2L282.0,173.3L283.1,177.3L271.5,189.7L261.6,186.8L257.8,193.6L266.2,201.3Z',
      '\u56db\u5ddd':'M225.6,211.4L229.2,218.9L232.9,220.1L239.7,218.0L239.0,210.7L246.5,200.2L251.0,200.5L252.1,206.5L265.6,206.8L260.4,202.8L263.0,199.5L266.2,201.3L258.1,194.3L261.2,190.8L259.6,188.9L261.9,186.7L271.5,189.7L283.1,177.3L280.9,175.0L282.8,172.9L259.1,167.6L252.7,169.7L248.5,162.0L241.2,160.9L239.2,157.1L233.1,159.7L235.8,162.9L233.6,165.4L230.7,166.2L230.9,162.5L221.5,170.7L215.5,166.8L210.8,168.0L204.0,158.8L198.3,158.5L196.0,160.9L199.0,164.0L195.8,167.9L207.8,179.5L205.6,180.9L208.4,184.2L210.0,202.0L211.6,203.9L214.3,198.8L218.9,207.4L221.8,205.9L225.6,211.4Z',
      '\u8d35\u5dde':'M288.8,201.5L284.6,203.6L281.2,197.1L274.5,196.1L268.8,201.9L267.0,198.9L266.0,201.7L260.3,201.3L265.1,207.1L258.2,207.2L254.5,210.7L247.1,209.5L245.8,216.1L251.0,215.2L253.0,217.7L250.1,223.3L254.1,226.4L251.8,230.3L257.1,228.3L263.4,231.0L271.5,223.9L277.6,227.3L289.3,222.6L290.7,212.5L285.0,212.3L290.2,208.6L288.8,201.5Z',
      '\u4e91\u5357':'M257.9,207.6L256.8,204.8L250.8,205.7L251.0,200.5L246.5,200.2L239.0,210.7L239.7,218.0L230.8,220.2L214.3,198.8L211.1,203.6L208.6,196.1L208.5,198.9L205.8,198.0L206.5,203.5L202.0,204.2L203.4,209.0L206.4,208.7L206.4,221.7L198.7,227.6L197.2,236.4L207.7,234.7L207.8,241.9L213.1,244.1L209.9,249.9L216.3,250.7L218.3,255.2L225.3,252.9L226.0,257.0L230.3,257.6L229.5,247.5L236.1,245.2L240.1,247.8L242.4,245.0L247.4,247.3L264.4,239.1L263.2,234.9L252.4,233.0L254.1,226.4L250.1,223.3L252.9,217.3L246.6,216.7L244.6,212.5L247.1,209.5L256.9,210.1L257.9,207.6Z',
      '\u897f\u85cf':'M136.3,143.5L118.5,140.9L93.1,149.1L79.9,146.3L73.8,150.0L64.0,148.4L59.1,155.8L50.2,158.8L55.2,170.2L48.4,170.4L48.4,173.3L52.9,182.0L69.5,189.9L71.7,186.8L77.0,187.4L107.8,206.1L108.9,204.0L120.4,206.8L128.0,204.4L130.7,211.3L136.9,203.5L150.0,205.3L155.0,214.0L166.8,213.3L184.0,203.0L193.6,207.3L197.6,201.2L206.5,203.5L209.1,189.4L205.6,180.9L207.8,179.5L202.6,172.1L195.9,170.4L195.5,174.2L191.0,174.6L191.4,177.2L187.3,175.3L186.5,177.8L174.5,169.6L166.0,171.1L141.4,165.0L135.7,159.1L137.5,153.3L134.3,150.1L137.0,145.3L133.9,144.1L136.3,143.5Z',
      '\u9655\u897f':'M297.4,154.9L297.4,136.4L300.6,132.3L298.4,127.4L303.3,116.8L293.4,119.4L284.9,131.3L273.5,131.9L273.5,137.2L283.9,141.2L283.6,149.3L276.9,149.4L275.1,152.5L267.5,151.2L267.8,162.7L263.0,162.4L262.6,167.1L259.3,168.1L271.6,169.3L291.2,176.8L290.7,171.4L296.0,169.9L290.6,165.3L302.4,164.6L297.4,154.9Z',
      '\u7518\u8083':'M267.2,146.2L266.1,150.0L262.4,148.7L258.4,145.8L256.8,136.6L243.1,130.0L243.1,125.8L249.2,121.4L248.4,118.1L231.3,120.4L230.3,123.9L224.1,121.7L223.1,118.2L212.1,114.5L217.8,111.5L217.3,106.9L203.6,109.3L194.5,92.3L186.1,93.7L185.8,98.8L161.4,109.2L156.8,119.5L187.1,127.8L193.6,124.4L192.8,119.7L201.6,122.9L207.3,120.6L215.1,126.1L232.1,131.0L236.8,135.2L239.5,145.3L231.4,152.8L233.3,157.4L222.5,158.1L225.6,162.1L231.2,162.7L231.0,166.3L235.7,163.7L233.1,159.7L239.2,157.1L241.2,160.9L249.0,162.5L250.0,168.4L257.8,169.7L262.6,167.1L263.0,162.4L267.8,162.7L267.5,151.2L275.1,152.5L276.9,149.4L283.4,149.6L284.4,143.1L268.1,135.5L266.1,140.0L270.6,144.7L267.2,146.2Z',
      '\u9752\u6d77':'M238.5,141.4L232.1,131.0L215.1,126.1L207.3,120.6L201.6,122.9L192.8,119.7L193.6,124.4L187.1,127.8L174.1,126.2L162.8,119.9L139.4,125.2L148.5,135.3L144.2,138.4L147.3,143.3L133.9,144.1L137.0,145.3L134.3,150.1L137.5,153.3L135.7,159.1L141.4,165.0L166.0,171.1L174.5,169.6L186.9,177.8L186.8,175.5L191.4,177.2L191.0,174.6L198.8,170.7L195.8,167.9L199.0,164.0L196.0,160.7L199.3,157.9L204.0,158.8L210.8,168.0L225.5,169.7L225.3,165.4L229.2,166.3L230.4,163.0L225.6,162.1L222.9,157.0L234.1,156.7L231.4,152.8L238.4,147.5L238.5,141.4Z',
      '\u5b81\u590f':'M273.1,135.8L273.5,131.9L276.2,130.1L267.0,126.5L270.7,121.7L269.1,118.3L265.4,119.3L263.0,122.0L261.4,130.4L249.9,133.3L253.0,133.4L252.6,135.0L256.8,136.6L259.5,143.1L258.4,145.8L266.1,150.0L266.6,146.6L270.5,145.6L270.5,143.1L267.2,142.1L266.1,140.0L268.3,138.7L268.0,135.6L273.1,135.8Z',
      '\u65b0\u7586':'M188.3,92.8L180.8,80.8L164.9,75.5L145.4,74.0L146.8,62.3L141.6,55.2L122.8,48.1L121.6,43.5L114.3,43.9L111.9,48.4L104.2,51.0L103.9,59.7L84.2,58.5L78.3,70.7L80.6,73.9L74.6,72.5L59.8,76.1L63.8,78.3L66.9,89.3L62.7,92.0L61.7,98.1L43.3,105.8L37.3,105.4L32.1,111.0L20.5,109.6L10.0,118.3L12.3,124.2L20.6,125.2L22.8,133.8L17.8,136.0L28.5,139.1L30.7,145.5L46.1,148.0L46.7,154.0L52.1,156.7L59.1,155.8L64.0,148.4L73.8,150.0L79.9,146.3L93.1,149.1L118.5,140.9L145.2,144.1L147.3,143.3L144.3,137.9L148.7,135.9L139.4,125.2L157.4,121.2L161.4,109.2L185.8,98.8L185.5,94.2L188.3,92.8Z',
      '\u53f0\u6e7e':'M375.8,247.8L379.2,251.9L388.0,228.2L385.0,226.0L380.3,227.9L373.2,238.1L372.5,242.9L375.8,247.8Z',
      '\u9999\u6e2f':'M325.8,247.3L325.0,247.9L325.8,248.5L324.4,249.7L325.6,249.6L326.1,248.6L327.7,249.6L327.8,248.2L328.7,248.4L328.1,247.5L327.3,247.9L328.3,247.3L327.7,247.0L325.8,247.3Z',
      '\u6fb3\u95e8':'M322.1,250.3L322.5,250.1L322.3,249.7L322.2,249.5L322.0,249.5L322.0,249.8L322.1,250.0L322.1,250.3Z',
    };
    const provCenter = {
      '\u5317\u4eac':[345.1,111.9],'\u5929\u6d25':[352.4,118.7],'\u6cb3\u5317':[343.7,114.5],'\u5c71\u897f':[313.8,127.7],
      '\u5185\u8499\u53e4':[331.8,78.1],'\u8fbd\u5b81':[387.9,105.0],'\u5409\u6797':[424.0,85.1],'\u9ed1\u9f99\u6c5f':[427.0,52.7],
      '\u4e0a\u6d77':[382.8,182.1],'\u6c5f\u82cf':[364.9,165.2],'\u6d59\u6c5f':[373.8,196.2],'\u5b89\u5fbd':[349.4,173.9],
      '\u798f\u5efa':[362.9,220.4],'\u6c5f\u897f':[340.7,208.2],'\u5c71\u4e1c':[355.6,142.9],'\u6cb3\u5357':[330.0,161.5],
      '\u6e56\u5317':[307.5,182.4],'\u6e56\u5357':[309.0,210.8],'\u5e7f\u4e1c':[322.2,241.5],'\u5e7f\u897f':[284.2,232.0],
      '\u6d77\u5357':[293.3,271.1],'\u91cd\u5e86':[278.3,190.2],'\u56db\u5ddd':[236.2,185.0],'\u8d35\u5dde':[268.0,212.4],
      '\u4e91\u5357':[230.7,224.0],'\u897f\u85cf':[135.2,176.8],'\u9655\u897f':[284.1,150.5],'\u7518\u8083':[235.3,137.9],
      '\u9752\u6d77':[190.8,151.0],'\u5b81\u590f':[265.2,135.0],'\u65b0\u7586':[94.0,104.9],'\u53f0\u6e7e':[378.7,238.8],
      '\u9999\u6e2f':[326.7,248.2],'\u6fb3\u95e8':[322.2,249.9],
    };

    /** Render the map + list using given visitor data */
    function renderVisitorMap(data) {
      const totalEl = document.getElementById('swVisitorTotal');
      const listEl = document.getElementById('swVisitorList');
      const mapEl = document.getElementById('swVisitorMap');
      if (totalEl) totalEl.textContent = data.total || 0;
      const provinces = data.provinces || {};

      if (mapEl) {
        const maxCount = Math.max(...Object.values(provinces).map(Number), 1);
        const accentVar = 'var(--accent)';
        let pathsHtml = '';
        let labelsHtml = '';

        for (const name of Object.keys(provPaths)) {
          const d = provPaths[name];
          const count = Number(provinces[name] || 0);
          let fill, strokeW, fOpacity;
          if (count > 0) {
            const intensity = 0.15 + Math.min((count / maxCount) * 0.7, 0.7);
            fill = accentVar; fOpacity = intensity; strokeW = '0.8';
          } else {
            fill = 'var(--text-tertiary)'; fOpacity = 0.08; strokeW = '0.4';
          }
          pathsHtml += `<path d="${d}" fill="${fill}" fill-opacity="${fOpacity}" `
            + `stroke="var(--border)" stroke-width="${strokeW}" `
            + `data-prov="${name}" class="china-prov">`
            + (count > 0 ? `<animate attributeName="fill-opacity" values="${fOpacity};${Math.min(fOpacity+0.12,0.95)};${fOpacity}" dur="3s" repeatCount="indefinite"/>` : '')
            + `</path>`;
        }

        const sortedProvs = Object.entries(provinces)
          .filter(([k]) => k !== '\u672a\u77e5' && k !== '\u6d77\u5916' && provCenter[k])
          .sort((a, b) => Number(b[1]) - Number(a[1]));
        for (const [name, count] of sortedProvs.slice(0, 6)) {
          const c = provCenter[name];
          if (!c) continue;
          labelsHtml += `<text x="${c[0]}" y="${c[1]}" text-anchor="middle" dominant-baseline="central" `
            + `fill="var(--text-primary)" font-size="9" font-weight="600" opacity="0.85">${name}</text>`;
          labelsHtml += `<text x="${c[0]}" y="${c[1]+11}" text-anchor="middle" dominant-baseline="central" `
            + `fill="${accentVar}" font-size="8" font-weight="700" opacity="0.9">${count}</text>`;
        }

        mapEl.innerHTML = `<svg viewBox="0 0 500 400" xmlns="http://www.w3.org/2000/svg" class="china-map-svg">
          <defs><filter id="glow"><feGaussianBlur stdDeviation="3" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
          ${pathsHtml}${labelsHtml}</svg>`;

        // Hover tooltips
        mapEl.querySelectorAll('.china-prov').forEach(el => {
          el.addEventListener('mouseenter', e => {
            const nm = el.getAttribute('data-prov');
            const cnt = provinces[nm] || 0;
            let tip = mapEl.querySelector('.map-tooltip');
            if (!tip) { tip = document.createElement('div'); tip.className = 'map-tooltip'; mapEl.appendChild(tip); }
            tip.textContent = `${nm}: ${cnt} \u8bbf\u5ba2`;
            tip.style.display = 'block';
            const rect = mapEl.getBoundingClientRect();
            const mh = ev => { tip.style.left = (ev.clientX - rect.left + 10) + 'px'; tip.style.top = (ev.clientY - rect.top - 28) + 'px'; };
            el._mh = mh; mapEl.addEventListener('mousemove', mh);
          });
          el.addEventListener('mouseleave', () => {
            const tip = mapEl.querySelector('.map-tooltip');
            if (tip) tip.style.display = 'none';
            if (el._mh) mapEl.removeEventListener('mousemove', el._mh);
          });
        });
      }

      if (listEl) {
        const sorted = Object.entries(provinces)
          .filter(([k]) => k !== '\u672a\u77e5')
          .sort((a, b) => Number(b[1]) - Number(a[1]));
        listEl.innerHTML = sorted.map(([prov, count]) =>
          `<span class="sw-visitor-tag">${prov} <span class="v-count">${count}</span></span>`
        ).join('');
      }
    }

    /** Load visitors data (GET — read-only, always refreshes) */
    async function loadVisitors() {
      try {
        const res = await fetch('/api/sidebar/visitors');
        const data = await res.json();
        renderVisitorMap(data);
      } catch {}
    }

    // ========== GUESTBOOK ==========
    let gbLoaded = false;
    async function loadGuestbook() {
      if (gbLoaded) return;
      gbLoaded = true;
      try {
        const res = await fetch('/api/sidebar/guestbook');
        const data = await res.json();
        renderGbMessages(data.messages || []);
      } catch {}
    }

    function renderGbMessages(msgs) {
      const el = document.getElementById('swGbMessages');
      if (!el) return;
      if (msgs.length === 0) {
        const zhLang = document.body.getAttribute('data-lang') === 'zh';
        el.innerHTML = `<div style="text-align:center;color:var(--text-tertiary);font-size:0.75rem;padding:20px 0">${zhLang ? '还没有留言，来第一个吧！' : 'No messages yet. Be the first!'}</div>`;
        return;
      }
      const latest = msgs.slice(-20).reverse();
      el.innerHTML = latest.map(m => {
        const ago = timeAgoShort(m.time);
        return `<div class="sw-gb-msg"><span class="sw-gb-msg-emoji">${m.emoji || '\uD83D\uDE0A'}</span><span class="sw-gb-msg-text">${escHtml(m.text)}</span><span class="sw-gb-msg-time">${ago}</span></div>`;
      }).join('');
    }

    function timeAgoShort(ts) {
      const diff = (Date.now() - ts) / 1000;
      if (diff < 60) return 'now';
      if (diff < 3600) return Math.floor(diff / 60) + 'm';
      if (diff < 86400) return Math.floor(diff / 3600) + 'h';
      return Math.floor(diff / 86400) + 'd';
    }

    function escHtml(s) {
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // Emoji selector
    sidebar.querySelectorAll('.sw-gb-emoji').forEach(btn => {
      btn.addEventListener('click', () => {
        sidebar.querySelectorAll('.sw-gb-emoji').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Send message
    const gbSendBtn = document.getElementById('swGbSend');
    const gbInput = document.getElementById('swGbInput');
    if (gbSendBtn && gbInput) {
      async function sendMessage() {
        const text = gbInput.value.trim();
        if (!text) return;
        const emoji = sidebar.querySelector('.sw-gb-emoji.active')?.dataset?.emoji || '\uD83D\uDE0A';
        gbSendBtn.disabled = true;
        try {
          const res = await fetch('/api/sidebar/guestbook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, emoji })
          });
          const data = await res.json();
          if (data.ok) {
            gbInput.value = '';
            // Re-fetch all messages
            gbLoaded = false;
            loadGuestbook();
          } else {
            const zhLang = document.body.getAttribute('data-lang') === 'zh';
            alert(data.error || (zhLang ? '发送失败' : 'Send failed'));
          }
        } catch {
          alert('Network error');
        }
        gbSendBtn.disabled = false;
      }

      gbSendBtn.addEventListener('click', sendMessage);
      gbInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendMessage();
      });
    }

    // ========== QUOTE ==========
    let quoteLoaded = false;
    async function loadQuote() {
      try {
        const res = await fetch('/api/sidebar/quote');
        const data = await res.json();
        const textEl = document.getElementById('swQuoteText');
        const authorEl = document.getElementById('swQuoteAuthor');
        if (textEl) textEl.textContent = `"${data.text}"`;
        if (authorEl) authorEl.textContent = `— ${data.author}`;
        quoteLoaded = true;
      } catch {}
    }

    document.getElementById('swQuoteRefresh')?.addEventListener('click', () => {
      loadQuote();
    });
  }

  // Init sidebar on load
  initSidebarWidgets();

})();
