CREATE TABLE IF NOT EXISTS demo_settings (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  test_phone TEXT,
  unlimited_joins INTEGER NOT NULL DEFAULT 0,
  bypass_duplicates INTEGER NOT NULL DEFAULT 0,
  always_send_sms INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO demo_settings (
  id,
  test_phone,
  unlimited_joins,
  bypass_duplicates,
  always_send_sms
)
VALUES (
  1,
  '6179016112',
  1,
  1,
  1
);
