-- Seed-type classification (matches the Studio's seed types) and
-- publish/ordering state for the marketing site's series list.

ALTER TABLE series ADD COLUMN kind TEXT NOT NULL DEFAULT 'idea' CHECK (kind IN ('book', 'person', 'passage', 'idea'));
ALTER TABLE series ADD COLUMN status TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('live', 'scheduled', 'draft', 'retired'));
ALTER TABLE series ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
