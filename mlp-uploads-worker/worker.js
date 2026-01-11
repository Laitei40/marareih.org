export default {
  async fetch(request, env) {
    // --------------------
    // CORS preflight
    // --------------------
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors() });
    }

    const url = new URL(request.url);

    // --------------------
    // Only POST /api/upload
    // --------------------
    if (url.pathname !== '/api/upload') {
      return new Response('Not Found', { status: 404, headers: cors() });
    }

    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method Not Allowed' }),
        { status: 405, headers: jsonCors() }
      );
    }

    try {
      const formData = await request.formData();
      const files = formData.getAll('file');

      // Cloudflare Turnstile verification
      const token = formData.get('cf-turnstile-response');
      if (!env.TURNSTILE_SECRET) {
        return new Response(
          JSON.stringify({ error: 'Server misconfiguration: TURNSTILE_SECRET not set' }),
          { status: 500, headers: jsonCors() }
        );
      }
      if (!token) {
        return new Response(
          JSON.stringify({ error: 'Turnstile token missing' }),
          { status: 400, headers: jsonCors() }
        );
      }

      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token }),
      });

      let verifyJson = {};
      try { verifyJson = await verifyRes.json(); } catch (e) { verifyJson = {}; }

      if (!verifyJson.success) {
        return new Response(
          JSON.stringify({ error: 'Turnstile verification failed', detail: verifyJson['error-codes'] || [] }),
          { status: 403, headers: jsonCors() }
        );
      }

      if (!files.length) {
        return new Response(
          JSON.stringify({ error: 'No files provided' }),
          { status: 400, headers: jsonCors() }
        );
      }

      const uploaded = [];

      for (const file of files) {
        if (!(file instanceof File) || file.size === 0) continue;

        // 🔥 NO FILE TYPE BLOCKING
        const prefix = choosePrefix(file);
        const safeName = sanitize(file.name);
        const key = `${prefix}${Date.now()}-${crypto.randomUUID()}-${safeName}`;

        await env.MLP_UPLOADS.put(key, file.stream(), {
          httpMetadata: {
            contentType: file.type || 'application/octet-stream',
          },
        });

        uploaded.push({
          key,
          originalName: file.name,
          size: file.size,
          type: file.type || 'unknown',
        });
      }

      return new Response(
        JSON.stringify({ success: true, uploaded }),
        { status: 200, headers: jsonCors() }
      );

    } catch (err) {
      return new Response(
        JSON.stringify({ error: 'Upload failed', detail: String(err) }),
        { status: 500, headers: jsonCors() }
      );
    }
  }
};

// --------------------------------------------------
// Helpers
// --------------------------------------------------

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function jsonCors() {
  return {
    'Content-Type': 'application/json',
    ...cors(),
  };
}

function sanitize(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
}

// --------------------------------------------------
// Folder routing (everything allowed)
// --------------------------------------------------
function choosePrefix(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const type = (file.type || '').toLowerCase();

  // Audio files
  if (type.startsWith('audio') || ['mp3','wav','ogg','flac','m4a'].includes(ext)) {
    return 'audio/';
  }

  // Video files
  if (type.startsWith('video') || ['mp4','mov','mkv','webm','avi'].includes(ext)) {
    return 'videos/';
  }

  // Images (includes common image extensions + svg)
  if (type.startsWith('image') || ['jpg','jpeg','png','webp','heic','heif','svg'].includes(ext)) {
    return 'images/';
  }

  // Documents
  if (type.startsWith('text') || ['pdf','doc','docx','txt','csv','json','md'].includes(ext)) {
    return 'docs/';
  }

  // Anything else -> others/
  return 'others/';
}
