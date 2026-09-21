# Digital Hero — Database Schema Review Checklist & Audit

This document provides the comprehensive senior-level technical audit, validation checklist, and final review sign-off for the Step 3 relational schema design.

---

## 1. Schema Design Checklist

- [x] **All required entities identified & designed**
  - `users`
  - `subscriptions`
  - `scores`
  - `charities`
  - `draws`
  - `draw_entries`
  - `winners`
  - `payouts`
- [x] **`users` table verified**
  - UUID PK directly mapped 1:1 to `auth.users(id)`
  - Password excluded (managed exclusively by Supabase Auth)
  - `role` constrained to `'visitor'`, `'subscriber'`, `'admin'`
  - Case-insensitive unique index on `LOWER(email)`
  - Soft deletion supported via `deleted_at TIMESTAMPTZ NULL`
- [x] **`subscriptions` table verified**
  - Historical subscription and billing audit trail protected via `user_id REFERENCES users(id) ON DELETE RESTRICT`
  - Enforced single active subscription per user using partial unique index `idx_subscriptions_user_active`
  - Explicit status validation: `'pending'`, `'active'`, `'cancelled'`, `'expired'`
- [x] **`scores` table verified**
  - Strict calendar-day constraint: `UNIQUE (user_id, score_date)`
  - `score_date` typed as `DATE` to eliminate timezone skew
  - Score constrained to non-negative integers (`score >= 0`)
  - Redundant index on `user_id` omitted because `UNIQUE (user_id, score_date)` covers it
- [x] **`charities` table verified**
  - Soft deactivation via `is_active` flag
  - Unique charity names
  - `ON DELETE RESTRICT` from child draws to maintain integrity of historical records
- [x] **`draws` table verified**
  - Full status lifecycle: `'scheduled'`, `'open'`, `'closed'`, `'completed'`, `'cancelled'`
  - Deadline validation: `CHECK (entry_deadline <= draw_date)`
  - Monetary values stored as `NUMERIC(12, 2)` (no floating-point types)
  - Currency explicitly defined: `currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency ~ '^[A-Z]{3}$')`
- [x] **`draw_entries` table verified**
  - Enforces one entry per user per draw: `UNIQUE (user_id, draw_id)`
  - User deletion blocked on participation history: `user_id REFERENCES users(id) ON DELETE RESTRICT`
  - Linked to qualifying daily score with `ON DELETE SET NULL`
  - Redundant index on `user_id` omitted because `UNIQUE (user_id, draw_id)` covers it
- [x] **`winners` table verified**
  - Unique rank per draw: `UNIQUE (draw_id, rank)`
  - Single win per user per draw: `UNIQUE (draw_id, user_id)`
  - Unique entry mapping: `UNIQUE (draw_entry_id)`
  - Prize amount and currency snapshotted at time of win for permanent historical accuracy
  - Intentional denormalization of `draw_id` and `user_id` fully documented to support declarative table constraints and fast queries
  - Redundant index on `draw_id` omitted because `UNIQUE (draw_id, rank)` covers it
- [x] **`payouts` table verified**
  - Separate entity preserving disbursement attempt history
  - Unique transaction reference for payment gateways
  - Enforced completion timestamp: `CHECK ((status = 'completed' AND paid_at IS NOT NULL) OR (status != 'completed'))`
  - Currency explicitly defined: `currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency ~ '^[A-Z]{3}$')`
- [x] **Primary keys verified**
  - Standardized `UUID` across all 8 tables
- [x] **Foreign keys verified**
  - All 10 foreign keys documented with explicit target tables and delete/update behaviors
- [x] **Unique constraints verified**
  - Email uniqueness, daily score uniqueness, single draw entry, unique winner ranks, unique transaction references
- [x] **NOT NULL constraints verified**
  - Mandatory fields strictly enforced
- [x] **CHECK constraints reviewed**
  - Status enums, non-negative scores, non-negative prizes, non-empty names, date sequence validations, ISO currency format
- [x] **ON DELETE behavior verified**
  - `RESTRICT` strictly enforced for audit, subscription, draw entry, charity, winner, and financial records
  - Soft deletion (`deleted_at`) applied to `users` to handle account closures cleanly without breaking referential integrity
- [x] **Indexes reviewed & optimized**
  - All foreign keys indexed
  - Redundant indexes (`idx_scores_user_id`, `idx_draw_entries_user_id`, `idx_winners_draw_id`) removed in favor of leftmost composite unique constraints
  - High-traffic query patterns covered (active subscriptions, upcoming open draws, pending payouts)
- [x] **Money data types reviewed**
  - Standardized on `NUMERIC(12, 2)` with explicit ISO-4217 currency codes
- [x] **Timestamp strategy reviewed**
  - Standardized on `TIMESTAMPTZ` with `now()` default
- [x] **UUID strategy reviewed**
  - Standardized on `UUID` with `gen_random_uuid()` default
- [x] **Historical data behavior reviewed**
  - Snapshotted prize amounts; preserved payout attempts; soft-deactivation for charities; protected draw participation
- [x] **ERD updated & verified**
  - Mermaid diagram in `docs/erd.mmd` reflects all updated columns, constraints, and foreign key behaviors
- [x] **Documentation created**
  - Complete technical specification in `docs/database-schema.md`

---

## 2. Senior Engineering Quality Audit

### 2.1. Data Integrity
- Database-level constraints guarantee invalid data cannot be inserted even if application-level checks are bypassed.
- No floating-point types used for monetary values.
- Currency explicitly enforced with 3-letter ISO-4217 uppercase pattern.

### 2.2. Referential Integrity
- All foreign keys explicitly defined with appropriate `ON DELETE` rules.
- `RESTRICT` prevents accidental deletion of financial, audit, subscription, draw participation, or historical records.
- Soft deletion via `deleted_at` ensures user deactivations do not cascade into corrupting historical business data.

### 2.3. Historical Integrity
- Winner records snapshot `prize_amount` and `currency` directly so modifications to draw configurations do not affect historical prize records.
- Payout attempts are logged separately from winning records, allowing retries without losing audit history.

### 2.4. Performance & Scalability
- Elimination of redundant indexes saves disk and buffer pool cache while accelerating write throughput.
- Partial index on `subscriptions(user_id) WHERE (status = 'active')` ensures real-time entitlement checks are instantaneous even with millions of historical subscription records.
- Composite index on `draws(status, draw_date)` enables fast retrieval of open upcoming draws.
- All non-leading foreign keys are indexed, avoiding table locks and sequential scans during cascade evaluations or joins.

### 2.5. Security
- Passwords are completely omitted from the application schema, delegating credentials safely to Supabase Auth.
- Users table references `auth.users(id)` via UUID, enabling seamless Row-Level Security (RLS) policies in Step 4.

---

## 3. Review Status

### APPROVED

All senior review requirements have been applied and verified in `docs/database-schema.md`, `docs/database-review.md`, and `docs/erd.mmd`. The schema is fully normalized, audit-compliant, and ready for migration generation in Step 4.

> **Database Execution Status**: No application tables or production database objects were created or modified in Supabase during Step 3.
