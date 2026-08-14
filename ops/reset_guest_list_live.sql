-- ONE-TIME LIVE CUTOVER. Back up D1 before running this file.
-- Clears guest-list analytics/testing records without touching venue,
-- promoter configuration, contest entries, or contest photos.

DELETE FROM promoter_qr_generation_attempts;
DELETE FROM guests;
DELETE FROM qr_codes;

UPDATE promoters
SET passes_used = 0,
    last_reset_at = CURRENT_TIMESTAMP;

UPDATE demo_settings
SET unlimited_joins = 0,
    bypass_duplicates = 0,
    always_send_sms = 0
WHERE id = 1;

DELETE FROM sqlite_sequence
WHERE name IN ('guests', 'qr_codes', 'promoter_qr_generation_attempts');

SELECT 'guests' AS table_name, COUNT(*) AS remaining FROM guests
UNION ALL
SELECT 'qr_codes', COUNT(*) FROM qr_codes
UNION ALL
SELECT 'promoter_qr_generation_attempts', COUNT(*) FROM promoter_qr_generation_attempts;
