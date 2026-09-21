# Digital Hero — Project Task Tracker & Future Roadmap

This document serves as the central tracking record for the Digital Hero application, summarizing completed foundation milestones and outlining future business feature phases.

---

## 1. Completed Foundation Roadmap (Steps 1–10)

All 10 foundational setup phases have been implemented, verified, and locked:

- [x] **Step 1 — Project & Tooling Setup**
  - Initialized decoupled repository with React 19 + Vite frontend and Node.js + Express backend.
  - Configured TypeScript with strict compilation, ESLint, and modern directory structures.
- [x] **Step 2 — Supabase Connection**
  - Configured native PostgreSQL connection pooling using `pg.Pool` with SSL support.
  - Implemented initial `/api/health` check endpoint.
- [x] **Step 3 — Database Schema Design**
  - Designed relational ERD supporting 8 core entities: `users`, `subscriptions`, `scores`, `charities`, `draws`, `draw_entries`, `winners`, `payouts`.
  - Conducted senior-level database review; eliminated redundant indexes and enforced strict constraints.
- [x] **Step 4 — Database Migrations**
  - Implemented version-controlled migration `20260921180000_initial_schema.sql` in Supabase PostgreSQL.
  - Built 15-point automated schema test suite verifying all 8 tables, UUID primary keys, and invariants.
- [x] **Step 5 — Supabase Authentication**
  - Integrated Supabase Auth with PostgreSQL synchronization trigger `20260921183000_auth_user_trigger.sql`.
  - Implemented client `AuthContext` and backend `requireAuth` JWT validation middleware.
  - Verified signup, login, session persistence, role assignment, and zero password storage in `public.users`.
- [x] **Step 6 — Authorization & RBAC**
  - Established 3-tier role hierarchy: `visitor`, `subscriber`, `admin`.
  - Created Express middleware `requireRole`, `requireSubscriber`, `requireAdmin`.
  - Implemented 12-point RBAC test suite enforcing HTTP 401 and 403 access control.
- [x] **Step 7 — Routing & Page Scaffolding**
  - Scaffolding complete frontend UI with React Router v7 and centralized `ROUTES` dictionary.
  - Implemented `ProtectedRoute` and `RoleRoute` guards, `AppLayout`, `AdminLayout`, error boundaries, and empty/loading/error reusable states.
- [x] **Step 8 — Environment & Configuration Management**
  - Centralized strict configuration validation in `client/src/config/env.ts` and `server/src/config/env.ts`.
  - Enforced strict isolation between public frontend keys and privileged server credentials.
  - Added automated build bundle secret scanner test `npm run test:config`.
- [x] **Step 9 — Deployment Preparation & Production Setup**
  - Configured Vercel SPA routing fallback (`client/vercel.json`) to eliminate 404s on browser reload.
  - Created serverless function adapter (`server/api/index.ts`, `server/vercel.json`) and guarded `httpServer.listen` in `server/src/server.ts`.
  - Verified production preview server on all 18 routes and updated CORS policies for `CLIENT_URL`.
- [x] **Step 10 — Baseline Documentation & Foundation Audit**
  - Completed comprehensive architectural, database, auth, RBAC, environment, API, and development guides.
  - Executed final repository-wide regression audit; locked foundation for feature development.

---

## 2. Active Development — Phase 1: Auth & Subscription

### Step 1 — Subscriber Onboarding & Plan Selection
Status: COMPLETE
- **Objective**: Extend authentication flow to route new registrations to a dedicated subscriber onboarding flow.
- **Implemented Flow**: `Signup` → `Plan Selection (/onboarding/plan)` → `Checkout Preview (/onboarding/checkout)` → `[Step 2 Payment]`.
- **Plan Models**: Created TypeScript representations for `monthly` and `yearly` plans with explicit placeholder pricing (`"Price configured during payment integration"`).
- **State Management**: Implemented `OnboardingContext` with `sessionStorage` fallback for refresh persistence.
- **UI Components**:
  - Plan Selection Page (`/onboarding/plan`): Responsive desktop/mobile card selector with clear visual focus/radio indicators and continue action.
  - Checkout Preview Page (`/onboarding/checkout`): Order summary, billing recurrence indicator, "Change Plan" navigation, and informational payment notice.
- **Guards & Protection**:
  - Protected onboarding routes behind `ProtectedRoute` requiring authentication.
  - Invalid/direct access to `/onboarding/checkout` without a selected plan redirects to `/onboarding/plan`.
- **Role & Database Invariants**:
  - Newly registered users strictly maintain `role = visitor`.
  - Zero rows created in `public.subscriptions`.
  - No database migrations, schema alterations, or mock backend API endpoints introduced.
- **Verification**: 12-point automated test suite (`npm run test:onboarding`) passing cleanly.

### Step 2 — Stripe Test-Mode Subscription Integration
Status: COMPLETE
- **Objective**: Connect subscriber onboarding checkout preview to Stripe Checkout in test mode for monthly and yearly subscriptions.
- **Stripe Backend Setup**:
  - Integrated official `stripe` Node SDK exclusively in backend (`server/`).
  - Added centralized configuration in `server/src/config/stripe.ts` with strict test-mode validation (forbids `sk_live_`).
  - Implemented `server/src/services/stripe.service.ts` mapping `monthly` and `yearly` plans to environment-configured recurring Price IDs (`STRIPE_MONTHLY_PRICE_ID`, `STRIPE_YEARLY_PRICE_ID`).
  - Attached authenticated application user identity (`userId`, `plan`) to session metadata and `subscription_data.metadata`.
- **Checkout API**:
  - Built protected endpoint `POST /api/subscriptions/checkout` requiring JWT Bearer authentication.
  - Enforced strict plan validation (only accepts `'monthly'` or `'yearly'`), rejecting arbitrary price IDs.
  - Returns Stripe hosted checkout URL for browser redirection.
- **Frontend Checkout Integration**:
  - Updated `CheckoutPreviewPage.tsx` with async checkout submission, button loading state (`Creating secure checkout...`), duplicate click prevention (`disabled={isSubmitting}`), and error alerts.
  - Created `SubscriptionSuccessPage.tsx` at `/subscription/success` and `SubscriptionCancelPage.tsx` at `/subscription/cancel`.
  - Configured success page to clarify test mode status without claiming premature subscription activation before webhook sync.
- **Security & Secret Protection**:
  - Verified `STRIPE_SECRET_KEY` is backend-only; 0 occurrences in frontend code or production bundle.
  - Zero database schema changes; zero subscription rows created manually; zero role escalation.
- **Verification**: 18-point automated test suite (`npm run test:stripe`) passing cleanly.

---

## 3. Next Development Phases (Future Roadmap)

> [!NOTE]
> The following phases represent future business feature increments. None of these features are implemented in the foundation step.

### Phase A — Core User Experience & Profile
- [ ] Refine public landing page with interactive hero sections and real-time statistics.
- [ ] Build user profile editing (name update, avatar upload).
- [ ] Implement password reset and email change workflows.
- [ ] Add notification banners and toast messaging system.

### Phase B — Subscription System
- [ ] Design and integrate Stripe/Razorpay subscription checkout flow.
- [ ] Implement subscription webhook listener (`/api/webhooks/subscription`).
- [ ] Auto-transition user role between `visitor` and `subscriber` based on active subscription status.
- [ ] Build subscription management portal (upgrade, cancel, renew, billing history).
- [ ] Background cron/job for processing expired subscriptions.

### Phase C — Daily Scoring Engine
- [ ] Implement interactive game/challenge mechanism in the client.
- [ ] Build secure score submission API (`POST /api/scores`) with anti-tampering validation.
- [ ] Enforce "one score per calendar day" database rule gracefully with client feedback.
- [ ] Build user score history graphs and daily streak tracking.
- [ ] Leaderboard computation and caching.

### Phase D — Charity Catalog & Management
- [ ] Build public charity listing (`/charities`) with filtering, search, and category tags.
- [ ] Admin charity management console (create, edit, upload logo, toggle active status, soft delete).
- [ ] Charity detail modal/page highlighting mission, impact stories, and total funds raised.

### Phase E — Draw Scheduling & Lifecycle
- [ ] Admin draw creation interface (designate beneficiary charity, set prize amount, configure deadline and draw date).
- [ ] Automated state transition engine (upcoming -> open -> closed -> completed).
- [ ] Public countdown timers on draw cards with real-time deadline warnings.
- [ ] Real-time draw status updates via Supabase Realtime channels.

### Phase F — Draw Entry System
- [ ] Implement "Enter Draw" action for eligible subscribers.
- [ ] Link qualifying daily scores to entries.
- [ ] Enforce "one entry per draw per user" constraint with clear user feedback.
- [ ] User entries dashboard (`/my-entries`) displaying active tickets and draw statuses.

### Phase G — Winner Selection Engine
- [ ] Implement provably fair or deterministic randomized winner drawing algorithm.
- [ ] Rank assignment for multi-tier prizes (1st place, runner-up, etc.).
- [ ] Winner record generation in `public.winners` preserving immutable historical prize snapshot.
- [ ] Public winner showcase page and celebration animations.
- [ ] Automated winner notification emails.

### Phase H — Financial Payouts & Settlement
- [ ] Payout generation upon winner confirmation.
- [ ] Integration with payout gateway (bank transfers, UPI, or Stripe Connect).
- [ ] Webhook processing for payout success, failure, and refunds.
- [ ] User winnings dashboard (`/my-winnings`) with claim status and payout timeline.
- [ ] Financial audit logs and invoice export.

### Phase I — Administrative Command Center
- [ ] Unified administrative dashboard with high-level KPI cards (active subscribers, GMV, charity disbursements).
- [ ] Comprehensive User Management table with role promotion/demotion and activity logs.
- [ ] Charity management CRUD console.
- [ ] Draw operations controller (manual draw trigger, deadline override, cancellation).
- [ ] Payout approval and audit queue.

### Phase J — Production Hardening & Observability
- [ ] Implement distributed rate limiting (e.g. Redis / Upstash) on public and authentication endpoints.
- [ ] Centralized structured logging with Winston / Pino.
- [ ] Error monitoring integration (e.g. Sentry).
- [ ] Database connection pool tuning and read replica configuration.
- [ ] CI/CD pipeline automation (GitHub Actions: lint, test, build, deploy).
