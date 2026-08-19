-- Preserve venue history while allowing a promoter slot to start fresh after staff turnover.
ALTER TABLE promoters ADD COLUMN stats_reset_at TEXT NOT NULL DEFAULT '1970-01-01 00:00:00';

