import { cors } from '../utils.js';
import { getAdminHtml } from '../views/admin-html.js';

export async function serveAdmin(request, env, path) {
  const html = getAdminHtml();
  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      ...cors(),
    },
  });
}
