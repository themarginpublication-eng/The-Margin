-- Deferred publish (essays) / deferred send (broadcasts), both polled
-- by the-margin-mailer's non-daily cron tick.

ALTER TABLE essays ADD COLUMN scheduled_at TEXT;
ALTER TABLE broadcasts ADD COLUMN scheduled_at TEXT;
ALTER TABLE broadcasts ADD COLUMN sent_at TEXT;
