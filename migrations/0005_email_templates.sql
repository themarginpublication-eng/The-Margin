-- Editable subject/intro copy for the mailer's transactional emails,
-- keyed by template name (e.g. 'daily-note', 'welcome-later').

CREATE TABLE IF NOT EXISTS email_templates (
  key         TEXT PRIMARY KEY,
  subject     TEXT,
  intro_html  TEXT,
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
