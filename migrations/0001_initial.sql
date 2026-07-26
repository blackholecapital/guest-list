PRAGMA foreign_keys = ON;

CREATE TABLE venues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 457,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE promoters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venue_id INTEGER NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (venue_id, slug),
  FOREIGN KEY (venue_id) REFERENCES venues(id)
);

CREATE TABLE guests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venue_id INTEGER NOT NULL,
  promoter_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  party_size INTEGER NOT NULL DEFAULT 1,
  submitted_latitude REAL NOT NULL,
  submitted_longitude REAL NOT NULL,
  submitted_accuracy_meters REAL,
  calculated_distance_meters REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'registered'
    CHECK (status IN ('registered', 'checked_in')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  checked_in_at TEXT,
  FOREIGN KEY (venue_id) REFERENCES venues(id),
  FOREIGN KEY (promoter_id) REFERENCES promoters(id)
);

CREATE INDEX idx_guests_created_at ON guests(created_at);
CREATE INDEX idx_guests_promoter_id ON guests(promoter_id);
CREATE INDEX idx_guests_status ON guests(status);
CREATE INDEX idx_promoters_slug ON promoters(slug);

-- Provisional map coordinates. Replace with verified entrance/map-pin coordinates.
INSERT INTO venues (
  slug,
  name,
  address,
  latitude,
  longitude,
  radius_meters
) VALUES (
  'scores-tampa',
  'Scores Tampa',
  '2310 N Dale Mabry Hwy, Tampa, FL 33607',
  27.9620,
  -82.5060,
  457
);

INSERT INTO promoters (venue_id, slug, name)
SELECT id, 'mike', 'Mike D.'
FROM venues WHERE slug = 'scores-tampa';

INSERT INTO promoters (venue_id, slug, name)
SELECT id, 'sarah', 'Sarah K.'
FROM venues WHERE slug = 'scores-tampa';

INSERT INTO promoters (venue_id, slug, name)
SELECT id, 'james', 'James R.'
FROM venues WHERE slug = 'scores-tampa';
