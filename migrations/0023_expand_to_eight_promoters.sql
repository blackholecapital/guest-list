-- Expand Scores Tampa from three promoter identities to eight.
-- Each promoter keeps an independent login, QR namespace, pass inventory, and analytics attribution.

INSERT INTO promoters (
  venue_id,
  slug,
  name,
  active,
  pass_limit,
  reset_days,
  passes_used,
  last_reset_at,
  login_username
)
SELECT id, 'green', 'Green', 1, 25, 1, 0, CURRENT_TIMESTAMP, 'Green'
FROM venues
WHERE slug = 'scores-tampa'
  AND NOT EXISTS (SELECT 1 FROM promoters WHERE slug = 'green');

INSERT INTO promoters (
  venue_id,
  slug,
  name,
  active,
  pass_limit,
  reset_days,
  passes_used,
  last_reset_at,
  login_username
)
SELECT id, 'purple', 'Purple', 1, 25, 1, 0, CURRENT_TIMESTAMP, 'Purple'
FROM venues
WHERE slug = 'scores-tampa'
  AND NOT EXISTS (SELECT 1 FROM promoters WHERE slug = 'purple');

INSERT INTO promoters (
  venue_id,
  slug,
  name,
  active,
  pass_limit,
  reset_days,
  passes_used,
  last_reset_at,
  login_username
)
SELECT id, 'orange', 'Orange', 1, 25, 1, 0, CURRENT_TIMESTAMP, 'Orange'
FROM venues
WHERE slug = 'scores-tampa'
  AND NOT EXISTS (SELECT 1 FROM promoters WHERE slug = 'orange');

INSERT INTO promoters (
  venue_id,
  slug,
  name,
  active,
  pass_limit,
  reset_days,
  passes_used,
  last_reset_at,
  login_username
)
SELECT id, 'teal', 'Teal', 1, 25, 1, 0, CURRENT_TIMESTAMP, 'Teal'
FROM venues
WHERE slug = 'scores-tampa'
  AND NOT EXISTS (SELECT 1 FROM promoters WHERE slug = 'teal');

INSERT INTO promoters (
  venue_id,
  slug,
  name,
  active,
  pass_limit,
  reset_days,
  passes_used,
  last_reset_at,
  login_username
)
SELECT id, 'pink', 'Pink', 1, 25, 1, 0, CURRENT_TIMESTAMP, 'Pink'
FROM venues
WHERE slug = 'scores-tampa'
  AND NOT EXISTS (SELECT 1 FROM promoters WHERE slug = 'pink');
