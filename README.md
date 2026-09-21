# Digital Hero

Full-stack application built with React (Vite) and Node.js (Express) with Supabase PostgreSQL.

## Architecture

* **Frontend**: React 19, Vite, TailwindCSS, TypeScript
* **Backend**: Node.js, Express, TypeScript
* **Database**: Supabase PostgreSQL (`pg` connection pool + Supabase JS Client)

---

## Supabase Setup

1. **Create a Supabase Project**:
   - Go to [Supabase](https://supabase.com/) and create a new project.
2. **Obtain Project Credentials**:
   - **Project URL**: In Project Settings > API > Project URL.
   - **Publishable Key**: In Project Settings > API > Project API Keys (Publishable key).
   - **Secret Key**: In Project Settings > API > Project API Keys (Secret key).
   - **PostgreSQL Connection String**: In Project Settings > Database > Connection string (NodeJS / URI). Ensure special characters in the database password (such as `#` -> `%23`) are properly URL-encoded.
3. **Configure Environment Variables**:
   - Create `.env` in `server/` using `server/.env.example`:
     ```env
     PORT=5000
     SUPABASE_URL=https://your-project-id.supabase.co
     SUPABASE_SECRET_KEY=your-supabase-secret-key
     DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
     ```
   - Create `.env` in `client/` using `client/.env.example`:
     ```env
     VITE_SUPABASE_URL=https://your-project-id.supabase.co
     VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
     VITE_API_URL=http://localhost:5000/api
     ```
4. **Security**:
   - **Never commit `.env` files** or real credentials to version control. All `.env` and `.env.*.local` files are ignored by git.
   - The backend `SUPABASE_SECRET_KEY` and `DATABASE_URL` must never be shared with or exposed in frontend code.

---

## Database Migrations (Supabase)

Database migrations are version-controlled in `supabase/migrations/`.

### 1. Supabase CLI
You can use the Supabase CLI directly via `npx` (no global installation required):
```bash
npx supabase --version
```
Or install globally via npm:
```bash
npm install -g supabase
```

### 2. Linking the Project (Optional)
To link the CLI directly to your remote Supabase project:
```bash
npx supabase link --project-ref <your-project-ref>
```

### 3. Creating New Migrations
To generate a new timestamped migration file:
```bash
npx supabase migration new <migration_name>
```

### 4. Applying Migrations
To push all local migrations to your remote Supabase database:
```bash
# Using DATABASE_URL
npx supabase db push --db-url "<YOUR_PERCENT_ENCODED_DATABASE_URL>"

# Or using linked project
npx supabase db push
```

To perform a dry run before applying:
```bash
npx supabase db push --dry-run --db-url "<YOUR_DATABASE_URL>"
```

### 5. Checking Migration Status
To view applied vs pending migrations:
```bash
npx supabase migration list --db-url "<YOUR_DATABASE_URL>"
```

### 6. Local Development (Optional)
If developing locally with Docker:
```bash
npx supabase start       # Start local Supabase containers
npx supabase db reset    # Reset local database and re-apply all migrations
npx supabase stop        # Stop local containers
```

---

## Getting Started

### Backend Setup & Run

```bash
cd server
npm install
npm run dev
```

* Starts Express server on `http://localhost:5000`.
* Build TypeScript: `npm run build`
* Production start: `npm start`
* Database Health Check: `GET http://localhost:5000/api/health`

### Frontend Setup & Run

```bash
cd client
npm install
npm run dev
```

* Starts Vite development server on `http://localhost:5173`.
* Type check & Build: `npm run build`
* Linting: `npm run lint`

---

## Database Health Endpoint

`GET /api/health`

Returns:
```json
{
  "success": true,
  "server": "ok",
  "database": "connected"
}
```

---

## Authentication Architecture (Step 5)

> **Scope Note**: Step 5 implements **Authentication** ("Who is this user?"). Step 6 will implement **Authorization & RBAC** ("What is this user allowed to do?").

```text
Frontend (React + Vite)
   │
   ├─ User signs up / logs in via Supabase Auth client
   │
Supabase Auth
   │
   ├─ Creates record in `auth.users`
   │
PostgreSQL Trigger (`public.handle_new_user`)
   │
   ├─ Automatically synchronizes record into `public.users`
   ├─ Maps `id = auth.users(id)`, `email`, `name`
   └─ Hardcodes default `role = 'visitor'` (tamper-proof)
   │
Frontend Session
   │
   ├─ Supabase SDK persists JWT session in browser storage
   ├─ `AuthContext` provides `user`, `session`, `loading`, `signUp`, `signIn`, `signOut`
   └─ Authenticated requests attach `Authorization: Bearer <access_token>`
   │
Express Backend (`/api/auth/*`)
   │
   ├─ `authMiddleware` intercepts request and extracts Bearer token
   ├─ `supabase.auth.getUser(token)` verifies JWT authenticity cryptographically
   ├─ Fetches trusted profile from `public.users`
   └─ Attaches typed `req.user` to Express request pipeline
   │
Authenticated API Endpoint (`GET /api/auth/me`)
   └─ Returns safe user profile data (`id`, `email`, `name`, `role`)
```

### Environment Variables

#### Frontend (`client/.env`)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
VITE_API_URL=http://localhost:5000/api
```

#### Backend (`server/.env`)
```env
PORT=5000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your-supabase-secret-key
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

### Auth Endpoints

| Method | Path | Auth Required | Description |
|---|---|---|---|
| `GET` | `/api/health` | No | System & database connectivity healthcheck |
| `GET` | `/api/auth/me` | Yes (`Bearer <token>`) | Current authenticated user profile |

### Security Guarantees

1. **Privilege Separation**:
   - `SUPABASE_SECRET_KEY` and `DATABASE_URL` exist **strictly on the backend**.
   - The frontend bundle only consumes public publishable keys (`VITE_SUPABASE_PUBLISHABLE_KEY`).
2. **Password Security**:
   - Passwords are encrypted and managed purely within `auth.users` by Supabase Auth.
   - `public.users` contains **no password column**.
3. **Role Escalation Protection**:
   - Client metadata such as `{ role: 'admin' }` passed during signup is completely ignored.
   - The PostgreSQL trigger `public.handle_new_user()` enforces `role = 'visitor'`.
4. **Token Verification**:
   - Backend derives identity directly from the verified Supabase JWT; client-supplied user IDs or roles are never trusted.

### Running Auth Verification Tests

An automated test suite is provided in `server/src/test/verify-auth.ts` covering all 12 validation requirements (signup, profile sync, default role, login, invalid login, session persistence, logout, 401 without token, 401 with invalid token, 200 with valid token, role escalation rejection, secret key isolation).

To run the verification suite:

```bash
cd server
npm run test:auth
```

---

## Authorization & Role-Based Access Control (Step 6)

### Responsibilities
* **Authentication (Step 5)**: *"Who is this user?"* (Supabase Auth verification)
* **Authorization (Step 6)**: *"What is this user allowed to do?"* (`public.users.role` check)

### Role Model
The application defines three strictly typed roles:
```ts
export type UserRole = 'visitor' | 'subscriber' | 'admin';
```

| Capability | Visitor | Subscriber | Admin |
|---|:---:|:---:|:---:|
| Public content | ✅ | ✅ | ✅ |
| Authenticated profile | ✅ | ✅ | ✅ |
| Subscriber features | ❌ | ✅ | ✅ |
| Subscription management | ❌ | ✅ | ✅ |
| Admin features & management | ❌ | ❌ | ✅ |

### Request Pipeline & Middleware Ordering
Authorization checks must **always** be executed after authentication middleware:

```text
Request
  │
  ▼
requireAuth (verifies Supabase JWT -> populates req.user from public.users)
  │
  ▼
requireRole('admin') / requireSubscriber / requireRole(...)
  │
  ▼
Controller handler
```

### HTTP Status Code Semantics
* `401 Unauthorized`: Missing, invalid, or expired authentication token.
  ```json
  { "success": false, "message": "Authentication required" }
  ```
* `403 Forbidden`: Authenticated user does not possess the required role.
  ```json
  { "success": false, "message": "Insufficient permissions" }
  ```

### Reusable Middleware Helpers
* `requireRole(...roles: UserRole[])`: Base higher-order authorization middleware.
* `requireAdmin`: Convenience shortcut for `requireRole('admin')`.
* `requireSubscriber`: Convenience shortcut for `requireRole('subscriber', 'admin')`.

### Authorization Endpoints
| Method | Path | Required Role | Description |
|---|---|---|---|
| `GET` | `/api/auth/test/authenticated` | Any authenticated user | Verifies valid session identity |
| `GET` | `/api/auth/test/subscriber` | `subscriber`, `admin` | Verifies subscriber privileges |
| `GET` | `/api/auth/test/admin` | `admin` only | Verifies administrative privileges |

### Security Guarantees
1. **Authoritative Backend**: Client-side headers (`X-Role`, `X-User-Role`), query params (`?role=admin`), or request bodies are strictly ignored. The only trusted source of truth is `public.users.role` retrieved via the authenticated database profile.
2. **Frontend Guards are UI Only**: The frontend `<RoleGate>` component controls view presentation for user experience, but all actual access control is enforced by Express backend middleware.
3. **No Self-Service Role Changes**: Users cannot modify their role via any public endpoint. Role modifications must be performed through trusted backend/database administrative procedures.

### Running RBAC Verification Tests
An automated test suite is provided in `server/src/test/verify-rbac.ts` testing all 12 test matrix combinations:

```bash
cd server
npm run test:rbac
```

