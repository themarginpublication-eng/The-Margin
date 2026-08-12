-- recipient_filter = 'custom': a JSON array of explicit addresses.
ALTER TABLE broadcasts ADD COLUMN custom_emails TEXT;
