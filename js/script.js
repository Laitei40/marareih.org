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

    // On small screens allow tapping the icon to cycle theme (icon-only affordance)
    wrapper.addEventListener('click', (e) => {
      try{
        if (window.innerWidth <= 480) {
          e.preventDefault();
          // cycle: system -> light -> dark -> system
          const cur = getStoredTheme() || 'system';
          const order = ['system','light','dark'];
          const idx = order.indexOf(cur);
          const next = order[(idx + 1) % order.length];
          if (next === 'system') storeTheme(null); else storeTheme(next);
          applyThemeMode(next);
        }
      }catch(err){/* ignore */}
    });

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
  document.addEventListener('DOMContentLoaded', injectDonateControls);

  // Header: subtle load animation and scroll elevation
  function initHeaderEffects(){
    try{
      var header = document.querySelector('.site-header');
      if (!header) return;

      var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // On load, reveal header with a short fade/slide unless reduced motion
      if (!prefersReduced) {
        // small timeout to let initial paint finish
        window.requestAnimationFrame(function(){
          header.setAttribute('data-loaded','');
        });
      } else {
        header.setAttribute('data-loaded','');
      }

      // Add subtle elevation when scrolling past a small threshold
      var lastKnown = 0;
      function onScroll(){
        var y = window.scrollY || window.pageYOffset;
        if (y > 8) header.classList.add('scrolled'); else header.classList.remove('scrolled');
        lastKnown = y;
      }

      // Use passive listener for performance
      window.addEventListener('scroll', onScroll, {passive:true});
      // Ensure initial state is correct
      onScroll();
    }catch(e){console.warn('initHeaderEffects failed', e)}
  }
  document.addEventListener('DOMContentLoaded', initHeaderEffects);

  /* ------------------ Donate (Buy Me a Coffee) injector ------------------ */
  function injectDonateControls(){
    try{
      var DONATE_PAGE = 'donate.html'; // local donate info page
      var DONATE_URL = 'https://www.buymeacoffee.com/mlp'; // external Buy Me a Coffee page
      var navRow = document.querySelector('.nav-row');
      var nav = document.getElementById('primary-navigation') || document.querySelector('.primary-nav');

      // Create a header donate button that is visible only on small screens.
      // We still keep the donate link inside the drawer; the header button provides
      // quick access on mobile without adding a persistent desktop CTA.
      if (navRow) {
        if (!navRow.querySelector('.header-donate')) {
          try {
            var headerDonate = document.createElement('a');
            headerDonate.className = 'donate-btn header-donate';
            headerDonate.href = DONATE_PAGE;
            headerDonate.setAttribute('aria-label','Support Mara Language Preservation — donate or learn how to support');
            headerDonate.innerHTML = '<span class="donate-icon" aria-hidden="true"></span><span class="donate-text">Support MLP</span>';
            var themeWrapper = navRow.querySelector('.theme-switcher');
            if (themeWrapper && themeWrapper.parentElement) navRow.insertBefore(headerDonate, themeWrapper);
            else navRow.appendChild(headerDonate);
          } catch (e) { console.warn('header donate insertion failed', e); }
        }
      }

      // Ensure the donate link is present inside the mobile drawer navigation for easy access
      if (nav) {
        var ul = nav.querySelector('ul');
        if (ul) {
          // avoid adding duplicate drawer donate link
          if (!ul.querySelector('.donate-link-drawer')) {
            var li = document.createElement('li');
            var link = document.createElement('a');
            link.href = DONATE_PAGE;
            link.className = 'donate-link-drawer';
            link.textContent = 'Support MLP';
            link.setAttribute('aria-label','Support Mara Language Preservation — donate or learn how to support');
            li.appendChild(link);
            ul.appendChild(li);
          }
        }
      }

      // NOTE: footer donate element intentionally omitted — use dedicated donate page instead
    }catch(e){ console.warn('injectDonateControls failed', e); }
  }


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

/* ------------------ Upload helpers (site-global) ------------------ */
/**
 * mlpUpload.initUpload(metadata)
 * - metadata: { filename, size, type, category }
 * Returns: { uploadUrl, objectKey, workerPresent }
 *
 * mlpUpload.uploadFile(file, { onProgress }) -> Promise<{ objectKey, status }>
 *
 * Notes:
 * - This helper POSTs to /api/upload/init and then PUTs file bytes to the returned uploadUrl.
 * - Uses XHR for the PUT to report progress via onProgress(percent, loaded, total).
 * - If /api/upload/init is not available or returns HTML, an Error is thrown suggesting to run local mock server or configure the Worker route.
 */
(function(){
  async function initUpload(metadata){
    if (!metadata || typeof metadata.filename !== 'string' || typeof metadata.size !== 'number') {
      throw new Error('initUpload requires metadata with filename (string) and size (number).');
    }
    const res = await fetch('/api/upload/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metadata),
      credentials: 'same-origin'
    }).catch((err)=>{ throw new Error('Network error during upload init: '+err.message); });

    const contentType = res.headers.get('content-type') || '';
    if (!res.ok) {
      // if HTML returned it's likely the route isn't configured
      const text = await res.text().catch(()=>null);
      if (contentType.includes('text/html')) {
        throw new Error('Upload init endpoint returned HTML (likely not configured). Run the local mock server or configure the Worker route.');
      }
      let msg = text || `Upload init failed: ${res.status} ${res.statusText}`;
      throw new Error(msg);
    }

    // parse JSON
    let json = null;
    try { json = await res.json(); } catch (e) { throw new Error('Upload init returned invalid JSON'); }

    if (!json.uploadUrl) throw new Error('Upload init did not return uploadUrl');
    return { uploadUrl: json.uploadUrl, objectKey: json.objectKey, workerPresent: (res.headers.get('X-MLP-Worker') === 'true') };
  }

  function uploadFile(file, options={}) {
    const onProgress = options.onProgress;
    return new Promise(async (resolve, reject) => {
      try {
        const init = await initUpload({ filename: file.name, size: file.size, type: file.type, category: options.category || undefined });

        const xhr = new XMLHttpRequest();
        xhr.open('PUT', init.uploadUrl, true);
        // Set content type if known
        try { if (file.type) xhr.setRequestHeader('Content-Type', file.type); else xhr.setRequestHeader('Content-Type', 'application/octet-stream'); } catch(e){ /* some CORS servers disallow this header; ignore */ }

        xhr.upload.onprogress = function(e){
          if (e.lengthComputable && typeof onProgress === 'function') {
            onProgress(Math.round((e.loaded / e.total) * 100), e.loaded, e.total);
          }
        };

        xhr.onload = function(){
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({ objectKey: init.objectKey, status: xhr.status });
          } else {
            reject(new Error('Upload failed: ' + xhr.status + ' ' + xhr.statusText + ' - ' + (xhr.responseText || '').slice(0,250)));
          }
        };
        xhr.onerror = function(){ reject(new Error('Network error during file upload')); };
        xhr.onabort = function(){ reject(new Error('Upload aborted')); };

        xhr.send(file);
      } catch (err) {
        reject(err);
      }
    });
  }

  // Expose
  window.mlpUpload = {
    initUpload,
    uploadFile
  };
})();

/* ------------------ Upload page behavior (runs only on /upload) ------------------ */
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('uploadForm');
  if (!form) return;

  const fileInput = document.getElementById('fileInput');
  const browseBtn = document.getElementById('browseBtn');
  const dropzone = document.querySelector('.dropzone');
  const fileList = document.getElementById('fileList');
  const uploadBtn = document.getElementById('uploadBtn');

  let selectedFiles = [];
  let uploading = false;

  function updateUI() {
    // render file list
    fileList.innerHTML = '';
    if (selectedFiles.length === 0) {
      fileList.innerHTML = '<div class="muted">No files selected</div>';
    } else {
      selectedFiles.forEach((file, idx) => {
        const item = document.createElement('div');
        item.className = 'file-row';

        const meta = document.createElement('div');
        meta.className = 'file-meta';

        // icon
        const icon = getFileIcon(file);
        icon.classList.add('file-icon');

        // info container
        const info = document.createElement('div');
        info.style.minWidth = '0';
        const name = document.createElement('div');
        name.className = 'file-name';
        name.textContent = file.name;
        const size = document.createElement('div');
        size.className = 'file-size';
        size.textContent = (file.size >= 1024*1024) ? (Math.round(file.size/1024/1024) + ' MB') : (Math.round(file.size/1024) + ' KB');
        info.appendChild(name);
        info.appendChild(size);

        meta.appendChild(icon);
        meta.appendChild(info);

        const remove = document.createElement('button');
        remove.className = 'btn-file-remove';
        remove.type = 'button';
        remove.setAttribute('aria-label', 'Remove ' + file.name);
        remove.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M3 6h18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M8 6v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 11v6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M14 11v6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg> Remove';
        remove.addEventListener('click', () => {
          selectedFiles.splice(idx, 1);
          updateUI();
        });

        item.appendChild(meta);
        item.appendChild(remove);
        fileList.appendChild(item);
      });
    }

    uploadBtn.disabled = selectedFiles.length === 0;
  }

  function handleFiles(list) {
    const arr = Array.from(list || []);
    // basic validation: drop any zero-length files
    arr.forEach(f => { if (f.size > 0) selectedFiles.push(f); });
    updateUI();
  }

  // file input change
  fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
  });

  // browse button opens picker
  browseBtn.addEventListener('click', () => fileInput.click());

  // keyboard activation on dropzone
  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });

  // drag & drop
  ['dragenter','dragover'].forEach(ev => {
    dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
  });
  ['dragleave','dragend','drop'].forEach(ev => {
    dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.remove('dragover'); });
  });
  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length) {
      handleFiles(dt.files);
    }
  });

  // Prevent accidental refresh while uploading
  window.addEventListener('beforeunload', (e) => {
    if (uploading) {
      e.preventDefault();
      e.returnValue = '';
      return '';
    }
  });

  // Upload sequence using mlpUpload.uploadFile helper
  async function performUpload(files, metadata) {
    const uploaded = [];
    let totalBytes = files.reduce((s, f) => s + f.size, 0);
    let totalUploaded = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      progressStatus.textContent = `Preparing upload (${i+1}/${files.length})`;

      try {
        const res = await window.mlpUpload.uploadFile(file, {
          category: metadata.category,
          onProgress: (percent, loaded, total) => {
            const totalSoFar = totalUploaded + (loaded || 0);
            const totalPercent = Math.round((totalSoFar / totalBytes) * 100);
            progressFill.style.width = totalPercent + '%';
            progressPercent.textContent = totalPercent + '%';
            progressBar.setAttribute('aria-valuenow', totalPercent);
            progressStatus.textContent = `Uploading ${file.name} — ${percent}%`;
          }
        });

        totalUploaded += file.size;
        progressStatus.textContent = `Uploaded ${file.name}`;
        uploaded.push({ originalName: file.name, size: file.size, objectKey: res.objectKey });
      } catch (err) {
        throw { error: (err && err.message) ? err.message : (err.error || 'Upload failed') };
      }
    }

    return { success: true, uploaded };
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (selectedFiles.length === 0) return;
    // prepare UI
    uploading = true;
    uploadBtn.disabled = true;
    clearBtn.disabled = true;
    progressFill.style.width = '0%';
    progressPercent.textContent = '0%';
    progressStatus.textContent = 'Starting...';
    statusMessage.textContent = '';

    const metadata = { category: '', description: '', contributor: '' };

    try {
      const result = await performUpload(selectedFiles, metadata);
      // success display
      statusMessage.className = 'status-message success';
      statusMessage.textContent = `Upload successful: ${result.uploaded.length} file(s) saved.`;
      // show uploaded file details
      const summary = result.uploaded.map(u => `${u.originalName} (${humanFileSize(u.size)})`).join(', ');
      const detail = document.createElement('div');
      detail.className = 'muted';
      detail.textContent = summary;
      statusMessage.appendChild(detail);
      // reset selected files
      selectedFiles = [];
      updateUI();
    } catch (err) {
      console.error(err);
      statusMessage.className = 'status-message error';
      statusMessage.textContent = (err && err.error) ? (err.error + '') : 'Upload failed. Please try again.';
    } finally {
      uploading = false;
      uploadBtn.disabled = true;
      clearBtn.disabled = false;
      progressStatus.textContent = uploading ? 'Uploading' : 'Waiting';
    }
  });

  // clear button
  const clearBtn = document.getElementById('clearBtn');
  clearBtn.addEventListener('click', () => {
    if (uploading) return;
    selectedFiles = [];
    updateUI();
    statusMessage.textContent = '';
    progressFill.style.width = '0%';
    progressPercent.textContent = '0%';
  });

  // initial UI
  updateUI();
  // Progress element refs used in performUpload
  const progressBar = document.getElementById('progressBar');
  const progressFill = document.getElementById('progressFill');
  const progressPercent = document.getElementById('progressPercent');
  const progressStatus = document.getElementById('progressStatus');
  const statusMessage = document.getElementById('statusMessage');

  // helper: human readable file sizes
  function humanFileSize(bytes) {
    const thresh = 1024;
    if (Math.abs(bytes) < thresh) return bytes + ' B';
    const units = ['KB','MB','GB','TB','PB','EB','ZB','YB'];
    let u = -1;
    do {
      bytes /= thresh;
      ++u;
    } while(Math.abs(bytes) >= thresh && u < units.length - 1);
    return bytes.toFixed(1)+' '+units[u];
  }

  // file icon helper — returns a DOM element (span) with a small SVG
  function getFileIcon(file) {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const type = file.type || '';
    const el = document.createElement('span');
    el.className = 'file-icon';
    let svg = '';
    if (type.startsWith('audio') || ['mp3','wav','ogg'].includes(ext)) {
      svg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M9 9v6h4l5 4V5l-5 4H9z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    } else if (type.startsWith('image') || ['png','jpg','jpeg','gif'].includes(ext)) {
      svg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M8 14l2.5-3 3 4 2-2 3 3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    } else if (['zip','gz'].includes(ext)) {
      svg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M8 7h8M8 11h8M8 15h5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    } else if (['pdf','doc','docx','txt','csv','json'].includes(ext) || type.includes('text') || ext==='pdf') {
      svg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="1.4"/><path d="M14 2v6h6" stroke="currentColor" stroke-width="1.4"/></svg>';
    } else {
      svg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" stroke-width="1.4"/><path d="M8 12h8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
    }
    el.innerHTML = svg;
    return el;
  }
});
