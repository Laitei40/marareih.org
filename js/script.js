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


  /* ------------------ Mobile drawer navigation ------------------ */
  (function initDrawerNav(){
    const navToggle = document.querySelector('.nav-toggle');
    const nav = document.getElementById('primary-navigation') || document.querySelector('.primary-nav');
    const navRow = document.querySelector('.nav-row');
    if (!navToggle || !nav || !navRow) return;

    // Create backdrop element
    let backdrop = document.querySelector('.mobile-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'mobile-backdrop';
      document.body.appendChild(backdrop);
    }

    // Create a close button inside nav for accessibility
    let closeBtn = nav.querySelector('.drawer-close');
    if (!closeBtn) {
      closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'drawer-close';
      closeBtn.setAttribute('aria-label','Close navigation');
      closeBtn.innerHTML = '&times;';
      // insert at top of nav
      nav.insertBefore(closeBtn, nav.firstChild);
    }

    // Save original parent so we can restore nav after closing (prevents ancestor stacking context issues)
    const originalParent = nav.parentElement;
    const originalNext = nav.nextSibling;


    let prevFocus = null;

    function moveNavToBody(){
      try{
        if (nav.parentElement !== document.body) {
          document.body.appendChild(nav);
        }
      }catch(e){/* ignore */}
    }

    function moveNavBack(){
      try{
        if (originalParent && nav.parentElement !== originalParent) {
          if (originalNext) originalParent.insertBefore(nav, originalNext);
          else originalParent.appendChild(nav);
        }
      }catch(e){/* ignore */}
    }

    function openDrawer(){
      // move nav to body so it's not clipped by header or transformed ancestors
      moveNavToBody();
      prevFocus = document.activeElement;
      nav.classList.add('open');
      navRow.classList.add('nav-open');
      backdrop.classList.add('show');
      document.body.classList.add('no-scroll');
      navToggle.setAttribute('aria-expanded','true');
      // focus close button for keyboard users
      closeBtn.focus();
      // attach escape handler
      document.addEventListener('keydown', onKeydown);
    }

    function closeDrawer(){
      nav.classList.remove('open');
      navRow.classList.remove('nav-open');
      backdrop.classList.remove('show');
      document.body.classList.remove('no-scroll');
      navToggle.setAttribute('aria-expanded','false');
      // restore nav to its original location so desktop layout remains consistent
      moveNavBack();
      // restore focus
      try{ if (prevFocus && typeof prevFocus.focus === 'function') prevFocus.focus(); } catch(e){}
      document.removeEventListener('keydown', onKeydown);
    }

    function onKeydown(e){
      if (e.key === 'Escape') closeDrawer();
    }

    // Toggle handler
    navToggle.addEventListener('click', (e) => {
      if (nav.classList.contains('open')) closeDrawer(); else openDrawer();
    });

    // Close when backdrop clicked
    backdrop.addEventListener('click', closeDrawer);

    // Close when close button clicked
    closeBtn.addEventListener('click', closeDrawer);

    // Close when a navigation link is tapped — allow navigation to proceed
    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        // small timeout to allow navigation to start, but close immediately
        setTimeout(closeDrawer, 50);
      });
    });

  })();

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

/* ------------------ Cookie consent banner ------------------ */
(function cookieConsent(){
  try{
    var CONSENT_KEY = 'mlp-consent';
    if (localStorage.getItem(CONSENT_KEY) === 'accepted') return;

    // create banner
    var banner = document.createElement('div');
    banner.className = 'cookie-consent-banner';
    banner.setAttribute('role','region');
    banner.setAttribute('aria-label','Cookie consent');

    var inner = document.createElement('div');
    inner.className = 'inner container';

    var msg = document.createElement('p');
    msg.innerHTML = 'This website uses cookies or local storage to remember your preferences and improve your experience. <a href="privacy-policy.html">Privacy policy</a>';

    var btn = document.createElement('button');
    btn.className = 'btn-accept';
    btn.type = 'button';
    btn.textContent = 'Accept';
    btn.setAttribute('aria-label','Accept cookies');

    inner.appendChild(msg);
    inner.appendChild(btn);
    banner.appendChild(inner);
    document.body.appendChild(banner);

    // focus accept for keyboard users
    btn.focus();

    function accept(){
      try{ localStorage.setItem(CONSENT_KEY,'accepted'); }catch(e){}
      // remove banner
      if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
    }

    btn.addEventListener('click', accept, { once: true });

    // allow keyboard Enter/Space on the button
    btn.addEventListener('keydown', function(e){ if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); accept(); } });
  }catch(e){ console.warn('cookieConsent failed', e); }
})();
