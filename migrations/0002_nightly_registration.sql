ALTER TABLE guests ADD COLUMN event_date TEXT;

CREATE UNIQUE INDEX idx_guests_phone_event
ON guests (
  venue_id,
  phone,
  event_date
);
