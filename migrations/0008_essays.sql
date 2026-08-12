-- Long-form articles (the biweekly essay, separate from daily series
-- readings). See 0010/0012/0015 for body content, scheduling, archiving.

CREATE TABLE IF NOT EXISTS essays (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  passage_ref     TEXT,
  series_id       TEXT REFERENCES series(id) ON DELETE SET NULL,
  topic           TEXT,
  summary         TEXT,
  search_keywords TEXT,
  substack_url    TEXT,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
