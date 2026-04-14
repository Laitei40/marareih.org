import { cors } from '../utils.js';

export async function handleIcs(request, env, path) {
  // Extract slug from /api/calendar/:slug.ics
  const match = path.match(/^\/api\/calendar\/([\w-]+)\.ics$/);
  if (!match) {
    return new Response('Not Found', { status: 404, headers: cors() });
  }

  const slug = match[1];

  const cal = await env.DB.prepare(
    'SELECT * FROM calendars WHERE slug = ?'
  ).bind(slug).first();

  if (!cal) {
    return new Response('Calendar not found', { status: 404, headers: cors() });
  }

  const { results: events } = await env.DB.prepare(
    'SELECT * FROM events WHERE calendar_id = ? ORDER BY start_datetime ASC'
  ).bind(cal.id).all();

  const ics = generateIcsContent(cal, events || []);

  return new Response(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${slug}.ics"`,
      'Cache-Control': 'public, max-age=300',
      ...cors(),
    },
  });
}

function generateIcsContent(calendar, events) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//marareih.org//Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(calendar.name)}`,
    `X-WR-CALDESC:${escapeIcsText(calendar.description || '')}`,
  ];

  for (const event of events) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${event.uid}`);
    lines.push(`DTSTAMP:${formatIcsDate(event.updated_at || event.created_at)}`);

    if (event.all_day) {
      lines.push(`DTSTART;VALUE=DATE:${formatIcsDateOnly(event.start_datetime)}`);
      lines.push(`DTEND;VALUE=DATE:${formatIcsDateOnly(event.end_datetime)}`);
    } else {
      const tz = event.timezone || 'UTC';
      if (tz === 'UTC') {
        lines.push(`DTSTART:${formatIcsDate(event.start_datetime)}`);
        lines.push(`DTEND:${formatIcsDate(event.end_datetime)}`);
      } else {
        lines.push(`DTSTART;TZID=${tz}:${formatIcsDateLocal(event.start_datetime)}`);
        lines.push(`DTEND;TZID=${tz}:${formatIcsDateLocal(event.end_datetime)}`);
      }
    }

    lines.push(`SUMMARY:${escapeIcsText(event.title)}`);

    if (event.description) {
      lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
    }

    if (event.location) {
      lines.push(`LOCATION:${escapeIcsText(event.location)}`);
    }

    if (event.recurrence) {
      lines.push(`RRULE:${event.recurrence}`);
    }

    lines.push(`CREATED:${formatIcsDate(event.created_at)}`);
    lines.push(`LAST-MODIFIED:${formatIcsDate(event.updated_at || event.created_at)}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  // Fold long lines per RFC 5545 (max 75 octets per line)
  return foldIcsLines(lines).join('\r\n') + '\r\n';
}

// Format date to ICS UTC format: 20261231T235959Z
function formatIcsDate(dateStr) {
  if (!dateStr) return formatIcsDate(new Date().toISOString());
  const d = new Date(dateStr);
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// Format date-only: 20261231
function formatIcsDateOnly(dateStr) {
  const d = new Date(dateStr);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

// Format date as local (no Z suffix) for TZID usage: 20261231T235959
function formatIcsDateLocal(dateStr) {
  return formatIcsDate(dateStr).replace('Z', '');
}

// Escape special characters in ICS text fields
function escapeIcsText(text) {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

// Fold lines > 75 bytes per RFC 5545
function foldIcsLines(lines) {
  const folded = [];
  for (const line of lines) {
    if (line.length <= 75) {
      folded.push(line);
    } else {
      let remaining = line;
      folded.push(remaining.substring(0, 75));
      remaining = remaining.substring(75);
      while (remaining.length > 0) {
        folded.push(' ' + remaining.substring(0, 74));
        remaining = remaining.substring(74);
      }
    }
  }
  return folded;
}
