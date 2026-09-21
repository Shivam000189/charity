# Digital Hero

Digital Hero is a full-stack web platform built with React 19, Express, TypeScript, and Supabase. The platform empowers subscribers to participate in charitable draws, track scores, support non-profit organizations, and receive audited payouts.

---

## 1. Project Status

```text
Foundation Status: Steps 1–10 COMPLETE & VERIFIED ✅
Current Phase:     Ready for Feature Development (Phases A–J)
```

The core foundation—including database schema migrations, Supabase authentication, 3-tier RBAC authorization, routing, environment validation, and production deployment preparation—is complete, tested, and locked.

---

## 2. Tech Stack

* **Frontend**: React 19, Vite 8, TypeScript, TailwindCSS 4, React Router v7.
* **Backend**: Node.js, Express 4, TypeScript (`tsx` / `tsc`), `pg` pool.
* **Database**: Supabase PostgreSQL (1:1 auth trigger, UUID primary keys, financial precision).
* **Authentication**: Supabase Auth (managed sessions, JWT access tokens).
* **Authorization**: Express RBAC (`visitor`, `subscriber`, `admin`).
* **Deployment Target**: Vercel (Frontend SPA + Serverless Backend Adapter) / Node.js persistent host.

---

## 3. Repository Structure

```text
dgital-hero/
├── client/                     # Frontend React + Vite application
│   ├── src/                    # Components, pages, layouts, context, hooks
│   ├── vercel.json             # Vercel SPA routing fallback configuration
│   └── package.json
├── server/                     # Backend Express API
│   ├── api/                    # Serverless adapter entrypoint (api/index.ts)
│   ├── src/                    # Config, controllers, middleware, routes, tests
│   ├── vercel.json             # Vercel backend routing configuration
│   └── package.json
├── supabase/                   # Database version-controlled migrations
│   └── migrations/             # SQL schema and trigger migrations
├── docs/                       # Complete architectural and technical documentation
└── README.md                   # Project overview & quickstart
```

---

## 4. Documentation Index

For deep architectural and technical specifications, refer to the dedicated documents in `docs/`:

* [System Architecture](file:///d:/shivam/projects/dgital-hero/docs/architecture.md): Component diagrams, data flow, and security boundaries.
* [Database Architecture](file:///d:/shivam/projects/dgital-hero/docs/database.md): Schema, table specifications, constraints, and relationships.
* [Authentication Guide](file:///d:/shivam/projects/dgital-hero/docs/authentication.md): Supabase Auth lifecycle, signup trigger, and JWT verification.
* [Authorization & RBAC](file:///d:/shivam/projects/dgital-hero/docs/authorization.md): Role hierarchy (`visitor`, `subscriber`, `admin`) and permission matrix.
* [Environment Configuration](file:///d:/shivam/projects/dgital-hero/docs/environment.md): Environment variables, validation rules, and secret protection.
* [Local Development Guide](file:///d:/shivam/projects/dgital-hero/docs/development.md): Prerequisites, step-by-step setup, and dev servers.
* [Deployment Guide](file:///d:/shivam/projects/dgital-hero/docs/deployment.md): Vercel setup, CORS, production health check, and smoke tests.
* [API Specification](file:///d:/shivam/projects/dgital-hero/docs/api.md): REST endpoint definitions, request payloads, and error codes.
* [Subscription & Stripe Architecture](file:///d:/shivam/projects/dgital-hero/docs/subscription.md): Subscriber onboarding, Stripe test-mode checkout, and future webhook sync.
* [Task Tracker & Roadmap](file:///d:/shivam/projects/dgital-hero/docs/task-tracker.md): Completed foundation summary and future phases (A–J).

---

## 5. Stripe Development

The project currently uses **Stripe TEST MODE**.

* **Step 2**: Stripe Checkout integration (test-mode subscription session creation, plan validation, and return routing).
* **Step 3**: Webhook synchronization (capturing events and syncing active subscriptions to Supabase).

For full details, refer to [`docs/subscription.md`](file:///d:/shivam/projects/dgital-hero/docs/subscription.md).

---

## 6. Quickstart Guide

### 6.1. Install Dependencies
```bash
# Backend dependencies
cd server
npm install

# Frontend dependencies
cd ../client
npm install
```

### 6.2. Environment Variables
Create `.env` files in both `client/` and `server/` using the tracked `.env.example` templates:

* **`server/.env`**:
  ```env
  PORT=5000
  NODE_ENV=development
  CLIENT_URL=http://localhost:5173
  SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_SECRET_KEY=your-supabase-secret-key
  DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
  STRIPE_SECRET_KEY=sk_test_your_test_secret_key
  STRIPE_MONTHLY_PRICE_ID=price_your_test_monthly_price_id
  STRIPE_YEARLY_PRICE_ID=price_your_test_yearly_price_id
  STRIPE_SUCCESS_URL=http://localhost:5173/subscription/success
  STRIPE_CANCEL_URL=http://localhost:5173/onboarding/checkout
  ```
* **`client/.env`**:
  ```env
  VITE_SUPABASE_URL=https://your-project.supabase.co
  VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
  VITE_API_URL=http://localhost:5000/api
  ```

### 6.3. Run Development Servers
```bash
# Terminal 1: Start Backend (http://localhost:5000)
cd server
npm run dev

# Terminal 2: Start Frontend (http://localhost:5173)
cd client
npm run dev
```

---

## 7. Automated Testing & Verification

All automated tests are located in `server/src/test/`:

```bash
cd server

npm run test:stripe     # Verifies Stripe checkout creation, plan mapping, and error handling
npm run test:onboarding # 12-point subscriber onboarding verification suite
npm run test:config     # Validates env parsing & audits dist/ for secret leakage
npm run test:schema     # Verifies all 8 database tables, UUID PKs, and constraints
npm run test:auth       # 12-point authentication test suite
npm run test:rbac       # 12-point RBAC authorization test suite
```

Frontend build and lint verification:
```bash
cd client
npm run lint            # ESLint check (0 errors, 0 warnings)
npm run build           # Production bundle build
```

---

## 8. Security Policy

* **No Passwords in `public.users`**: Passwords reside strictly in encrypted Supabase Auth storage.
* **Server-Authoritative RBAC**: Roles are retrieved directly from `public.users.role` on every authenticated request.
* **Zero Secret Leakage**: Service role keys, database URLs, and Stripe secret keys are never shipped to client bundles or committed to version control.
