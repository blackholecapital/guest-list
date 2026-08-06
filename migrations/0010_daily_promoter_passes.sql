-- Each promoter receives 10 single-use QR passes every 24 hours.

UPDATE promoters
SET pass_limit = 10,
    reset_days = 1,
    passes_used = 0,
    last_reset_at = CURRENT_TIMESTAMP;
