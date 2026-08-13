CREATE TABLE contest_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  title TEXT NOT NULL DEFAULT '$1K Lingerie Contest',
  event_date TEXT NOT NULL DEFAULT '2026-08-20',
  event_time TEXT NOT NULL DEFAULT '',
  venue_name TEXT NOT NULL DEFAULT 'Scores Tampa',
  venue_address TEXT NOT NULL DEFAULT '2310 N Dale Mabry Hwy, Tampa, FL 33607',
  approval_message TEXT NOT NULL DEFAULT 'Congratulations, {name}! You''ve been selected for the {title} at {venue} on {date} at {time}. Reply STOP to opt out.',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO contest_settings (id) VALUES (1);

CREATE TABLE contest_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  date_of_birth TEXT NOT NULL,
  sms_opt_in INTEGER NOT NULL DEFAULT 0,
  age_confirmed INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE contest_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_id INTEGER NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (entry_id) REFERENCES contest_entries(id) ON DELETE CASCADE
);

CREATE INDEX idx_contest_entries_status_created ON contest_entries(status, created_at DESC);
CREATE INDEX idx_contest_photos_entry ON contest_photos(entry_id);
