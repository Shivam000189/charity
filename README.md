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
