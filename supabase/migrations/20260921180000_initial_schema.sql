-- Step 4: Initial Database Schema Migration
-- Approved schema for Digital Hero: users, subscriptions, scores, charities, draws, draw_entries, winners, payouts

-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Users Table
-- Linked 1:1 with Supabase Auth (auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  role TEXT NOT NULL DEFAULT 'visitor' CHECK (role IN ('visitor', 'subscriber', 'admin')),
  deleted_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON public.users (LOWER(email));

-- 2. Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  plan TEXT NOT NULL CHECK (plan IN ('monthly', 'annual', 'daily')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'cancelled', 'expired')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  cancelled_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_subscriptions_expires_after_started CHECK (expires_at > started_at)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_user_active ON public.subscriptions (user_id) WHERE (status = 'active');

-- 3. Scores Table
CREATE TABLE IF NOT EXISTS public.scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0),
  score_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_scores_user_date UNIQUE (user_id, score_date)
);

-- 4. Charities Table
CREATE TABLE IF NOT EXISTS public.charities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE CHECK (char_length(trim(name)) > 0),
  description TEXT NULL,
  logo_url TEXT NULL,
  website_url TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Draws Table
CREATE TABLE IF NOT EXISTS public.draws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  description TEXT NULL,
  charity_id UUID NOT NULL REFERENCES public.charities(id) ON DELETE RESTRICT,
  draw_date TIMESTAMPTZ NOT NULL,
  entry_deadline TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'open', 'closed', 'completed', 'cancelled')),
  prize_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (prize_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency ~ '^[A-Z]{3}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_draws_deadline_before_draw CHECK (entry_deadline <= draw_date)
);

CREATE INDEX IF NOT EXISTS idx_draws_charity_id ON public.draws (charity_id);
CREATE INDEX IF NOT EXISTS idx_draws_status_date ON public.draws (status, draw_date);

-- 6. Draw Entries Table
CREATE TABLE IF NOT EXISTS public.draw_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_id UUID NOT NULL REFERENCES public.draws(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  score_id UUID NULL REFERENCES public.scores(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_draw_entries_user_draw UNIQUE (user_id, draw_id)
);

CREATE INDEX IF NOT EXISTS idx_draw_entries_draw_id ON public.draw_entries (draw_id);

-- 7. Winners Table
CREATE TABLE IF NOT EXISTS public.winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_id UUID NOT NULL REFERENCES public.draws(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  draw_entry_id UUID NOT NULL UNIQUE REFERENCES public.draw_entries(id) ON DELETE RESTRICT,
  rank INTEGER NOT NULL CHECK (rank >= 1),
  prize_amount NUMERIC(12, 2) NOT NULL CHECK (prize_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency ~ '^[A-Z]{3}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_winners_draw_rank UNIQUE (draw_id, rank),
  CONSTRAINT uq_winners_draw_user UNIQUE (draw_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_winners_user_id ON public.winners (user_id);

-- 8. Payouts Table
CREATE TABLE IF NOT EXISTS public.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  winner_id UUID NOT NULL REFERENCES public.winners(id) ON DELETE RESTRICT,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency ~ '^[A-Z]{3}$'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  transaction_reference TEXT NULL UNIQUE,
  failure_reason TEXT NULL,
  paid_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_payouts_completed_paid_at CHECK ((status = 'completed' AND paid_at IS NOT NULL) OR (status != 'completed'))
);

CREATE INDEX IF NOT EXISTS idx_payouts_winner_id ON public.payouts (winner_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON public.payouts (status) WHERE status IN ('pending', 'processing');
