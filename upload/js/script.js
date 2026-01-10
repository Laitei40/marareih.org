document.addEventListener('DOMContentLoaded', function () {
  const form = document.querySelector('.upload-form');
  if (!form) return;
  const fileInput = form.querySelector('input[type="file"]');
  const status = document.createElement('div');
  status.className = 'upload-status';
  form.appendChild(status);
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!fileInput.files || fileInput.files.length === 0) {
      status.textContent = 'Please choose a file to upload.';
      return;
    }
    const name = fileInput.files[0].name;
    status.textContent = 'Uploading "' + name + '" (demo)...';
    setTimeout(function () { status.textContent = 'Upload complete (demo).'; }, 800);
  });
});
