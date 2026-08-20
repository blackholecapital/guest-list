-- Canonical special events with persistent, promoter-attributed share links.

ALTER TABLE promoters ADD COLUMN promoter_kind TEXT NOT NULL DEFAULT 'regular';
ALTER TABLE promoters ADD COLUMN temporary_slot INTEGER;
ALTER TABLE guests ADD COLUMN special_event_id INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS idx_promoters_temporary_slot
ON promoters (venue_id, temporary_slot)
WHERE temporary_slot IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_guests_special_event
ON guests (special_event_id, promoter_id, created_at);

CREATE TABLE special_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venue_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,
  FOREIGN KEY (venue_id) REFERENCES venues(id)
);

CREATE TABLE special_event_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  promoter_id INTEGER NOT NULL,
  display_name TEXT NOT NULL,
  legacy_qr_code_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (event_id, promoter_id),
  FOREIGN KEY (event_id) REFERENCES special_events(id),
  FOREIGN KEY (promoter_id) REFERENCES promoters(id),
  FOREIGN KEY (legacy_qr_code_id) REFERENCES qr_codes(id)
);

CREATE TABLE special_event_scans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  promoter_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES special_events(id),
  FOREIGN KEY (promoter_id) REFERENCES promoters(id)
);

CREATE INDEX idx_special_event_assignments_promoter
ON special_event_assignments (promoter_id, event_id);

CREATE INDEX idx_special_event_scans_event_promoter
ON special_event_scans (event_id, promoter_id, created_at);

-- Preserve the existing event flyers as one-assignment canonical events.
INSERT INTO special_events (id, venue_id, name, expires_at, created_at)
SELECT q.id, p.venue_id, COALESCE(q.event_name, 'Special Event'), q.expires_at, q.created_at
FROM qr_codes q
JOIN promoters p ON p.id = q.promoter_id
WHERE q.is_special_event = 1
  AND q.deleted_at IS NULL;

INSERT INTO special_event_assignments (event_id, promoter_id, display_name, legacy_qr_code_id, created_at)
SELECT q.id, q.promoter_id, p.name, q.id, q.created_at
FROM qr_codes q
JOIN promoters p ON p.id = q.promoter_id
WHERE q.is_special_event = 1
  AND q.deleted_at IS NULL;

-- Ten reusable temporary promoter slots. Names are assigned by Admin as needed.
INSERT INTO promoters (
  venue_id, slug, name, active, pass_limit, reset_days, passes_used,
  last_reset_at, promoter_kind, temporary_slot
)
SELECT v.id, 'temp-' || n.slot, 'Temporary ' || n.slot, 0, 1, 1, 0,
       CURRENT_TIMESTAMP, 'temporary', n.slot
FROM venues v
CROSS JOIN (
  SELECT 1 AS slot UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
  UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10
) n
WHERE v.slug = 'scores-tampa'
  AND NOT EXISTS (
    SELECT 1 FROM promoters p
    WHERE p.venue_id = v.id AND p.temporary_slot = n.slot
  );
