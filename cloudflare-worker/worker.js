// DEPRECATED worker: This project uses Cloudflare Pages + Pages Functions
// for static assets and API routes. Leaving this file in the repo is fine for
// reference, but do NOT deploy this as a standalone Worker or use it as a
// reverse proxy — it can cause static assets to be served as HTML (MIME issues).

// To avoid accidental proxying if this Worker is deployed, respond with
// a clear 410 Gone for all requests. This prevents the Worker from serving
// static content and encourages use of Pages Functions at /functions/api/*.

export default {
  async fetch(request, env) {
    // Handle preflight (still return CORS so browsers get consistent responses)
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors() });
    }

    return new Response('This Worker is deprecated. Use Pages Functions for API endpoints.', {
      status: 410,
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
