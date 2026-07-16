-- The Margin — lightweight CMS for the marketing site
-- Each row overrides one data-screen-label block (or a head/body injection
-- point) from site/*.html. Keys are defined in app/src/lib/site-manifest.json.
-- Absence of a row means "use the default copy baked into the HTML file."

CREATE TABLE IF NOT EXISTS site_content (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
