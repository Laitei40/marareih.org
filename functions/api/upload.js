// Pages Function: POST /api/upload
// Purpose: Handle multipart/form-data uploads and store files in R2 via the
// MLP_UPLOADS binding. This function is used by Cloudflare Pages (Functions)
// rather than a standalone Worker. Pages Functions are the recommended way
// to implement API endpoints for Pages sites because they run next to your
// static assets and avoid accidentally proxying or serving static files.

const DEFAULT_MAX_BYTES = 50 * 1024 * 1024; // 50 MB

export async function onRequestOptions({ request }) {
  // Simple CORS preflight response
  return new Response(null, { status: 204, headers: cors() });
}

export async function onRequestPost({ request, env }) {
  try {
    // Accept only multipart/form-data
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return json({ success: false, error: 'Expected multipart/form-data' }, 400);
    }

    const form = await request.formData();

    // Support multiple files under the 'file' field (fd.append('file', file) multiple times)
    const files = form.getAll('file') || [];

    if (!files.length) {
      // Also support single file retrieval via get('file') if needed
      const single = form.get('file');
      if (!single) return json({ success: false, error: 'Missing file field' }, 400);
      files.push(single);
    }

    const MAX_BYTES = Number(env.MAX_UPLOAD_BYTES) || DEFAULT_MAX_BYTES;

    const saved = [];

    for (const file of files) {
      // Validate File-like object
      if (!file || typeof file.name !== 'string' || typeof file.stream !== 'function') {
        return json({ success: false, error: 'Invalid file uploaded' }, 400);
      }

      // If size is available, enforce limit
      if (typeof file.size === 'number' && file.size > MAX_BYTES) {
        return json({ success: false, error: 'File too large', maxBytes: MAX_BYTES }, 413);
      }

      // If size is not known, do a streaming size check to enforce the limit
      if (typeof file.size !== 'number') {
        // Consume up to MAX_BYTES+1 bytes to test limit
        const reader = file.stream().getReader();
        let bytes = 0;
        let done = false;
        while (true) {
          const { value, done: d } = await reader.read();
          if (d) { done = true; break; }
          bytes += (value ? value.length : 0);
          if (bytes > MAX_BYTES) {
            // Abort reader
            try { reader.cancel(); } catch (e) {}
            return json({ success: false, error: 'File too large', maxBytes: MAX_BYTES }, 413);
          }
        }
        // We consumed the stream to check size, but we need the full stream to put to R2.
        // Because we've consumed it, this code path is rare and indicates the platform didn't provide size metadata.
        // For simplicity and safety, reject these uploads and ask clients to provide size metadata.
        return json({ success: false, error: 'Upload failed: unknown file size - please provide file size' }, 400);
      }

      // Generate safe key and store in R2
      const prefix = choosePrefix(file);
      const safeName = sanitizeFilename(file.name);
      const key = `${prefix}${Date.now()}-${crypto.randomUUID()}-${safeName}`;

      await env.MLP_UPLOADS.put(key, file.stream(), {
        httpMetadata: {
          contentType: file.type || 'application/octet-stream'
        }
      });

      saved.push({ originalName: file.name, key, size: file.size, type: file.type });
    }

    return json({ success: true, uploaded: saved });
  } catch (err) {
    console.error('Upload function error:', err);
    return json({ success: false, error: 'Upload failed', detail: String(err?.message || err) }, 500);
  }
}

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors() }
  });
}

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
}

function choosePrefix(file) {
  const type = (file.type || '').toLowerCase();
  const ext = (file.name || '').toLowerCase().split('.').pop();

  if (type.startsWith('audio') || ['mp3','wav','ogg','m4a'].includes(ext)) return 'audio/';
  if (type.startsWith('image') || ['png','jpg','jpeg','webp','svg'].includes(ext)) return 'images/';
  if (type.startsWith('text') || ['txt','csv','json','md','pdf'].includes(ext)) return 'docs/';
  return 'others/';
}