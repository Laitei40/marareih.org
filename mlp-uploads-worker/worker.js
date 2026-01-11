export default {
  async fetch(request, env) {
    // -----------------------------
    // CORS preflight
    // -----------------------------
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors() });
    }

    const url = new URL(request.url);

    // -----------------------------
    // Only allow POST /api/upload
    // -----------------------------
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
      // -----------------------------
      // Parse FormData
      // -----------------------------
      const formData = await request.formData();
      const files = formData.getAll('file');

      if (!files.length) {
        return new Response(
          JSON.stringify({ error: 'No files provided' }),
          { status: 400, headers: jsonCors() }
        );
      }

      const uploaded = [];

      // -----------------------------
      // Upload each file
      // -----------------------------
      for (const file of files) {
        if (!(file instanceof File) || file.size === 0) continue;

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
          type: file.type,
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
// Folder routing (NO uploads/ EVER)
// --------------------------------------------------
function choosePrefix(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const type = (file.type || '').toLowerCase();

  if (type.startsWith('audio') || ['mp3','wav','ogg','flac','m4a'].includes(ext)) {
    return 'audio/';
  }

  if (type.startsWith('video') || ['mp4','mov','mkv','webm','avi'].includes(ext)) {
    return 'videos/';
  }

  if (['pdf','doc','docx','txt','csv','json','md'].includes(ext) || type.startsWith('text')) {
    return 'docs/';
  }

  if (['jpg','jpeg','png','webp','heic','heif'].includes(ext)) {
    return 'photos/';
  }

  if (type.startsWith('image') || ['svg','gif','bmp','tiff'].includes(ext)) {
    return 'images/';
  }

  return 'others/';
}