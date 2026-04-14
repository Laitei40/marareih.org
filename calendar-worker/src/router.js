import { handleCalendars } from './handlers/calendars.js';
import { handleEvents } from './handlers/events.js';
import { handleIcs } from './handlers/ics.js';
import { serveAdmin } from './handlers/admin.js';
import { cors, jsonResponse } from './utils.js';

export async function handleRequest(request, env, ctx) {
  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors() });
  }

  const url = new URL(request.url);
  const path = url.pathname;

  try {
    // Public ICS endpoint: /api/calendar/:slug.ics
    if (path.match(/^\/api\/calendar\/[\w-]+\.ics$/)) {
      return handleIcs(request, env, path);
    }

    // Calendar CRUD
    if (path.startsWith('/api/calendars')) {
      return handleCalendars(request, env, path);
    }

    // Event CRUD
    if (path.startsWith('/api/events') || path.match(/^\/api\/calendars\/\d+\/events/)) {
      return handleEvents(request, env, path);
    }

    // Admin dashboard (protected by Cloudflare Access)
    if (path === '/admin' || path.startsWith('/admin/')) {
      return serveAdmin(request, env, path);
    }

    // Root redirect to admin
    if (path === '/') {
      return Response.redirect(new URL('/admin', url).toString(), 302);
    }

    return jsonResponse({ error: 'Not Found' }, 404);
  } catch (err) {
    console.error('Request error:', err);
    return jsonResponse({ error: 'Internal Server Error' }, 500);
  }
}
