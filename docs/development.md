# Digital Hero — Local Development Guide

This guide explains how a developer can set up, configure, run, and test the Digital Hero repository locally from scratch.

---

## 1. Prerequisites

Before getting started, ensure you have:
* **Node.js**: v20.x or v22.x LTS installed.
* **npm**: v10.x or newer.
* **Git**: Installed and configured.
* **Supabase Project**: A live Supabase project (free tier is sufficient).

---

## 2. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd dgital-hero

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

---

## 3. Environment Configuration

### 3.1. Configure Server Environment
Create `server/.env` by copying from `server/.env.example`:
```bash
cd server
cp .env.example .env
```
Fill in the credentials from your Supabase Dashboard:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your-supabase-service-role-secret-key
DATABASE_URL=postgresql://postgres:your-db-password@db.your-project.supabase.co:5432/postgres
```
*(Ensure any special characters in the database password, such as `#` or `%`, are properly URL-encoded).*

### 3.2. Configure Client Environment
Create `client/.env` by copying from `client/.env.example`:
```bash
cd ../client
cp .env.example .env
```
Populate the public frontend configuration:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
VITE_API_URL=http://localhost:5000/api
```

---

## 4. Apply Database Migrations

Apply the version-controlled SQL migrations located in `supabase/migrations/`:
* `supabase/migrations/20260921180000_initial_schema.sql` (8 core tables & constraints)
* `supabase/migrations/20260921183000_auth_user_trigger.sql` (Auth sync trigger)

You can apply them via the Supabase CLI:
```bash
npx supabase db push --db-url "<YOUR_ENCODED_DATABASE_URL>"
```
Or execute the SQL scripts directly in the **Supabase Dashboard > SQL Editor**.

---

## 5. Running the Application Locally

### 5.1. Start the Backend API
In the `server/` directory:
```bash
npm run dev
```
* **Output**: `Server listening at http://localhost:5000`
* **Health Check**: Test in browser or curl:
  ```bash
  curl http://localhost:5000/api/health
  # Returns: {"success":true,"server":"ok","database":"connected"}
  ```

### 5.2. Start the Frontend Client
In the `client/` directory:
```bash
npm run dev
```
* **Output**: `Local: http://localhost:5173/`
* Open `http://localhost:5173` in your browser to access the application.

---

## 6. Running Automated Tests

All tests are located in `server/src/test/` and run using `tsx`:

```bash
cd server

# 1. Verify environment configuration & secret leakage audit
npm run test:config

# 2. Verify all 8 tables and database constraints
npm run test:schema

# 3. Verify complete 12-point authentication lifecycle
npm run test:auth

# 4. Verify 12-point RBAC authorization & role isolation
npm run test:rbac
```

---

## 7. Linting & Production Build Verification

```bash
# Frontend linting
cd client
npm run lint

# Frontend production build
npm run build

# Frontend production preview
npm run preview
# Serves build on http://localhost:4173

# Backend production build
cd ../server
npm run build

# Backend production start
npm run start
```
