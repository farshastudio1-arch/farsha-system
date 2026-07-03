CREATE TABLE IF NOT EXISTS media_albums (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_media_albums_name ON media_albums (name);

CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL CHECK (size >= 0),
  width INTEGER,
  height INTEGER,
  title TEXT NOT NULL,
  alt_text TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  album_id TEXT,
  source_area TEXT NOT NULL DEFAULT 'media-library',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (album_id) REFERENCES media_albums(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_media_assets_album_id ON media_assets (album_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_created_at ON media_assets (created_at);
CREATE INDEX IF NOT EXISTS idx_media_assets_source_area ON media_assets (source_area);
