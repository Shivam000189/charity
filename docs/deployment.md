# Digital Hero — Production Deployment Guide (Step 9)

This guide documents the production deployment architecture, configuration, and verification procedures for the full-stack Digital Hero application.

---

## 1. Deployment Architecture

```text
                               ┌────────────────────────────────┐
                               │           Supabase             │
                               │   PostgreSQL + Supabase Auth   │
                               └───────────────▲────────────────┘
                                               │
                         Database Connection   │  Auth Verification
                         (Pool & Migrations)   │  (JWT & Secret Key)
                                               │
┌─────────────────────────┐          ┌─────────┴──────────────┐
│     Client Browser      │ ───────► │   Production Backend   │
│  React 19 + Vite (SPA)  │          │     Express /api       │
└───────────┬─────────────┘          └─────────▲──────────────┘
            │                                  │
            │ Static Assets                    │ API Requests (CORS protected)
            ▼                                  │
┌─────────────────────────┐                    │
│     Vercel Frontend     │ ───────────────────┘
│  client/dist (Rewrites) │
└─────────────────────────┘
```

---

## 2. Frontend Deployment (Vercel)

### Project Configuration
* **Framework Preset**: Vite
* **Root Directory**: `client`
* **Build Command**: `npm run build`
* **Output Directory**: `dist`
* **Install Command**: `npm install`

### SPA Fallback Routing (`client/vercel.json`)
Because the frontend is a single-page application (SPA) using React Router, direct navigation or browser refreshes on deep routes (such as `/dashboard`, `/profile`, `/subscription`, `/admin/*`) must be redirected to `index.html` rather than returning a 404:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Production Environment Variables (Frontend)
Configure these in the Vercel Dashboard under **Settings > Environment Variables**:

| Variable | Required | Description | Example |
|---|:---:|---|---|
| `VITE_SUPABASE_URL` | Yes | Supabase Project URL | `https://your-project.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase Publishable / Anon API Key | `eyJhbGciOi...` |
| `VITE_API_URL` | Yes | Production Backend API Base URL | `https://api.yourdomain.com/api` (or Vercel backend URL) |

> [!CAUTION]
> Never set `SUPABASE_SECRET_KEY` or `DATABASE_URL` in the frontend project!

---

## 3. Backend Deployment

The backend Express application supports two production deployment models without modifying controllers, routes, or database queries:

### Option A: Vercel Serverless Function
Deploy the `server` directory as a serverless project on Vercel:
* **Root Directory**: `server`
* **Serverless Entrypoint**: `server/api/index.ts`
* **Serverless Rewrites** (`server/vercel.json`):
  ```json
  {
    "version": 2,
    "rewrites": [
      {
        "source": "/(.*)",
        "destination": "/api/index"
      }
    ]
  }
  ```
* **Listener Safeguard**: When `process.env.VERCEL` is set, `server/src/server.ts` automatically skips `httpServer.listen(...)` to prevent port conflicts in serverless environments.

### Option B: Standalone Node.js Host (Render, Railway, Fly.io, AWS)
Run the application as a persistent Node.js service:
* **Build Command**: `npm run build`
* **Start Command**: `npm start` (`node dist/server.js`)
* **Port**: Automatically binds to `process.env.PORT` (defaults to `5000`).

### Production Environment Variables (Backend)
Configure these in the backend hosting provider:

| Variable | Required | Secret | Description | Example |
|---|:---:|:---:|---|---|
| `NODE_ENV` | Yes | No | Runtime environment | `production` |
| `PORT` | No | No | HTTP listening port (defaults to 5000) | `5000` |
| `CLIENT_URL` | Yes | No | Allowed frontend origin for CORS | `https://your-frontend.vercel.app` |
| `SUPABASE_URL` | Yes | No | Supabase Project URL | `https://your-project.supabase.co` |
| `SUPABASE_SECRET_KEY` | Yes | **YES** | Privileged service role key | `eyJhbGciOi...` |
| `DATABASE_URL` | Yes | **YES** | Direct Supabase PostgreSQL URL | `postgresql://postgres:...` |

---

## 4. Production CORS Configuration

The Express backend implements origin-restricted CORS:
1. In `production` mode (`NODE_ENV=production`), wildcard origins are forbidden.
2. Only origins explicitly listed in `CLIENT_URL` (supports comma-separated list of origins) are allowed:
   ```env
   CLIENT_URL=https://your-frontend.vercel.app,https://yourcustomdomain.com
   ```
3. Authenticated requests with credentials (`cookies`, `Authorization` headers) are properly authorized.

---

## 5. Supabase Production Authentication & Database Setup

### Auth Redirect URLs
1. Navigate to **Supabase Dashboard > Authentication > URL Configuration**.
2. **Site URL**: Set to your production frontend URL (e.g. `https://your-frontend.vercel.app`).
3. **Redirect URLs**: Add your production domain and callback paths:
   - `https://your-frontend.vercel.app/**`
   - `https://your-frontend.vercel.app/login`
   - `https://your-frontend.vercel.app/dashboard`
4. **Email Confirmations**: Keep email confirmation settings intact as configured for production.

### Database Migrations Verification
Ensure that migrations from Steps 4 & 5 are applied to the target production Supabase database:
- `supabase/migrations/20260921180000_initial_schema.sql` (8 core tables & constraints)
- `supabase/migrations/20260921183000_auth_user_trigger.sql` (Auth sync trigger)

Verify schema integrity using:
```bash
cd server
npm run test:schema
```
Expected output:
```text
Public tables found: [
  'charities',
  'draw_entries',
  'draws',
  'payouts',
  'scores',
  'subscriptions',
  'users',
  'winners'
]
ALL 8 REQUIRED TABLES EXIST: PASS
```

---

## 6. Health & Smoke Testing

### Deployment Status Note
Deployment configuration is fully prepared in the repository (`client/vercel.json`, `server/vercel.json`, `server/api/index.ts`). Production deployment to your live cloud account must be verified separately once linked to your Vercel Dashboard / Git provider.

### Health Check Endpoint
```http
GET https://api.yourdomain.com/api/health
```

Expected response:
```json
{
  "success": true,
  "server": "ok",
  "database": "connected"
}
```

### Production Smoke Test Checklist
After deploying frontend and backend:
1. **Frontend Load**: Navigate to `https://<frontend-url>` — Home page renders cleanly.
2. **Public Routes**: Verify `/about`, `/charities`, `/draws`.
3. **Signup**: Register a new user (`/signup`).
4. **Login**: Authenticate with registered user (`/login`).
5. **Dashboard & Profile**: Verify access to `/dashboard` and `/profile`.
6. **API Session**: Call `/api/auth/me` with Bearer token — returns authenticated user data with role `visitor`.
7. **Role Guards (403)**:
   - Visitor attempting `/subscription` -> Denied.
   - Visitor attempting `/admin` -> Denied.
8. **Auth Guards (401)**:
   - Direct API request to `/api/auth/test/authenticated` without token -> 401 Unauthorized.
9. **Page Refresh**: Refresh on `/dashboard` — session persists and user remains on dashboard.
10. **Logout**: Click Logout — session is revoked and user is redirected to `/login`.
11. **SPA Direct Navigation**: Paste `https://<frontend-url>/dashboard` directly into address bar — serves React application without 404.

---

## 7. Automated Test Suites

Run these commands locally or in CI before every release:

```bash
# Frontend build & typecheck
cd client
npm run lint
npm run build

# Backend verification test suites
cd ../server
npm run build
npm run test:config     # Validates env parsing & audits dist/ for secrets
npm run test:auth       # 12-point authentication test suite
npm run test:rbac       # 12-point RBAC authorization test suite
npm run test:schema     # Verifies all 8 database tables
```

---

## 8. Rollback Considerations

1. **Frontend Rollback**:
   - Vercel automatically maintains deployment history with immutable preview URLs for every commit.
   - In the event of a frontend regression, instantly roll back to the previously passing deployment with zero downtime via **Vercel Dashboard > Deployments > Promote to Production**.
2. **Backend Rollback**:
   - For Vercel Serverless deployments: Roll back to previous serverless deployment instantly via Vercel Dashboard.
   - For Standalone Node.js hosting (Render / Railway / Fly.io): Re-deploy previous commit SHA or rollback release in the platform console.
3. **Database Schema Considerations**:
   - Migrations are additive and backward-compatible.
   - Never run destructive rollback scripts (e.g. `DROP TABLE`) against live production data.
   - Database connection pools (`pg.Pool`) automatically recover upon backend restart.

