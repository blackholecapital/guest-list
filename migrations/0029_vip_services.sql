-- Promoter-attributed VIP and bottle-service lead funnel.

ALTER TABLE venues
ADD COLUMN vip_services_enabled INTEGER NOT NULL DEFAULT 0;

CREATE TABLE vip_services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venue_id INTEGER NOT NULL,
  slot INTEGER NOT NULL CHECK (slot BETWEEN 1 AND 4),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  regular_price_cents INTEGER NOT NULL DEFAULT 0,
  discount_percent INTEGER NOT NULL DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 50),
  active INTEGER NOT NULL DEFAULT 0,
  image_key TEXT,
  image_content_type TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (venue_id, slot),
  FOREIGN KEY (venue_id) REFERENCES venues(id)
);

ALTER TABLE guests ADD COLUMN vip_service_id INTEGER;
ALTER TABLE guests ADD COLUMN vip_service_name TEXT;
ALTER TABLE guests ADD COLUMN vip_regular_price_cents INTEGER;
ALTER TABLE guests ADD COLUMN vip_discount_percent INTEGER;
ALTER TABLE guests ADD COLUMN vip_quoted_price_cents INTEGER;

CREATE TABLE vip_registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venue_id INTEGER NOT NULL,
  promoter_id INTEGER NOT NULL,
  service_id INTEGER NOT NULL,
  guest_id INTEGER NOT NULL,
  event_date TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  party_size INTEGER NOT NULL DEFAULT 1,
  service_name TEXT NOT NULL,
  regular_price_cents INTEGER NOT NULL DEFAULT 0,
  discount_percent INTEGER NOT NULL DEFAULT 0,
  quoted_price_cents INTEGER NOT NULL DEFAULT 0,
  sms_opt_in INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (venue_id, phone, event_date),
  FOREIGN KEY (venue_id) REFERENCES venues(id),
  FOREIGN KEY (promoter_id) REFERENCES promoters(id),
  FOREIGN KEY (service_id) REFERENCES vip_services(id),
  FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE
);

CREATE INDEX idx_vip_registrations_promoter_date
ON vip_registrations (promoter_id, event_date, created_at);

CREATE INDEX idx_vip_registrations_service_date
ON vip_registrations (service_id, event_date, created_at);

INSERT INTO vip_services (
  venue_id, slot, name, description, regular_price_cents, discount_percent, active
)
SELECT id, 1, 'VIP Bottle Service',
  'Reserve a VIP table and bottle service with priority host assistance when you arrive.',
  30000, 30, 1
FROM venues
WHERE slug = 'scores-tampa';

INSERT INTO vip_services (
  venue_id, slot, name, description, regular_price_cents, discount_percent, active
)
SELECT id, 2, 'Special 1', 'Add a rotating VIP offer, dinner package, or event promotion.', 0, 10, 0
FROM venues
WHERE slug = 'scores-tampa';

INSERT INTO vip_services (
  venue_id, slot, name, description, regular_price_cents, discount_percent, active
)
SELECT id, 3, 'Special 2', 'Add a rotating VIP offer, celebration package, or event promotion.', 0, 10, 0
FROM venues
WHERE slug = 'scores-tampa';

INSERT INTO vip_services (
  venue_id, slot, name, description, regular_price_cents, discount_percent, active
)
SELECT id, 4, 'Special 3', 'Add a rotating VIP offer, premium table, or event promotion.', 0, 10, 0
FROM venues
WHERE slug = 'scores-tampa';
