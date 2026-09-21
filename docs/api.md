# Digital Hero — API Specification

This document details all implemented HTTP endpoints on the Digital Hero backend Express server.

* **Base URL**: `http://localhost:5000/api` (Local) / `/api` (Production)
* **Default Content-Type**: `application/json`

---

## 1. System & Health Endpoints

### `GET /api/health`
Checks API service responsiveness and active database connection pool health.

* **Authentication**: None
* **Role Requirement**: None
* **Request Body**: None
* **Success Response (HTTP 200)**:
  ```json
  {
    "success": true,
    "server": "ok",
    "database": "connected"
  }
  ```
* **Degraded Response (HTTP 503)**:
  ```json
  {
    "success": false,
    "server": "ok",
    "database": "disconnected"
  }
  ```

---

### `GET /` and `GET /api`
Root informational ping returning uptime and service metadata.

* **Authentication**: None
* **Role Requirement**: None
* **Request Body**: None
* **Success Response (HTTP 200)**:
  ```json
  {
    "status": "ok",
    "service": "Digital Hero API",
    "uptime": 45.2,
    "timestamp": "2026-09-21T14:15:00.000Z"
  }
  ```

---

## 2. Authentication & Profile Endpoints

### `GET /api/auth/me`
Fetches the profile and authoritative database role of the currently authenticated user.

* **Authentication**: Required (`Authorization: Bearer <access_token>`)
* **Role Requirement**: None (`visitor`, `subscriber`, or `admin`)
* **Request Body**: None
* **Success Response (HTTP 200)**:
  ```json
  {
    "success": true,
    "user": {
      "id": "54b5cd62-0e07-4ab7-a536-f56bdaaeaae6",
      "email": "user@example.com",
      "name": "Jane Doe",
      "role": "visitor"
    }
  }
  ```
* **Error Responses**:
  * **HTTP 401 Unauthorized** (Missing Token):
    ```json
    {
      "success": false,
      "code": "AUTH_REQUIRED",
      "message": "Authentication required"
    }
    ```
  * **HTTP 401 Unauthorized** (Expired or Invalid Token):
    ```json
    {
      "success": false,
      "code": "INVALID_CREDENTIALS",
      "message": "Invalid or expired authentication token"
    }
    ```

---

## 3. Authorization Gateway Verification Endpoints

These endpoints exist to verify RBAC enforcement across integration tests and client verification.

### `GET /api/auth/test/authenticated`
Verifies that the caller has a valid authentication session regardless of role.

* **Authentication**: Required (`Authorization: Bearer <access_token>`)
* **Role Requirement**: Any authenticated role
* **Success Response (HTTP 200)**:
  ```json
  {
    "success": true,
    "message": "Authenticated access granted",
    "user": {
      "id": "54b5cd62-0e07-4ab7-a536-f56bdaaeaae6",
      "email": "user@example.com",
      "role": "visitor"
    }
  }
  ```
* **Error Response (HTTP 401)**: Missing or invalid token.

---

### `GET /api/auth/test/subscriber`
Verifies that the caller holds at least the `subscriber` role (accessible to `subscriber` and `admin`).

* **Authentication**: Required (`Authorization: Bearer <access_token>`)
* **Role Requirement**: `subscriber` or `admin`
* **Success Response (HTTP 200)**:
  ```json
  {
    "success": true,
    "message": "Subscriber access granted",
    "user": {
      "id": "54b5cd62-0e07-4ab7-a536-f56bdaaeaae6",
      "email": "subscriber@example.com",
      "role": "subscriber"
    }
  }
  ```
* **Error Responses**:
  * **HTTP 401 Unauthorized**: Unauthenticated request.
  * **HTTP 403 Forbidden** (When role is `visitor`):
    ```json
    {
      "success": false,
      "message": "Insufficient permissions"
    }
    ```

---

### `GET /api/auth/test/admin`
Verifies that the caller holds the `admin` role.

* **Authentication**: Required (`Authorization: Bearer <access_token>`)
* **Role Requirement**: `admin`
* **Success Response (HTTP 200)**:
  ```json
  {
    "success": true,
    "message": "Admin access granted",
    "user": {
      "id": "461c575e-1692-4545-8e26-ca34e1cf2348",
      "email": "admin@example.com",
      "role": "admin"
    }
  }
  ```
* **Error Responses**:
  * **HTTP 401 Unauthorized**: Unauthenticated request.
  * **HTTP 403 Forbidden** (When role is `visitor` or `subscriber`):
    ```json
    {
      "success": false,
      "message": "Insufficient permissions"
    }
    ```

---

## 4. Score Management Endpoints (Phase 2)

All score endpoints require both user authentication and active subscriber authorization (`requireAuth` + `requireSubscriber`).

### `GET /api/scores`
Retrieves up to 5 retained scores for the authenticated user, ordered in reverse chronological order (`score_date DESC, created_at DESC`).

* **Authentication**: Required
* **Authorization**: Active Subscriber (or Admin)
* **Request Body**: None
* **Success Response (HTTP 200)**:
  ```json
  {
    "success": true,
    "scores": [
      {
        "id": "872b4643-94f2-45aa-8220-62c3a570090c",
        "userId": "00000000-0000-0000-0000-000000000091",
        "score": 38,
        "date": "2026-09-21",
        "createdAt": "2026-09-21T17:00:00.000Z",
        "updatedAt": "2026-09-21T17:00:00.000Z"
      }
    ]
  }
  ```

---

### `POST /api/scores`
Logs a new 18-hole Stableford score. Enforces:
1. Valid Stableford score (integer 1–45).
2. Valid calendar date (YYYY-MM-DD, no future dates).
3. Unique score per date per subscriber.
4. Rolling-5 eviction: If the subscriber has 5 existing scores, adding a 6th atomically evicts the oldest score (`score_date ASC, created_at ASC`).

* **Authentication**: Required
* **Authorization**: Active Subscriber (or Admin)
* **Request Body**:
  ```json
  {
    "score": 36,
    "date": "2026-09-21"
  }
  ```
* **Success Response (HTTP 201)**:
  ```json
  {
    "success": true,
    "message": "Score recorded successfully.",
    "data": {
      "id": "872b4643-94f2-45aa-8220-62c3a570090c",
      "userId": "00000000-0000-0000-0000-000000000091",
      "score": 36,
      "date": "2026-09-21",
      "createdAt": "2026-09-21T17:00:00.000Z",
      "updatedAt": "2026-09-21T17:00:00.000Z"
    },
    "scores": [ /* latest <= 5 scores */ ],
    "evictedScoreId": "optional-uuid-of-evicted-score"
  }
  ```
* **Error Responses**:
  * **HTTP 400 Bad Request** (`INVALID_SCORE`, `INVALID_DATE`, `FUTURE_DATE`, `MISSING_FIELD`).
  * **HTTP 409 Conflict** (`SCORE_ALREADY_EXISTS`):
    ```json
    {
      "success": false,
      "code": "SCORE_ALREADY_EXISTS",
      "message": "A score already exists for this date.",
      "existingScoreId": "872b4643-94f2-45aa-8220-62c3a570090c"
    }
    ```

---

### `PATCH /api/scores/:id`
Updates an existing score owned by the authenticated user. Editing an existing score does not trigger rolling-5 eviction.

* **Authentication**: Required
* **Authorization**: Active Subscriber (or Admin)
* **Request Body** (at least one field required):
  ```json
  {
    "score": 40,
    "date": "2026-09-20"
  }
  ```
* **Success Response (HTTP 200)**:
  ```json
  {
    "success": true,
    "message": "Score updated successfully.",
    "data": { /* updated ScoreRecord */ },
    "scores": [ /* updated list of <= 5 scores */ ]
  }
  ```
* **Error Responses**:
  * **HTTP 404 Not Found** (`SCORE_NOT_FOUND`): Score does not exist or belongs to another user.
  * **HTTP 409 Conflict** (`SCORE_ALREADY_EXISTS`): Attempting to change date to another date that already has a score for this user.

---

### `DELETE /api/scores/:id`
Deletes a score owned by the authenticated user.

* **Authentication**: Required
* **Authorization**: Active Subscriber (or Admin)
* **Success Response (HTTP 200)**:
  ```json
  {
    "success": true,
    "message": "Score deleted successfully.",
    "deletedId": "872b4643-94f2-45aa-8220-62c3a570090c",
    "scores": [ /* remaining scores */ ]
  }
  ```
* **Error Response (HTTP 404)**: `SCORE_NOT_FOUND` if score does not exist or is owned by another user.

---

## 5. Charity System Endpoints (Phase 3)

### Public Charity Endpoints

#### `GET /api/charities`
Retrieves all active, non-deleted partner charities with optional search and category filters.

* **Authentication**: None
* **Query Parameters**:
  * `search` (optional string): Case-insensitive match on name or description.
  * `category` (optional string): Filter by category (`Education`, `Healthcare`, `Environment`, `Community`, `Sports`, `Animal Welfare`, `Arts & Culture`, `Other`).
* **Success Response (HTTP 200)**:
  ```json
  {
    "success": true,
    "charities": [
      {
        "id": "2aa5984f-3475-44e8-a691-25a2ea4c46b0",
        "name": "Clean Oceans Foundation",
        "description": "Dedicated to removing plastic from the ocean.",
        "category": "Environment",
        "logoUrl": "https://...",
        "websiteUrl": "https://...",
        "images": ["https://..."],
        "upcomingEvents": [
          { "title": "Beach Cleanup Gala", "date": "2026-10-15", "location": "Miami Beach" }
        ],
        "featured": true,
        "isActive": true,
        "createdAt": "2026-09-21T18:00:00.000Z",
        "updatedAt": "2026-09-21T18:00:00.000Z"
      }
    ]
  }
  ```

#### `GET /api/charities/featured`
Returns all active charities marked as `featured = true` for the homepage spotlight carousel.

* **Authentication**: None
* **Success Response (HTTP 200)**: List of featured charities.

#### `GET /api/charities/:id`
Retrieves detailed profile of a single active charity.

* **Authentication**: None
* **Success Response (HTTP 200)**: `{ "success": true, "charity": { ... } }`
* **Error Response (HTTP 404)**: If charity does not exist or is inactive / soft-deleted.

---

### Admin Charity Management Endpoints

#### `GET /api/admin/charities`
Retrieves all charities in the system (including inactive and soft-deleted).

* **Authentication**: Required
* **Authorization**: Admin (`requireAdmin`)
* **Success Response (HTTP 200)**: Array of all charities.

#### `POST /api/admin/charities`
Creates a new partner charity.

* **Authentication**: Required
* **Authorization**: Admin (`requireAdmin`)
* **Request Body**:
  ```json
  {
    "name": "Global Rainforest Alliance",
    "description": "Preserving indigenous rainforests.",
    "category": "Environment",
    "logoUrl": "https://...",
    "websiteUrl": "https://...",
    "images": ["https://..."],
    "upcomingEvents": [
      { "title": "Arbor Day Fundraiser", "date": "2026-11-01", "location": "Online" }
    ],
    "featured": false
  }
  ```
* **Success Response (HTTP 201)**: `{ "success": true, "charity": { ... } }`
* **Error Responses**:
  * **HTTP 400 Bad Request**: Validation failure (`CHARITY_NAME_REQUIRED`, `INVALID_CATEGORY`).
  * **HTTP 409 Conflict**: `CHARITY_NAME_EXISTS`.

#### `PATCH /api/admin/charities/:id`
Updates an existing charity's metadata, images, events, or active status.

* **Authentication**: Required
* **Authorization**: Admin (`requireAdmin`)

#### `DELETE /api/admin/charities/:id`
Soft-deletes a charity (`is_active = false, deleted_at = NOW()`). Foreign keys from historical draws and donations are strictly preserved.

* **Authentication**: Required
* **Authorization**: Admin (`requireAdmin`)
* **Success Response (HTTP 200)**: `{ "success": true, "message": "Charity successfully deactivated." }`

#### `POST /api/admin/charities/upload`
Uploads an image file to Supabase Storage in the public `charities` bucket.

* **Authentication**: Required
* **Authorization**: Admin (`requireAdmin`)
* **Request Body**:
  ```json
  {
    "base64Data": "data:image/png;base64,...",
    "filename": "logo.png",
    "mimetype": "image/png"
  }
  ```
* **Success Response (HTTP 200)**: `{ "success": true, "url": "https://...supabase.co/storage/v1/object/public/charities/..." }`

---

### Subscriber Charity Preferences

#### `GET /api/subscriptions/charity`
Retrieves the authenticated subscriber's current allocated charity and contribution percentage.

* **Authentication**: Required
* **Authorization**: Active Subscriber (`requireSubscriber`)
* **Success Response (HTTP 200)**:
  ```json
  {
    "success": true,
    "preference": {
      "subscriptionId": "74faee17-b4ea-4ead-a4a2-728644fb2980",
      "charityId": "2aa5984f-3475-44e8-a691-25a2ea4c46b0",
      "charity": { /* CharityRecord */ },
      "contributionPercentage": 25
    }
  }
  ```

#### `PUT /api/subscriptions/charity`
Updates the subscriber's selected charity and contribution percentage (minimum 10%, maximum 100%).

* **Authentication**: Required
* **Authorization**: Active Subscriber (`requireSubscriber`)
* **Request Body**:
  ```json
  {
    "charityId": "2aa5984f-3475-44e8-a691-25a2ea4c46b0",
    "contributionPercentage": 35
  }
  ```
* **Success Response (HTTP 200)**: `{ "success": true, "preference": { ... } }`
* **Error Responses**:
  * **HTTP 400 Bad Request** (`INVALID_PERCENTAGE`): If contribution percentage is < 10 or > 100.
  * **HTTP 400 Bad Request** (`CHARITY_INACTIVE`): If charity is soft-deleted or inactive.
  * **HTTP 403 Forbidden** (`SUBSCRIPTION_REQUIRED`): If caller lacks an active subscription.

---

### Independent Donations

#### `POST /api/donations`
Creates a pending one-time donation to a partner charity.

* **Authentication**: Optional (supports both logged-in users and anonymous guests)
* **Request Body**:
  ```json
  {
    "charityId": "2aa5984f-3475-44e8-a691-25a2ea4c46b0",
    "amount": 50.00,
    "donorName": "Jane Doe",
    "message": "Keep up the inspiring work!"
  }
  ```
* **Success Response (HTTP 201)**: `{ "success": true, "donation": { "id": "...", "status": "pending", ... } }`

#### `POST /api/donations/:id/confirm`
Confirms donation payment using test-mode simulated card processing.

* **Authentication**: None
* **Request Body**:
  ```json
  {
    "cardNumber": "4242424242424242"
  }
  ```
* **Success Response (HTTP 200)**:
  ```json
  {
    "success": true,
    "donation": {
      "id": "...",
      "status": "completed",
      "transactionReference": "MOCK-DON-MUBJI7F2-9M7CMKD1"
    }
  }
  ```
* **Error Response (HTTP 400)**: If card ending in `0002` is provided, simulates a card decline and marks donation as `failed`.

---

## 6. Draw & Prize Engine Endpoints (Phase 4)

### Public & Subscriber Draw Endpoints

#### `GET /api/draws/active`
Retrieves the currently open or scheduled active draw with estimated jackpot calculations.

* **Authentication**: None
* **Success Response (HTTP 200)**:
  ```json
  {
    "success": true,
    "draw": {
      "id": "53d05e75-de48-49b1-924e-43b83661ea28",
      "title": "Monthly Draw - 2026-10",
      "scheduled_month": "2026-10",
      "draw_date": "2026-10-31",
      "draw_type": "SCORE_WEIGHTED",
      "status": "open",
      "three_match_percentage": 25,
      "four_match_percentage": 35,
      "five_match_percentage": 40,
      "total_pool": 1231.46,
      "three_match_pool": 307.86,
      "four_match_pool": 431.01,
      "five_match_pool": 492.59,
      "jackpot_rollover_amount": 5000.00,
      "entries_count": 42
    }
  }
  ```

#### `GET /api/draws/history`
Retrieves all completed, finalized draws with official winning numbers and prize totals.

* **Authentication**: None
* **Success Response (HTTP 200)**: `{ "success": true, "draws": [ ... ] }`

#### `GET /api/draws/:id`
Retrieves public details of a specific draw, including declared winners if completed.

* **Authentication**: None
* **Success Response (HTTP 200)**: `{ "success": true, "draw": { ... }, "winners": [ ... ] }`

#### `GET /api/draws/:id/my-entry`
Retrieves the authenticated subscriber's assigned 5-number ticket for the specified draw.

* **Authentication**: Required (`Authorization: Bearer <token>`)
* **Success Response (HTTP 200)**:
  ```json
  {
    "success": true,
    "entry": {
      "id": "03fa41f1-399b-449e-ba65-8742880b91e9",
      "draw_id": "53d05e75-de48-49b1-924e-43b83661ea28",
      "user_id": "00000000-0000-0000-0000-000000000091",
      "numbers": [12, 18, 25, 33, 41],
      "created_at": "2026-09-21T18:00:00.000Z"
    }
  }
  ```

---

### Admin Draw Engine Endpoints

#### `GET /api/admin/draws`
Lists all draws across all statuses (draft, scheduled, open, closed, simulated, completed, cancelled).

* **Authentication**: Required (`requireAdmin`)
* **Success Response (HTTP 200)**: `{ "success": true, "draws": [ ... ] }`

#### `POST /api/admin/draws`
Schedules a new monthly draw. Rejects duplicate months and ensures 3/4/5 match percentages sum to 100%.

* **Authentication**: Required (`requireAdmin`)
* **Request Body**:
  ```json
  {
    "title": "Monthly Draw - 2026-11",
    "scheduled_month": "2026-11",
    "draw_date": "2026-11-30",
    "draw_type": "SCORE_WEIGHTED",
    "three_match_percentage": 25,
    "four_match_percentage": 35,
    "five_match_percentage": 40,
    "jackpot_rollover_amount": 0
  }
  ```

#### `POST /api/admin/draws/:id/open`
Opens the draw entry window and automatically enrolls all active subscribers in good standing, generating 5 unique numbers in range 1–45.

* **Authentication**: Required (`requireAdmin`)
* **Success Response (HTTP 200)**: `{ "success": true, "entriesEnrolled": 42 }`

#### `POST /api/admin/draws/:id/close`
Closes the draw entry window (`status = 'closed'`).

* **Authentication**: Required (`requireAdmin`)
* **Success Response (HTTP 200)**: `{ "success": true, "draw": { ... } }`

#### `POST /api/admin/draws/:id/simulate`
Generates candidate drawn numbers, evaluates matches, and computes winner allocations and rollover without creating permanent winner records.

* **Authentication**: Required (`requireAdmin`)
* **Success Response (HTTP 200)**:
  ```json
  {
    "success": true,
    "simulation": {
      "candidateNumbers": [7, 14, 21, 35, 42],
      "match5Winners": [],
      "match4Winners": [ { "userId": "...", "prizeAmount": 431.01, "matchCount": 4, "rank": 1 } ],
      "match3Winners": [],
      "match5Pool": 5492.59,
      "match4Pool": 431.01,
      "match3Pool": 307.86,
      "jackpotRollover": 5492.59,
      "totalSubscribers": 3,
      "totalEntries": 3
    }
  }
  ```

#### `POST /api/admin/draws/:id/publish`
Atomically finalizes the draw: writes declared winners to `public.winners`, marks status as `'completed'`, records winning numbers in `draws.drawn_numbers`, and transfers any unclaimed 5-match jackpot into subsequent draws.

* **Authentication**: Required (`requireAdmin`)
* **Success Response (HTTP 200)**: `{ "success": true, "winnersCount": 1, "draw": { ... } }`

#### `DELETE /api/admin/draws/:id`
Deletes a draft or scheduled draw. Rejects deletion if draw is in progress or completed.

* **Authentication**: Required (`requireAdmin`)
* **Success Response (HTTP 200)**: `{ "success": true, "message": "Draw deleted successfully." }`

---

## 7. Winner Verification & Dashboards Endpoints (Phase 5)

### User & Subscriber Winner Endpoints

#### `GET /api/winners/me`
Retrieves all draw prize winnings awarded to the authenticated subscriber, including match details, signed scorecard proof URLs, and payout progress.

* **Authentication**: Required (`requireAuth`)
* **Success Response (HTTP 200)**:
  ```json
  {
    "success": true,
    "winners": [
      {
        "id": "76495b28-fcbf-4074-9ec4-cecbff54f1c3",
        "drawId": "53d05e75-de48-49b1-924e-43b83661ea28",
        "drawTitle": "Monthly Draw - 2026-09",
        "rank": 2,
        "matchCount": 4,
        "prizeAmount": 431.01,
        "currency": "INR",
        "verificationStatus": "PENDING_PROOF",
        "proofStoragePath": null,
        "proofSignedUrl": null,
        "paymentStatus": "PENDING",
        "paidAt": null,
        "paymentReference": null,
        "createdAt": "2026-09-21T18:00:00.000Z"
      }
    ]
  }
  ```

#### `POST /api/winners/:winnerId/proof`
Uploads a golf scorecard screenshot to private Supabase Storage (`winner-proofs`) for admin verification.
* Validates ownership: only the winning subscriber can upload proof.
* Allowed image types: `image/jpeg`, `image/png`, `image/webp`.
* Size limit: Maximum 5MB.
* Transitions status: `PENDING_PROOF` -> `PENDING_REVIEW` (or from `REJECTED` back to `PENDING_REVIEW`).

* **Authentication**: Required (`requireAuth`)
* **Request Format**: `multipart/form-data` with field `proof` (File) or base64 JSON payload.
* **Success Response (HTTP 200)**:
  ```json
  {
    "success": true,
    "message": "Score proof uploaded successfully. Awaiting admin review.",
    "winner": {
      "id": "76495b28-fcbf-4074-9ec4-cecbff54f1c3",
      "verificationStatus": "PENDING_REVIEW",
      "proofStoragePath": "winner-proofs/76495b28...png"
    }
  }
  ```
* **Error Responses**:
  * **HTTP 403 Forbidden**: If the caller is not the owner of the winning claim.
  * **HTTP 400 Bad Request**: File exceeds 5MB or invalid MIME type.
  * **HTTP 409 Conflict**: Proof already approved.

---

### Admin Winner Verification & Payout Operations

#### `GET /api/admin/winners`
Lists all declared winners across all lottery draws with full joined user and draw metadata, verification statuses, and time-limited (1-hour) signed URLs for inspecting submitted scorecard proofs.

* **Authentication**: Required (`requireAdmin`)
* **Success Response (HTTP 200)**: Array of all platform winners.

#### `GET /api/admin/winners/pending`
Returns only winning claims currently in `PENDING_REVIEW` status requiring administrative action.

* **Authentication**: Required (`requireAdmin`)
* **Success Response (HTTP 200)**: Array of pending winner reviews.

#### `POST /api/admin/winners/:id/approve`
Approves a winner's submitted scorecard proof, locking the record against further edits and making it eligible for payout settlement.

* **Authentication**: Required (`requireAdmin`)
* **Success Response (HTTP 200)**:
  ```json
  {
    "success": true,
    "message": "Winner proof approved.",
    "winner": {
      "id": "76495b28-fcbf-4074-9ec4-cecbff54f1c3",
      "verificationStatus": "APPROVED",
      "reviewedBy": "00000000-0000-0000-0000-000000000001",
      "reviewedAt": "2026-09-22T00:00:00.000Z"
    }
  }
  ```

#### `POST /api/admin/winners/:id/reject`
Rejects an illegible or non-matching scorecard proof, requiring an explanation note. Resets verification status to `REJECTED`, allowing the subscriber to resubmit.

* **Authentication**: Required (`requireAdmin`)
* **Request Body**:
  ```json
  {
    "reason": "Stableford points on scorecard do not match the declared score."
  }
  ```
* **Success Response (HTTP 200)**: `{ "success": true, "message": "Winner proof rejected." }`

#### `POST /api/admin/winners/:id/mark-paid`
Records a manual prize disbursement (e.g. bank wire, UPI, transfer).
* Strictly requires `verification_status = 'APPROVED'`.
* Transitions `payment_status: PENDING -> PAID`.
* Creates/updates audit entry in `public.payouts` with reference ID.
* Idempotent: rejects duplicate payments with `ALREADY_PAID`.

* **Authentication**: Required (`requireAdmin`)
* **Request Body**:
  ```json
  {
    "paymentReference": "BANK-REF-998822",
    "paidAt": "2026-09-22T00:00:00.000Z",
    "adminNote": "Processed via direct wire transfer."
  }
  ```
* **Success Response (HTTP 200)**:
  ```json
  {
    "success": true,
    "message": "Winner payout marked as paid.",
    "payoutId": "5f9d1234-abcd-4e56-8901-23456789abcd"
  }
  ```

---

### Admin User Management Endpoints

#### `GET /api/admin/users`
Returns all platform users with subscription standing, score counters, and prize metrics.

* **Authentication**: Required (`requireAdmin`)

#### `GET /api/admin/users/:id`
Retrieves a comprehensive drill-down profile for a single user including their active subscription, allocated charity partner, recent scores, and won draw prizes.

* **Authentication**: Required (`requireAdmin`)

#### `PATCH /api/admin/users/:id/role`
Updates a user's platform role (`visitor`, `subscriber`, `admin`).

* **Authentication**: Required (`requireAdmin`)

---

### Admin PRD Analytics & Reports

#### `GET /api/admin/reports/overview`
Retrieves high-level KPI cards for the Admin Dashboard overview: total users, active subscribers, upcoming draw summary, pending scorecard verification queue count, and pending payouts count.

* **Authentication**: Required (`requireAdmin`)

#### `GET /api/admin/reports/aggregate`
Aggregates the 4 comprehensive PRD operational reports:
1. `totalUsers`: Total registered accounts, active subscribers, and visitors.
2. `totalPrizePool`: Total prize pool published across draws, completed draws count, and total winners awarded.
3. `charityTotals`: Per-charity active subscriber supporters, total donation volume, and gift counts.
4. `drawStatistics`: Total draws, published, scheduled/open, total tickets entered, and total winners.

* **Authentication**: Required (`requireAdmin`)


