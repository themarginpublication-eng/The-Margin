-- The essay's own reading view (site/reading-view.html): full body,
-- the passage text it annotates, and inline margin-note annotations.

ALTER TABLE essays ADD COLUMN body TEXT;
ALTER TABLE essays ADD COLUMN passage_text TEXT;
ALTER TABLE essays ADD COLUMN annotations_json TEXT NOT NULL DEFAULT '[]';
