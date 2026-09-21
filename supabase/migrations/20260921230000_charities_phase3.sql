-- Phase 3 — Charity System Migration
-- Adds category, images, upcoming_events, featured, deleted_at to public.charities
-- Adds charity_id and contribution_percentage to public.subscriptions
-- Creates public.donations table

-- 1. Charities Table Enhancements
ALTER TABLE public.charities
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Other',
  ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS upcoming_events JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_charities_category ON public.charities (category);
CREATE INDEX IF NOT EXISTS idx_charities_featured ON public.charities (featured) WHERE (featured = true);
CREATE INDEX IF NOT EXISTS idx_charities_active ON public.charities (is_active) WHERE (is_active = true AND deleted_at IS NULL);

-- 2. Subscriptions Table Enhancements (Charity Preference & Contribution %)
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS charity_id UUID NULL REFERENCES public.charities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contribution_percentage INTEGER NOT NULL DEFAULT 10;

-- Enforce minimum 10% and maximum 100% contribution
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_subscriptions_contribution_percentage'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT chk_subscriptions_contribution_percentage
      CHECK (contribution_percentage >= 10 AND contribution_percentage <= 100);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_subscriptions_charity_id ON public.subscriptions (charity_id);

-- 3. Independent Donations Table
CREATE TABLE IF NOT EXISTS public.donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  charity_id UUID NOT NULL REFERENCES public.charities(id) ON DELETE RESTRICT,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency ~ '^[A-Z]{3}$'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  donor_name TEXT NULL,
  message TEXT NULL,
  transaction_reference TEXT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_donations_charity_id ON public.donations (charity_id);
CREATE INDEX IF NOT EXISTS idx_donations_user_id ON public.donations (user_id);
CREATE INDEX IF NOT EXISTS idx_donations_status ON public.donations (status);
