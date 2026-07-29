-- Blog v1. Public soft-sell funnel (styling tips / inspiration → booking) plus an
-- admin authoring surface. Bodies are stored as Tiptap ProseMirror JSON and rendered
-- server-side through a controlled node allowlist (no HTML, no sanitizer needed).
CREATE TABLE blog_authors (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  avatar_url TEXT NOT NULL,
  bio        TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE blog_posts (
  id            TEXT PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,
  title         TEXT NOT NULL,
  excerpt       TEXT NOT NULL DEFAULT '',      -- empty = auto-fallback at render
  cover_url     TEXT NOT NULL DEFAULT '',      -- required to publish, enforced in action
  body_json     TEXT NOT NULL DEFAULT '{}',    -- Tiptap ProseMirror JSON
  author_id     TEXT REFERENCES blog_authors(id),
  published     INTEGER NOT NULL DEFAULT 0 CHECK (published IN (0,1)),
  -- repurposing tracker (admin-only, never rendered publicly)
  shared_x       INTEGER NOT NULL DEFAULT 0 CHECK (shared_x IN (0,1)),
  shared_threads INTEGER NOT NULL DEFAULT 0 CHECK (shared_threads IN (0,1)),
  made_video     INTEGER NOT NULL DEFAULT 0 CHECK (made_video IN (0,1)),
  created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_at  TEXT                            -- set when first published
);

CREATE INDEX idx_blog_posts_published ON blog_posts(published, published_at);
