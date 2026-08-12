-- Reader contact fields synced to a Notion "Readers" database
-- (NOTION_READERS_DATABASE_ID / NOTION_TOKEN, used by the app worker).

ALTER TABLE users ADD COLUMN phone TEXT;
ALTER TABLE users ADD COLUMN notion_page_id TEXT;
