# Hostel Management & Meal Tracking Web App — Design Spec

Date: 2026-09-08
Status: Approved for planning

## 1. Overview

A web app for hostel management that:

- Maintains a student profile database (admin-managed).
- Lets students opt in to tomorrow's breakfast/dinner via a daily "tick" system, with a cutoff.
- Shows admin the exact quantity of food to prepare for the next day.
- Automatically calculates each student's monthly mess bill from their tick count, visible to admin only.
- Archives each month's billing after the admin finalizes it, then starts a fresh month.

Two roles: **Admin** (hostel management) and **Student** (resident).

## 2. Architecture

- **Framework**: Next.js (App Router, TypeScript). Single codebase for both admin and student UIs. Server Components/Server Actions handle data access; Client Components handle interactive bits (toggles, forms).
- **Backend**: No separate API server. Supabase *is* the backend. All writes (ticks, profile edits, approvals, bill generation) go through Next.js Server Actions, which run the business logic (cutoff enforcement, billing formula) server-side — never trusted to the browser.
- **Database**: Supabase Postgres.
- **Auth**: Supabase Auth (email/password). Each user has a `role` (`admin`/`student`) and, for students, a `status` (`pending`/`approved`).
- **Storage**: Supabase Storage, one private bucket for profile photos, accessed via signed URLs (never public).
- **Authorization**: Postgres Row-Level Security (RLS) enforces visibility rules at the database layer — e.g., a student can never read the billing table, even if the UI had a bug.
- **Styling**: Tailwind CSS, mobile-first responsive layouts.
- **Dev environment**: Supabase cloud project (free tier). Next.js run locally via `next dev`. Production hosting is out of scope for this spec.
- **Repo**: `d:\hostel\hostel-manager`, local git repo only — no GitHub remote, no push.
- **Timezone**: All cutoff/day/month boundary logic uses Asia/Kolkata (IST), regardless of server or client timezone.

## 3. Data Model

All tables live in the Supabase Postgres `public` schema.

### `profiles`
1:1 with `auth.users` (same `id`, uuid, PK/FK to `auth.users.id`).

| column | type | notes |
|---|---|---|
| id | uuid | PK, FK -> auth.users.id |
| role | text | `admin` \| `student` |
| status | text | `pending` \| `approved` (students only; admin rows are always `approved`) |
| full_name | text | |
| room_number | text | nullable (unset until admin assigns) |
| permanent_address | text | nullable |
| contact_personal | text | nullable |
| contact_emergency | text | nullable |
| fee_status | text | `paid` \| `pending`; general hostel/room fee, admin-managed, unrelated to the mess bill |
| photo_path | text | nullable; object path in the `profile-photos` Storage bucket |
| created_at | timestamptz | default `now()` |

### `meal_ticks`
One row per student per calendar date. Never deleted — a year of data for a few hundred students is trivially small for Postgres, so there's no storage reason to purge it; a closed month is protected from edits instead (see `monthly_bills`).

| column | type | notes |
|---|---|---|
| id | bigint | PK, identity |
| student_id | uuid | FK -> profiles.id, `ON DELETE CASCADE` |
| meal_date | date | the date the meal is *for* |
| breakfast | boolean | default `false` |
| dinner | boolean | default `false` |
| submitted_at | timestamptz | default `now()`, updated on edit |

Unique constraint on `(student_id, meal_date)`.

### `monthly_bills`
The billing archive. One row per student per billing month, written only when the admin runs "Generate & Close Month." Presence of a row for a given `(student_id, month)` means that month is closed for that student: the app rejects new/edited `meal_ticks` writes whose `meal_date` falls within a month that already has a `monthly_bills` row for that `student_id`.

| column | type | notes |
|---|---|---|
| id | bigint | PK, identity |
| student_id | uuid | FK -> profiles.id, `ON DELETE CASCADE` |
| month | date | first day of the billing month, e.g. `2026-09-01` |
| breakfast_count | int | |
| dinner_count | int | |
| total_ticks | int | breakfast_count + dinner_count |
| bill_amount | numeric | computed via the formula in §5 |
| generated_at | timestamptz | default `now()` |

Unique constraint on `(student_id, month)`.

### `app_settings`
Single-row table (or a fixed `id = 1` row) holding admin-configurable settings.

| column | type | notes |
|---|---|---|
| id | int | PK, fixed at `1` |
| cutoff_time | time | default `22:00`, IST |
| updated_at | timestamptz | |

### Row-Level Security summary

- `profiles`: a student may `SELECT`/`UPDATE` only their own row, and only non-privileged columns (never `role`, `fee_status`, or `status`). Admin has full access to all rows.
- `meal_ticks`: a student may `SELECT`/`INSERT`/`UPDATE` only rows where `student_id = auth.uid()`, and only for dates not in a closed month (enforced in the Server Action layer as well as, ideally, a check/trigger). Admin has full read access.
- `monthly_bills`: admin-only. No student-facing policy exists at all — students cannot read this table under any circumstance.
- `app_settings`: readable by any authenticated user (students need to know the cutoff time); writable by admin only.

## 4. Auth & Registration Flow

- No public admin signup screen. A single admin account is seeded directly (e.g., created once via the Supabase dashboard or a one-off seed script).
- **Student self-registration**: a student signs up with email + password via Supabase Auth. This creates a `profiles` row with `role='student'`, `status='pending'`, and only `full_name`/email known. On login, a `pending` student sees only a "your account is awaiting admin approval" screen — no dashboard, no tick form.
- **Admin approval queue**: the admin dashboard lists all `pending` students. Approving one requires the admin to fill in the remaining required fields (room number, address, contact numbers, photo) before flipping `status` to `approved`. Once approved, the student gets full dashboard access.
- **Admin-direct add**: the admin can also create a student profile directly (skipping self-registration), for cases where the hostel wants to onboard someone itself. This creates the `auth.users` entry via the Supabase admin API (e.g., invite-by-email) plus a `profiles` row with `status='approved'` immediately.

## 5. Core Feature Flows

### Daily meal tick (student)
- The student dashboard shows two toggles: "Tomorrow's Breakfast" and "Tomorrow's Dinner," reflecting any existing `meal_ticks` row for tomorrow's date, editable up until the cutoff.
- A Server Action performs the write. It computes "now" in IST, compares against `app_settings.cutoff_time` for today, and:
  - Before cutoff: creates/updates the `meal_ticks` row for tomorrow's date (upsert on `(student_id, meal_date)`).
  - At/after cutoff: rejects the write with a clear message; the UI shows the form as read-only/locked for that date. A student who never submitted keeps `breakfast=false, dinner=false` for that date (default opt-out — no row is required to mean "no meal").

### Meal planning analytics (admin)
- A dashboard page shows a live count: `SELECT count(*) FILTER (WHERE breakfast), count(*) FILTER (WHERE dinner) FROM meal_ticks WHERE meal_date = tomorrow`, joined to `profiles` to include only `approved` students.

### Mess bill calculation (admin only)
- A "current month tally" view sums each approved student's `breakfast + dinner` ticks for the current calendar month so far (live, recomputed on read — not stored) and applies the formula:
  - `total_ticks <= 30` → bill = `1800`
  - `total_ticks > 30` → bill = `1800 + 55 * (total_ticks - 30)`
- This is viewable at any time during the month as a preview; it is not final until the month is closed.
- **Generate & Close Month**: an explicit admin action, guarded by a confirmation dialog. For every approved student, it computes the final tally for that month, writes a `monthly_bills` row (locking that student's ticks for that month against further edits), and the UI then shows the next month as the active one for ticking.
- Bills are visible only on the admin dashboard (`monthly_bills` has no student-facing read access at all — see RLS above). Students never see a bill.

### Student profile view
- Read-only: name, room number, permanent address, contact numbers, photo. Never shows `fee_status` or any billing data.

### Admin student management
- Add / view / edit / delete student profiles (photo upload/replace via Storage, room number, `fee_status` toggle, contact info, address). Delete removes the `profiles` row (cascade-deleting that student's `meal_ticks`/`monthly_bills` via FK) *and* the corresponding `auth.users` entry (via the Supabase admin API), so the account can no longer log in. This is acceptable given the hostel workflow (student has left) but is a deliberately destructive action the UI should confirm explicitly.

## 6. Non-Functional Requirements

- **Responsive design**: Tailwind, mobile-first — students primarily use phones for the daily tick.
- **Security**:
  - RLS enabled and enforced on every table listed above.
  - Profile photos live in a private Storage bucket; the app serves them via short-lived signed URLs, never public URLs.
  - Every Server Action re-checks the caller's role/ownership server-side (never trusts client-supplied role/ID).
  - Standard Supabase Auth password handling (hashing, session tokens) — no custom credential storage.

## 7. Testing Approach

- Unit tests (Vitest) for the two pieces of pure business logic that actually carry risk of a subtle bug:
  - The billing formula (`calculateBill(totalTicks): number`), including the boundary at exactly 30 and 31 ticks.
  - The cutoff check (`isBeforeCutoff(now, cutoffTime): boolean`) in IST, including the boundary at exactly the cutoff time.
- Manual verification in-browser of the end-to-end flows: student self-registration → admin approval → daily tick submission (before and after cutoff) → admin prep-count view → admin bill preview → Generate & Close Month → new month starts clean.

## 8. Explicit Out of Scope (for this spec)

- Production deployment/hosting setup.
- Payment collection or payment-gateway integration (billing is calculated and displayed only, not collected in-app).
- Email/SMS notifications.
- Multiple hostels/messes in one deployment (single-mess assumption).
- Configurable billing formula (flat rate / per-tick rate are fixed constants in code, not admin-editable — only the cutoff time is admin-configurable, per explicit requirement).
