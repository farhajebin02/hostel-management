# Hostel Manager

Next.js + Supabase app for hostel student records, daily meal opt-in ("ticks"), next-day prep analytics, and automated monthly mess billing.

## Setup

1. `npm install`
2. Create a Supabase project at supabase.com.
3. Copy `.env.local.example` to `.env.local` and fill in the Project URL, anon key, and service role key from Project Settings → API.
4. In the Supabase SQL Editor, run `supabase/migrations/0001_init.sql`.
5. In Authentication → Users, add the admin's email/password, copy their UID, then run in the SQL Editor:
   ```sql
   update public.profiles set role = 'admin', status = 'approved', full_name = 'Admin' where id = '<admin-uid>';
   ```
6. `npm run dev` and visit `http://localhost:3000`.

## Testing

`npm test` runs the Vitest unit tests for the billing formula and IST cutoff/month-boundary logic.

`npm run build` runs a full production build and type-check across the app.

## Roles

- **Admin**: logs in directly, manages students (add/edit/delete, fee status, photos), reviews pending self-registrations, reviews next-day prep counts, and generates monthly bills.
- **Student**: signs up at `/signup`, waits for admin approval, then submits tomorrow's breakfast/dinner ticks daily before the cutoff time (default 22:00 IST, admin-configurable in Settings).

Mess bills are calculated automatically from each student's monthly tick count (flat ₹1800 for up to 30 ticks, +₹55 per tick above that) and are visible to admins only — students never see billing information anywhere in the app; this is enforced both in the UI and at the database level via Row-Level Security (the `monthly_bills` table has no student-facing policy at all).

## Architecture notes

- All authorization is enforced by Postgres Row-Level Security, not just the UI — every table has RLS enabled, and a `is_admin()` helper function backs the admin-only policies.
- The daily cutoff and "only tomorrow, only if the month isn't already closed" rules are enforced by a database trigger (`enforce_tick_write_rules`), not just the page's disabled-checkbox UI — so the real security boundary holds even if a request bypasses the rendered form.
- Profile photos live in a private Supabase Storage bucket and are only ever served via short-lived (60s) signed URLs, never a public URL.
- "Generate & Close Month" snapshots each approved student's final tick counts and bill into `monthly_bills`, which then locks that student's ticks for that month against further edits (enforced by the same DB trigger). The billing page supports navigating to past months (`?month=YYYY-MM`) so a month can still be reviewed and closed after the calendar has rolled over — closing a future month is blocked.

## Known follow-ups

- `src/middleware.ts` uses Next.js's `middleware` convention, which Next 16 flags as deprecated in favor of `proxy` — functionally fine today, but worth migrating via `npx @next/codemod@canary middleware-to-proxy .` in a future pass.
- Production deployment, payment collection, notifications, multi-hostel support, and an admin-configurable billing formula are explicitly out of scope for this build (see the design spec).
