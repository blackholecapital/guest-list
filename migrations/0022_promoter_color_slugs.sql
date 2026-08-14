-- Replace the original placeholder-name URLs with stable color-based URLs.
UPDATE promoters SET name = 'Blue' WHERE slug = 'mike' AND name IN ('Mike', 'Mike D', 'Mike D.');
UPDATE promoters SET name = 'Yellow' WHERE slug = 'james' AND name IN ('James', 'James R', 'James R.');
UPDATE promoters SET name = 'Red' WHERE slug = 'sarah' AND name IN ('Sarah', 'Sarah K', 'Sarah K.');

UPDATE promoters SET slug = 'blue' WHERE slug = 'mike';
UPDATE promoters SET slug = 'yellow' WHERE slug = 'james';
UPDATE promoters SET slug = 'red' WHERE slug = 'sarah';

-- Repair the session store automatically if migration 0021 was skipped during rollout.
CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash TEXT PRIMARY KEY,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at
ON admin_sessions(expires_at);
