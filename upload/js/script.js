document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('uploadForm');
  if (!form) return;

  const fileInput = document.getElementById('fileInput');
  const browseBtn = document.getElementById('browseBtn');
  const dropzone = document.querySelector('.dropzone');
  const fileList = document.getElementById('fileList');
  const uploadBtn = document.getElementById('uploadBtn');
  const clearBtn = document.getElementById('clearBtn');

  const progressBar = document.getElementById('progressBar');
  const progressFill = document.getElementById('progressFill');
  const progressPercent = document.getElementById('progressPercent');
  const progressStatus = document.getElementById('progressStatus');
  const statusMessage = document.getElementById('statusMessage');

  const API_BASE = 'https://mlp-uploads.teiteipara.workers.dev';

  let selectedFiles = [];
  let uploading = false;

  /* ---------------- UI helpers ---------------- */

  function updateUI() {
    fileList.innerHTML = '';

    if (selectedFiles.length === 0) {
      fileList.innerHTML = '<div class="muted">No files selected</div>';
    } else {
      selectedFiles.forEach((file, idx) => {
        const row = document.createElement('div');
        row.className = 'file-row';

        const meta = document.createElement('div');
        meta.className = 'file-meta';

        const icon = getFileIcon(file);
        icon.classList.add('file-icon');

        const info = document.createElement('div');
        const name = document.createElement('div');
        name.className = 'file-name';
        name.textContent = file.name;

        const size = document.createElement('div');
        size.className = 'file-size';
        size.textContent = humanFileSize(file.size);

        info.append(name, size);
        meta.append(icon, info);

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'btn-file-remove';
        removeBtn.textContent = 'Remove';
        removeBtn.onclick = () => {
          selectedFiles.splice(idx, 1);
          updateUI();
        };

        row.append(meta, removeBtn);
        fileList.appendChild(row);
      });
    }

    uploadBtn.disabled = selectedFiles.length === 0 || uploading;
  }

  function resetProgress() {
    progressFill.style.width = '0%';
    progressPercent.textContent = '0%';
    progressStatus.textContent = 'Idle';
    progressBar.setAttribute('aria-valuenow', '0');
  }

  function handleFiles(files) {
    Array.from(files).forEach(f => {
      if (f.size > 0) selectedFiles.push(f);
    });
    updateUI();
  }

  /* ---------------- Events ---------------- */

  fileInput.addEventListener('change', e => handleFiles(e.target.files));
  browseBtn.addEventListener('click', () => fileInput.click());

  ['dragenter', 'dragover'].forEach(e =>
    dropzone.addEventListener(e, ev => {
      ev.preventDefault();
      dropzone.classList.add('dragover');
    })
  );

  ['dragleave', 'drop'].forEach(e =>
    dropzone.addEventListener(e, ev => {
      ev.preventDefault();
      dropzone.classList.remove('dragover');
    })
  );

  dropzone.addEventListener('drop', e => {
    if (e.dataTransfer.files.length) {
      handleFiles(e.dataTransfer.files);
    }
  });

  clearBtn.addEventListener('click', () => {
    if (uploading) return;
    selectedFiles = [];
    statusMessage.textContent = '';
    resetProgress();
    updateUI();
  });

  window.addEventListener('beforeunload', e => {
    if (uploading) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  /* ---------------- Upload logic ---------------- */

  async function performUpload(files) {
    const fd = new FormData();
    files.forEach(f => fd.append('file', f));

    progressStatus.textContent = 'Uploading…';

    const res = await fetch(`${API_BASE}/api/upload`, {
      method: 'POST',
      body: fd,
      credentials: 'omit'
    });

    const text = await res.text();
    let json = {};
    try { json = JSON.parse(text); } catch {}

    if (!res.ok) {
      throw new Error(json.error || `HTTP ${res.status}`);
    }

    return json;
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (selectedFiles.length === 0) return;

    uploading = true;
    uploadBtn.disabled = true;
    clearBtn.disabled = true;
    resetProgress();
    progressStatus.textContent = 'Starting…';
    statusMessage.textContent = '';

    try {
      const result = await performUpload(selectedFiles);

      progressFill.style.width = '100%';
      progressPercent.textContent = '100%';
      progressBar.setAttribute('aria-valuenow', '100');

      statusMessage.className = 'status-message success';
      statusMessage.textContent = `Upload successful (${selectedFiles.length} file(s))`;

      selectedFiles = [];
      updateUI();
    } catch (err) {
      console.error(err);
      statusMessage.className = 'status-message error';
      statusMessage.textContent = `Upload failed: ${err.message}`;
    } finally {
      uploading = false;
      uploadBtn.disabled = true;
      clearBtn.disabled = false;
      progressStatus.textContent = 'Idle';
    }
  });

  /* ---------------- Utilities ---------------- */

  function humanFileSize(bytes) {
    const thresh = 1024;
    if (bytes < thresh) return bytes + ' B';
    const units = ['KB','MB','GB','TB'];
    let u = -1;
    do {
      bytes /= thresh;
      ++u;
    } while (bytes >= thresh && u < units.length - 1);
    return bytes.toFixed(1) + ' ' + units[u];
  }

  function getFileIcon(file) {
    const span = document.createElement('span');
    span.innerHTML = '📄';
    return span;
  }

  /* ---------------- Init ---------------- */

  resetProgress();
  updateUI();
});
