-- Preserve repeat beta registrations as append-only history while application
-- duplicate checks continue to block normal same-phone, same-night submissions.
DROP INDEX IF EXISTS idx_guests_phone_event;

CREATE INDEX IF NOT EXISTS idx_guests_phone_event
ON guests (
  venue_id,
  phone,
  event_date
);
