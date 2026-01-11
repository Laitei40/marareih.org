document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('uploadForm');
  if (!form) return;

  const fileInput = document.getElementById('fileInput');
  const browseBtn = document.getElementById('browseBtn');
  const dropzone = document.querySelector('.dropzone');
  const fileList = document.getElementById('fileList');
  const uploadBtn = document.getElementById('uploadBtn');
  // legacy placeholders removed: using dedicated progress elements below

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

  // API base — replace YOUR_USERNAME with your Cloudflare Workers account name
  // Example: const API_BASE = 'https://mlp-uploads.alice.workers.dev'
  const API_BASE = 'https://mlp-uploads.YOUR_USERNAME.workers.dev';

  // Upload sequence — POST FormData directly to the standalone Worker
  async function performUpload(files, metadata) {
    // Create a single FormData and append all files + optional metadata
    const fd = new FormData();
    files.forEach(f => fd.append('file', f));
    if (metadata && typeof metadata === 'object') {
      Object.keys(metadata).forEach(k => {
        if (metadata[k]) fd.append(k, metadata[k]);
      });
    }

    progressStatus.textContent = 'Uploading...';

    try {
      const res = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        body: fd,
        credentials: 'omit'
      });

      const text = await res.text();
      let json = {};
      try { json = text ? JSON.parse(text) : {}; } catch (e) { json = {}; }

      if (!res.ok) {
        const msg = json && json.error ? json.error : (text || `HTTP ${res.status}`);
        throw { error: `Upload failed: ${msg}` };
      }

      const uploaded = (json && Array.isArray(json.uploaded) && json.uploaded.length) ? json.uploaded : files.map(f => ({ originalName: f.name, size: f.size }));
      // set progress to complete
      progressFill.style.width = '100%';
      progressPercent.textContent = '100%';
      progressBar.setAttribute('aria-valuenow', 100);
      progressStatus.textContent = `Uploaded`;
      return { success: true, uploaded, raw: json };
    } catch (err) {
      throw err;
    }
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
