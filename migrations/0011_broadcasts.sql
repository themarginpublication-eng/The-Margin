-- One-off email campaigns sent via the-margin-mailer's /broadcast
-- endpoint (POST, x-trigger-key auth) to a filtered recipient list.

CREATE TABLE IF NOT EXISTS broadcasts (
  id                TEXT PRIMARY KEY,
  subject           TEXT NOT NULL,
  body_html         TEXT NOT NULL,
  recipient_filter  TEXT NOT NULL,
  recipient_label   TEXT NOT NULL,
  sent_count        INTEGER NOT NULL DEFAULT 0,
  failed_count      INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
