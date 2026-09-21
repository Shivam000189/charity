-- Phase 2 Step 1 & 2: Score Stableford Range Migration
-- Constrains public.scores.score to 1..45 (inclusive) for Stableford scoring system

DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find and drop existing check constraint on public.scores.score if any
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.scores'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%score%';

    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.scores DROP CONSTRAINT %I', constraint_name);
    END IF;
END $$;

ALTER TABLE public.scores
  ADD CONSTRAINT chk_scores_stableford_range
  CHECK (score >= 1 AND score <= 45);
