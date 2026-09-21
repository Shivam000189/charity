# Digital Hero — Database Schema Specification

This document provides the complete relational database design and schema specification for the **Digital Hero** application.

> **IMPORTANT RULE**: This document represents the approved **design only** (Step 3). No actual database tables, types, or migrations have been executed against the Supabase PostgreSQL database yet. Execution and migrations will occur in Step 4.

---

## 1. System Architecture & Lifecycle

### Architectural Fit
```text
┌─────────────────────────────────────────────────────────┐
│                    React 19 + Vite                      │
│                  (TailwindCSS, TS)                      │
└────────────────────────────┬────────────────────────────┘
                             │ HTTPS / REST
┌────────────────────────────▼────────────────────────────┐
│                  Node.js + Express                      │
│               (TypeScript REST Server)                  │
└────────────────────────────┬────────────────────────────┘
                             │ Connection Pool (pg) / SSL
┌────────────────────────────▼────────────────────────────┐
│                  Supabase PostgreSQL                    │
│        (auth.users  <───>  public application tables)    │
└─────────────────────────────────────────────────────────┘
```

### Domain Lifecycle
1. **Registration**: A user authenticates via Supabase Auth (`auth.users`), creating a profile in `public.users` sharing the exact same `UUID`.
2. **Subscription**: The user purchases or starts a subscription plan (`subscriptions`), setting status to `'active'`.
3. **Daily Score**: The user plays the daily game/challenge, producing a daily score recorded in `scores`. Enforced to strictly one score per user per calendar day.
4. **Draw Participation**: Active draws (`draws`) supporting designated charities (`charities`) accept entries. Eligible users enter via `draw_entries`, optionally linking their qualifying daily score.
5. **Draw Execution**: When the entry deadline passes, the draw closes, random or score-based winner selection occurs, and results are written to `winners`. The winning prize amount is preserved as a permanent historical snapshot.
6. **Payout Processing**: A financial transaction is initiated in `payouts` for the winner. When payment succeeds via a payment gateway (e.g., Stripe/banking), `paid_at` and `transaction_reference` are recorded.

---

## 2. Table Specifications

### 2.1. `users`
Represents application-level user profiles and roles linked 1:1 with Supabase Auth.

* **Purpose**: Stores profile data, app role, and authorization metadata without storing passwords.
* **Columns**:
  | Column | Data Type | Nullable | Default | Constraints & References |
  | :--- | :--- | :--- | :--- | :--- |
  | `id` | `UUID` | NOT NULL | None | `PRIMARY KEY`, `REFERENCES auth.users(id) ON DELETE CASCADE` |
  | `email` | `TEXT` | NOT NULL | None | `UNIQUE` (Case-insensitive) |
  | `name` | `TEXT` | NOT NULL | None | `CHECK (char_length(trim(name)) > 0)` |
  | `role` | `TEXT` | NOT NULL | `'visitor'` | `CHECK (role IN ('visitor', 'subscriber', 'admin'))` |
  | `deleted_at` | `TIMESTAMPTZ` | YES | `NULL` | None |
  | `created_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | None |
  | `updated_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | None |

* **Key Design Decisions**:
  - **No Password Column**: Credentials and tokens are managed exclusively by Supabase Auth.
  - **Soft Deletion (`deleted_at`)**: User deletion should normally be handled through soft deletion/deactivation (`deleted_at IS NOT NULL`) rather than physically deleting a user row when historical records (subscriptions, draw entries, winnings) depend on that user.
  - **Role Strategy**: Implemented as `TEXT` with a `CHECK` constraint rather than a native Postgres `ENUM`. This allows zero-downtime additions/modifications of roles in future migrations without complex type migration locking.
  - **Email Uniqueness**: Unique index on `LOWER(email)` prevents duplicate registrations with different casing.

---

### 2.2. `subscriptions`
Represents the subscription lifecycle, billing history, and active entitlement.

* **Purpose**: Records current and historical subscriptions for users.
* **Columns**:
  | Column | Data Type | Nullable | Default | Constraints & References |
  | :--- | :--- | :--- | :--- | :--- |
  | `id` | `UUID` | NOT NULL | `gen_random_uuid()` | `PRIMARY KEY` |
  | `user_id` | `UUID` | NOT NULL | None | `REFERENCES public.users(id) ON DELETE RESTRICT` |
  | `plan` | `TEXT` | NOT NULL | None | `CHECK (plan IN ('monthly', 'annual', 'daily'))` |
  | `status` | `TEXT` | NOT NULL | None | `CHECK (status IN ('pending', 'active', 'cancelled', 'expired'))` |
  | `started_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | None |
  | `expires_at` | `TIMESTAMPTZ` | NOT NULL | None | `CHECK (expires_at > started_at)` |
  | `cancelled_at`| `TIMESTAMPTZ` | YES | `NULL` | None |
  | `created_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | None |
  | `updated_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | None |

* **Key Design Decisions**:
  - **Historical Audit Protection (`ON DELETE RESTRICT`)**: Subscriptions represent financial billing transactions. `ON DELETE RESTRICT` guarantees historical subscription and financial records cannot be destroyed through accidental cascading user deletion.
  - **Single Active Subscription Invariant**: Enforced by a partial unique index:
    ```sql
    CREATE UNIQUE INDEX idx_subscriptions_user_active
    ON public.subscriptions (user_id)
    WHERE (status = 'active');
    ```
    This guarantees at the database engine level that a user can never possess two simultaneous active subscriptions, while preserving complete historical records.
  - **Real-time Status Check**: Evaluated instantly via `WHERE user_id = $1 AND status = 'active' AND expires_at > now()`.

---

### 2.3. `scores`
Represents a user's daily performance score.

* **Purpose**: Tracks daily game/challenge scores with strict one-score-per-day enforcement.
* **Columns**:
  | Column | Data Type | Nullable | Default | Constraints & References |
  | :--- | :--- | :--- | :--- | :--- |
  | `id` | `UUID` | NOT NULL | `gen_random_uuid()` | `PRIMARY KEY` |
  | `user_id` | `UUID` | NOT NULL | None | `REFERENCES public.users(id) ON DELETE CASCADE` |
  | `score` | `INTEGER` | NOT NULL | None | `CHECK (score >= 0)` |
  | `score_date` | `DATE` | NOT NULL | None | None |
  | `created_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | None |
  | `updated_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | None |

* **Key Constraints**:
  - `UNIQUE (user_id, score_date)`: Guarantees that a user can only record one score per calendar date. The underlying B-Tree index for this constraint also naturally indexes `user_id`, eliminating the need for a separate redundant index on `user_id`.
  - `score_date` uses PostgreSQL `DATE`: Eliminates timezone offset discrepancies and boundary drift issues common with timestamp conversions.

---

### 2.4. `charities`
Represents non-profit and charitable partner organizations supported by the platform's draws.

* **Purpose**: Directory of beneficiary charities available to be linked to lottery draws.
* **Columns**:
  | Column | Data Type | Nullable | Default | Constraints & References |
  | :--- | :--- | :--- | :--- | :--- |
  | `id` | `UUID` | NOT NULL | `gen_random_uuid()` | `PRIMARY KEY` |
  | `name` | `TEXT` | NOT NULL | None | `UNIQUE`, `CHECK (char_length(trim(name)) > 0)` |
  | `description` | `TEXT` | YES | `NULL` | None |
  | `logo_url` | `TEXT` | YES | `NULL` | None |
  | `website_url` | `TEXT` | YES | `NULL` | None |
  | `is_active` | `BOOLEAN` | NOT NULL | `true` | None |
  | `created_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | None |
  | `updated_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | None |

* **Key Design Decisions**:
  - **Soft Deactivation**: Organizations are toggled inactive via `is_active = false`. Historical draws referencing a deactivated charity remain fully intact.
  - **Deletions Prohibited on References**: Uses `ON DELETE RESTRICT` from child draws.

---

### 2.5. `draws`
Represents scheduled lottery and prize drawings associated with partner charities.

* **Purpose**: Controls draw timeline, prize pool, supported charity, and lifecycle states.
* **Columns**:
  | Column | Data Type | Nullable | Default | Constraints & References |
  | :--- | :--- | :--- | :--- | :--- |
  | `id` | `UUID` | NOT NULL | `gen_random_uuid()` | `PRIMARY KEY` |
  | `name` | `TEXT` | NOT NULL | None | `CHECK (char_length(trim(name)) > 0)` |
  | `description` | `TEXT` | YES | `NULL` | None |
  | `charity_id` | `UUID` | NOT NULL | None | `REFERENCES public.charities(id) ON DELETE RESTRICT` |
  | `draw_date` | `TIMESTAMPTZ` | NOT NULL | None | None |
  | `entry_deadline`| `TIMESTAMPTZ`| NOT NULL | None | `CHECK (entry_deadline <= draw_date)` |
  | `status` | `TEXT` | NOT NULL | `'scheduled'` | `CHECK (status IN ('scheduled', 'open', 'closed', 'completed', 'cancelled'))` |
  | `prize_amount` | `NUMERIC(12, 2)` | NOT NULL | `0.00` | `CHECK (prize_amount >= 0)` |
  | `currency` | `TEXT` | NOT NULL | `'INR'` | `CHECK (currency ~ '^[A-Z]{3}$')` |
  | `created_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | None |
  | `updated_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | None |

* **Key Constraints & Lifecycle**:
  - `scheduled`: Created ahead of time; entries not yet accepted.
  - `open`: Accepts participant entries until `entry_deadline`.
  - `closed`: Deadline passed; entries locked; awaiting winner computation.
  - `completed`: Winners declared; results finalized.
  - `cancelled`: Aborted draw; no winners awarded.
  - **Currency & Precision**: Uses `NUMERIC(12, 2)` and an explicit ISO-4217 3-letter currency code defaulting to `'INR'` (Indian Rupee), based on the platform's domain specification (`₹10,000` prize structures).

---

### 2.6. `draw_entries`
Represents a user's entry and participation in a specific draw.

* **Purpose**: Records ticket/entry submissions, maintaining relational links to the qualifying daily score.
* **Columns**:
  | Column | Data Type | Nullable | Default | Constraints & References |
  | :--- | :--- | :--- | :--- | :--- |
  | `id` | `UUID` | NOT NULL | `gen_random_uuid()` | `PRIMARY KEY` |
  | `draw_id` | `UUID` | NOT NULL | None | `REFERENCES public.draws(id) ON DELETE RESTRICT` |
  | `user_id` | `UUID` | NOT NULL | None | `REFERENCES public.users(id) ON DELETE RESTRICT` |
  | `score_id` | `UUID` | YES | `NULL` | `REFERENCES public.scores(id) ON DELETE SET NULL` |
  | `created_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | None |

* **Key Constraints & Historical Protection**:
  - `UNIQUE (user_id, draw_id)`: Guarantees exactly one entry per user for a given draw. The composite unique index automatically indexes `user_id` as leading column, making a separate index on `user_id` redundant.
  - `user_id ON DELETE RESTRICT`: Protects lottery audit integrity. Once a user enters a draw, their participation record cannot be deleted through cascading user deletion, preserving accurate participant counts and audit records.
  - `score_id` is nullable with `ON DELETE SET NULL`: Ensures draw entry validity remains preserved even if raw game score archives are purged.

---

### 2.7. `winners`
Represents the awarded outcomes and ranks from completed drawings.

* **Purpose**: Permanent historical snapshot of declared winners and allocated prizes.
* **Columns**:
  | Column | Data Type | Nullable | Default | Constraints & References |
  | :--- | :--- | :--- | :--- | :--- |
  | `id` | `UUID` | NOT NULL | `gen_random_uuid()` | `PRIMARY KEY` |
  | `draw_id` | `UUID` | NOT NULL | None | `REFERENCES public.draws(id) ON DELETE RESTRICT` |
  | `user_id` | `UUID` | NOT NULL | None | `REFERENCES public.users(id) ON DELETE RESTRICT` |
  | `draw_entry_id`| `UUID` | NOT NULL | None | `UNIQUE`, `REFERENCES public.draw_entries(id) ON DELETE RESTRICT` |
  | `rank` | `INTEGER` | NOT NULL | None | `CHECK (rank >= 1)` |
  | `prize_amount` | `NUMERIC(12, 2)` | NOT NULL | None | `CHECK (prize_amount >= 0)` |
  | `currency` | `TEXT` | NOT NULL | `'INR'` | `CHECK (currency ~ '^[A-Z]{3}$')` |
  | `created_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | None |

* **Key Integrity Constraints & Denormalization Rationale**:
  - `UNIQUE (draw_id, rank)`: Guarantees that each prize rank in a draw is uniquely assigned. Automatically indexes `draw_id`, eliminating the need for a separate index on `draw_id`.
  - `UNIQUE (draw_id, user_id)`: Prevents the same user from winning multiple prize slots in a single draw.
  - `UNIQUE (draw_entry_id)`: Guarantees a 1:1 relationship between an entry and a winning outcome.
  - **Intentional Denormalization Notice**:
    The `winners` table explicitly contains `draw_id` and `user_id` in addition to `draw_entry_id`. Although `draw_entry_id` indirectly references the draw and user:
    1. `draw_id` enables declarative database-level enforcement of `UNIQUE (draw_id, rank)`.
    2. `draw_id + user_id` enables declarative database-level enforcement of `UNIQUE (draw_id, user_id)` (preventing duplicate winners for the same user within a single draw).
    3. Direct columns drastically simplify common winner queries (`WHERE user_id = $1` and `WHERE draw_id = $1`) without multi-table joins.
    4. `draw_entry_id` preserves the exact entry that produced the win.
    This is a normalized schema with intentional denormalization where strictly required for declarative constraint enforcement and high-throughput query performance.
  - **Historical Snapshot**: `prize_amount` and `currency` are physically snapshotted on the winning record. Future alterations to draw settings never alter the historical winning balance.
  - `ON DELETE RESTRICT` across all references protects audit integrity.

---

### 2.8. `payouts`
Represents payment disbursements to winners through financial gateways (e.g. Stripe, bank transfer).

* **Purpose**: Tracks disbursement states, payment gateway transaction references, and timestamps.
* **Columns**:
  | Column | Data Type | Nullable | Default | Constraints & References |
  | :--- | :--- | :--- | :--- | :--- |
  | `id` | `UUID` | NOT NULL | `gen_random_uuid()` | `PRIMARY KEY` |
  | `winner_id` | `UUID` | NOT NULL | None | `REFERENCES public.winners(id) ON DELETE RESTRICT` |
  | `amount` | `NUMERIC(12, 2)` | NOT NULL | None | `CHECK (amount > 0)` |
  | `currency` | `TEXT` | NOT NULL | `'INR'` | `CHECK (currency ~ '^[A-Z]{3}$')` |
  | `status` | `TEXT` | NOT NULL | `'pending'` | `CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded'))` |
  | `transaction_reference` | `TEXT` | YES | `NULL` | `UNIQUE` |
  | `failure_reason` | `TEXT` | YES | `NULL` | None |
  | `paid_at` | `TIMESTAMPTZ` | YES | `NULL` | None |
  | `created_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | None |
  | `updated_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | None |

* **Key Business Constraints**:
  - `CHECK ((status = 'completed' AND paid_at IS NOT NULL) OR (status != 'completed'))`: Ensures a disbursement cannot be marked completed without recording the execution timestamp.
  - `transaction_reference` has a unique index: Prevents duplicate payouts from being processed for the same gateway transfer ID.
  - Preserves attempt history: A failed payout attempt remains recorded, allowing subsequent retry disbursements while maintaining complete accounting history.

---

## 3. Relationship Map & Cardinality

| Relationship | Cardinality | Parent Entity | Child Entity | Foreign Key Column |
| :--- | :--- | :--- | :--- | :--- |
| User has Subscriptions | 1 : 0..N | `users` | `subscriptions` | `subscriptions.user_id` |
| User submits Scores | 1 : 0..N | `users` | `scores` | `scores.user_id` |
| User enters Draws | 1 : 0..N | `users` | `draw_entries` | `draw_entries.user_id` |
| Draw contains Entries | 1 : 0..N | `draws` | `draw_entries` | `draw_entries.draw_id` |
| Score qualifies Entry | 0..1 : 0..N | `scores` | `draw_entries` | `draw_entries.score_id` |
| Charity supports Draws | 1 : 0..N | `charities` | `draws` | `draws.charity_id` |
| Draw selects Winners | 1 : 0..N | `draws` | `winners` | `winners.draw_id` |
| User wins Draws | 1 : 0..N | `users` | `winners` | `winners.user_id` |
| Entry awarded Winner | 1 : 0..1 | `draw_entries` | `winners` | `winners.draw_entry_id` |
| Winner receives Payouts | 1 : 0..N | `winners` | `payouts` | `payouts.winner_id` |

---

## 4. Foreign Key Delete & Update Behavior

| Foreign Key | Target Table | ON DELETE | ON UPDATE | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| `subscriptions.user_id` | `users(id)` | `RESTRICT` | `CASCADE` | Preserves financial subscription and billing audit history. Hard deletion blocked. |
| `scores.user_id` | `users(id)` | `CASCADE` | `CASCADE` | User deletion removes personal daily activity records. |
| `draw_entries.user_id` | `users(id)` | `RESTRICT` | `CASCADE` | Preserves lottery participation audit records. Hard deletion blocked. |
| `draw_entries.draw_id` | `draws(id)` | `RESTRICT` | `CASCADE` | Cannot delete a draw if users have submitted entries. |
| `draw_entries.score_id` | `scores(id)` | `SET NULL` | `CASCADE` | Preserves draw entry record if qualifying score is purged. |
| `draws.charity_id` | `charities(id)` | `RESTRICT` | `CASCADE` | Cannot delete a charity with past or active draws (use `is_active = false`). |
| `winners.draw_id` | `draws(id)` | `RESTRICT` | `CASCADE` | Draw results and winner audit records must never be lost. |
| `winners.user_id` | `users(id)` | `RESTRICT` | `CASCADE` | User who has won a prize cannot be hard-deleted (financial record). |
| `winners.draw_entry_id`| `draw_entries(id)` | `RESTRICT` | `CASCADE` | Winning entry record cannot be deleted. |
| `payouts.winner_id` | `winners(id)` | `RESTRICT` | `CASCADE` | Financial payout audits must never be orphaned or deleted. |

---

## 5. Indexing Strategy

Following PostgreSQL performance best practices, only necessary foreign key columns and critical query paths are indexed. Redundant indexes covered by existing composite unique constraints are intentionally omitted:

### 5.1. Foreign Key & Lookup Indexes
1. `idx_subscriptions_user_id` ON `subscriptions(user_id)`
   - *Query*: Fetching user's subscription history.
2. `idx_draws_charity_id` ON `draws(charity_id)`
   - *Query*: Filtering draws supported by a specific charity.
3. `idx_draw_entries_draw_id` ON `draw_entries(draw_id)`
   - *Query*: Listing all participants for a specific draw (e.g. `WHERE draw_id = $1`). *(Note: `draw_entries(user_id)` does not need a separate index because `UNIQUE (user_id, draw_id)` already indexes `user_id` as its leading column).*
4. `idx_winners_user_id` ON `winners(user_id)`
   - *Query*: Displaying prizes won by a user in profile. *(Note: `winners(draw_id)` does not need a separate index because `UNIQUE (draw_id, rank)` already indexes `draw_id` as its leading column).*
5. `idx_payouts_winner_id` ON `payouts(winner_id)`
   - *Query*: Listing payout transactions for a winner.

### 5.2. Functional, Composite & Partial Indexes
1. `idx_users_email_lower` ON `users(LOWER(email))`
   - *Purpose*: Case-insensitive login and user lookup.
2. `idx_subscriptions_user_active` ON `subscriptions(user_id)` WHERE `(status = 'active')`
   - *Purpose*: High-performance real-time subscription entitlement check (`O(1)` index seek) and single-active-subscription integrity enforcement.
3. `idx_draws_status_date` ON `draws(status, draw_date)`
   - *Purpose*: Finding active/open draws ordered by upcoming draw date (`WHERE status = 'open' ORDER BY draw_date ASC`).
4. `idx_payouts_status` ON `payouts(status)` WHERE `status IN ('pending', 'processing')`
   - *Purpose*: Background cron/worker job querying unprocessed payouts for gateway disbursement.

### 5.3. Omitted Redundant Indexes (By Design)
- `idx_scores_user_id`: Omitted because `UNIQUE (user_id, score_date)` already creates a B-Tree index with `user_id` in the leading position.
- `idx_draw_entries_user_id`: Omitted because `UNIQUE (user_id, draw_id)` already creates a B-Tree index with `user_id` in the leading position.
- `idx_winners_draw_id`: Omitted because `UNIQUE (draw_id, rank)` already creates a B-Tree index with `draw_id` in the leading position.

---

## 6. Project Data Type & Standards Policy

| Category | Standard Type | Rules & Guidance |
| :--- | :--- | :--- |
| **Primary Keys** | `UUID` | Default to `gen_random_uuid()` (or `auth.users(id)`). |
| **Foreign Keys** | `UUID` | Strictly matches parent PK type. All FKs indexed (or covered by composite unique constraints). |
| **Monetary Amounts** | `NUMERIC(12, 2)` | Standard decimal representation. Floating point (`FLOAT`, `REAL`) is strictly forbidden. |
| **Currency** | `TEXT` | Standard 3-letter ISO-4217 uppercase code (`INR` default, validated via regex). |
| **Calendar Dates** | `DATE` | For daily events without time-of-day (`score_date`). Avoids timezone skew. |
| **Timestamps** | `TIMESTAMPTZ` | Always timezone-aware (`TIMESTAMP WITH TIME ZONE`). Default to `now()`. |
| **Status / Roles** | `TEXT` + `CHECK` | More maintainable and zero-downtime migratable than PG `ENUM`. |
| **Booleans** | `BOOLEAN` | Explicitly `NOT NULL DEFAULT false` (or `true`). |
| **Text Strings** | `TEXT` | `TEXT` with optional `CHECK (char_length(...) <= N)` over unbounded `VARCHAR`. |

---

## 7. Schema Review & Integrity Checklist

- [x] All 8 required entities designed (`users`, `subscriptions`, `scores`, `charities`, `draws`, `draw_entries`, `winners`, `payouts`).
- [x] Primary keys defined with `UUID` across all tables.
- [x] Foreign keys defined with explicit `ON DELETE` and `ON UPDATE` actions.
- [x] Unique constraints defined for emails, daily scores, draw entries, winner ranks, and transaction references.
- [x] Mandatory fields marked `NOT NULL`.
- [x] Numeric check constraints applied to scores, ranks, and monetary values (`>= 0`).
- [x] Status lifecycle check constraints applied to roles, subscriptions, draws, and payouts.
- [x] Real-time subscription check supported via partial unique index.
- [x] Financial snapshotting applied to winner prize records.
- [x] Redundant indexes eliminated by leveraging leading columns of composite unique constraints.
- [x] Historical data protected from user deletion via `RESTRICT` and soft deletion `deleted_at`.
- [x] Currency explicitly defined as ISO-4217 `INR`.
- [x] Intentional denormalization on `winners` fully documented.
- [x] Mermaid ERD generated in `docs/erd.mmd`.
