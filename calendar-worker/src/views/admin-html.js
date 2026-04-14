export function getAdminHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>MLP Admin – marareih.org</title>
<style>${getCSS()}</style>
</head>
<body>

<div id="dashboard">
  <header class="topbar">
    <div class="topbar-left">
      <button id="sidebar-toggle" class="btn-icon" title="Toggle sidebar">☰</button>
      <h1 class="topbar-title">MLP Admin</h1>
    </div>
    <div class="topbar-right">
      <span class="topbar-brand">marareih.org</span>
    </div>
  </header>

  <div class="main-layout">
    <aside id="sidebar" class="sidebar">
      <nav class="sidebar-nav">
        <button class="sidebar-nav-btn active" data-section="calendars">📅 Calendars</button>
        <button class="sidebar-nav-btn" data-section="updates">📝 Updates</button>
      </nav>

      <div id="sidebar-calendars" class="sidebar-section">
        <div class="sidebar-header">
          <h2>Calendars</h2>
          <button id="add-calendar-btn" class="btn btn-sm btn-primary" title="New calendar">+ New</button>
        </div>
        <ul id="calendar-list" class="sidebar-list"></ul>
      </div>

      <div id="sidebar-updates" class="sidebar-section" style="display:none">
        <div class="sidebar-header">
          <h2>Updates</h2>
          <button id="add-update-btn" class="btn btn-sm btn-primary" title="New update">+ New</button>
        </div>
        <ul id="update-list" class="sidebar-list"></ul>
      </div>
    </aside>

    <main id="content" class="content">
      <div id="welcome-panel" class="panel">
        <h2>Welcome to MLP Admin</h2>
        <p>Manage calendars, events, and project updates from one place.</p>
        <div class="welcome-cards">
          <div class="welcome-card" data-goto="calendars">
            <span class="welcome-icon">📅</span>
            <h3>Calendars</h3>
            <p>Create and manage calendars and events with ICS feed generation.</p>
          </div>
          <div class="welcome-card" data-goto="updates">
            <span class="welcome-icon">📝</span>
            <h3>Updates</h3>
            <p>Publish news, milestones, and announcements for visitors.</p>
          </div>
        </div>
      </div>

      <div id="calendar-panel" class="panel" style="display:none">
        <div class="panel-header">
          <div>
            <h2 id="cal-title"></h2>
            <p id="cal-description" class="text-muted"></p>
            <p class="ics-link">
              ICS Feed: <a id="cal-ics-link" href="#" target="_blank"></a>
              <button id="copy-ics-btn" class="btn btn-xs" title="Copy link">📋</button>
            </p>
          </div>
          <div class="panel-actions">
            <button id="edit-calendar-btn" class="btn btn-sm">Edit</button>
            <button id="delete-calendar-btn" class="btn btn-sm btn-danger">Delete</button>
          </div>
        </div>
        <div class="events-header">
          <h3>Events</h3>
          <button id="add-event-btn" class="btn btn-sm btn-primary">+ Add Event</button>
        </div>
        <div id="events-list" class="events-list"></div>
      </div>

      <div id="update-panel" class="panel" style="display:none">
        <div class="panel-header">
          <div>
            <h2 id="upd-title"></h2>
            <div id="upd-badges" class="badge-row"></div>
            <p id="upd-summary" class="text-muted"></p>
          </div>
          <div class="panel-actions">
            <button id="edit-update-btn" class="btn btn-sm">Edit</button>
            <button id="delete-update-btn" class="btn btn-sm btn-danger">Delete</button>
          </div>
        </div>
        <div id="upd-content" class="update-content"></div>
        <div id="upd-meta" class="update-meta text-muted"></div>
      </div>
    </main>
  </div>
</div>

<!-- CALENDAR MODAL -->
<div id="calendar-modal" class="modal" style="display:none">
  <div class="modal-overlay"></div>
  <div class="modal-content">
    <div class="modal-header">
      <h3 id="calendar-modal-title">New Calendar</h3>
      <button class="modal-close" data-close="calendar-modal">&times;</button>
    </div>
    <form id="calendar-form">
      <div class="form-group">
        <label for="cal-name">Name</label>
        <input type="text" id="cal-name" required placeholder="e.g. Church Events">
      </div>
      <div class="form-group">
        <label for="cal-slug">Slug (URL)</label>
        <input type="text" id="cal-slug" required placeholder="e.g. church" pattern="[a-z0-9\\-]+">
        <small class="text-muted">Lowercase letters, numbers, and hyphens only</small>
      </div>
      <div class="form-group">
        <label for="cal-desc">Description</label>
        <textarea id="cal-desc" rows="3" placeholder="Optional description"></textarea>
      </div>
      <input type="hidden" id="cal-edit-id">
      <div class="modal-footer">
        <button type="button" class="btn" data-close="calendar-modal">Cancel</button>
        <button type="submit" class="btn btn-primary">Save</button>
      </div>
    </form>
  </div>
</div>

<!-- EVENT MODAL -->
<div id="event-modal" class="modal" style="display:none">
  <div class="modal-overlay"></div>
  <div class="modal-content modal-lg">
    <div class="modal-header">
      <h3 id="event-modal-title">New Event</h3>
      <button class="modal-close" data-close="event-modal">&times;</button>
    </div>
    <form id="event-form">
      <div class="form-group">
        <label for="evt-title">Title</label>
        <input type="text" id="evt-title" required placeholder="Event title">
      </div>
      <div class="form-row">
        <div class="form-group flex-1">
          <label for="evt-start">Start</label>
          <input type="datetime-local" id="evt-start" required>
        </div>
        <div class="form-group flex-1">
          <label for="evt-end">End</label>
          <input type="datetime-local" id="evt-end" required>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" id="evt-allday"> All-day event
          </label>
        </div>
        <div class="form-group flex-1">
          <label for="evt-tz">Timezone</label>
          <select id="evt-tz">
            <option value="UTC">UTC</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label for="evt-location">Location</label>
        <input type="text" id="evt-location" placeholder="e.g. Main Church Hall">
      </div>
      <div class="form-group">
        <label for="evt-desc">Description</label>
        <textarea id="evt-desc" rows="3" placeholder="Event details"></textarea>
      </div>
      <div class="form-group">
        <label for="evt-recurrence">Recurrence (RRULE)</label>
        <select id="evt-recurrence-preset">
          <option value="">No recurrence</option>
          <option value="FREQ=DAILY">Daily</option>
          <option value="FREQ=WEEKLY">Weekly</option>
          <option value="FREQ=WEEKLY;BYDAY=MO,WE,FR">Weekly (Mon, Wed, Fri)</option>
          <option value="FREQ=MONTHLY">Monthly</option>
          <option value="FREQ=YEARLY">Yearly</option>
          <option value="custom">Custom RRULE...</option>
        </select>
        <input type="text" id="evt-recurrence" placeholder="e.g. FREQ=WEEKLY;BYDAY=SU" style="display:none;margin-top:8px">
      </div>
      <input type="hidden" id="evt-edit-id">
      <div class="modal-footer">
        <button type="button" class="btn" data-close="event-modal">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Event</button>
      </div>
    </form>
  </div>
</div>

<!-- UPDATE MODAL -->
<div id="update-modal" class="modal" style="display:none">
  <div class="modal-overlay"></div>
  <div class="modal-content modal-lg">
    <div class="modal-header">
      <h3 id="update-modal-title">New Update</h3>
      <button class="modal-close" data-close="update-modal">&times;</button>
    </div>
    <form id="update-form">
      <div class="form-group">
        <label for="upd-f-title">Title</label>
        <input type="text" id="upd-f-title" required placeholder="Update title">
      </div>
      <div class="form-group">
        <label for="upd-f-slug">Slug</label>
        <input type="text" id="upd-f-slug" required placeholder="e.g. new-dataset-release" pattern="[a-z0-9\\-]+">
        <small class="text-muted">Used in the URL — lowercase, hyphens only</small>
      </div>
      <div class="form-group">
        <label for="upd-f-summary">Summary</label>
        <input type="text" id="upd-f-summary" placeholder="Short one-line summary (optional)">
      </div>
      <div class="form-group">
        <label for="upd-f-content">Content</label>
        <textarea id="upd-f-content" rows="10" required placeholder="Write update content here. Basic HTML is supported."></textarea>
      </div>
      <div class="form-row">
        <div class="form-group flex-1">
          <label for="upd-f-category">Category</label>
          <select id="upd-f-category">
            <option value="general">General</option>
            <option value="release">Release</option>
            <option value="announcement">Announcement</option>
            <option value="milestone">Milestone</option>
            <option value="community">Community</option>
          </select>
        </div>
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" id="upd-f-published"> Published
          </label>
        </div>
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" id="upd-f-pinned"> Pinned
          </label>
        </div>
      </div>
      <input type="hidden" id="upd-f-edit-id">
      <div class="modal-footer">
        <button type="button" class="btn" data-close="update-modal">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Update</button>
      </div>
    </form>
  </div>
</div>

<!-- CONFIRM MODAL -->
<div id="confirm-modal" class="modal" style="display:none">
  <div class="modal-overlay"></div>
  <div class="modal-content modal-sm">
    <div class="modal-header">
      <h3>Confirm</h3>
      <button class="modal-close" data-close="confirm-modal">&times;</button>
    </div>
    <p id="confirm-message"></p>
    <div class="modal-footer">
      <button id="confirm-cancel" class="btn" data-close="confirm-modal">Cancel</button>
      <button id="confirm-ok" class="btn btn-danger">Delete</button>
    </div>
  </div>
</div>

<div id="toast-container"></div>

<script>${getJS()}</script>
</body>
</html>`;
}

function getCSS() {
  return `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#f5f5f7;--surface:#fff;--border:#e0e0e0;--text:#1d1d1f;--text-muted:#6e6e73;
  --primary:#0071e3;--primary-hover:#0077ED;--danger:#ff3b30;--danger-hover:#d62d23;
  --success:#34c759;--radius:10px;--shadow:0 2px 12px rgba(0,0,0,0.08);
  --sidebar-w:280px;--topbar-h:56px;
}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:var(--bg);color:var(--text);line-height:1.5}
a{color:var(--primary);text-decoration:none}a:hover{text-decoration:underline}
.btn{display:inline-flex;align-items:center;gap:4px;padding:8px 16px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text);font-size:14px;cursor:pointer;transition:all .15s}
.btn:hover{background:var(--bg)}
.btn-primary{background:var(--primary);color:#fff;border-color:var(--primary)}
.btn-primary:hover{background:var(--primary-hover)}
.btn-danger{background:var(--danger);color:#fff;border-color:var(--danger)}
.btn-danger:hover{background:var(--danger-hover)}
.btn-sm{padding:6px 12px;font-size:13px}
.btn-xs{padding:3px 8px;font-size:12px;border-radius:6px}
.btn-icon{background:none;border:none;font-size:22px;cursor:pointer;padding:4px 8px;border-radius:6px}
.btn-icon:hover{background:var(--bg)}
.topbar{display:flex;align-items:center;justify-content:space-between;height:var(--topbar-h);padding:0 20px;background:var(--surface);border-bottom:1px solid var(--border);position:sticky;top:0;z-index:100}
.topbar-left{display:flex;align-items:center;gap:12px}
.topbar-title{font-size:18px;font-weight:600}
.topbar-right{display:flex;align-items:center;gap:12px}
.topbar-brand{font-size:13px;color:var(--text-muted)}
.main-layout{display:flex;height:calc(100vh - var(--topbar-h))}
.sidebar{width:var(--sidebar-w);min-width:var(--sidebar-w);background:var(--surface);border-right:1px solid var(--border);overflow-y:auto;transition:margin .25s;display:flex;flex-direction:column}
.sidebar.collapsed{margin-left:calc(-1 * var(--sidebar-w))}
.sidebar-nav{display:flex;border-bottom:1px solid var(--border)}
.sidebar-nav-btn{flex:1;padding:12px 8px;border:none;background:none;cursor:pointer;font-size:13px;font-weight:500;color:var(--text-muted);border-bottom:2px solid transparent;transition:all .15s}
.sidebar-nav-btn:hover{background:var(--bg);color:var(--text)}
.sidebar-nav-btn.active{color:var(--primary);border-bottom-color:var(--primary)}
.sidebar-section{flex:1;overflow-y:auto}
.sidebar-header{display:flex;align-items:center;justify-content:space-between;padding:16px 16px 8px}
.sidebar-header h2{font-size:15px;font-weight:600}
.sidebar-list{list-style:none}
.sidebar-list li{padding:10px 16px;cursor:pointer;border-left:3px solid transparent;transition:all .15s;display:flex;align-items:center;justify-content:space-between}
.sidebar-list li:hover{background:var(--bg)}
.sidebar-list li.active{background:#e8f0fe;border-left-color:var(--primary);font-weight:500}
.sidebar-list li .item-name{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sidebar-list li .item-badge{font-size:11px;color:var(--text-muted);background:var(--bg);padding:2px 8px;border-radius:10px}
.sidebar-list li .item-badge.draft{color:var(--danger)}
.sidebar-list li .item-badge.pinned{color:#ff9500}
.content{flex:1;overflow-y:auto;padding:24px}
.panel{background:var(--surface);border-radius:var(--radius);padding:24px;box-shadow:var(--shadow)}
.panel-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;flex-wrap:wrap;gap:12px}
.panel-actions{display:flex;gap:8px}
.text-muted{color:var(--text-muted);font-size:14px}
.ics-link{font-size:13px;margin-top:6px;color:var(--text-muted)}
.ics-link a{font-family:monospace;font-size:12px}
.welcome-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-top:20px}
.welcome-card{padding:24px;border:1px solid var(--border);border-radius:var(--radius);cursor:pointer;transition:all .2s;text-align:center}
.welcome-card:hover{box-shadow:var(--shadow);border-color:var(--primary)}
.welcome-icon{font-size:36px;display:block;margin-bottom:8px}
.welcome-card h3{font-size:16px;margin-bottom:4px}
.welcome-card p{font-size:13px;color:var(--text-muted)}
.badge-row{display:flex;gap:6px;margin-top:4px}
.badge{display:inline-block;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:600;text-transform:uppercase}
.badge-cat{background:#e8f0fe;color:var(--primary)}
.badge-draft{background:#ffeaea;color:var(--danger)}
.badge-published{background:#e6f9ee;color:#1a8a42}
.badge-pinned{background:#fff5e6;color:#b87300}
.events-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.events-header h3{font-size:16px;font-weight:600}
.events-list{display:flex;flex-direction:column;gap:8px}
.event-card{display:flex;align-items:flex-start;justify-content:space-between;padding:14px 16px;border:1px solid var(--border);border-radius:8px;transition:box-shadow .15s;gap:12px}
.event-card:hover{box-shadow:0 2px 8px rgba(0,0,0,0.06)}
.event-info{flex:1;min-width:0}
.event-info h4{font-size:15px;font-weight:500;margin-bottom:2px}
.event-meta{font-size:13px;color:var(--text-muted)}
.event-meta span{margin-right:12px}
.event-actions{display:flex;gap:6px;flex-shrink:0}
.no-events{text-align:center;padding:40px;color:var(--text-muted)}
.update-content{margin-top:16px;line-height:1.7;font-size:15px}
.update-content p{margin-bottom:12px}
.update-meta{margin-top:20px;padding-top:12px;border-top:1px solid var(--border);font-size:12px}
.modal{position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center}
.modal-overlay{position:absolute;inset:0;background:rgba(0,0,0,0.4)}
.modal-content{position:relative;background:var(--surface);border-radius:var(--radius);padding:24px;width:90%;max-width:480px;max-height:90vh;overflow-y:auto;box-shadow:0 12px 40px rgba(0,0,0,0.15)}
.modal-lg{max-width:600px}
.modal-sm{max-width:380px}
.modal-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
.modal-header h3{font-size:18px;font-weight:600}
.modal-close{background:none;border:none;font-size:24px;cursor:pointer;color:var(--text-muted);padding:0 4px}
.modal-close:hover{color:var(--text)}
.modal-footer{display:flex;justify-content:flex-end;gap:8px;margin-top:20px}
.form-group{margin-bottom:14px}
.form-group label{display:block;font-size:13px;font-weight:500;margin-bottom:4px}
.form-group input,.form-group select,.form-group textarea{width:100%;padding:9px 12px;border:1px solid var(--border);border-radius:8px;font-size:14px;font-family:inherit;outline:none;transition:border .2s}
.form-group input:focus,.form-group select:focus,.form-group textarea:focus{border-color:var(--primary)}
.form-group small{display:block;margin-top:2px;color:var(--text-muted);font-size:12px}
.form-row{display:flex;gap:12px;flex-wrap:wrap}
.form-row .form-group{flex:1;min-width:140px}
.flex-1{flex:1}
.checkbox-label{display:flex;align-items:center;gap:8px;cursor:pointer;font-size:14px;padding-top:22px}
.checkbox-label input{width:auto}
#toast-container{position:fixed;bottom:20px;right:20px;z-index:300;display:flex;flex-direction:column;gap:8px}
.toast{padding:12px 20px;border-radius:8px;color:#fff;font-size:14px;animation:slidein .3s ease;box-shadow:0 4px 12px rgba(0,0,0,0.15)}
.toast-success{background:var(--success)}
.toast-error{background:var(--danger)}
.toast-info{background:var(--primary)}
@keyframes slidein{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@media(max-width:768px){
  .sidebar{position:fixed;top:var(--topbar-h);left:0;bottom:0;z-index:50;box-shadow:4px 0 20px rgba(0,0,0,0.1)}
  .sidebar.collapsed{margin-left:calc(-1 * var(--sidebar-w))}
  .content{padding:16px}
  .form-row{flex-direction:column}
  .panel-header{flex-direction:column}
}
`;
}

function getJS() {
  return `
(function() {
  'use strict';

  const API = location.origin;
  let calendars = [];
  let currentCalId = null;
  let currentEvents = [];
  let updates = [];
  let currentUpdateId = null;
  let activeSection = 'calendars';
  let confirmCallback = null;

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    populateTimezones();
    bindEvents();
    loadCalendars();
    loadUpdates();
  }

  function populateTimezones() {
    const sel = $('#evt-tz');
    try {
      const tzList = Intl.supportedValuesOf('timeZone');
      tzList.forEach(tz => {
        const opt = document.createElement('option');
        opt.value = tz;
        opt.textContent = tz;
        sel.appendChild(opt);
      });
    } catch (e) {
      const fallback = [
        'America/New_York','America/Chicago','America/Denver','America/Los_Angeles',
        'Europe/London','Europe/Berlin','Europe/Paris',
        'Asia/Tokyo','Asia/Shanghai','Asia/Dubai','Asia/Kolkata',
        'Africa/Nairobi','Africa/Lagos','Africa/Cairo',
        'Pacific/Auckland','Australia/Sydney'
      ];
      fallback.forEach(tz => {
        const opt = document.createElement('option');
        opt.value = tz;
        opt.textContent = tz;
        sel.appendChild(opt);
      });
    }
  }

  function bindEvents() {
    $('#sidebar-toggle').addEventListener('click', () => $('#sidebar').classList.toggle('collapsed'));

    $$('.sidebar-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => switchSection(btn.dataset.section));
    });
    $$('.welcome-card').forEach(card => {
      card.addEventListener('click', () => switchSection(card.dataset.goto));
    });

    // Calendar
    $('#add-calendar-btn').addEventListener('click', openNewCalendarModal);
    $('#edit-calendar-btn').addEventListener('click', openEditCalendarModal);
    $('#delete-calendar-btn').addEventListener('click', confirmDeleteCalendar);
    $('#add-event-btn').addEventListener('click', openNewEventModal);
    $('#copy-ics-btn').addEventListener('click', copyIcsLink);
    $('#calendar-form').addEventListener('submit', handleCalendarSave);
    $('#cal-name').addEventListener('input', autoSlug);
    $('#event-form').addEventListener('submit', handleEventSave);
    $('#evt-allday').addEventListener('change', toggleAllDay);
    $('#evt-recurrence-preset').addEventListener('change', toggleCustomRrule);

    // Updates
    $('#add-update-btn').addEventListener('click', openNewUpdateModal);
    $('#edit-update-btn').addEventListener('click', openEditUpdateModal);
    $('#delete-update-btn').addEventListener('click', confirmDeleteUpdate);
    $('#update-form').addEventListener('submit', handleUpdateSave);
    $('#upd-f-title').addEventListener('input', autoUpdateSlug);

    // Modal closes
    $$('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-close');
        $('#' + id).style.display = 'none';
      });
    });
    $$('.modal-overlay').forEach(ov => {
      ov.addEventListener('click', () => ov.closest('.modal').style.display = 'none');
    });
    $('#confirm-ok').addEventListener('click', () => {
      $('#confirm-modal').style.display = 'none';
      if (confirmCallback) confirmCallback();
    });
  }

  function switchSection(section) {
    activeSection = section;
    $$('.sidebar-nav-btn').forEach(b => b.classList.toggle('active', b.dataset.section === section));
    $('#sidebar-calendars').style.display = section === 'calendars' ? '' : 'none';
    $('#sidebar-updates').style.display = section === 'updates' ? '' : 'none';
    $('#calendar-panel').style.display = 'none';
    $('#update-panel').style.display = 'none';
    $('#welcome-panel').style.display = '';
    currentCalId = null;
    currentUpdateId = null;
    renderCalendarList();
    renderUpdateList();
  }

  async function api(path, opts) {
    opts = opts || {};
    const headers = { 'Content-Type': 'application/json' };
    const res = await fetch(API + path, Object.assign({}, opts, { headers: Object.assign({}, headers, opts.headers || {}) }));
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  // ═══════════════════════════════════
  //  CALENDARS
  // ═══════════════════════════════════

  async function loadCalendars() {
    try {
      const data = await api('/api/calendars');
      calendars = data.calendars;
      renderCalendarList();
    } catch (err) { toast(err.message, 'error'); }
  }

  function renderCalendarList() {
    const list = $('#calendar-list');
    if (!calendars.length) {
      list.innerHTML = '<li class="no-events" style="cursor:default;border:none">No calendars yet</li>';
      return;
    }
    list.innerHTML = calendars.map(function(c) {
      return '<li data-id="' + c.id + '" class="' + (c.id === currentCalId ? 'active' : '') + '">' +
        '<span class="item-name">' + esc(c.name) + '</span>' +
      '</li>';
    }).join('');
    list.querySelectorAll('li[data-id]').forEach(function(li) {
      li.addEventListener('click', function() { selectCalendar(parseInt(li.dataset.id, 10)); });
    });
  }

  async function selectCalendar(id) {
    currentCalId = id;
    currentUpdateId = null;
    renderCalendarList();
    var cal = calendars.find(function(c) { return c.id === id; });
    if (!cal) return;

    $('#cal-title').textContent = cal.name;
    $('#cal-description').textContent = cal.description || '';
    var icsUrl = API + '/api/calendar/' + cal.slug + '.ics';
    $('#cal-ics-link').href = icsUrl;
    $('#cal-ics-link').textContent = icsUrl;
    $('#welcome-panel').style.display = 'none';
    $('#update-panel').style.display = 'none';
    $('#calendar-panel').style.display = '';

    if (window.innerWidth <= 768) $('#sidebar').classList.add('collapsed');
    loadEvents(id);
  }

  async function loadEvents(calId) {
    try {
      var data = await api('/api/calendars/' + calId + '/events');
      currentEvents = data.events;
      renderEvents();
    } catch (err) { toast(err.message, 'error'); }
  }

  function renderEvents() {
    var list = $('#events-list');
    if (!currentEvents.length) {
      list.innerHTML = '<div class="no-events">No events in this calendar. Click <b>+ Add Event</b> to create one.</div>';
      return;
    }
    list.innerHTML = currentEvents.map(function(ev) {
      var start = ev.all_day ? formatDate(ev.start_datetime) : formatDateTime(ev.start_datetime);
      var end = ev.all_day ? formatDate(ev.end_datetime) : formatDateTime(ev.end_datetime);
      return '<div class="event-card" data-id="' + ev.id + '">' +
        '<div class="event-info">' +
          '<h4>' + esc(ev.title) + '</h4>' +
          '<div class="event-meta">' +
            '<span>📅 ' + start + ' — ' + end + '</span>' +
            (ev.location ? '<span>📍 ' + esc(ev.location) + '</span>' : '') +
            (ev.recurrence ? '<span>🔁 ' + esc(ev.recurrence) + '</span>' : '') +
            (ev.all_day ? '<span>☀️ All day</span>' : '') +
          '</div>' +
          (ev.description ? '<p class="text-muted" style="margin-top:4px;font-size:13px">' + esc(ev.description) + '</p>' : '') +
        '</div>' +
        '<div class="event-actions">' +
          '<button class="btn btn-xs edit-event-btn" data-id="' + ev.id + '">Edit</button>' +
          '<button class="btn btn-xs btn-danger delete-event-btn" data-id="' + ev.id + '">Delete</button>' +
        '</div>' +
      '</div>';
    }).join('');

    list.querySelectorAll('.edit-event-btn').forEach(function(btn) {
      btn.addEventListener('click', function() { openEditEventModal(parseInt(btn.dataset.id, 10)); });
    });
    list.querySelectorAll('.delete-event-btn').forEach(function(btn) {
      btn.addEventListener('click', function() { confirmDeleteEvent(parseInt(btn.dataset.id, 10)); });
    });
  }

  function openNewCalendarModal() {
    $('#calendar-modal-title').textContent = 'New Calendar';
    $('#calendar-form').reset();
    $('#cal-edit-id').value = '';
    $('#calendar-modal').style.display = '';
  }

  function openEditCalendarModal() {
    var cal = calendars.find(function(c) { return c.id === currentCalId; });
    if (!cal) return;
    $('#calendar-modal-title').textContent = 'Edit Calendar';
    $('#cal-name').value = cal.name;
    $('#cal-slug').value = cal.slug;
    $('#cal-desc').value = cal.description || '';
    $('#cal-edit-id').value = cal.id;
    $('#calendar-modal').style.display = '';
  }

  async function handleCalendarSave(e) {
    e.preventDefault();
    var id = $('#cal-edit-id').value;
    var body = { name: $('#cal-name').value.trim(), slug: $('#cal-slug').value.trim(), description: $('#cal-desc').value.trim() };
    try {
      if (id) {
        await api('/api/calendars/' + id, { method: 'PUT', body: JSON.stringify(body) });
        toast('Calendar updated', 'success');
      } else {
        var data = await api('/api/calendars', { method: 'POST', body: JSON.stringify(body) });
        currentCalId = data.calendar.id;
        toast('Calendar created', 'success');
      }
      $('#calendar-modal').style.display = 'none';
      await loadCalendars();
      if (currentCalId) selectCalendar(currentCalId);
    } catch (err) { toast(err.message, 'error'); }
  }

  function confirmDeleteCalendar() {
    var cal = calendars.find(function(c) { return c.id === currentCalId; });
    if (!cal) return;
    showConfirm('Delete calendar "' + cal.name + '" and all its events?', async function() {
      try {
        await api('/api/calendars/' + currentCalId, { method: 'DELETE' });
        toast('Calendar deleted', 'success');
        currentCalId = null;
        $('#calendar-panel').style.display = 'none';
        $('#welcome-panel').style.display = '';
        loadCalendars();
      } catch (err) { toast(err.message, 'error'); }
    });
  }

  function autoSlug() {
    if (!$('#cal-edit-id').value) {
      $('#cal-slug').value = slugify($('#cal-name').value);
    }
  }

  function openNewEventModal() {
    $('#event-modal-title').textContent = 'New Event';
    $('#event-form').reset();
    $('#evt-edit-id').value = '';
    $('#evt-recurrence').style.display = 'none';
    setDefaultTimes();
    $('#event-modal').style.display = '';
  }

  function openEditEventModal(id) {
    var ev = currentEvents.find(function(e) { return e.id === id; });
    if (!ev) return;
    $('#event-modal-title').textContent = 'Edit Event';
    $('#evt-title').value = ev.title;
    $('#evt-start').value = toLocalInput(ev.start_datetime);
    $('#evt-end').value = toLocalInput(ev.end_datetime);
    $('#evt-allday').checked = !!ev.all_day;
    $('#evt-tz').value = ev.timezone || 'UTC';
    $('#evt-location').value = ev.location || '';
    $('#evt-desc').value = ev.description || '';
    $('#evt-edit-id').value = ev.id;
    if (ev.recurrence) {
      var preset = $('#evt-recurrence-preset');
      var match = Array.from(preset.options).find(function(o) { return o.value === ev.recurrence; });
      if (match) { preset.value = ev.recurrence; $('#evt-recurrence').style.display = 'none'; }
      else { preset.value = 'custom'; $('#evt-recurrence').style.display = ''; $('#evt-recurrence').value = ev.recurrence; }
    } else {
      $('#evt-recurrence-preset').value = '';
      $('#evt-recurrence').style.display = 'none';
      $('#evt-recurrence').value = '';
    }
    toggleAllDay();
    $('#event-modal').style.display = '';
  }

  async function handleEventSave(e) {
    e.preventDefault();
    var id = $('#evt-edit-id').value;
    var recurrence = '';
    var presetVal = $('#evt-recurrence-preset').value;
    if (presetVal === 'custom') recurrence = $('#evt-recurrence').value.trim();
    else recurrence = presetVal;

    var body = {
      title: $('#evt-title').value.trim(),
      startDatetime: new Date($('#evt-start').value).toISOString(),
      endDatetime: new Date($('#evt-end').value).toISOString(),
      allDay: $('#evt-allday').checked,
      timezone: $('#evt-tz').value,
      location: $('#evt-location').value.trim(),
      description: $('#evt-desc').value.trim(),
      recurrence: recurrence
    };
    try {
      if (id) {
        await api('/api/events/' + id, { method: 'PUT', body: JSON.stringify(body) });
        toast('Event updated', 'success');
      } else {
        await api('/api/calendars/' + currentCalId + '/events', { method: 'POST', body: JSON.stringify(body) });
        toast('Event created', 'success');
      }
      $('#event-modal').style.display = 'none';
      loadEvents(currentCalId);
    } catch (err) { toast(err.message, 'error'); }
  }

  function confirmDeleteEvent(id) {
    var ev = currentEvents.find(function(e) { return e.id === id; });
    if (!ev) return;
    showConfirm('Delete event "' + ev.title + '"?', async function() {
      try {
        await api('/api/events/' + id, { method: 'DELETE' });
        toast('Event deleted', 'success');
        loadEvents(currentCalId);
      } catch (err) { toast(err.message, 'error'); }
    });
  }

  function toggleAllDay() {
    var allDay = $('#evt-allday').checked;
    $('#evt-start').type = allDay ? 'date' : 'datetime-local';
    $('#evt-end').type = allDay ? 'date' : 'datetime-local';
  }

  function toggleCustomRrule() {
    var val = $('#evt-recurrence-preset').value;
    if (val === 'custom') { $('#evt-recurrence').style.display = ''; $('#evt-recurrence').focus(); }
    else { $('#evt-recurrence').style.display = 'none'; $('#evt-recurrence').value = val; }
  }

  function setDefaultTimes() {
    var now = new Date();
    now.setMinutes(0, 0, 0);
    now.setHours(now.getHours() + 1);
    var end = new Date(now.getTime() + 3600000);
    $('#evt-start').value = toLocalInput(now.toISOString());
    $('#evt-end').value = toLocalInput(end.toISOString());
  }

  // ═══════════════════════════════════
  //  UPDATES
  // ═══════════════════════════════════

  async function loadUpdates() {
    try {
      var data = await api('/api/admin/updates');
      updates = data.updates;
      renderUpdateList();
    } catch (err) { toast(err.message, 'error'); }
  }

  function renderUpdateList() {
    var list = $('#update-list');
    if (!updates.length) {
      list.innerHTML = '<li class="no-events" style="cursor:default;border:none">No updates yet</li>';
      return;
    }
    list.innerHTML = updates.map(function(u) {
      var badge = '';
      if (u.pinned) badge = '<span class="item-badge pinned">📌</span>';
      else if (!u.published) badge = '<span class="item-badge draft">Draft</span>';
      return '<li data-id="' + u.id + '" class="' + (u.id === currentUpdateId ? 'active' : '') + '">' +
        '<span class="item-name">' + esc(u.title) + '</span>' +
        badge +
      '</li>';
    }).join('');
    list.querySelectorAll('li[data-id]').forEach(function(li) {
      li.addEventListener('click', function() { selectUpdate(parseInt(li.dataset.id, 10)); });
    });
  }

  function selectUpdate(id) {
    currentUpdateId = id;
    currentCalId = null;
    renderUpdateList();
    renderCalendarList();
    var u = updates.find(function(x) { return x.id === id; });
    if (!u) return;

    $('#upd-title').textContent = u.title;
    $('#upd-summary').textContent = u.summary || '';

    var badges = '<span class="badge badge-cat">' + esc(u.category) + '</span>';
    badges += u.published
      ? '<span class="badge badge-published">Published</span>'
      : '<span class="badge badge-draft">Draft</span>';
    if (u.pinned) badges += '<span class="badge badge-pinned">Pinned</span>';
    $('#upd-badges').innerHTML = badges;

    $('#upd-content').innerHTML = u.content;

    var created = formatDateTime(u.created_at);
    var updated = formatDateTime(u.updated_at);
    var meta = 'Created: ' + created + ' · Updated: ' + updated;
    if (u.published_at) meta += ' · Published: ' + formatDateTime(u.published_at);
    meta += ' · Slug: ' + u.slug;
    $('#upd-meta').textContent = meta;

    $('#welcome-panel').style.display = 'none';
    $('#calendar-panel').style.display = 'none';
    $('#update-panel').style.display = '';

    if (window.innerWidth <= 768) $('#sidebar').classList.add('collapsed');
  }

  function openNewUpdateModal() {
    $('#update-modal-title').textContent = 'New Update';
    $('#update-form').reset();
    $('#upd-f-edit-id').value = '';
    $('#update-modal').style.display = '';
  }

  function openEditUpdateModal() {
    var u = updates.find(function(x) { return x.id === currentUpdateId; });
    if (!u) return;
    $('#update-modal-title').textContent = 'Edit Update';
    $('#upd-f-title').value = u.title;
    $('#upd-f-slug').value = u.slug;
    $('#upd-f-summary').value = u.summary || '';
    $('#upd-f-content').value = u.content;
    $('#upd-f-category').value = u.category || 'general';
    $('#upd-f-published').checked = !!u.published;
    $('#upd-f-pinned').checked = !!u.pinned;
    $('#upd-f-edit-id').value = u.id;
    $('#update-modal').style.display = '';
  }

  async function handleUpdateSave(e) {
    e.preventDefault();
    var id = $('#upd-f-edit-id').value;
    var body = {
      title: $('#upd-f-title').value.trim(),
      slug: $('#upd-f-slug').value.trim(),
      summary: $('#upd-f-summary').value.trim(),
      content: $('#upd-f-content').value.trim(),
      category: $('#upd-f-category').value,
      published: $('#upd-f-published').checked,
      pinned: $('#upd-f-pinned').checked
    };
    try {
      if (id) {
        await api('/api/admin/updates/' + id, { method: 'PUT', body: JSON.stringify(body) });
        toast('Update saved', 'success');
      } else {
        var data = await api('/api/admin/updates', { method: 'POST', body: JSON.stringify(body) });
        currentUpdateId = data.update.id;
        toast('Update created', 'success');
      }
      $('#update-modal').style.display = 'none';
      await loadUpdates();
      if (currentUpdateId) selectUpdate(currentUpdateId);
    } catch (err) { toast(err.message, 'error'); }
  }

  function confirmDeleteUpdate() {
    var u = updates.find(function(x) { return x.id === currentUpdateId; });
    if (!u) return;
    showConfirm('Delete update "' + u.title + '"?', async function() {
      try {
        await api('/api/admin/updates/' + currentUpdateId, { method: 'DELETE' });
        toast('Update deleted', 'success');
        currentUpdateId = null;
        $('#update-panel').style.display = 'none';
        $('#welcome-panel').style.display = '';
        loadUpdates();
      } catch (err) { toast(err.message, 'error'); }
    });
  }

  function autoUpdateSlug() {
    if (!$('#upd-f-edit-id').value) {
      $('#upd-f-slug').value = slugify($('#upd-f-title').value);
    }
  }

  // ── Shared ──
  function showConfirm(message, callback) {
    $('#confirm-message').textContent = message;
    confirmCallback = callback;
    $('#confirm-modal').style.display = '';
  }

  function copyIcsLink() {
    var url = $('#cal-ics-link').href;
    navigator.clipboard.writeText(url).then(function() { toast('ICS link copied!', 'info'); });
  }

  function toast(msg, type) {
    type = type || 'info';
    var el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.textContent = msg;
    $('#toast-container').appendChild(el);
    setTimeout(function() { el.remove(); }, 3500);
  }

  function esc(str) {
    var d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  function slugify(str) {
    return str.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  }

  function formatDateTime(dt) {
    return new Date(dt).toLocaleString(undefined, { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
  }

  function formatDate(dt) {
    return new Date(dt).toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' });
  }

  function toLocalInput(isoStr) {
    var d = new Date(isoStr);
    var offset = d.getTimezoneOffset();
    var local = new Date(d.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  }
})();
`;
}
