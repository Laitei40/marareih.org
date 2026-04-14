-- Updates / News table
CREATE TABLE IF NOT EXISTS updates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  summary TEXT,
  category TEXT DEFAULT 'general',
  published INTEGER DEFAULT 0,
  pinned INTEGER DEFAULT 0,
  published_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_updates_published ON updates(published, published_at DESC);
CREATE INDEX idx_updates_slug ON updates(slug);
CREATE INDEX idx_updates_category ON updates(category);
