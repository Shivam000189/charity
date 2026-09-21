-- Phase 1 Steps 4 & 5: Subscription Lifecycle Statuses Migration
-- Adds 'pending_renewal' and 'lapsed' to public.subscriptions status constraint
-- Adds unique partial index for pending_renewal to maintain at most one active/pending_renewal subscription per user

DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find and drop existing check constraint on public.subscriptions.status
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.subscriptions'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%status%';

    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.subscriptions DROP CONSTRAINT %I', constraint_name);
    END IF;
END $$;

-- Add updated check constraint supporting full lifecycle statuses
ALTER TABLE public.subscriptions
  ADD CONSTRAINT chk_subscriptions_status
  CHECK (status IN ('pending', 'active', 'pending_renewal', 'cancelled', 'lapsed', 'expired'));

-- Ensure at most one 'pending_renewal' per user (prevent duplicate concurrent renewal records)
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_user_pending_renewal 
  ON public.subscriptions (user_id) 
  WHERE (status = 'pending_renewal');
