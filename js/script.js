// Small JS for nav toggle, reveal-on-scroll animations, and contact form
(function () {
  'use strict';

  /* ------------------ Mobile nav toggle ------------------ */
  const navToggle = document.querySelector('.nav-toggle');
  const nav =
    document.getElementById('primary-navigation') ||
    document.querySelector('.primary-nav');

  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });

    // Close mobile nav when a navigation link is clicked (improves tap behavior)
    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        if (nav.classList.contains('open')) {
          nav.classList.remove('open');
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
