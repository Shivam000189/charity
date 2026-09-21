-- Migration: 20260921250000_winner_verification_phase5.sql
-- Description: Adds winner proof verification lifecycle, reviewer tracking, and payment status columns

ALTER TABLE public.winners
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'PENDING_PROOF'
    CHECK (verification_status IN ('PENDING_PROOF', 'PENDING_REVIEW', 'APPROVED', 'REJECTED')),
  ADD COLUMN IF NOT EXISTS proof_storage_path TEXT NULL,
  ADD COLUMN IF NOT EXISTS proof_uploaded_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (payment_status IN ('PENDING', 'PAID')),
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS payment_reference TEXT NULL,
  ADD COLUMN IF NOT EXISTS admin_note TEXT NULL;

-- Create partial indexes for fast lookups in admin workflows
CREATE INDEX IF NOT EXISTS idx_winners_verification_status
  ON public.winners (verification_status)
  WHERE verification_status = 'PENDING_REVIEW';

CREATE INDEX IF NOT EXISTS idx_winners_payment_status
  ON public.winners (payment_status)
  WHERE payment_status = 'PENDING' AND verification_status = 'APPROVED';
