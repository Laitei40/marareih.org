// Small JS for nav toggle and reveal-on-scroll animations
(function(){
  'use strict';

  // Mobile nav toggle
  const navToggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('primary-navigation') || document.querySelector('.primary-nav');
  if(navToggle && nav){
    navToggle.addEventListener('click', function(){
      const isOpen = nav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }

  // Simple reveal on scroll using IntersectionObserver
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if('IntersectionObserver' in window && !prefersReduced){
    const obs = new IntersectionObserver((entries)=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          entry.target.classList.add('in-view');
          obs.unobserve(entry.target);
        }
      });
    },{threshold:0.12});

    document.querySelectorAll('[data-anim]').forEach(el=>obs.observe(el));
  } else {
    // If no observer or reduced motion, just show all
    document.querySelectorAll('[data-anim]').forEach(el=>el.classList.add('in-view'));
  }

  // Contact form: ensure Turnstile token exists before submit (client-side check)
  const contactForm = document.getElementById('contactForm');
  if(contactForm){
    contactForm.addEventListener('submit', function(e){
      const tokenField = contactForm.querySelector('[name="cf-turnstile-response"]');
      if(!tokenField || !tokenField.value || !tokenField.value.trim()){
        e.preventDefault();
        // Attempt to focus the Turnstile iframe if present
        const frame = document.querySelector('.cf-turnstile iframe');
        if(frame) frame.focus();
        alert('Please complete the anti-bot check (Cloudflare Turnstile) before submitting.');
        return false;
      }
    });
  }

  // Update year placeholders
  const y = new Date().getFullYear();
  ['year','year2','year3','year4'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.textContent = y;
  });
})();

const form = document.getElementById("contactForm");
const statusEl = document.getElementById("formStatus");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const token = document.querySelector(
    'input[name="cf-turnstile-response"]'
  )?.value;

  if (!token) {
    statusEl.textContent = "Please complete the verification.";
    return;
  }

  const data = {
    name: form.name.value,
    email: form.email.value,
    message: form.message.value,
    token
  };

  statusEl.textContent = "Sending…";

  try {
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const result = await res.json();

    if (result.success) {
      statusEl.textContent = "Message sent successfully ✔";
      form.reset();
      turnstile.reset();
    } else {
      statusEl.textContent = result.error || "Failed to send.";
    }
  } catch {
    statusEl.textContent = "Network error. Try again later.";
  }
});
