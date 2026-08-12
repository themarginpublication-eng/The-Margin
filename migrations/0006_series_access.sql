-- Paywall-style gating: how many days are free before a series requires
-- signup, and whether it's gated at all.

ALTER TABLE series ADD COLUMN access TEXT NOT NULL DEFAULT 'gated' CHECK (access IN ('gated', 'open'));
ALTER TABLE series ADD COLUMN free_days INTEGER NOT NULL DEFAULT 2;
