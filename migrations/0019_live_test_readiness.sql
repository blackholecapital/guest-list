-- Live reporting controls and server-managed promoter login credentials.
ALTER TABLE venues ADD COLUMN weekly_reset_day INTEGER NOT NULL DEFAULT 1;

ALTER TABLE promoters ADD COLUMN login_username TEXT;
ALTER TABLE promoters ADD COLUMN password_hash TEXT;
ALTER TABLE promoters ADD COLUMN password_salt TEXT;

UPDATE promoters
SET login_username = CASE slug
  WHEN 'mike' THEN 'Blue'
  WHEN 'james' THEN 'Yellow'
  WHEN 'sarah' THEN 'Red'
  ELSE name
END
WHERE login_username IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_promoters_login_username
ON promoters (login_username COLLATE NOCASE)
WHERE login_username IS NOT NULL;
