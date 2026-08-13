-- Links a Studio draft to the series row it's building, so essays and
-- publishing can target the right series before the draft is finished.
-- Null until the Studio's Series tab is saved for the first time.

ALTER TABLE studio_drafts ADD COLUMN series_id TEXT REFERENCES series(id) ON DELETE SET NULL;
