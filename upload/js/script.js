document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('uploadForm');
  if (!form) return;

  const fileInput = document.getElementById('fileInput');
  const browseBtn = document.getElementById('browseBtn');
  const dropzone = document.querySelector('.dropzone');
  const fileList = document.getElementById('fileList');
  const uploadBtn = document.getElementById('uploadBtn');
  const progressEl = document.getElementById('uploadProgress');
  const progressText = document.getElementById('progressText');

  let selectedFiles = [];

  function updateUI() {
    // render file list
    fileList.innerHTML = '';
    if (selectedFiles.length === 0) {
      fileList.innerHTML = '<div class="meta alt">No files selected</div>';
    } else {
      selectedFiles.forEach((file, idx) => {
        const item = document.createElement('div');
        item.className = 'file-item';

        const meta = document.createElement('div');
        meta.className = 'file-meta';
        const name = document.createElement('div');
        name.className = 'file-name';
        name.textContent = file.name;
        const size = document.createElement('div');
        size.className = 'file-size';
        size.textContent = (file.size >= 1024*1024) ? (Math.round(file.size/1024/1024) + ' MB') : (Math.round(file.size/1024) + ' KB');
        meta.appendChild(name);
        meta.appendChild(size);

        const remove = document.createElement('button');
        remove.className = 'file-remove';
        remove.type = 'button';
        remove.setAttribute('aria-label', 'Remove ' + file.name);
        remove.textContent = 'Remove';
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

  // Upload sequence: sends all selected files + metadata to the Worker endpoint '/api/upload'
  // Uses XMLHttpRequest for upload progress events. The Worker will validate and store files in R2.
  function performUpload(files, metadata) {
    return new Promise((resolve, reject) => {
      const fd = new FormData();
      files.forEach((f) => fd.append('file', f, f.name));
      // include metadata fields
      Object.keys(metadata || {}).forEach(k => { if (metadata[k]) fd.append(k, metadata[k]); });

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload', true);

      xhr.setRequestHeader('Accept', 'application/json');

      xhr.upload.onprogress = function (e) {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          progressEl.value = percent;
          progressText.textContent = `${percent}%`;
        } else {
          progressText.textContent = 'Uploading...';
        }
      };

      xhr.onload = function () {
        try {
          const json = JSON.parse(xhr.responseText || '{}');
          if (xhr.status >= 200 && xhr.status < 300 && json.success) {
            progressEl.value = 100;
            progressText.textContent = 'Upload complete';
            resolve(json);
          } else {
            progressText.textContent = 'Upload failed';
            reject(json || { error: 'Upload failed', status: xhr.status });
          }
        } catch (err) {
          reject({ error: 'Invalid JSON response', details: err.message });
        }
      };

      xhr.onerror = function () { reject({ error: 'Network error' }); };
      xhr.onabort = function () { reject({ error: 'Upload aborted' }); };

      xhr.send(fd);
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (selectedFiles.length === 0) return;
    uploadBtn.disabled = true;
    const metadata = {
      category: document.getElementById('category').value,
      description: document.getElementById('description').value,
      contributor: document.getElementById('contributor').value
    };

    try {
      await performUpload(selectedFiles, metadata);
    } catch (err) {
      progressText.textContent = 'Upload failed: ' + (err.message || err);
    } finally {
      uploadBtn.disabled = false;
    }
  });

  // initial UI
  updateUI();
});
