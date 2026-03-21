// ========================================
// PORTAL — Frontend Interactions (with i18n)
// ========================================

(() => {
  'use strict';

  // === Get current language from body data attribute ===
  const lang = document.body.getAttribute('data-lang') || 'zh';

  // === Theme Toggle ===
  const themeToggle = document.getElementById('themeToggle');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

  function getTheme() {
    return localStorage.getItem('portal-theme') || (prefersDark.matches ? 'dark' : 'light');
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('portal-theme', theme);
    const icon = themeToggle?.querySelector('i');
    if (icon) {
      icon.className = theme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    }
  }

  setTheme(getTheme());

  themeToggle?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    setTheme(current === 'dark' ? 'light' : 'dark');
  });

  // === Language Toggle — intercept click and use JS to set cookie + reload ===
  const langToggle = document.getElementById('langToggle');
  if (langToggle) {
    langToggle.addEventListener('click', (e) => {
      e.preventDefault();
      const newLang = lang === 'zh' ? 'en' : 'zh';
      document.cookie = `portal_lang=${newLang}; path=/; max-age=${365 * 24 * 3600}; samesite=lax`;
      window.location.reload();
    });
  }

  // === Live Clock (locale-aware) ===
  function updateTime() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');

    const hourEl = document.querySelector('.time-hour');
    const minEl = document.querySelector('.time-min');
    const dateEl = document.getElementById('dateDisplay');

    if (hourEl) hourEl.textContent = h;
    if (minEl) minEl.textContent = m;

    if (dateEl) {
      if (lang === 'zh') {
        const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
        dateEl.textContent = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${weekdays[now.getDay()]}`;
      } else {
        const options = { weekday: 'long', month: 'long', day: 'numeric' };
        dateEl.textContent = now.toLocaleDateString('en-US', options);
      }
    }
  }

  updateTime();
  setInterval(updateTime, 1000);

  // === Smooth Scroll for nav links ===
  document.querySelectorAll('.nav-link[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const id = link.getAttribute('href');
      const target = document.querySelector(id);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // === Card hover tilt effect ===
  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -2;
      const rotateY = ((x - centerX) / centerX) * 2;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });

  // === Animate stat numbers on scroll ===
  function animateCountUp(el, target) {
    let current = 0;
    const step = Math.max(1, Math.ceil(target / 40));
    const interval = setInterval(() => {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(interval);
      }
      el.textContent = current;
    }, 30);
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const nums = entry.target.querySelectorAll('.stat-num');
        nums.forEach(n => {
          const target = parseInt(n.textContent, 10);
          if (!isNaN(target) && !n.dataset.animated) {
            n.dataset.animated = 'true';
            animateCountUp(n, target);
          }
        });
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  const statsCard = document.querySelector('.card-stats');
  if (statsCard) observer.observe(statsCard);

  // === Download button click feedback ===
  const preparingText = lang === 'zh' ? '准备中...' : 'Preparing...';
  const readyText = lang === 'zh' ? '完成!' : 'Ready!';

  document.querySelectorAll('.download-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const icon = btn.querySelector('i');
      const text = btn.querySelector('span');
      if (icon && text) {
        const origIcon = icon.className;
        const origText = text.textContent;
        icon.className = 'fa-solid fa-spinner fa-spin';
        text.textContent = preparingText;

        setTimeout(() => {
          icon.className = 'fa-solid fa-check';
          text.textContent = readyText;
          setTimeout(() => {
            icon.className = origIcon;
            text.textContent = origText;
          }, 1500);
        }, 1000);
      }
    });
  });

})();
