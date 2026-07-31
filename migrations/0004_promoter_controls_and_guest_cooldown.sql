-- Promoter inventory controls + guest pass protection

ALTER TABLE promoters ADD COLUMN pass_limit INTEGER NOT NULL DEFAULT 10;
ALTER TABLE promoters ADD COLUMN reset_days INTEGER NOT NULL DEFAULT 3;
ALTER TABLE promoters ADD COLUMN passes_used INTEGER NOT NULL DEFAULT 0;
ALTER TABLE promoters ADD COLUMN last_reset_at TEXT;

ALTER TABLE venues ADD COLUMN customer_cooldown_days INTEGER NOT NULL DEFAULT 14;
ALTER TABLE venues ADD COLUMN geofence_enabled INTEGER NOT NULL DEFAULT 1;

ALTER TABLE guests ADD COLUMN qr_token TEXT;
ALTER TABLE guests ADD COLUMN free_pass_claimed_at TEXT;

CREATE TABLE IF NOT EXISTS qr_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  promoter_id INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  max_uses INTEGER NOT NULL DEFAULT 1,
  used_count INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (promoter_id) REFERENCES promoters(id)
);

CREATE INDEX IF NOT EXISTS idx_qr_codes_token ON qr_codes(token);
CREATE INDEX IF NOT EXISTS idx_guests_phone ON guests(phone);
