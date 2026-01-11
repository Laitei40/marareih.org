const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: path.join(__dirname, 'tmp-uploads') });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the `upload` directory so the UI can be opened
// via http://localhost:3000/upload/index.html during local testing.
app.use('/upload', express.static(__dirname));

// Also serve project-root static assets so the upload page can load site-root
// resources (e.g. /js/script.js, /css/upload.css, /assets/...) when testing locally.
app.use('/js', express.static(path.join(__dirname, '..', 'js')));
app.use('/css', express.static(path.join(__dirname, '..', 'css')));
app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));

// Also expose the project root for convenience so absolute site-root paths resolve
// during local testing (serves index.html, other pages, etc.)
app.use('/', express.static(path.join(__dirname, '..')));

app.post('/api/upload', upload.array('file'), (req, res) => {
  const files = req.files || [];
  const out = files.map(f => ({ originalName: f.originalname, size: f.size, tmpPath: f.path }));
  console.log('Received files:', out);
  res.json({ success: true, uploaded: out });
});

// Removed signed-init endpoint; UI posts multipart/form-data to POST /api/upload directly to the Worker.

// Handle direct PUT to mock-upload path (simulates R2 PUT) — kept for legacy testing if needed
app.put('/mock-upload/:objectKey', (req, res) => {
  const objectKey = req.params.objectKey;
  const saveDir = path.join(__dirname, 'tmp-uploads');
  if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir, { recursive: true });

  const filename = objectKey.split('/').pop() || `upload-${Date.now()}`;
  const outPath = path.join(saveDir, filename);
  const writeStream = fs.createWriteStream(outPath);

  let size = 0;
  req.on('data', chunk => { size += chunk.length; writeStream.write(chunk); });
  req.on('end', () => {
    writeStream.end();
    console.log(`Saved mock-upload ${objectKey} -> ${outPath} (${size} bytes)`);
    res.status(200).json({ success: true, objectKey, savedTo: outPath, size });
  });
  req.on('error', (err) => {
    writeStream.destroy();
    res.status(500).json({ success: false, error: String(err) });
  });
});

app.get('/', (req, res) => res.send('Mock upload server running'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Mock server listening on http://localhost:${PORT}`));
