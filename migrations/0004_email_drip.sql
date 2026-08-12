-- Daily reading-email drip: tracks per-enrollment send state so the
-- mailer worker's cron (0 12 * * *) knows what's due and can skip
-- already-emailed-today rows.

ALTER TABLE progress ADD COLUMN started_at TEXT;
ALTER TABLE progress ADD COLUMN last_emailed_day INTEGER NOT NULL DEFAULT 0;
ALTER TABLE progress ADD COLUMN last_emailed_at TEXT;
ALTER TABLE progress ADD COLUMN email_opt_out INTEGER NOT NULL DEFAULT 0;
