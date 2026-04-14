import { jsonResponse, generateUID } from '../utils.js';

export async function handleEvents(request, env, path) {
  const method = request.method;

  // GET /api/calendars/:calId/events - list events for a calendar
  const calEventsMatch = path.match(/^\/api\/calendars\/(\d+)\/events$/);
  if (calEventsMatch && method === 'GET') {
    return listEvents(env, parseInt(calEventsMatch[1], 10));
  }

  // POST /api/calendars/:calId/events - create event
  if (calEventsMatch && method === 'POST') {
    return createEvent(request, env, parseInt(calEventsMatch[1], 10));
  }

  // GET /api/events/:id
  const eventMatch = path.match(/^\/api\/events\/(\d+)$/);
  if (eventMatch) {
    const id = parseInt(eventMatch[1], 10);

    if (method === 'GET') {
      return getEvent(env, id);
    }

    if (method === 'PUT') {
      return updateEvent(request, env, id);
    }

    if (method === 'DELETE') {
      return deleteEvent(env, id);
    }
  }

  return jsonResponse({ error: 'Not Found' }, 404);
}

async function listEvents(env, calendarId) {
  const cal = await env.DB.prepare(
    'SELECT id FROM calendars WHERE id = ?'
  ).bind(calendarId).first();

  if (!cal) return jsonResponse({ error: 'Calendar not found' }, 404);

  const { results } = await env.DB.prepare(
    'SELECT * FROM events WHERE calendar_id = ? ORDER BY start_datetime ASC'
  ).bind(calendarId).all();

  return jsonResponse({ events: results || [] });
}

async function getEvent(env, id) {
  const event = await env.DB.prepare(
    'SELECT * FROM events WHERE id = ?'
  ).bind(id).first();

  if (!event) return jsonResponse({ error: 'Event not found' }, 404);
  return jsonResponse({ event });
}

async function createEvent(request, env, calendarId) {
  const cal = await env.DB.prepare(
    'SELECT id FROM calendars WHERE id = ?'
  ).bind(calendarId).first();

  if (!cal) return jsonResponse({ error: 'Calendar not found' }, 404);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const { title, description, location, startDatetime, endDatetime, allDay, recurrence, timezone } = body;

  if (!title || !startDatetime || !endDatetime) {
    return jsonResponse({ error: 'Title, startDatetime, and endDatetime are required' }, 400);
  }

  // Validate datetime format
  if (isNaN(Date.parse(startDatetime)) || isNaN(Date.parse(endDatetime))) {
    return jsonResponse({ error: 'Invalid datetime format' }, 400);
  }

  if (new Date(endDatetime) < new Date(startDatetime)) {
    return jsonResponse({ error: 'End date must be after start date' }, 400);
  }

  const uid = generateUID();

  const result = await env.DB.prepare(
    `INSERT INTO events (calendar_id, uid, title, description, location, start_datetime, end_datetime, all_day, recurrence, timezone)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    calendarId,
    uid,
    title,
    description || '',
    location || '',
    startDatetime,
    endDatetime,
    allDay ? 1 : 0,
    recurrence || '',
    timezone || 'UTC'
  ).run();

  const event = await env.DB.prepare(
    'SELECT * FROM events WHERE id = ?'
  ).bind(result.meta.last_row_id).first();

  return jsonResponse({ event }, 201);
}

async function updateEvent(request, env, id) {
  const existing = await env.DB.prepare(
    'SELECT * FROM events WHERE id = ?'
  ).bind(id).first();

  if (!existing) return jsonResponse({ error: 'Event not found' }, 404);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const title = body.title || existing.title;
  const description = body.description !== undefined ? body.description : existing.description;
  const location = body.location !== undefined ? body.location : existing.location;
  const startDatetime = body.startDatetime || existing.start_datetime;
  const endDatetime = body.endDatetime || existing.end_datetime;
  const allDay = body.allDay !== undefined ? (body.allDay ? 1 : 0) : existing.all_day;
  const recurrence = body.recurrence !== undefined ? body.recurrence : existing.recurrence;
  const timezone = body.timezone || existing.timezone;

  if (isNaN(Date.parse(startDatetime)) || isNaN(Date.parse(endDatetime))) {
    return jsonResponse({ error: 'Invalid datetime format' }, 400);
  }

  await env.DB.prepare(
    `UPDATE events SET title = ?, description = ?, location = ?, start_datetime = ?, end_datetime = ?,
     all_day = ?, recurrence = ?, timezone = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(title, description, location, startDatetime, endDatetime, allDay, recurrence, timezone, id).run();

  const event = await env.DB.prepare(
    'SELECT * FROM events WHERE id = ?'
  ).bind(id).first();

  return jsonResponse({ event });
}

async function deleteEvent(env, id) {
  const existing = await env.DB.prepare(
    'SELECT * FROM events WHERE id = ?'
  ).bind(id).first();

  if (!existing) return jsonResponse({ error: 'Event not found' }, 404);

  await env.DB.prepare('DELETE FROM events WHERE id = ?').bind(id).run();
  return jsonResponse({ message: 'Event deleted' });
}
