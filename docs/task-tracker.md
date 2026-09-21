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

## 3. Completed Feature Phase — Phase 2: Score Management

Status: COMPLETE
- **Step 1 — Score Entry**: Stableford scoring (1–45 points), valid non-future dates, user ownership.
- **Step 2 — One Score Per Date**: Enforced via DB unique constraint `uq_scores_user_date` and structured 409 conflict responses.
- **Step 3 — Rolling-5 Retention**: Automated atomic eviction keeping the 5 most recent scores (`score_date DESC, created_at DESC`).
- **Step 4 — Edit & Delete**: Owner-restricted score updates and deletions without unintended eviction triggers.
- **Step 5 — Score Display & Visualization**: Trend charts, Stableford statistics, and interactive history.
- **Verification**: 29-point automated test suite (`npm run test:scores`) passing cleanly.

---

## 4. Completed Feature Phase — Phase 3: Charity System

Status: COMPLETE
- **Step 1 — Charity Data Model & Admin CRUD**:
  - Expanded `public.charities` with `category`, `images`, `upcoming_events`, `featured`, and soft-delete `deleted_at`.
  - Admin CRUD endpoints (`GET/POST/PATCH/DELETE /api/admin/charities`) with soft-delete (`is_active = false, deleted_at = NOW()`).
  - Image upload support to Supabase Storage `charities` bucket.
- **Step 2 — Public Charity Directory**:
  - Filterable public directory (`/charities`) with real-time text search and category pills.
  - Active-only filtering excluding soft-deleted or deactivated charities.
- **Step 3 — Individual Charity Profile Pages**:
  - Dedicated charity detail pages (`/charities/:id`) displaying hero imagery, mission narrative, multi-image gallery, and structured upcoming events.
- **Step 4 — Homepage Featured-Charity Spotlight**:
  - Homepage spotlight section rendering admin-curated featured charity with direct learn-more and donation links.
  - Graceful fallback banner directing to the public directory if no charity is featured.
- **Step 5 — Subscriber Charity Selection & Independent Donation Flow**:
  - Subscriber contribution allocation (`GET/PUT /api/subscriptions/charity`) with server-side validation enforcing 10%–100% allocation bounds.
  - Independent donation creation and payment confirmation (`/charities/:id/donate`) using test-mode simulated card processing (4242 success, 0002 decline, `MOCK-DON-` txn reference).
- **Verification**: 22-point automated test suite (`npm run test:charity`) passing cleanly.

---

## 5. Completed Feature Phase — Phase 4: Draw & Prize Engine

Status: COMPLETE
- **Step 1 — Draw Configuration & Admin Controls**:
  - Implemented migration `20260921240000_draw_engine_phase4.sql` expanding `public.draws` with `scheduled_month`, `draw_type`, `three_match_percentage`, `four_match_percentage`, `five_match_percentage`, `drawn_numbers`, `total_pool`, tier pools, `jackpot_rollover_amount`, `rolled_over_to_next`, `simulation_data`, and status lifecycle (`draft`, `scheduled`, `open`, `closed`, `simulated`, `completed`, `cancelled`).
  - Enforced partial unique index `uq_draws_active_month` on `scheduled_month` preventing duplicate draws in the same month.
  - Enforced `chk_draw_percentages` constraint requiring 3/4/5 match shares to total exactly 100%.
- **Step 2 — Draw Entry Mechanism & Number Generation**:
  - Auto-enrollment logic in `openDraw` enrolling all active subscribers without duplicate tickets (`uq_draw_entries_user_draw`).
  - Number generation producing 5 unique sorted numbers in range `[1, 45]`.
  - `RANDOM` uniform generator vs `SCORE_WEIGHTED` distribution weighting frequency based on subscriber recent Stableford scores (Phase 2).
- **Step 3 — Zero-Leakage Prize Pool Arithmetic**:
  - Monthly subscription fee ₹499 vs annual subscription monthly equivalent ₹416.58 (₹4,999 / 12).
  - Dedicated charity deduction based on subscriber preference (Phase 3).
  - Integer paise precision arithmetic (`draw.math.ts`) guaranteeing `threeMatchPool + fourMatchPool + fiveMatchBase === totalPool` to the exact cent/paise with zero financial leakage.
- **Step 4 — Simulate-Before-Publish**:
  - `POST /api/admin/draws/:id/simulate` isolated sandbox execution.
  - Candidate numbers drawn, ticket matches evaluated, winners categorized into 5-match, 4-match, and 3-match tiers.
  - Generates full snapshot persisted in `draws.simulation_data` with zero permanent records written to `public.winners`.
- **Step 5 — Match Evaluation, Multi-Winner Split & Jackpot Rollover**:
  - Single-tier exclusivity (a 5-match winner receives the top jackpot and does not dilute 4-match or 3-match pools).
  - Multi-winner split dividing tier pool equally among qualifying subscribers.
  - 5-match jackpot rollover: If 0 subscribers match 5 numbers, the entire 5-match pool automatically rolls over into the subsequent draw.
  - Atomic publishing transaction (`POST /api/admin/draws/:id/publish`) inserting declared winners into `public.winners`, transitioning status to `completed`, and rendering draw immutable.
- **Verification**: 20-point automated test suite (`npm run test:draws`) passing cleanly.

---

## 6. Completed Feature Phase — Phase 5: Winner Verification & Dashboards

Status: COMPLETE
- **Step 1 — Winner Proof Upload**:
  - Secure upload endpoint (`POST /api/winners/:winnerId/proof`) with strict format (JPEG, PNG, WebP) and size (max 5MB) validation.
  - Private Supabase Storage bucket (`winner-proofs`, `public: false`) with 1-hour signed URL generation for authorized viewing.
  - Winner ownership security enforcing that subscribers can only upload score proof for their own winning claims.
  - State transition: `PENDING_PROOF` -> `PENDING_REVIEW`.
- **Step 2 — Admin Winner Verification**:
  - Admin verification endpoints (`GET /api/admin/winners`, `GET /api/admin/winners/pending`).
  - Approval workflow (`POST /api/admin/winners/:id/approve`) recording admin reviewer and locking proof from further edits.
  - Rejection workflow (`POST /api/admin/winners/:id/reject`) requiring a clear reason and allowing the winner to re-upload.
- **Step 3 — Payment Status Tracking**:
  - Payout lifecycle enforcement: `APPROVED` -> `PENDING` -> `PAID`.
  - Manual disbursement settlement (`POST /api/admin/winners/:id/mark-paid`) recording bank/wire reference and persisting audit record in `public.payouts`.
  - Idempotent payment protection preventing double payouts.
- **Step 4 — Complete User Dashboard**:
  - Integrated 5 key operational modules at `/dashboard`:
    1. Subscription status & renewal timeline
    2. Golf scores & rolling-5 retention
    3. Supported charity beneficiary & contribution percentage
    4. Draw participation with confirmed 5 ticket numbers & jackpot summary
    5. Personal prize winnings summary, claim alerts, and proof upload modals.
- **Step 5 — Complete Admin Dashboard**:
  - Administrative overview at `/admin` displaying real-time platform KPIs and an urgent pending proof verification queue.
  - User management at `/admin/users` with user directory search, role assignment, and detailed account inspector.
  - Winner auditing at `/admin/winners` with proof image modal, approval/rejection actions, and payout settlement triggers.
  - Payout processing operations at `/admin/payouts` tracking settled prize distributions.
  - Operational PRD reporting at `/admin/reports` aggregating 4 core reports:
    1. Platform Users Summary (Total users, Active subscribers, Visitors)
    2. Total Prize Pool & Distributions (Published pools, Completed draws, Total winners)
    3. Charity Partner Impact (Per-charity subscriber counts & total donations)
    4. Draw Operational Statistics (Total draws, Published, Open, Entries, Winners).
- **Verification**: 22-point automated test suite (`npm run test:phase5`) passing cleanly with 100% test coverage.

---

## 7. Completed Feature Phase — Phase 6: UI/UX Polish & Deployment

Status: COMPLETE
- **Step 1 — Visual Design System**:
  - Implemented cohesive, charity-first visual identity replacing legacy greens with deep modern indigo/slate/violet palette.
  - Added modern typography pairing: `Plus Jakarta Sans` (display/headings) and `Inter` (body copy) loaded via Google Fonts.
  - Standardized component design system: `Button` (with spinner, micro-elevation, click scale depression), `Badge` (semantic status indicators for subscription, draw, and verification states), `Card` (responsive elevation, subtle border contrast), `Skeleton` (content loading placeholders).
  - Modernized `HomePage`, `CharitySpotlight`, and `AboutPage` to emphasize transparency, community impact, 0% financial leakage, and verified scorecards.
- **Step 2 — Motion & Micro-Interactions**:
  - Added performant CSS micro-animations (`fadeIn`, `popIn`, `shimmer`) with zero external animation bloat.
  - Implemented full `@media (prefers-reduced-motion: reduce)` support across all transitions and transforms.
  - Added sequential ball reveal and interactive feedback on draw selection and proof verification components.
- **Step 3 — Responsiveness & Mobile Experience**:
  - Tested and hardened responsive layouts across standard viewport sizes (375px mobile, 768px tablet, 1024px desktop, 1440px+ ultra-wide).
  - Built sliding responsive mobile navigation drawer with backdrop overlay, auto-closing on route navigation.
  - Enforced 44px+ touch-friendly tap targets for mobile inputs, buttons, and drawer links.
  - Handled responsive overflow for admin KPI tables and user score histories with horizontal scroll containers and card fallbacks.
- **Step 4 — Error Hardening & Edge Cases**:
  - Implemented production React `ErrorBoundary` wrapping the root application tree, capturing unhandled runtime faults with user-friendly recovery UI instead of blank white screens or raw stack traces.
  - Hardened centralized API client (`client/src/lib/api.ts`) with network loss detection (`NETWORK_ERROR`), clear 401 session expiration handling, and user-actionable 403 access control messages.
  - Enhanced empty, loading, and error UI states with contextual action links across all public, subscriber, and admin views.
- **Step 5 — Production QA & Deployment Verification**:
  - Validated single-page application deep route fallback via `client/vercel.json` rewrites.
  - Hardened backend CORS configuration in `server/src/server.ts` to restrict API access strictly to whitelisted origins and `CLIENT_URL`.
  - Audited production build artifacts for secret leakage: verified 0 secret keys present in client bundle.
  - Executed 100% of automated regression test suites across Phases 0–5 (`test:auth`, `test:rbac`, `test:scores`, `test:charity`, `test:draws`, `test:lifecycle`, `test:phase5`): ALL PASSED.
  - Verified clean compilation: `client` (`tsc -b && vite build`) and `server` (`tsc`) both passing with exit code 0.

---

## 8. Next Development Phases (Future Roadmap)

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
