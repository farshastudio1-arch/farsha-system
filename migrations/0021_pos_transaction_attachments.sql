PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS pos_transaction_attachments (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('customer_photo', 'id_document')),
  r2_key TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL CHECK (size >= 0),
  width INTEGER,
  height INTEGER,
  original_filename TEXT NOT NULL DEFAULT '',
  capture_source TEXT NOT NULL CHECK (capture_source IN ('webcam', 'upload')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deleted')),
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_by TEXT,
  deleted_at TEXT,
  FOREIGN KEY (transaction_id) REFERENCES pos_transactions(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pos_transaction_attachments_active_kind
  ON pos_transaction_attachments (transaction_id, kind)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_pos_transaction_attachments_transaction
  ON pos_transaction_attachments (transaction_id, status);

CREATE INDEX IF NOT EXISTS idx_pos_transaction_attachments_kind
  ON pos_transaction_attachments (kind, status);

CREATE INDEX IF NOT EXISTS idx_pos_transaction_attachments_created
  ON pos_transaction_attachments (created_at);
