-- The Margin — Studio (authoring backend for series drafts)
-- One row per draft; the whole editable state lives in data_json (see
-- app/src/lib/studio-data.ts for its shape). Publishing a draft is a
-- separate, later step that hands off to the `series` table.

CREATE TABLE IF NOT EXISTS studio_drafts (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  title       TEXT NOT NULL,
  data_json   TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_studio_drafts_user ON studio_drafts(user_id);
