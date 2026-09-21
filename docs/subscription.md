# Digital Hero — Subscription & Onboarding Architecture

This document describes the subscriber onboarding architecture, plan selection system, state management, and future payment integration roadmap for the Digital Hero application.

---

## 1. Onboarding Flow (Phase 1 — Step 1)

The subscriber onboarding flow guides newly registered users through plan evaluation and checkout preview before payment setup:

```text
Signup (/signup)
   ↓
Account Created (Supabase Auth & public.users sync)
   ↓
Plan Selection (/onboarding/plan)
   ↓
Choose Monthly / Yearly
   ↓
Checkout Preview (/onboarding/checkout)
   ↓
[Payment Integration — Step 2]
```

### Flow Breakdown

1. **Signup (`/signup`)**:
   - The user registers via `SignupForm.tsx`.
   - On successful Supabase user creation and session establishment, the client programmatically navigates to `/onboarding/plan`.
2. **Plan Selection (`/onboarding/plan`)**:
   - Authenticated user reviews the available subscription options:
     - **Monthly Plan**: Billed monthly, standard access.
     - **Yearly Plan**: Billed yearly, annual commitment savings.
   - User selects a plan card (visual indicator: border accent, checkmark badge, accessible radio semantics).
   - "Continue to Checkout" button commits the selection to `OnboardingContext` and navigates to `/onboarding/checkout`.
3. **Checkout Preview (`/onboarding/checkout`)**:
   - Displays plan summary: Plan name, billing recurrence, and pricing indicator.
   - Guarded route: If accessed directly without a selected plan in state/sessionStorage, automatically redirects to `/onboarding/plan`.
   - Provides a "Change Plan" link taking the user back to `/onboarding/plan` with state retained.
   - "Continue to Payment" button presents a clear informational banner explaining that real payment integration is scheduled for Step 2.

---

## 2. Core Architectural Distinction

> [!IMPORTANT]
> **Plan Selection DOES NOT Activate a Subscription.**
>
> - Selecting a plan is purely client-side onboarding intent.
> - A user who selects a plan or views checkout preview **remains in the `visitor` role**.
> - **Zero records** are inserted into `public.subscriptions`.
> - The application does not grant subscriber privileges or access to protected subscriber routes (`/my-entries`, `/my-winnings`, etc.) until real payment processing and server-side verification succeed in subsequent steps.

| Concept | Plan Selection (Step 1) | Active Subscription (Step 2+) |
| :--- | :--- | :--- |
| **State Storage** | React Context (`sessionStorage`) | PostgreSQL `public.subscriptions` |
| **User Role** | `role = visitor` | `role = subscriber` |
| **Payment Status** | Not initiated | Charged & confirmed via webhook |
| **Route Access** | `/onboarding/*`, `/dashboard` | Subscriber routes (`/my-entries`, etc.) |

---

## 3. Plan Data Model

The frontend subscription plan definitions are defined in `client/src/types/subscription.ts`:

```typescript
export type SubscriptionPlanId = 'monthly' | 'yearly';

export interface PlanDetails {
  id: SubscriptionPlanId;
  name: string;
  billingInterval: 'month' | 'year';
  displayPrice: string;
  description: string;
  features: string[];
}
```

### Pricing Disclaimer
In accordance with PRD guidelines, exact production prices are **not invented**:
- Display price uses the explicit placeholder: `"Price configured during payment integration"`.
- No fake Stripe price IDs or mockup amounts exist in code.

---

## 4. Route Protection & Existing User Safeguards

1. **Authentication Guard**:
   - `/onboarding/plan` and `/onboarding/checkout` are mounted inside `<ProtectedRoute />` within `client/src/app/AppRouter.tsx`.
   - Unauthenticated visitors attempting to access these routes are redirected to `/login` with return intent preserved.
2. **Existing User Flow**:
   - Users logging in via `/login` continue to be routed directly to `/dashboard` (or their requested return location).
   - Existing visitors and subscribers are never forced into onboarding loops on login.
3. **Admin Exemption**:
   - Administrative users retain unrestricted access to `/admin/*` routes and are unaffected by subscriber onboarding flows.

---

## 5. Scope & Deferred Features (Phase 1 — Step 2+)

The following capabilities are **explicitly NOT implemented** in Step 1 and are deferred to Step 2 and subsequent phases:

- **Stripe SDK & Library**: No Stripe client/server libraries or API keys introduced.
- **Stripe Products & Prices**: No live Stripe price entities or checkout sessions.
- **Stripe Elements / Checkout**: No payment collection forms or credit card inputs.
- **Payment Processing**: No credit card or third-party payment transactions executed.
- **Payment Database Records**: No payment audit or transaction records in PostgreSQL.
- **Stripe Webhooks**: Webhook endpoint (`/api/webhooks/stripe`) deferred to Step 2.
- **Subscription Lifecycle**: Auto-renewal, cancellation, expiration, and lapse management deferred to Steps 3–5.
- **Role Escalation**: Transitioning users from `visitor` to `subscriber` upon successful payment deferred to Step 2.
