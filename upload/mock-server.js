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

app.post('/api/upload', upload.array('files'), (req, res) => {
  const files = req.files || [];
  const out = files.map(f => ({ originalName: f.originalname, size: f.size, tmpPath: f.path }));
  console.log('Received files:', out);
  res.json({ success: true, uploaded: out });
});

app.get('/', (req, res) => res.send('Mock upload server running'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Mock server listening on http://localhost:${PORT}`));
