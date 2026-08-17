-- Location Assistance is a venue-wide exception path and is disabled by default.
ALTER TABLE venues
ADD COLUMN location_assistance_enabled INTEGER NOT NULL DEFAULT 0;
