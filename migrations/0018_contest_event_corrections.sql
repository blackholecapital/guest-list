UPDATE contest_settings
SET
  title = '$1K Lingerie Contest',
  event_date = '2026-08-19',
  updated_at = CURRENT_TIMESTAMP
WHERE id = 1
  AND event_date IN ('', '2026-08-20');
