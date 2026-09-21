# Digital Hero — Environment & Configuration Guide (Step 8)

This document details all environment variables, their validation rules, security classifications, and usage across development and production environments.

---

## 1. Security Classification & Boundary Rules

| Classification | Scope | Exposure Risk | Permitted Locations |
|---|:---:|:---:|---|
| **SAFE FOR FRONTEND** | Client | Publicly embedded in browser JavaScript bundles. | `client/.env`, `client/.env.production`, Vercel Frontend project settings. Must be prefixed with `VITE_`. |
| **BACKEND ONLY** | Server | Privileged credentials. **CRITICAL RISK** if leaked. | `server/.env`, backend host settings (Vercel Serverless / Render / Railway). Must NEVER be prefixed with `VITE_` or imported in `client/`. |

---

## 2. Frontend Environment Variables

Frontend variables are consumed in [`client/src/config/env.ts`](file:///d:/shivam/projects/dgital-hero/client/src/config/env.ts).

### `VITE_SUPABASE_URL`
* **Classification**: SAFE FOR FRONTEND
* **Required**: Yes
* **Description**: The public HTTPS URL of the Supabase project.
* **Development Value**: `https://<your-project-id>.supabase.co`
* **Production Value**: `https://<your-production-project-id>.supabase.co`

### `VITE_SUPABASE_PUBLISHABLE_KEY`
* **Classification**: SAFE FOR FRONTEND
* **Required**: Yes
* **Description**: The public Supabase publishable/anon API key used to initialize the browser Supabase Auth client.
* **Development Value**: `eyJh...<your-publishable-key>`
* **Production Value**: `eyJh...<your-production-publishable-key>`

### `VITE_API_URL`
* **Classification**: SAFE FOR FRONTEND
* **Required**: Optional (Defaults to `http://localhost:5000/api` in development)
* **Description**: The base URL where the Express API backend is hosted.
* **Development Value**: `http://localhost:5000/api`
* **Production Value**: `https://<your-backend-domain>/api` (or Vercel serverless backend URL)

---

## 3. Backend Environment Variables

Backend variables are strictly validated on startup by [`server/src/config/env.ts`](file:///d:/shivam/projects/dgital-hero/server/src/config/env.ts).

### `PORT`
* **Classification**: BACKEND ONLY (Non-secret)
* **Required**: Optional (Defaults to `5000`)
* **Description**: Port number on which the HTTP server listens in standalone mode.
* **Validation**: Numeric integer between `1` and `65535`.
* **Development Value**: `5000`
* **Production Value**: Assigned by hosting platform or left as `5000`.

### `NODE_ENV`
* **Classification**: BACKEND ONLY (Non-secret)
* **Required**: Optional (Defaults to `'development'`)
* **Description**: Runtime mode indicator. Controls CORS restrictions and logging verbosity.
* **Validation**: One of `'development'`, `'production'`, `'test'`.
* **Development Value**: `development`
* **Production Value**: `production`

### `CLIENT_URL`
* **Classification**: BACKEND ONLY (Non-secret)
* **Required**: Optional in development; Recommended in production
* **Description**: Comma-separated list of allowed frontend origins for CORS header evaluation.
* **Development Value**: `http://localhost:5173`
* **Production Value**: `https://your-app.vercel.app,https://yourdomain.com`

### `SUPABASE_URL`
* **Classification**: BACKEND ONLY (Non-secret)
* **Required**: Yes
* **Description**: The HTTPS URL of the Supabase project. Used by the backend to verify JWT tokens with Supabase Auth.
* **Development Value**: `https://<your-project-id>.supabase.co`
* **Production Value**: `https://<your-production-project-id>.supabase.co`

### `SUPABASE_SECRET_KEY`
* **Classification**: BACKEND ONLY (CRITICAL SECRET)
* **Required**: Yes
* **Description**: Privileged service-role secret key. Allows the backend to verify user tokens, bypass RLS, and perform administrative operations.
* **Security Notice**: Never commit this key to version control or share it with frontend applications.
* **Development Value**: `<your-supabase-secret-key>`
* **Production Value**: Set directly in production host secrets manager.

### `DATABASE_URL`
* **Classification**: BACKEND ONLY (CRITICAL SECRET)
* **Required**: Yes
* **Description**: PostgreSQL connection URI for the connection pool (`pg.Pool`).
* **Format**: `postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres`
* **Security Notice**: Password special characters (such as `#`, `%`, `@`) must be URL-encoded (e.g. `#` -> `%23`).
* **Development Value**: `postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres`
* **Production Value**: Set directly in production host secrets manager.

---

## 4. Example Configuration Templates

### `client/.env.example`
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
VITE_API_URL=http://localhost:5000/api
```

### `server/.env.example`
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SECRET_KEY=your-supabase-secret-key
DATABASE_URL=postgresql://postgres:your-db-password@db.your-project-id.supabase.co:5432/postgres
```

---

## 5. Automated Verification Tests

Run the automated configuration and bundle leakage test suite:

```bash
cd server
npm run test:config
```

Verifies:
* Server environment schema parsing and bounds checking.
* Graceful startup failure on missing required variables.
* Absence of any backend secret tokens in `client/src/` source code.
* Absence of any backend secret tokens in the compiled production bundle (`client/dist/`).
