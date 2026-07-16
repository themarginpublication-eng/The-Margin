-- The Margin — initial schema (Cloudflare D1 / SQLite)
-- Mirrors Backend Blueprint.html section 02 (data model), plus a waitlist
-- table for the marketing site's pre-launch popup / subscribe forms.

CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE,
  username       TEXT NOT NULL UNIQUE,
  password_hash  TEXT,                          -- null when the user only signs in with Google
  email_verified INTEGER NOT NULL DEFAULT 0,     -- 0/1
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS auth_identities (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider      TEXT NOT NULL CHECK (provider IN ('password', 'google')),
  provider_uid  TEXT,                            -- Google's account id, when applicable
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (provider, provider_uid)
);
CREATE INDEX IF NOT EXISTS idx_auth_identities_user ON auth_identities(user_id);

CREATE TABLE IF NOT EXISTS series (
  id          TEXT PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  subtitle    TEXT,
  passage     TEXT,
  total_days  INTEGER NOT NULL,
  days_json   TEXT NOT NULL,                     -- JSON array: each morning's verse + reading + move
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS progress (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  series_id       TEXT NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  current_day     INTEGER NOT NULL DEFAULT 1,
  completed_days  TEXT NOT NULL DEFAULT '[]',     -- JSON array of ints
  last_read_at    TEXT,
  UNIQUE (user_id, series_id)
);
CREATE INDEX IF NOT EXISTS idx_progress_user ON progress(user_id);

CREATE TABLE IF NOT EXISTS waitlist (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  source      TEXT,                              -- e.g. 'launch-popup', 'index', 'subscribe'
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
