import { cors, jsonResponse } from '../utils.js';

export async function handleUpdates(request, env, path) {
  const db = env.DB;
  const method = request.method;

  // GET /api/updates — list published updates (public)
  if (path === '/api/updates' && method === 'GET') {
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
    const category = url.searchParams.get('category') || '';
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM updates WHERE published = 1';
    const params = [];
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    query += ' ORDER BY pinned DESC, published_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const updates = await db.prepare(query).bind(...params).all();

    // Count total
    let countQuery = 'SELECT COUNT(*) as total FROM updates WHERE published = 1';
    const countParams = [];
    if (category) {
      countQuery += ' AND category = ?';
      countParams.push(category);
    }
    const countResult = countParams.length
      ? await db.prepare(countQuery).bind(...countParams).first()
      : await db.prepare(countQuery).first();

    return jsonResponse({
      updates: updates.results,
      total: countResult.total,
      page,
      limit
    });
  }

  // GET /api/updates/:slug — single update by slug (public)
  const slugMatch = path.match(/^\/api\/updates\/([a-z0-9-]+)$/);
  if (slugMatch && method === 'GET') {
    const slug = slugMatch[1];
    const update = await db.prepare('SELECT * FROM updates WHERE slug = ? AND published = 1').bind(slug).first();
    if (!update) return jsonResponse({ error: 'Not found' }, 404);
    return jsonResponse({ update });
  }

  // ── Admin endpoints (all updates, including drafts) ──

  // GET /api/admin/updates — list all updates (admin)
  if (path === '/api/admin/updates' && method === 'GET') {
    const updates = await db.prepare('SELECT * FROM updates ORDER BY pinned DESC, updated_at DESC').all();
    return jsonResponse({ updates: updates.results });
  }

  // GET /api/admin/updates/:id
  const adminIdMatch = path.match(/^\/api\/admin\/updates\/(\d+)$/);
  if (adminIdMatch && method === 'GET') {
    const update = await db.prepare('SELECT * FROM updates WHERE id = ?').bind(parseInt(adminIdMatch[1], 10)).first();
    if (!update) return jsonResponse({ error: 'Not found' }, 404);
    return jsonResponse({ update });
  }

  // POST /api/admin/updates — create
  if (path === '/api/admin/updates' && method === 'POST') {
    const body = await request.json();
    const { title, slug, content, summary, category, published, pinned } = body;
    if (!title || !slug || !content) {
      return jsonResponse({ error: 'title, slug, and content are required' }, 400);
    }
    const publishedAt = published ? new Date().toISOString() : null;
    const result = await db.prepare(
      'INSERT INTO updates (title, slug, content, summary, category, published, pinned, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(title, slug, content, summary || '', category || 'general', published ? 1 : 0, pinned ? 1 : 0, publishedAt).run();

    const update = await db.prepare('SELECT * FROM updates WHERE id = ?').bind(result.meta.last_row_id).first();
    return jsonResponse({ update }, 201);
  }

  // PUT /api/admin/updates/:id — update
  if (adminIdMatch && method === 'PUT') {
    const id = parseInt(adminIdMatch[1], 10);
    const existing = await db.prepare('SELECT * FROM updates WHERE id = ?').bind(id).first();
    if (!existing) return jsonResponse({ error: 'Not found' }, 404);

    const body = await request.json();
    const title = body.title || existing.title;
    const slug = body.slug || existing.slug;
    const content = body.content || existing.content;
    const summary = body.summary !== undefined ? body.summary : existing.summary;
    const category = body.category || existing.category;
    const published = body.published !== undefined ? (body.published ? 1 : 0) : existing.published;
    const pinned = body.pinned !== undefined ? (body.pinned ? 1 : 0) : existing.pinned;

    // Set published_at on first publish
    let publishedAt = existing.published_at;
    if (published && !existing.published_at) {
      publishedAt = new Date().toISOString();
    }

    await db.prepare(
      'UPDATE updates SET title = ?, slug = ?, content = ?, summary = ?, category = ?, published = ?, pinned = ?, published_at = ?, updated_at = datetime(\'now\') WHERE id = ?'
    ).bind(title, slug, content, summary, category, published, pinned, publishedAt, id).run();

    const update = await db.prepare('SELECT * FROM updates WHERE id = ?').bind(id).first();
    return jsonResponse({ update });
  }

  // DELETE /api/admin/updates/:id
  if (adminIdMatch && method === 'DELETE') {
    const id = parseInt(adminIdMatch[1], 10);
    await db.prepare('DELETE FROM updates WHERE id = ?').bind(id).run();
    return jsonResponse({ success: true });
  }

  return jsonResponse({ error: 'Not Found' }, 404);
}
