export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    /* ===============================
       CORS preflight
    =============================== */
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: cors()
      });
    }

    /* ===============================
       Ignore favicon
    =============================== */
    if (path === '/favicon.ico') {
      return new Response(null, { status: 204 });
    }

    /* ===============================
       Allow static assets to pass through
       (important for Pages / upload UI)
    =============================== */
    const staticExt = /\.(css|js|png|jpe?g|svg|ico|woff2?|ttf|eot)$/i;
    if (path.startsWith('/upload/') || staticExt.test(path)) {
      return fetch(request);
    }

    /* ===============================
       POST /api/upload
    =============================== */
    if (path === '/api/upload') {
      if (request.method !== 'POST') {
        return json(
          { success: false, error: 'Method Not Allowed' },
          405
        );
      }

      try {
        const form = await request.formData();
        const file = form.get('file');

        if (!file || !(file instanceof File)) {
          return json(
            { success: false, error: 'Missing file' },
            400
          );
        }

        /* ===============================
           Size limit (default 50 MB)
        =============================== */
        const MAX_BYTES =
          Number(env.MAX_UPLOAD_BYTES) || 50 * 1024 * 1024;

        if (file.size > MAX_BYTES) {
          return json(
            { success: false, error: 'File too large' },
            413
          );
        }

        /* ===============================
           Generate safe object key
        =============================== */
        const prefix = choosePrefix(file);
        const safeName = sanitizeFilename(file.name);
        const key = `${prefix}${Date.now()}-${crypto.randomUUID()}-${safeName}`;

        /* ===============================
           Store in R2
        =============================== */
        await env.MLP_UPLOADS.put(key, file.stream(), {
          httpMetadata: {
            contentType: file.type || 'application/octet-stream'
          }
        });

        return json({
          success: true,
          key,
          size: file.size,
          type: file.type
        });
      } catch (err) {
        return json(
          {
            success: false,
            error: 'Upload failed',
            detail: String(err?.message || err)
          },
          500
        );
      }
    }

    /* ===============================
       Fallback
    =============================== */
    return new Response('Not Found', {
      status: 404,
      headers: cors()
    });
  }
};

/* ============================================================
   Helpers
============================================================ */

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
    headers: {
      'Content-Type': 'application/json',
      ...cors()
    }
  });
}

function sanitizeFilename(name) {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 200);
}

function choosePrefix(file) {
  const type = (file.type || '').toLowerCase();
  const ext = file.name.toLowerCase().split('.').pop();

  if (type.startsWith('audio') || ['mp3','wav','ogg','m4a'].includes(ext)) {
    return 'audio/';
  }

  if (type.startsWith('image') || ['png','jpg','jpeg','webp','svg'].includes(ext)) {
    return 'images/';
  }

  if (
    type.startsWith('text') ||
    ['txt','csv','json','md','pdf'].includes(ext)
  ) {
    return 'docs/';
  }

  return 'others/';
}
