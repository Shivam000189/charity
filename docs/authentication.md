# Digital Hero — Authentication Architecture (Step 5)

This document explains the authentication lifecycle, identity synchronization, token verification, and security boundaries implemented in Digital Hero.

---

## 1. Authentication Overview

Digital Hero delegates authentication credential management and session issuance to **Supabase Auth**, while managing application profiles, roles, and relational records in **Supabase PostgreSQL (`public.users`)**.

```text
Browser Client                     Supabase Auth                     Express Backend                 Supabase PostgreSQL
      │                                  │                                  │                                  │
      ├────── 1. Sign Up / Sign In ─────►│                                  │                                  │
      │                                  ├──── 2. Insert auth.users ──────────────────────────────────────────►│
      │                                  │                                  │        (Trigger fires)           │
      │                                  │                                  │    3. Insert public.users ───────┤
      │                                  │                                  │       (role = 'visitor')         │
      │◄───── 4. JWT Access Token ───────┤                                  │                                  │
      │                                  │                                  │                                  │
      ├────── 5. GET /api/auth/me (Authorization: Bearer <JWT>) ───────────►│                                  │
      │                                  │                                  ├────── 6. Validate Token ────────►│
      │                                  │                                  ├────── 7. Query User Profile ────►│
      │                                  │                                  │          (role from DB)          │
      │◄───── 8. Return Profile & Role ─────────────────────────────────────┤                                  │
```

---

## 2. Authentication Flows

### 2.1. Registration / Signup Flow
1. The user submits their email, password, and display name through the [`SignupForm`](file:///d:/shivam/projects/dgital-hero/client/src/components/auth/SignupForm.tsx) on `/signup`.
2. The browser calls `supabase.auth.signUp({ email, password, options: { data: { name } } })`.
3. Supabase Auth encrypts the password and writes a new identity record to `auth.users`.
4. The PostgreSQL database trigger `on_auth_user_created` automatically executes the function `handle_new_user()`.
5. The trigger automatically creates a row in `public.users`:
   ```sql
   INSERT INTO public.users (id, email, name, role)
   VALUES (
     NEW.id,
     NEW.email,
     COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
     'visitor' -- Strictly hardcoded default role
   );
   ```
6. The user is guaranteed to start with the baseline `'visitor'` role. Any user-supplied role metadata is strictly ignored.

### 2.2. Login Flow
1. The user inputs their credentials into [`LoginForm`](file:///d:/shivam/projects/dgital-hero/client/src/components/auth/LoginForm.tsx) on `/login`.
2. The browser invokes `supabase.auth.signInWithPassword({ email, password })`.
3. Supabase Auth verifies credentials and returns an active session containing a signed JWT access token (`access_token`) and refresh token.
4. [`AuthContext`](file:///d:/shivam/projects/dgital-hero/client/src/context/AuthContext.tsx) captures the session event and queries `public.users` to hydrate the user profile and role into client memory.

### 2.3. Backend Token Verification (`requireAuth`)
1. All authenticated API requests pass an HTTP header:
   ```http
   Authorization: Bearer <access_token>
   ```
2. The Express [`requireAuth`](file:///d:/shivam/projects/dgital-hero/server/src/middleware/auth.middleware.ts) middleware intercepts the request.
3. If the header is missing or malformed, it immediately returns:
   ```json
   {
     "success": false,
     "code": "AUTH_REQUIRED",
     "message": "Authentication required"
   }
   ```
4. The middleware validates the token using the privileged backend Supabase client:
   ```ts
   const { data, error } = await supabase.auth.getUser(token);
   ```
5. If the token is invalid or expired, the backend returns HTTP 401:
   ```json
   {
     "success": false,
     "code": "INVALID_CREDENTIALS",
     "message": "Invalid or expired authentication token"
   }
   ```
6. The backend queries `public.users` using the PostgreSQL pool to retrieve the user's authoritative role and profile:
   ```sql
   SELECT id, email, name, role FROM public.users WHERE id = $1 AND deleted_at IS NULL
   ```
7. It attaches the user payload to `req.user`:
   ```ts
   req.user = { id: profile.id, email: profile.email, name: profile.name, role: profile.role };
   ```

### 2.4. Logout Flow
1. The user triggers `logout()` from [`AuthContext`](file:///d:/shivam/projects/dgital-hero/client/src/context/AuthContext.tsx) via Header navigation.
2. The client invokes `supabase.auth.signOut()`.
3. The local storage session is cleared.
4. Client state resets `user` and `session` to `null`.
5. The user is redirected to `/login`.

---

## 3. The `/api/auth/me` Endpoint

* **Route**: `GET /api/auth/me`
* **Authentication**: Required (`Bearer <token>`)
* **Role**: Any valid authenticated role (`visitor`, `subscriber`, `admin`)
* **Controller**: [`getMe`](file:///d:/shivam/projects/dgital-hero/server/src/controllers/auth.controller.ts)
* **Response**:
  ```json
  {
    "success": true,
    "user": {
      "id": "54b5cd62-0e07-4ab7-a536-f56bdaaeaae6",
      "email": "user@example.com",
      "name": "User Name",
      "role": "visitor"
    }
  }
  ```

---

## 4. Fundamental Security Rules

1. **Passwords Never Touch `public.users`**: All passwords, hashing algorithms, and password-reset lifecycles reside in Supabase Auth.
2. **Client Cannot Escalate Privileges**: The client cannot choose or alter its role during registration or login.
3. **Database Is Authoritative**: User roles are read directly from `public.users.role` on every authenticated request.
4. **Secret Key Isolation**: `SUPABASE_SECRET_KEY` is restricted strictly to the backend environment and never shipped to client bundles.
