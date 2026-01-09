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

      const result = await res.json();

      if (res.ok && result.success) {
        statusEl.textContent = 'Message sent successfully ✔';
        form.reset();

        if (window.turnstile?.reset) {
          window.turnstile.reset();
        }
      } else {
        statusEl.textContent = result.error || 'Failed to send message.';
      }
    } catch {
      statusEl.textContent = 'Network error. Please try again later.';
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
})();
