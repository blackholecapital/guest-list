-- Beta-only fallback registrations when a guest cannot enable phone location.
ALTER TABLE guests ADD COLUMN location_exception INTEGER NOT NULL DEFAULT 0;
ALTER TABLE guests ADD COLUMN exception_reason TEXT;
ALTER TABLE guests ADD COLUMN confirmation_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_guests_confirmation_code
ON guests (confirmation_code)
WHERE confirmation_code IS NOT NULL;
