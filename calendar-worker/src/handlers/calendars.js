import { jsonResponse, sanitizeSlug } from '../utils.js';

export async function handleCalendars(request, env, path) {
  const method = request.method;

  // GET /api/calendars - list all
  if (path === '/api/calendars' && method === 'GET') {
    return listCalendars(env);
  }

  // POST /api/calendars - create
  if (path === '/api/calendars' && method === 'POST') {
    return createCalendar(request, env);
  }

  // Match /api/calendars/:id
  const idMatch = path.match(/^\/api\/calendars\/(\d+)$/);
  if (idMatch) {
    const id = parseInt(idMatch[1], 10);

    // GET /api/calendars/:id
    if (method === 'GET') {
      return getCalendar(env, id);
    }

    // PUT /api/calendars/:id
    if (method === 'PUT') {
      return updateCalendar(request, env, id);
    }

    // DELETE /api/calendars/:id
    if (method === 'DELETE') {
      return deleteCalendar(env, id);
    }
  }

  return jsonResponse({ error: 'Not Found' }, 404);
}

async function listCalendars(env) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM calendars ORDER BY name ASC'
  ).all();
  return jsonResponse({ calendars: results || [] });
}

async function getCalendar(env, id) {
  const cal = await env.DB.prepare(
    'SELECT * FROM calendars WHERE id = ?'
  ).bind(id).first();

  if (!cal) return jsonResponse({ error: 'Calendar not found' }, 404);
  return jsonResponse({ calendar: cal });
}

async function createCalendar(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const { name, slug, description } = body;
  if (!name || !slug) {
    return jsonResponse({ error: 'Name and slug are required' }, 400);
  }

  const cleanSlug = sanitizeSlug(slug);
  if (!cleanSlug) {
    return jsonResponse({ error: 'Invalid slug' }, 400);
  }

  // Check uniqueness
  const existing = await env.DB.prepare(
    'SELECT id FROM calendars WHERE slug = ?'
  ).bind(cleanSlug).first();

  if (existing) {
    return jsonResponse({ error: 'A calendar with this slug already exists' }, 409);
  }

  const result = await env.DB.prepare(
    'INSERT INTO calendars (name, slug, description) VALUES (?, ?, ?)'
  ).bind(name, cleanSlug, description || '').run();

  const cal = await env.DB.prepare(
    'SELECT * FROM calendars WHERE id = ?'
  ).bind(result.meta.last_row_id).first();

  return jsonResponse({ calendar: cal }, 201);
}

async function updateCalendar(request, env, id) {
  const existing = await env.DB.prepare(
    'SELECT * FROM calendars WHERE id = ?'
  ).bind(id).first();

  if (!existing) return jsonResponse({ error: 'Calendar not found' }, 404);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const name = body.name || existing.name;
  const description = body.description !== undefined ? body.description : existing.description;
  let slug = existing.slug;

  if (body.slug && body.slug !== existing.slug) {
    slug = sanitizeSlug(body.slug);
    const dup = await env.DB.prepare(
      'SELECT id FROM calendars WHERE slug = ? AND id != ?'
    ).bind(slug, id).first();
    if (dup) {
      return jsonResponse({ error: 'A calendar with this slug already exists' }, 409);
    }
  }

  await env.DB.prepare(
    "UPDATE calendars SET name = ?, slug = ?, description = ?, updated_at = datetime('now') WHERE id = ?"
  ).bind(name, slug, description, id).run();

  const cal = await env.DB.prepare(
    'SELECT * FROM calendars WHERE id = ?'
  ).bind(id).first();

  return jsonResponse({ calendar: cal });
}

async function deleteCalendar(env, id) {
  const existing = await env.DB.prepare(
    'SELECT * FROM calendars WHERE id = ?'
  ).bind(id).first();

  if (!existing) return jsonResponse({ error: 'Calendar not found' }, 404);

  // Delete associated events first
  await env.DB.prepare('DELETE FROM events WHERE calendar_id = ?').bind(id).run();
  await env.DB.prepare('DELETE FROM calendars WHERE id = ?').bind(id).run();

  return jsonResponse({ message: 'Calendar deleted' });
}
