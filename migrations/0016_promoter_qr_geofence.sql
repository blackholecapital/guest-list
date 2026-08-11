-- Audit every promoter QR generation attempt and retain its geographic origin.
CREATE TABLE IF NOT EXISTS promoter_qr_generation_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  promoter_id INTEGER NOT NULL,
  qr_code_id INTEGER,
  latitude REAL,
  longitude REAL,
  accuracy_meters REAL,
  distance_meters REAL,
  location_status TEXT NOT NULL DEFAULT 'captured',
  outcome TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (promoter_id) REFERENCES promoters(id),
  FOREIGN KEY (qr_code_id) REFERENCES qr_codes(id)
);

CREATE INDEX IF NOT EXISTS idx_promoter_qr_attempts_promoter_created
ON promoter_qr_generation_attempts (promoter_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_promoter_qr_attempts_qr
ON promoter_qr_generation_attempts (qr_code_id);

CREATE INDEX IF NOT EXISTS idx_promoter_qr_attempts_outcome
ON promoter_qr_generation_attempts (outcome, created_at DESC);
