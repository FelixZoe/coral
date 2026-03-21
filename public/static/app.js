// ========================================
// PORTAL — Frontend Interactions
// ========================================

(() => {
  'use strict';

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

  // === Live Clock ===
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
      const options = { weekday: 'long', month: 'long', day: 'numeric' };
      dateEl.textContent = now.toLocaleDateString('en-US', options);
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
  document.querySelectorAll('.download-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      // show a brief "downloading" state
      const icon = btn.querySelector('i');
      const text = btn.querySelector('span');
      if (icon && text) {
        const origIcon = icon.className;
        const origText = text.textContent;
        icon.className = 'fa-solid fa-spinner fa-spin';
        text.textContent = 'Preparing...';

        setTimeout(() => {
          icon.className = 'fa-solid fa-check';
          text.textContent = 'Ready!';
          setTimeout(() => {
            icon.className = origIcon;
            text.textContent = origText;
          }, 1500);
        }, 1000);
      }
    });
  });

})();
