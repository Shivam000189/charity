# Digital Hero — Authorization & RBAC Architecture (Step 6)

This document details the Role-Based Access Control (RBAC) model, middleware implementation, permission matrix, and security boundary distinctions in Digital Hero.

---

## 1. System Roles

The application implements a 3-tier hierarchical role architecture:

| Role | Hierarchy Level | Description |
|---|:---:|---|
| **`visitor`** | 1 (Base) | Default role assigned upon registration. Can access public pages, user dashboard, and personal profile. Cannot enter subscriber draws or view subscriber features. |
| **`subscriber`** | 2 (Member) | Paying member with an active recurring subscription. Has access to all visitor capabilities plus subscriber areas (`/subscription`, `/my-entries`, `/my-winnings`). |
| **`admin`** | 3 (Superuser) | System operator with complete operational privileges. Inherits all subscriber and visitor access, plus exclusive access to administrative management consoles (`/admin/*`). |

---

## 2. Express Authorization Middleware

All authorization middleware is located in [`server/src/middleware/role.middleware.ts`](file:///d:/shivam/projects/dgital-hero/server/src/middleware/role.middleware.ts) and depends on [`requireAuth`](file:///d:/shivam/projects/dgital-hero/server/src/middleware/auth.middleware.ts) running beforehand.

### 2.1. `requireRole(...allowedRoles: UserRole[])`
Checks whether the authenticated user's role (`req.user.role`) is included within the permitted list:
```ts
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Insufficient permissions' });
      return;
    }
    next();
  };
};
```

### 2.2. Convenience Middleware Helpers
* **`requireSubscriber`**: Defined as `requireRole('subscriber', 'admin')`. Grants access to paying members and administrative staff.
* **`requireAdmin`**: Defined as `requireRole('admin')`. Restricts access strictly to administrative personnel.

---

## 3. HTTP Error Codes & Semantics

* **`401 Unauthorized`**:
  * Returned when an unauthenticated client requests an authenticated endpoint, or when the supplied Bearer token is expired, tampered with, or invalid.
  * Message: `"Authentication required"` or `"Invalid or expired authentication token"`.
* **`403 Forbidden`**:
  * Returned when a user is validly authenticated, but their assigned role does not meet the endpoint's role requirement.
  * Message: `"Insufficient permissions"`.

---

## 4. Application Permission Matrix

| Route / Area | Path | Unauthenticated | Visitor | Subscriber | Admin | Guard Mechanism |
|---|---|:---:|:---:|:---:|:---:|---|
| **Home Page** | `/` | Allowed | Allowed | Allowed | Allowed | Public Route |
| **About Page** | `/about` | Allowed | Allowed | Allowed | Allowed | Public Route |
| **Charities List** | `/charities` | Allowed | Allowed | Allowed | Allowed | Public Route |
| **Draws List** | `/draws` | Allowed | Allowed | Allowed | Allowed | Public Route |
| **Login / Signup** | `/login`, `/signup` | Allowed | Allowed | Allowed | Allowed | Public Route |
| **User Dashboard** | `/dashboard` | Denied (401) | **Allowed** | **Allowed** | **Allowed** | `ProtectedRoute` / `requireAuth` |
| **User Profile** | `/profile` | Denied (401) | **Allowed** | **Allowed** | **Allowed** | `ProtectedRoute` / `requireAuth` |
| **Subscription Portal**| `/subscription` | Denied (401) | Denied (403) | **Allowed** | **Allowed** | `RoleRoute(['subscriber', 'admin'])` |
| **My Draw Entries** | `/my-entries` | Denied (401) | Denied (403) | **Allowed** | **Allowed** | `RoleRoute(['subscriber', 'admin'])` |
| **My Winnings** | `/my-winnings` | Denied (401) | Denied (403) | **Allowed** | **Allowed** | `RoleRoute(['subscriber', 'admin'])` |
| **Admin Overview** | `/admin` | Denied (401) | Denied (403) | Denied (403) | **Allowed** | `RoleRoute(['admin'])` / `requireAdmin` |
| **Admin User Mgmt** | `/admin/users` | Denied (401) | Denied (403) | Denied (403) | **Allowed** | `RoleRoute(['admin'])` / `requireAdmin` |
| **Admin Charities** | `/admin/charities` | Denied (401) | Denied (403) | Denied (403) | **Allowed** | `RoleRoute(['admin'])` / `requireAdmin` |
| **Admin Draws** | `/admin/draws` | Denied (401) | Denied (403) | Denied (403) | **Allowed** | `RoleRoute(['admin'])` / `requireAdmin` |
| **Admin Winners** | `/admin/winners` | Denied (401) | Denied (403) | Denied (403) | **Allowed** | `RoleRoute(['admin'])` / `requireAdmin` |
| **Admin Payouts** | `/admin/payouts` | Denied (401) | Denied (403) | Denied (403) | **Allowed** | `RoleRoute(['admin'])` / `requireAdmin` |

---

## 5. Security Boundary Principles

```text
┌────────────────────────────────────────────────────────┐
│                   Frontend Client                      │
│   ProtectedRoute.tsx & RoleRoute.tsx (UX Layer)        │
│   - Redirects to /login if unauthenticated             │
│   - Redirects to /unauthorized if role insufficient    │
│   ⚠️  CAN BE BYPASSED BY TAMPERING IN BROWSER MEMORY   │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP Request + Bearer JWT
                            ▼
┌────────────────────────────────────────────────────────┐
│                   Backend Express                      │
│   requireAuth & requireRole Middleware (Security Gate) │
│   - Verifies cryptographically signed Supabase token   │
│   - Looks up authoritative role in public.users        │
│   - Enforces 401 / 403 server-side                     │
│   🛡️  UNBYPASSABLE REAL SECURITY BOUNDARY              │
└────────────────────────────────────────────────────────┘
```

1. **Client Guards are UX**: Frontend route redirection improves user experience by hiding inaccessible pages and preventing unnecessary navigation.
2. **Backend RBAC is the True Authority**: The Express API never relies on roles or claims sent by the browser. Roles are verified by querying `public.users.role` from the database.
