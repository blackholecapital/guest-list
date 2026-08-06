-- Restore the intended promoter default while preserving configurable reset intervals.

UPDATE promoters
SET pass_limit = 25,
    passes_used = MIN(passes_used, 25),
    reset_days = CASE WHEN reset_days < 1 THEN 1 ELSE reset_days END;
