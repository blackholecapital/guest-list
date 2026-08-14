-- Weekly contest progression and idempotent day-of SMS reminders.
ALTER TABLE contest_settings ADD COLUMN current_round INTEGER NOT NULL DEFAULT 1;
ALTER TABLE contest_settings ADD COLUMN weekly_rounds INTEGER NOT NULL DEFAULT 4;
ALTER TABLE contest_settings ADD COLUMN reminder_message TEXT NOT NULL DEFAULT 'Reminder, {name}: {round} is tonight at {venue} on {date} at {time}. Bring a valid ID and arrive ready to check in. Reply STOP to opt out.';

UPDATE contest_settings
SET
  event_date = '2026-08-19',
  current_round = 1,
  weekly_rounds = 4,
  approval_message = CASE
    WHEN approval_message = 'Congratulations, {name}! You''ve been selected for the {title} at {venue} on {date} at {time}. Reply STOP to opt out.'
      THEN 'Congratulations, {name}! You''ve been selected for {round} of the {title} at {venue} on {date} at {time}. Reply STOP to opt out.'
    ELSE approval_message
  END,
  updated_at = CURRENT_TIMESTAMP
WHERE id = 1;

ALTER TABLE contest_entries ADD COLUMN assigned_event_date TEXT;
ALTER TABLE contest_entries ADD COLUMN assigned_event_time TEXT;
ALTER TABLE contest_entries ADD COLUMN assigned_round INTEGER;

UPDATE contest_entries
SET
  assigned_event_date = (SELECT event_date FROM contest_settings WHERE id = 1),
  assigned_event_time = (SELECT event_time FROM contest_settings WHERE id = 1),
  assigned_round = 1
WHERE status = 'approved';

CREATE TABLE contest_sms_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_id INTEGER NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('day_of_reminder')),
  event_date TEXT NOT NULL,
  queued_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (entry_id, notification_type, event_date),
  FOREIGN KEY (entry_id) REFERENCES contest_entries(id) ON DELETE CASCADE
);

CREATE INDEX idx_contest_reminder_candidates
ON contest_entries(status, assigned_event_date, sms_opt_in);
