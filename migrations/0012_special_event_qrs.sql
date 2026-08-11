-- Durable special-event flyers and their conversion attribution.

ALTER TABLE qr_codes ADD COLUMN event_name TEXT;
ALTER TABLE qr_codes ADD COLUMN is_special_event INTEGER NOT NULL DEFAULT 0;
ALTER TABLE qr_codes ADD COLUMN deleted_at TEXT;

-- Preserve event flyers created before this dashboard existed. The existing
-- admin generator uniquely used 10,000-use QR codes for special events.
UPDATE qr_codes
SET is_special_event = 1,
    event_name = 'Special Event – ' || substr(expires_at, 1, 10)
WHERE max_uses = 10000
  AND event_name IS NULL;

CREATE INDEX IF NOT EXISTS idx_qr_codes_special_events
ON qr_codes (is_special_event, deleted_at, created_at);

CREATE INDEX IF NOT EXISTS idx_guests_qr_token
ON guests (qr_token);
