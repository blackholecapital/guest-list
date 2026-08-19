ALTER TABLE promoters ADD COLUMN email TEXT;

CREATE UNIQUE INDEX idx_promoters_email
ON promoters (email COLLATE NOCASE)
WHERE email IS NOT NULL AND email != '';

CREATE TABLE promoter_sessions (
  token_hash TEXT PRIMARY KEY,
  promoter_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (promoter_id) REFERENCES promoters(id) ON DELETE CASCADE
);

CREATE INDEX idx_promoter_sessions_promoter
ON promoter_sessions(promoter_id);

CREATE INDEX idx_promoter_sessions_expires
ON promoter_sessions(expires_at);

CREATE TABLE promoter_account_tokens (
  token_hash TEXT PRIMARY KEY,
  promoter_id INTEGER NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('invite', 'reset')),
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (promoter_id) REFERENCES promoters(id) ON DELETE CASCADE
);

CREATE INDEX idx_promoter_account_tokens_promoter
ON promoter_account_tokens(promoter_id, purpose, created_at);
