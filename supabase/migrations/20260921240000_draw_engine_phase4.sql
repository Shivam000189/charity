-- 20260921240000_draw_engine_phase4.sql
-- Phase 4: Draw & Prize Engine schema updates

-- 1. Updates to public.draws
-- Make charity_id nullable so draws can support community-wide lottery without forcing single charity
ALTER TABLE public.draws ALTER COLUMN charity_id DROP NOT NULL;

-- Add draw_type column
ALTER TABLE public.draws
  ADD COLUMN IF NOT EXISTS draw_type TEXT NOT NULL DEFAULT 'RANDOM'
  CHECK (draw_type IN ('RANDOM', 'SCORE_WEIGHTED'));

-- Add scheduled_month column (YYYY-MM)
ALTER TABLE public.draws
  ADD COLUMN IF NOT EXISTS scheduled_month VARCHAR(7) NULL;

-- Add pool share percentage columns (default 25% / 35% / 40%)
ALTER TABLE public.draws
  ADD COLUMN IF NOT EXISTS three_match_percentage NUMERIC(5,2) NOT NULL DEFAULT 25.00
  CHECK (three_match_percentage >= 0),
  ADD COLUMN IF NOT EXISTS four_match_percentage NUMERIC(5,2) NOT NULL DEFAULT 35.00
  CHECK (four_match_percentage >= 0),
  ADD COLUMN IF NOT EXISTS five_match_percentage NUMERIC(5,2) NOT NULL DEFAULT 40.00
  CHECK (five_match_percentage >= 0);

-- Enforce sum of pool percentages = 100.00
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_draw_percentages'
  ) THEN
    ALTER TABLE public.draws
      ADD CONSTRAINT chk_draw_percentages
      CHECK (three_match_percentage + four_match_percentage + five_match_percentage = 100.00);
  END IF;
END $$;

-- Add drawn_numbers and pool tracking columns
ALTER TABLE public.draws
  ADD COLUMN IF NOT EXISTS drawn_numbers JSONB NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS three_match_pool NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS four_match_pool NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS five_match_pool NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS jackpot_rollover_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS rolled_over_to_next NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS simulation_data JSONB NULL DEFAULT NULL;

-- Update status check constraint to include draft, scheduled, open, closed, simulated, completed, cancelled
DO $$
BEGIN
  -- Drop existing status check if present
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'draws_status_check'
  ) THEN
    ALTER TABLE public.draws DROP CONSTRAINT draws_status_check;
  END IF;

  ALTER TABLE public.draws
    ADD CONSTRAINT draws_status_check
    CHECK (status IN ('draft', 'scheduled', 'open', 'closed', 'simulated', 'completed', 'cancelled'));
END $$;

-- Enforce single active draw per scheduled_month (non-cancelled)
CREATE UNIQUE INDEX IF NOT EXISTS idx_draws_scheduled_month_active
  ON public.draws (scheduled_month)
  WHERE (status != 'cancelled' AND scheduled_month IS NOT NULL);

-- 2. Updates to public.draw_entries
ALTER TABLE public.draw_entries
  ADD COLUMN IF NOT EXISTS numbers JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 3. Updates to public.winners
ALTER TABLE public.winners
  ADD COLUMN IF NOT EXISTS match_count INTEGER NOT NULL DEFAULT 3
  CHECK (match_count IN (3, 4, 5));
