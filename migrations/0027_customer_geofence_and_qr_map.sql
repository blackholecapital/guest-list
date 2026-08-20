-- Separate customer registration rules from promoter QR-generation protection.
-- Promoter generation coordinates have been retained since migration 0016;
-- this index keeps the new chronological admin map fast.
ALTER TABLE venues
ADD COLUMN customer_geofence_enabled INTEGER NOT NULL DEFAULT 1;

ALTER TABLE guests
ADD COLUMN customer_location_status TEXT NOT NULL DEFAULT 'captured';

CREATE INDEX IF NOT EXISTS idx_promoter_qr_attempts_created
ON promoter_qr_generation_attempts (created_at DESC);

