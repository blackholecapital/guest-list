-- Coordinates already exist on every guest registration. This composite index
-- keeps the admin map query fast as registration volume grows.
CREATE INDEX IF NOT EXISTS idx_guests_registration_map
ON guests (created_at, promoter_id, submitted_latitude, submitted_longitude);
