PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS name_generator_pool_entries (
  id TEXT PRIMARY KEY,
  table_key TEXT NOT NULL CHECK (table_key IN ('table_1', 'table_2')),
  value TEXT NOT NULL,
  normalized_value TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (table_key, normalized_value)
);

CREATE INDEX IF NOT EXISTS idx_name_generator_pool_entries_table
  ON name_generator_pool_entries (table_key, value);

CREATE TABLE IF NOT EXISTS name_generator_used_names (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL CHECK (source IN ('catalog', 'manual')),
  source_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_name_generator_used_names_source
  ON name_generator_used_names (source, source_id);

INSERT INTO name_generator_used_names (
  id,
  name,
  normalized_name,
  source,
  source_id
)
SELECT
  'catalog-' || id,
  trim(name),
  lower(
    trim(
      replace(
        replace(
          replace(
            replace(
              replace(
                replace(
                  replace(replace(replace(name, char(9), ' '), char(10), ' '), char(13), ' '),
                  '  ',
                  ' '
                ),
                '  ',
                ' '
              ),
              '  ',
              ' '
            ),
            '  ',
            ' '
          ),
          '  ',
          ' '
        ),
        '  ',
        ' '
      )
    )
  ),
  'catalog',
  id
FROM kebaya_items
WHERE trim(name) != ''
ON CONFLICT(normalized_name) DO UPDATE SET
  name = excluded.name,
  source = excluded.source,
  source_id = excluded.source_id,
  updated_at = CURRENT_TIMESTAMP;
