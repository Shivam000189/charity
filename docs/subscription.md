# Subscription Architecture — Digital Hero

## Overview

Digital Hero uses a **payment-provider-agnostic** subscription system.
The `PaymentProvider` interface decouples business logic from payment implementation.

---

## Current Architecture (Phase 1 Step 3)

```
User
 ↓
Signup → Dashboard
 ↓
Plan Selection (/onboarding/plan)
 ↓
Order Summary (/onboarding/checkout)
 ↓
Mock Checkout (/onboarding/mock-checkout)   ← MockPaymentProvider
 ↓
POST /api/subscriptions/checkout            ← creates mock_session_<uuid>
 ↓
POST /api/subscriptions/pay                 ← processes mock payment
 ↓
SubscriptionService.createOrUpdateSubscription()
 ↓
public.subscriptions (Supabase PostgreSQL)
 ↓
/subscription/success
```

---

## Future Architecture (Phase 1 Step 5+)

```
User
 ↓
Plan Selection → Order Summary → Backend
 ↓
POST /api/subscriptions/checkout            ← StripePaymentProvider
 ↓
Stripe Hosted Checkout
 ↓
Stripe Test Payment
 ↓
Stripe Webhook → POST /api/subscriptions/webhook
 ↓
SubscriptionService.createOrUpdateSubscription()
 ↓
public.subscriptions
 ↓
/subscription/success
```

---

## Provider Files

| File | Purpose |
|---|---|
| `server/src/providers/payment/payment.provider.ts` | Interface (TypeScript contract) |
| `server/src/providers/payment/plan-pricing.ts` | Plan → DB plan mapping + pricing |
| `server/src/providers/payment/mock.provider.ts` | **Active**: MockPaymentProvider |
| `server/src/providers/payment/stripe.provider.ts` | Future: StripePaymentProvider shell |
| `server/src/providers/payment/index.ts` | Exports active provider singleton |

**To switch providers**, change only `index.ts`:
```typescript
// Current (mock)
export const paymentProvider: PaymentProvider = new MockPaymentProvider();

// Future (Stripe)
// export const paymentProvider: PaymentProvider = new StripePaymentProvider();
```

---

## Demo Pricing

> **These are DEMO prices for development only. Update before production.**

| Plan | API ID | DB Plan | Amount (INR) | Paise |
|---|---|---|---|---|
| Monthly | `monthly` | `monthly` | 499/month | 49,900 |
| Yearly | `yearly` | `annual` | 4,999/year | 4,99,900 |

> **Important**: `'yearly'` (API) maps to `'annual'` (DB column). The DB schema uses `CHECK (plan IN ('monthly', 'annual', 'daily'))`.
> This mapping is handled transparently in `mapPlanToDb()`.

---

## Demo Test Cards (MockPaymentProvider)

| Card Number | Behavior |
|---|---|
| `4242 4242 4242 4242` | Payment succeeds |
| `4000 0000 0000 0002` | Payment declined |
| Any other 16-digit | Payment succeeds (permissive mock) |

Use any future expiry (MM/YY) and any 3-4 digit CVV.

> **Security**: Card details are validated format-only and are **never stored, logged, or persisted** anywhere in the application.

---

## Idempotency

Sessions are **single-use**:
- A session is created when `POST /api/subscriptions/checkout` is called
- A session is consumed (deleted) when `POST /api/subscriptions/pay` succeeds
- A second `POST /pay` with the same sessionId will fail with "Invalid or expired session"
- Declined payments do NOT consume the session — the user can retry with a different card

Database idempotency:
- The `idx_subscriptions_user_active` unique partial index enforces max one active subscription per user
- `SubscriptionService.createOrUpdateSubscription()` handles existing rows via UPDATE (not INSERT)

---

## Date Arithmetic

Subscription expiry uses proper calendar arithmetic via `Date.setMonth()` / `Date.setFullYear()`:

```typescript
// monthly: Jan 31 + 1 month -> Feb 28 (not 31 days later)
// yearly:  Feb 29 (leap year) + 1 year -> Feb 28 (correct)
```

This is enforced by `calculateExpiresAt()` in `plan-pricing.ts`.

---

## Stripe Migration Guide

When switching from mock to Stripe:

1. **Configure environment variables** in `server/.env`:
   ```
   PAYMENT_PROVIDER=stripe
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_MONTHLY_PRICE_ID=price_...
   STRIPE_YEARLY_PRICE_ID=price_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

2. **Implement `StripePaymentProvider`** in `stripe.provider.ts`:
   - `createCheckout()` calls `createCheckoutSession()` from `stripe.service.ts`
   - `processPayment()` is not needed (Stripe uses webhooks, not direct pay calls)

3. **Update `index.ts`** to export `StripePaymentProvider`

4. **Update the frontend flow**:
   - `POST /api/subscriptions/checkout` returns `url` (Stripe redirect)
   - Frontend does: `window.location.href = checkoutSession.url`
   - Stripe webhook handles payment confirmation and subscription creation

5. **Enable webhook** at `POST /api/subscriptions/webhook` (already implemented in `webhook.service.ts`)

---

## Database Schema Reference

```sql
CREATE TABLE public.subscriptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan         TEXT NOT NULL CHECK (plan IN ('monthly', 'annual', 'daily')),
  status       TEXT NOT NULL CHECK (status IN ('pending', 'active', 'cancelled', 'expired')),
  started_at   TIMESTAMPTZ NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  cancelled_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_subscriptions_expires_after_started CHECK (expires_at > started_at)
);

-- Enforces max one active subscription per user
CREATE UNIQUE INDEX idx_subscriptions_user_active
  ON public.subscriptions (user_id) WHERE (status = 'active');
```
