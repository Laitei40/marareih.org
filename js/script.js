// Small JS for nav toggle, reveal-on-scroll animations, and contact form
(function () {
  'use strict';

  /* ------------------ Theme switcher ------------------ */
  const THEME_KEY = 'mlp-theme'; // 'light' | 'dark' | 'system'

  function getStoredTheme() {
    try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
  }

  function storeTheme(value) {
    try { if (value == null) localStorage.removeItem(THEME_KEY); else localStorage.setItem(THEME_KEY, value); } catch (e) { /* ignore */ }
  }

  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  let mqListener = null;

  function applyThemeMode(mode) {
    // mode: 'light' | 'dark' | 'system'
    if (mode === 'system') {
      const useDark = mq.matches;
      document.documentElement.setAttribute('data-theme', useDark ? 'dark' : 'light');

      // listen for changes
      if (!mqListener) {
        mqListener = (e) => document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
        if (mq.addEventListener) mq.addEventListener('change', mqListener);
        else if (mq.addListener) mq.addListener(mqListener);
      }
    } else {
      // remove system listener
      if (mqListener) {
        if (mq.removeEventListener) mq.removeEventListener('change', mqListener);
        else if (mq.removeListener) mq.removeListener(mqListener);
        mqListener = null;
      }
      document.documentElement.setAttribute('data-theme', mode === 'dark' ? 'dark' : 'light');
    }

    // update UI control if present
    const sel = document.getElementById('mlp-theme-select');
    if (sel) sel.value = mode;
    // update wrapper attribute so CSS icon reflects active mode
    const wrapper = document.querySelector('.theme-switcher');
    if (wrapper) {
      if (mode === 'system') wrapper.setAttribute('data-active-theme', 'system');
      else wrapper.setAttribute('data-active-theme', mode === 'dark' ? 'dark' : 'light');
    }
  }

  function initTheme() {
    const stored = getStoredTheme();
    const initial = stored || 'system';
    applyThemeMode(initial);
  }

  /* Inject theme switcher into header (if present) */
  function injectThemeSwitcher() {
    const navRow = document.querySelector('.nav-row');
    if (!navRow) return;

    // create wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'theme-switcher';

    const label = document.createElement('label');
    label.setAttribute('for', 'mlp-theme-select');
    label.textContent = '';
    label.className = 'sr-only';
    label.textContent = 'Theme';

    const select = document.createElement('select');
    select.id = 'mlp-theme-select';
    select.setAttribute('aria-label', 'Select theme — Light, Dark, or System');

    const optSystem = document.createElement('option'); optSystem.value = 'system'; optSystem.textContent = 'System';
    const optLight = document.createElement('option'); optLight.value = 'light'; optLight.textContent = 'Light';
    const optDark = document.createElement('option'); optDark.value = 'dark'; optDark.textContent = 'Dark';

    select.appendChild(optSystem);
    select.appendChild(optLight);
    select.appendChild(optDark);

    select.addEventListener('change', (e) => {
      const v = e.target.value;
      if (v === 'system') storeTheme(null); else storeTheme(v);
      applyThemeMode(v);
    });

    wrapper.appendChild(label);
    wrapper.appendChild(select);

    // append to nav-row (right side) as last child
    navRow.appendChild(wrapper);

    // set control to current value and mark wrapper state for icons
    const stored = getStoredTheme() || 'system';
    select.value = stored;
    wrapper.setAttribute('data-active-theme', stored);
  }

  // initialize theme and UI
  initTheme();
  // try to inject switcher (pages without nav-row will just skip)
  document.addEventListener('DOMContentLoaded', injectThemeSwitcher);


  /* ------------------ Mobile nav toggle ------------------ */
  const navToggle = document.querySelector('.nav-toggle');
  const nav =
    document.getElementById('primary-navigation') ||
    document.querySelector('.primary-nav');
  const navRowEl = document.querySelector('.nav-row');

  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('open');
      if (navRowEl) navRowEl.classList.toggle('nav-open', isOpen);
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });

    // Close mobile nav when a navigation link is clicked (improves tap behavior)
    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        if (nav.classList.contains('open')) {
          nav.classList.remove('open');
          if (navRowEl) navRowEl.classList.remove('nav-open');
          navToggle.setAttribute('aria-expanded', 'false');
        }
      });
    });
  }

  /* ------------------ Reveal on scroll ------------------ */
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if ('IntersectionObserver' in window && !prefersReduced) {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    document.querySelectorAll('[data-anim]').forEach((el) => obs.observe(el));
  } else {
    document.querySelectorAll('[data-anim]').forEach((el) =>
      el.classList.add('in-view')
    );
  }

  /* ------------------ Contact form ------------------ */
  const form = document.getElementById('contactForm');
  const statusEl = document.getElementById('formStatus');

  if (!form || !statusEl) return; // ✅ prevent errors on other pages

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const token = document.querySelector(
      'input[name="cf-turnstile-response"]'
    )?.value;

    if (!token) {
      statusEl.textContent = 'Please complete the verification.';
      return;
    }

    const payload = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      message: form.message.value.trim(),
      token
    };

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    statusEl.textContent = 'Sending…';

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // Try to parse JSON, but fall back to text if response isn't JSON
      let result = null;
      let text = null;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          result = await res.json();
        } catch (err) {
          console.error('Failed to parse JSON response', err);
          text = await res.text().catch(() => null);
        }
      } else {
        text = await res.text().catch(() => null);
      }

      // Log for debugging
      console.debug('Contact response', { status: res.status, headers: Object.fromEntries(res.headers), json: result, text });

      if (res.ok && result && result.success) {
        statusEl.textContent = 'Message sent successfully ✔';
        form.reset();

        if (window.turnstile?.reset) {
          window.turnstile.reset();
        }
      } else {
        // Prefer server-provided message, then text, then generic
        let msg = (result && (result.error || result.message)) || (result && result.verify && 'Verification failed') || text || 'Failed to send message.';

        // If Turnstile verification error codes are present, give a specific instruction and reset widget
        if (result && result.verify && Array.isArray(result.verify['error-codes'])) {
          const codes = result.verify['error-codes'];
          if (codes.includes('timeout-or-duplicate') || codes.includes('invalid-input-response')) {
            msg = 'Verification expired or invalid. Please complete the Turnstile verification again.';

            // Reset the widget so the user can re-verify
            if (window.turnstile && typeof window.turnstile.reset === 'function') {
              try { window.turnstile.reset(); } catch (e) { console.warn('turnstile.reset() failed', e); }
            }
          } else if (codes.includes('invalid-input-secret')) {
            msg = 'Server configuration error: Turnstile secret invalid. Please contact the site admin.';
          }
        }

        // If provider details are present, append a short hint (non-sensitive)
        if (result && result.provider) {
          const p = result.provider;
          const snippet = p.textSnippet || (typeof p.json === 'object' ? JSON.stringify(p.json).slice(0,120) : null);
          msg += snippet ? ` (provider: ${p.status} ${p.statusText} - ${snippet})` : ` (provider: ${p.status} ${p.statusText})`;
        }

        statusEl.textContent = msg;
      }
    } catch (err) {
      console.error('Contact submit failed', err);
      statusEl.textContent = `Network error. ${String(err).slice(0,120)}`;
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
})();
