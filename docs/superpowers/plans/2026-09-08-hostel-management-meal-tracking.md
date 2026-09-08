# Hostel Management & Meal Tracking App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Next.js + Supabase hostel management & meal-tracking web app described in the spec: student database, daily meal opt-in with cutoff, next-day prep analytics, and admin-only automated monthly billing.

**Architecture:** Next.js (App Router, TypeScript, Tailwind) as the sole application layer, talking directly to Supabase (Postgres + Auth + Storage) via Server Components/Server Actions. All authorization is enforced twice: Row-Level Security in Postgres (source of truth) and route guards/UI in Next.js (UX).

**Tech Stack:** Next.js (App Router, TS, `--src-dir`), Tailwind CSS, `@supabase/supabase-js`, `@supabase/ssr`, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-08-hostel-management-meal-tracking-design.md`

## Global Constraints

- Timezone: all cutoff, daily, and monthly boundary logic uses Asia/Kolkata (IST), regardless of server/client timezone.
- Billing formula (fixed, not admin-configurable): `total_ticks <= 30` → `1800`; `total_ticks > 30` → `1800 + 55 * (total_ticks - 30)`.
- Default daily cutoff: `22:00` IST, admin-configurable via `app_settings.cutoff_time`.
- RLS must be enabled on every table with no exceptions; `monthly_bills` has no student-facing policy at all, ever.
- Profile photos live only in the private `profile-photos` Storage bucket, served only via short-lived signed URLs — never a public URL.
- Local git repo only — no GitHub remote, no push.
- Out of scope (do not build): production deployment, payment collection, email/SMS notifications, multi-hostel support, admin-configurable billing formula.

---

## Task 1: Project Scaffolding

**Files:**
- Create: entire Next.js project at repo root (`package.json`, `tsconfig.json`, `next.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `.gitignore`, etc.)
- Create: `vitest.config.ts`
- Create: `.env.local.example`

**Interfaces:**
- Produces: a working Next.js dev server, `npm test` running Vitest, path alias `@/*` → `src/*`.

- [ ] **Step 1: Scaffold Next.js**

Run in `d:\hostel\hostel-manager`:

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

If it refuses because the directory isn't empty (it already has `.git` and `docs/`), scaffold into a temporary sibling folder (`npx create-next-app@latest ../hostel-manager-tmp ...`) and move every generated file/folder into `d:\hostel\hostel-manager`, then delete the temp folder.

- [ ] **Step 2: Install Supabase + test dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install -D vitest
```

- [ ] **Step 3: Add Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
  },
})
```

- [ ] **Step 4: Add test scripts to `package.json`**

Add to the `"scripts"` object:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Add env var template**

Create `.env.local.example`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Confirm `.gitignore` already contains `.env*.local` (Next.js adds this by default) — if not, add it.

- [ ] **Step 6: Verify**

Run: `npm run build`
Expected: build succeeds with the default Next.js starter page.

Run: `npm test`
Expected: passes with "no test files found" (no tests exist yet).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with Tailwind, Supabase deps, and Vitest"
```

---

## Task 2: Database Schema, RLS, and Storage

**Files:**
- Create: `supabase/migrations/0001_init.sql`

**Interfaces:**
- Produces tables: `public.profiles`, `public.meal_ticks`, `public.monthly_bills`, `public.app_settings`; function `public.is_admin()`; Storage bucket `profile-photos`.
- Consumed by every later task via the Supabase client.

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/0001_init.sql`:

```sql
-- profiles: 1:1 with auth.users
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'student' check (role in ('admin', 'student')),
  status text not null default 'pending' check (status in ('pending', 'approved')),
  full_name text,
  room_number text,
  permanent_address text,
  contact_personal text,
  contact_emergency text,
  fee_status text not null default 'pending' check (fee_status in ('paid', 'pending')),
  photo_path text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Helper used by policies below. security definer + owned by a role with
-- BYPASSRLS (the default Supabase "postgres" owner) avoids RLS recursion
-- when checking the caller's own role.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create policy "Students can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select
  using (public.is_admin());

create policy "Admins can insert profiles"
  on public.profiles for insert
  with check (public.is_admin());

create policy "Admins can update all profiles"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete profiles"
  on public.profiles for delete
  using (public.is_admin());

-- Auto-create a bare pending profile whenever a new auth user is created
-- (self-signup or admin-invited). Admin approval/edit flows fill the rest.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, status, full_name)
  values (
    new.id,
    'student',
    'pending',
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- app_settings: single-row table of admin-configurable settings
create table public.app_settings (
  id int primary key default 1,
  cutoff_time time not null default '22:00',
  updated_at timestamptz not null default now(),
  constraint app_settings_singleton check (id = 1)
);

insert into public.app_settings (id, cutoff_time) values (1, '22:00');

alter table public.app_settings enable row level security;

create policy "Authenticated users can view settings"
  on public.app_settings for select
  using (auth.role() = 'authenticated');

create policy "Admins can update settings"
  on public.app_settings for update
  using (public.is_admin())
  with check (public.is_admin());

-- meal_ticks: one row per student per calendar date, never deleted
create table public.meal_ticks (
  id bigint generated always as identity primary key,
  student_id uuid not null references public.profiles(id) on delete cascade,
  meal_date date not null,
  breakfast boolean not null default false,
  dinner boolean not null default false,
  submitted_at timestamptz not null default now(),
  unique (student_id, meal_date)
);

alter table public.meal_ticks enable row level security;

create policy "Students can view own ticks"
  on public.meal_ticks for select
  using (auth.uid() = student_id);

create policy "Students can insert own ticks"
  on public.meal_ticks for insert
  with check (auth.uid() = student_id);

create policy "Students can update own ticks"
  on public.meal_ticks for update
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

create policy "Admins can view all ticks"
  on public.meal_ticks for select
  using (public.is_admin());

-- monthly_bills: billing archive, admin-only, immutable once written
create table public.monthly_bills (
  id bigint generated always as identity primary key,
  student_id uuid not null references public.profiles(id) on delete cascade,
  month date not null,
  breakfast_count int not null,
  dinner_count int not null,
  total_ticks int not null,
  bill_amount numeric not null,
  generated_at timestamptz not null default now(),
  unique (student_id, month)
);

alter table public.monthly_bills enable row level security;

create policy "Admins can view all bills"
  on public.monthly_bills for select
  using (public.is_admin());

create policy "Admins can insert bills"
  on public.monthly_bills for insert
  with check (public.is_admin());

-- Authoritative DB-side guard: only "tomorrow" (IST), only before cutoff,
-- only if that student's month isn't already closed. The Next.js layer
-- duplicates this check for UX, but this trigger is the real enforcement.
create or replace function public.enforce_tick_write_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cutoff time;
  v_today_ist date;
  v_tomorrow_ist date;
  v_now_time_ist time;
  v_closed boolean;
begin
  select cutoff_time into v_cutoff from public.app_settings where id = 1;
  v_today_ist := (now() at time zone 'Asia/Kolkata')::date;
  v_tomorrow_ist := v_today_ist + 1;
  v_now_time_ist := (now() at time zone 'Asia/Kolkata')::time;

  if new.meal_date <> v_tomorrow_ist then
    raise exception 'Ticks can only be submitted for tomorrow (%), not %', v_tomorrow_ist, new.meal_date;
  end if;

  if v_now_time_ist >= v_cutoff then
    raise exception 'Cutoff time (%) has passed for today; tomorrow''s ticks are locked', v_cutoff;
  end if;

  select exists (
    select 1 from public.monthly_bills
    where student_id = new.student_id
      and month = date_trunc('month', new.meal_date)::date
  ) into v_closed;

  if v_closed then
    raise exception 'This month has already been closed and billed';
  end if;

  new.submitted_at := now();
  return new;
end;
$$;

create trigger trg_enforce_tick_write_rules
  before insert or update on public.meal_ticks
  for each row execute function public.enforce_tick_write_rules();

-- Storage: private bucket for profile photos
insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', false)
on conflict (id) do nothing;

create policy "Students can view own photo"
  on storage.objects for select
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Admins can manage all photos"
  on storage.objects for all
  using (bucket_id = 'profile-photos' and public.is_admin())
  with check (bucket_id = 'profile-photos' and public.is_admin());
```

- [ ] **Step 2: Create the Supabase project**

In the Supabase dashboard, create a new project (any name/region). Wait for it to finish provisioning.

- [ ] **Step 3: Wire up environment variables**

Copy `.env.local.example` to `.env.local`. From Project Settings → API, fill in:
- `NEXT_PUBLIC_SUPABASE_URL` — the Project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the `anon` `public` key.
- `SUPABASE_SERVICE_ROLE_KEY` — the `service_role` key (keep secret, never expose to the client).

- [ ] **Step 4: Apply the migration**

In the Supabase dashboard, open SQL Editor, paste the full contents of `supabase/migrations/0001_init.sql`, and run it.

- [ ] **Step 5: Verify**

In the SQL Editor, run:

```sql
select * from public.app_settings;
```

Expected: one row, `cutoff_time = 22:00:00`.

```sql
select tablename, rowsecurity from pg_tables where schemaname = 'public';
```

Expected: `rowsecurity = true` for all four tables.

- [ ] **Step 6: Seed the admin account**

In the dashboard, go to Authentication → Users → Add user, create the admin's email/password. Copy the generated user's UID, then in the SQL Editor:

```sql
update public.profiles
set role = 'admin', status = 'approved', full_name = 'Admin'
where id = '<paste-the-admin-uid-here>';
```

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/0001_init.sql .env.local.example
git commit -m "feat: add database schema, RLS policies, and storage bucket"
```

(`.env.local` itself must NOT be committed — confirm it's gitignored.)

---

## Task 3: Supabase Client Helpers, Middleware, and Shared Types

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/admin.ts`
- Create: `src/lib/types.ts`
- Create: `src/middleware.ts`

**Interfaces:**
- Produces: `createClient()` (browser, from `client.ts`), `createClient()` (server, async, from `server.ts`), `createAdminClient()` (from `admin.ts`), and types `Profile`, `MealTick`, `MonthlyBill`, `AppSettings`.
- Consumed by: every page/action task from here on.

- [ ] **Step 1: Browser client**

Create `src/lib/supabase/client.ts`:

```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 2: Server client**

Create `src/lib/supabase/server.ts`:

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // called from a Server Component render; middleware refreshes the session instead
          }
        },
      },
    }
  )
}
```

- [ ] **Step 3: Admin (service-role) client**

Create `src/lib/supabase/admin.ts`:

```ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
```

- [ ] **Step 4: Shared types**

Create `src/lib/types.ts`:

```ts
export type Role = 'admin' | 'student'
export type StudentStatus = 'pending' | 'approved'
export type FeeStatus = 'paid' | 'pending'

export interface Profile {
  id: string
  role: Role
  status: StudentStatus
  full_name: string | null
  room_number: string | null
  permanent_address: string | null
  contact_personal: string | null
  contact_emergency: string | null
  fee_status: FeeStatus
  photo_path: string | null
  created_at: string
}

export interface MealTick {
  id: number
  student_id: string
  meal_date: string
  breakfast: boolean
  dinner: boolean
  submitted_at: string
}

export interface MonthlyBill {
  id: number
  student_id: string
  month: string
  breakfast_count: number
  dinner_count: number
  total_ticks: number
  bill_amount: number
  generated_at: string
}

export interface AppSettings {
  id: number
  cutoff_time: string
  updated_at: string
}
```

- [ ] **Step 5: Session-refresh middleware**

Create `src/middleware.ts`:

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 6: Verify**

Run: `npm run build`
Expected: succeeds with no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/supabase src/lib/types.ts src/middleware.ts
git commit -m "feat: add Supabase client helpers, middleware, and shared types"
```

---

## Task 4: IST Time Helpers (TDD)

**Files:**
- Create: `src/lib/time.ts`
- Create: `tests/unit/time.test.ts`

**Interfaces:**
- Produces: `getISTDateString(now?: Date): string`, `getTomorrowISTDateString(now?: Date): string`, `isBeforeCutoff(now: Date, cutoffTime: string): boolean`, `getISTMonthBounds(now?: Date): { start: string; end: string; month: string }`.
- Consumed by: student tick page/action (Task 11), admin analytics (Task 13), admin billing (Task 14).

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/time.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { isBeforeCutoff, getISTDateString, getTomorrowISTDateString, getISTMonthBounds } from '@/lib/time'

describe('isBeforeCutoff', () => {
  it('returns true when now is before the cutoff time in IST', () => {
    // 2026-09-08T16:29:00Z = 2026-09-08 21:59 IST
    expect(isBeforeCutoff(new Date('2026-09-08T16:29:00Z'), '22:00')).toBe(true)
  })

  it('returns false exactly at the cutoff time in IST', () => {
    // 2026-09-08T16:30:00Z = 2026-09-08 22:00 IST
    expect(isBeforeCutoff(new Date('2026-09-08T16:30:00Z'), '22:00')).toBe(false)
  })

  it('returns false when now is after the cutoff time in IST', () => {
    // 2026-09-08T16:31:00Z = 2026-09-08 22:01 IST
    expect(isBeforeCutoff(new Date('2026-09-08T16:31:00Z'), '22:00')).toBe(false)
  })
})

describe('getISTDateString / getTomorrowISTDateString', () => {
  it('computes the IST calendar date for a UTC instant already past midnight IST', () => {
    // 2026-09-08T19:00:00Z = 2026-09-09 00:30 IST
    const now = new Date('2026-09-08T19:00:00Z')
    expect(getISTDateString(now)).toBe('2026-09-09')
    expect(getTomorrowISTDateString(now)).toBe('2026-09-10')
  })
})

describe('getISTMonthBounds', () => {
  it('computes the first day of the current and next IST month', () => {
    // 2026-09-08T10:00:00Z = 2026-09-08 15:30 IST
    const now = new Date('2026-09-08T10:00:00Z')
    expect(getISTMonthBounds(now)).toEqual({ start: '2026-09-01', end: '2026-10-01', month: '2026-09' })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `src/lib/time.ts` does not exist yet.

- [ ] **Step 3: Implement**

Create `src/lib/time.ts`:

```ts
const IST_TIMEZONE = 'Asia/Kolkata'

function getISTParts(now: Date) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)!.value
  return {
    year: Number(get('year')),
    month: Number(get('month')), // 1-indexed
    day: Number(get('day')),
    hour: Number(get('hour')) % 24,
    minute: Number(get('minute')),
  }
}

export function getISTDateString(now: Date = new Date()): string {
  const { year, month, day } = getISTParts(now)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function getTomorrowISTDateString(now: Date = new Date()): string {
  const { year, month, day } = getISTParts(now)
  const tomorrow = new Date(Date.UTC(year, month - 1, day) + 24 * 60 * 60 * 1000)
  return `${tomorrow.getUTCFullYear()}-${String(tomorrow.getUTCMonth() + 1).padStart(2, '0')}-${String(tomorrow.getUTCDate()).padStart(2, '0')}`
}

export function isBeforeCutoff(now: Date, cutoffTime: string): boolean {
  const { hour, minute } = getISTParts(now)
  const [cutoffHour, cutoffMinute] = cutoffTime.split(':').map(Number)
  return hour * 60 + minute < cutoffHour * 60 + cutoffMinute
}

export function getISTMonthBounds(now: Date = new Date()): { start: string; end: string; month: string } {
  const { year, month } = getISTParts(now)
  const pad = (n: number) => String(n).padStart(2, '0')
  const start = `${year}-${pad(month)}-01`
  // Date.UTC's month param is 0-indexed, so passing our 1-indexed `month`
  // directly lands on the first day of the *next* month.
  const nextMonth = new Date(Date.UTC(year, month, 1))
  const end = `${nextMonth.getUTCFullYear()}-${pad(nextMonth.getUTCMonth() + 1)}-01`
  return { start, end, month: `${year}-${pad(month)}` }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS, all 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/time.ts tests/unit/time.test.ts
git commit -m "feat: add IST time helpers for cutoff and month-boundary logic"
```

---

## Task 5: Billing Formula (TDD)

**Files:**
- Create: `src/lib/billing.ts`
- Create: `tests/unit/billing.test.ts`

**Interfaces:**
- Produces: `calculateBill(totalTicks: number): number`.
- Consumed by: admin billing page/action (Task 14).

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/billing.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { calculateBill } from '@/lib/billing'

describe('calculateBill', () => {
  it('returns the flat rate when ticks are well below the threshold', () => {
    expect(calculateBill(0)).toBe(1800)
    expect(calculateBill(15)).toBe(1800)
  })

  it('returns the flat rate at exactly 30 ticks', () => {
    expect(calculateBill(30)).toBe(1800)
  })

  it('adds the per-tick rate starting at 31 ticks', () => {
    expect(calculateBill(31)).toBe(1855)
  })

  it('scales linearly above the threshold', () => {
    expect(calculateBill(40)).toBe(1800 + 55 * 10)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `src/lib/billing.ts` does not exist yet.

- [ ] **Step 3: Implement**

Create `src/lib/billing.ts`:

```ts
const FLAT_RATE = 1800
const FLAT_RATE_THRESHOLD = 30
const PER_EXTRA_TICK_RATE = 55

export function calculateBill(totalTicks: number): number {
  if (totalTicks <= FLAT_RATE_THRESHOLD) {
    return FLAT_RATE
  }
  return FLAT_RATE + PER_EXTRA_TICK_RATE * (totalTicks - FLAT_RATE_THRESHOLD)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS, all 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/billing.ts tests/unit/billing.test.ts
git commit -m "feat: add mess bill calculation formula"
```

---

## Task 6: Auth Pages — Signup, Login, Logout, Root Redirect

**Files:**
- Create: `src/app/page.tsx`
- Create: `src/app/login/page.tsx`
- Create: `src/app/login/actions.ts`
- Create: `src/app/signup/page.tsx`
- Create: `src/app/signup/actions.ts`
- Create: `src/app/logout/route.ts`

**Interfaces:**
- Consumes: `createClient()` (server, Task 3).
- Produces: routes `/login`, `/signup`, `/logout`, `/` (redirect hub used by Tasks 7 and 8).

- [ ] **Step 1: Root redirect**

Create `src/app/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  if (profile.role === 'admin') redirect('/admin')
  if (profile.status === 'pending') redirect('/pending')
  redirect('/student')
}
```

- [ ] **Step 2: Login action + page**

Create `src/app/login/actions.ts`:

```ts
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const email = String(formData.get('email'))
  const password = String(formData.get('password'))

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`)

  redirect('/')
}
```

Create `src/app/login/page.tsx`:

```tsx
import { login } from './actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Hostel Manager Login</h1>
      {error && <p className="rounded bg-red-100 p-2 text-sm text-red-700">{error}</p>}
      <form action={login} className="flex flex-col gap-3">
        <input name="email" type="email" placeholder="Email" required className="rounded border p-2" />
        <input name="password" type="password" placeholder="Password" required className="rounded border p-2" />
        <button type="submit" className="rounded bg-blue-600 p-2 text-white">Log in</button>
      </form>
      <p className="text-sm">
        New student? <a href="/signup" className="text-blue-600 underline">Sign up</a>
      </p>
    </main>
  )
}
```

- [ ] **Step 3: Signup action + page**

Create `src/app/signup/actions.ts`:

```ts
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signup(formData: FormData) {
  const email = String(formData.get('email'))
  const password = String(formData.get('password'))
  const fullName = String(formData.get('full_name'))

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  })

  if (error) redirect(`/signup?error=${encodeURIComponent(error.message)}`)

  redirect('/pending')
}
```

Create `src/app/signup/page.tsx`:

```tsx
import { signup } from './actions'

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Student Sign Up</h1>
      {error && <p className="rounded bg-red-100 p-2 text-sm text-red-700">{error}</p>}
      <form action={signup} className="flex flex-col gap-3">
        <input name="full_name" placeholder="Full name" required className="rounded border p-2" />
        <input name="email" type="email" placeholder="Email" required className="rounded border p-2" />
        <input name="password" type="password" placeholder="Password" required minLength={6} className="rounded border p-2" />
        <button type="submit" className="rounded bg-blue-600 p-2 text-white">Sign up</button>
      </form>
      <p className="text-sm">
        Already have an account? <a href="/login" className="text-blue-600 underline">Log in</a>
      </p>
    </main>
  )
}
```

- [ ] **Step 4: Logout route**

Create `src/app/logout/route.ts`:

```ts
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/login', request.url))
}
```

- [ ] **Step 5: Verify manually**

Run `npm run dev`. Visit `/signup`, create a student account with a real-looking email/password. Expect redirect to `/pending`. In the Supabase dashboard, confirm a new `profiles` row exists with `status = 'pending'`, `role = 'student'`. Log out, then log in at `/login` with the admin credentials from Task 2 Step 6; expect no redirect loop (will 404 until Task 8 exists — that's expected at this point).

- [ ] **Step 6: Commit**

```bash
git add src/app/page.tsx src/app/login src/app/signup src/app/logout
git commit -m "feat: add signup, login, logout, and root role-based redirect"
```

---

## Task 7: Pending-Approval Screen + Student Layout Guard

**Files:**
- Create: `src/app/pending/page.tsx`
- Create: `src/app/student/layout.tsx`

**Interfaces:**
- Consumes: `createClient()` (Task 3).
- Produces: `/pending` route; the `/student/*` layout guard that Tasks 11–12 render inside.

- [ ] **Step 1: Pending screen**

Create `src/app/pending/page.tsx`:

```tsx
export default function PendingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">Awaiting approval</h1>
      <p>Your account has been created. A hostel admin needs to review and approve it before you can submit meal ticks.</p>
      <form action="/logout" method="post">
        <button type="submit" className="text-sm text-blue-600 underline">Log out</button>
      </form>
    </main>
  )
}
```

- [ ] **Step 2: Student layout guard**

Create `src/app/student/layout.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'student') redirect('/login')
  if (profile.status !== 'approved') redirect('/pending')

  return (
    <div>
      <nav className="flex items-center justify-between border-b p-4">
        <span className="font-semibold">Hostel Manager</span>
        <div className="flex items-center gap-4 text-sm">
          <a href="/student">Today&apos;s Ticks</a>
          <a href="/student/profile">My Profile</a>
          <form action="/logout" method="post">
            <button type="submit">Log out</button>
          </form>
        </div>
      </nav>
      <div className="p-4">{children}</div>
    </div>
  )
}
```

- [ ] **Step 3: Verify manually**

With a `pending` student logged in, visiting `/student` (once it exists in Task 11) should not be reachable yet — confirm instead that visiting `/pending` directly while logged out redirects nowhere unexpected (it's a static page, fine either way). This step is fully verifiable once Task 11 exists; for now just confirm `npm run build` type-checks.

- [ ] **Step 4: Commit**

```bash
git add src/app/pending src/app/student/layout.tsx
git commit -m "feat: add pending-approval screen and student layout guard"
```

---

## Task 8: Admin Layout Guard + Dashboard Shell

**Files:**
- Create: `src/app/admin/layout.tsx`
- Create: `src/app/admin/page.tsx`

**Interfaces:**
- Consumes: `createClient()` (Task 3).
- Produces: the `/admin/*` layout guard + nav that Tasks 9–15 render inside.

- [ ] **Step 1: Admin layout guard + nav**

Create `src/app/admin/layout.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/login')

  return (
    <div>
      <nav className="flex flex-wrap items-center gap-4 border-b p-4 text-sm">
        <span className="mr-4 font-semibold">Hostel Manager — Admin</span>
        <a href="/admin/pending">Pending Approvals</a>
        <a href="/admin/students">Students</a>
        <a href="/admin/analytics">Prep Analytics</a>
        <a href="/admin/billing">Billing</a>
        <a href="/admin/settings">Settings</a>
        <form action="/logout" method="post" className="ml-auto">
          <button type="submit">Log out</button>
        </form>
      </nav>
      <div className="p-4">{children}</div>
    </div>
  )
}
```

- [ ] **Step 2: Dashboard home**

Create `src/app/admin/page.tsx`:

```tsx
export default function AdminHome() {
  return (
    <div>
      <h1 className="text-xl font-semibold">Welcome, Admin</h1>
      <p className="text-sm text-gray-600">Use the navigation above to manage students, review tomorrow&apos;s prep counts, and generate monthly bills.</p>
    </div>
  )
}
```

- [ ] **Step 3: Verify manually**

Log in as the seeded admin account (Task 2 Step 6). Confirm landing on `/admin` with the nav visible. Log in as an approved-or-pending student and confirm visiting `/admin` directly redirects to `/login`.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/layout.tsx src/app/admin/page.tsx
git commit -m "feat: add admin layout guard and dashboard home"
```

---

## Task 9: Admin Pending Queue + Approve Action

**Files:**
- Create: `src/app/admin/pending/page.tsx`
- Create: `src/app/admin/pending/actions.ts`
- Create: `src/app/admin/pending/[id]/page.tsx`

**Interfaces:**
- Consumes: `createClient()` (Task 3), admin layout (Task 8).
- Produces: `approveStudent(studentId: string, formData: FormData)` — not reused elsewhere.

- [ ] **Step 1: Queue list page**

Create `src/app/admin/pending/page.tsx`:

```tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function PendingQueuePage() {
  const supabase = await createClient()
  const { data: pending } = await supabase
    .from('profiles')
    .select('id, full_name, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Pending Approvals</h1>
      {!pending?.length && <p>No students waiting for approval.</p>}
      <ul className="flex flex-col gap-2">
        {pending?.map((p) => (
          <li key={p.id} className="flex items-center justify-between rounded border p-3">
            <span>{p.full_name || '(no name)'}</span>
            <Link href={`/admin/pending/${p.id}`} className="text-blue-600 underline">
              Review &amp; approve
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 2: Approve action**

Create `src/app/admin/pending/actions.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function approveStudent(studentId: string, formData: FormData) {
  const supabase = await createClient()

  let photoPath: string | null = null
  const photo = formData.get('photo')
  if (photo instanceof File && photo.size > 0) {
    photoPath = `${studentId}/${Date.now()}-${photo.name}`
    const { error: uploadError } = await supabase.storage
      .from('profile-photos')
      .upload(photoPath, photo, { upsert: true })
    if (uploadError) throw new Error(uploadError.message)
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: String(formData.get('full_name')),
      room_number: String(formData.get('room_number')),
      permanent_address: String(formData.get('permanent_address')),
      contact_personal: String(formData.get('contact_personal')),
      contact_emergency: String(formData.get('contact_emergency')),
      status: 'approved',
      ...(photoPath ? { photo_path: photoPath } : {}),
    })
    .eq('id', studentId)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/pending')
  redirect('/admin/pending')
}
```

- [ ] **Step 3: Review/approve detail page**

Create `src/app/admin/pending/[id]/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { approveStudent } from '../actions'

export default async function ReviewPendingStudent({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: student } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('id', id)
    .eq('status', 'pending')
    .single()

  if (!student) notFound()

  const approveWithId = approveStudent.bind(null, student.id)

  return (
    <div className="max-w-md">
      <h1 className="mb-4 text-xl font-semibold">Approve {student.full_name}</h1>
      <form action={approveWithId} className="flex flex-col gap-3">
        <input name="full_name" defaultValue={student.full_name ?? ''} placeholder="Full name" required className="rounded border p-2" />
        <input name="room_number" placeholder="Room number" required className="rounded border p-2" />
        <textarea name="permanent_address" placeholder="Permanent address" required className="rounded border p-2" />
        <input name="contact_personal" placeholder="Personal contact number" required className="rounded border p-2" />
        <input name="contact_emergency" placeholder="Emergency contact number" required className="rounded border p-2" />
        <label className="flex flex-col gap-1 text-sm">
          Profile photo
          <input type="file" name="photo" accept="image/*" className="rounded border p-2" />
        </label>
        <button type="submit" className="rounded bg-green-600 p-2 text-white">Approve student</button>
      </form>
    </div>
  )
}
```

- [ ] **Step 4: Verify manually**

Sign up a new student (via `/signup`). As admin, visit `/admin/pending`, confirm the new student appears, click through, fill the form (with or without a photo), submit. Confirm the student disappears from the queue and their `profiles` row now has `status = 'approved'` with all fields filled. Log in as that student and confirm no more redirect to `/pending`.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/pending
git commit -m "feat: add admin pending-approval queue and approve action"
```

---

## Task 10: Admin Student List, Add, Edit, Delete

**Files:**
- Create: `src/app/admin/students/page.tsx`
- Create: `src/app/admin/students/actions.ts`
- Create: `src/app/admin/students/new/page.tsx`
- Create: `src/app/admin/students/[id]/page.tsx`
- Create: `src/app/admin/students/[id]/DeleteButton.tsx`

**Interfaces:**
- Consumes: `createClient()`, `createAdminClient()` (Task 3), admin layout (Task 8).
- Produces: `createStudent`, `updateStudent(studentId, formData)`, `deleteStudent(studentId)` — not reused elsewhere.

- [ ] **Step 1: Student list**

Create `src/app/admin/students/page.tsx`:

```tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function StudentsPage() {
  const supabase = await createClient()
  const { data: students } = await supabase
    .from('profiles')
    .select('id, full_name, room_number, fee_status')
    .eq('role', 'student')
    .eq('status', 'approved')
    .order('full_name', { ascending: true })

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Students</h1>
        <Link href="/admin/students/new" className="rounded bg-blue-600 px-3 py-1 text-white">
          Add student
        </Link>
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="p-2">Name</th>
            <th className="p-2">Room</th>
            <th className="p-2">Fee status</th>
            <th className="p-2" />
          </tr>
        </thead>
        <tbody>
          {students?.map((s) => (
            <tr key={s.id} className="border-b">
              <td className="p-2">{s.full_name}</td>
              <td className="p-2">{s.room_number}</td>
              <td className="p-2 capitalize">{s.fee_status}</td>
              <td className="p-2">
                <Link href={`/admin/students/${s.id}`} className="text-blue-600 underline">Edit</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Actions — create, update, delete**

Create `src/app/admin/students/actions.ts`:

```ts
'use server'

import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function createStudent(formData: FormData) {
  const email = String(formData.get('email'))
  const fullName = String(formData.get('full_name'))
  const roomNumber = String(formData.get('room_number'))
  const permanentAddress = String(formData.get('permanent_address'))
  const contactPersonal = String(formData.get('contact_personal'))
  const contactEmergency = String(formData.get('contact_emergency'))

  const adminClient = createAdminClient()
  const { data: created, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
  })

  if (inviteError || !created.user) {
    throw new Error(inviteError?.message ?? 'Failed to invite student')
  }

  let photoPath: string | null = null
  const photo = formData.get('photo')
  if (photo instanceof File && photo.size > 0) {
    photoPath = `${created.user.id}/${Date.now()}-${photo.name}`
    const { error: uploadError } = await adminClient.storage
      .from('profile-photos')
      .upload(photoPath, photo, { upsert: true })
    if (uploadError) throw new Error(uploadError.message)
  }

  const supabase = await createClient()
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      room_number: roomNumber,
      permanent_address: permanentAddress,
      contact_personal: contactPersonal,
      contact_emergency: contactEmergency,
      status: 'approved',
      ...(photoPath ? { photo_path: photoPath } : {}),
    })
    .eq('id', created.user.id)

  if (updateError) throw new Error(updateError.message)

  redirect('/admin/students')
}

export async function updateStudent(studentId: string, formData: FormData) {
  const supabase = await createClient()

  let photoPath: string | undefined
  const photo = formData.get('photo')
  if (photo instanceof File && photo.size > 0) {
    photoPath = `${studentId}/${Date.now()}-${photo.name}`
    const { error: uploadError } = await supabase.storage
      .from('profile-photos')
      .upload(photoPath, photo, { upsert: true })
    if (uploadError) throw new Error(uploadError.message)
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: String(formData.get('full_name')),
      room_number: String(formData.get('room_number')),
      permanent_address: String(formData.get('permanent_address')),
      contact_personal: String(formData.get('contact_personal')),
      contact_emergency: String(formData.get('contact_emergency')),
      fee_status: String(formData.get('fee_status')),
      ...(photoPath ? { photo_path: photoPath } : {}),
    })
    .eq('id', studentId)

  if (error) throw new Error(error.message)

  redirect('/admin/students')
}

export async function deleteStudent(studentId: string) {
  const adminClient = createAdminClient()
  const { error } = await adminClient.auth.admin.deleteUser(studentId)
  if (error) throw new Error(error.message)
  redirect('/admin/students')
}
```

- [ ] **Step 3: Add-student page**

Create `src/app/admin/students/new/page.tsx`:

```tsx
import { createStudent } from '../actions'

export default function NewStudentPage() {
  return (
    <div className="max-w-md">
      <h1 className="mb-4 text-xl font-semibold">Add Student</h1>
      <form action={createStudent} className="flex flex-col gap-3">
        <input name="email" type="email" placeholder="Email" required className="rounded border p-2" />
        <input name="full_name" placeholder="Full name" required className="rounded border p-2" />
        <input name="room_number" placeholder="Room number" required className="rounded border p-2" />
        <textarea name="permanent_address" placeholder="Permanent address" required className="rounded border p-2" />
        <input name="contact_personal" placeholder="Personal contact number" required className="rounded border p-2" />
        <input name="contact_emergency" placeholder="Emergency contact number" required className="rounded border p-2" />
        <label className="flex flex-col gap-1 text-sm">
          Profile photo
          <input type="file" name="photo" accept="image/*" className="rounded border p-2" />
        </label>
        <button type="submit" className="rounded bg-blue-600 p-2 text-white">Add student</button>
      </form>
    </div>
  )
}
```

- [ ] **Step 4: Delete confirm button (Client Component)**

Create `src/app/admin/students/[id]/DeleteButton.tsx`:

```tsx
'use client'

export function DeleteButton() {
  return (
    <button
      type="submit"
      className="rounded bg-red-600 p-2 text-white"
      onClick={(e) => {
        if (!confirm('Delete this student permanently? This cannot be undone.')) {
          e.preventDefault()
        }
      }}
    >
      Delete student
    </button>
  )
}
```

- [ ] **Step 5: Edit/delete page**

Create `src/app/admin/students/[id]/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updateStudent, deleteStudent } from '../actions'
import { DeleteButton } from './DeleteButton'

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: student } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .eq('role', 'student')
    .single()

  if (!student) notFound()

  const updateWithId = updateStudent.bind(null, student.id)
  const deleteWithId = deleteStudent.bind(null, student.id)

  return (
    <div className="max-w-md">
      <h1 className="mb-4 text-xl font-semibold">Edit {student.full_name}</h1>
      <form action={updateWithId} className="flex flex-col gap-3">
        <input name="full_name" defaultValue={student.full_name ?? ''} required className="rounded border p-2" />
        <input name="room_number" defaultValue={student.room_number ?? ''} required className="rounded border p-2" />
        <textarea name="permanent_address" defaultValue={student.permanent_address ?? ''} required className="rounded border p-2" />
        <input name="contact_personal" defaultValue={student.contact_personal ?? ''} required className="rounded border p-2" />
        <input name="contact_emergency" defaultValue={student.contact_emergency ?? ''} required className="rounded border p-2" />
        <select name="fee_status" defaultValue={student.fee_status} className="rounded border p-2">
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
        </select>
        <label className="flex flex-col gap-1 text-sm">
          Replace profile photo
          <input type="file" name="photo" accept="image/*" className="rounded border p-2" />
        </label>
        <button type="submit" className="rounded bg-blue-600 p-2 text-white">Save changes</button>
      </form>
      <form action={deleteWithId} className="mt-4">
        <DeleteButton />
      </form>
    </div>
  )
}
```

- [ ] **Step 6: Verify manually**

As admin: add a student directly via `/admin/students/new` (uses a real email you control, since Supabase sends an invite email). Confirm the student appears in `/admin/students`. Edit their fee status and room number, save, confirm changes persist. Delete the student, confirm they disappear and can no longer log in.

- [ ] **Step 7: Commit**

```bash
git add src/app/admin/students
git commit -m "feat: add admin student list, add, edit, and delete"
```

---

## Task 11: Student Daily Tick Page + Action

**Files:**
- Create: `src/app/student/page.tsx`
- Create: `src/app/student/actions.ts`

**Interfaces:**
- Consumes: `createClient()` (Task 3), `getTomorrowISTDateString`, `isBeforeCutoff` (Task 4), student layout (Task 7).
- Produces: `submitTick(formData)` — not reused elsewhere.

- [ ] **Step 1: Tick action**

Create `src/app/student/actions.ts`:

```ts
'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getTomorrowISTDateString } from '@/lib/time'

export async function submitTick(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const tomorrow = getTomorrowISTDateString()
  const breakfast = formData.get('breakfast') === 'on'
  const dinner = formData.get('dinner') === 'on'

  const { error } = await supabase
    .from('meal_ticks')
    .upsert(
      { student_id: user.id, meal_date: tomorrow, breakfast, dinner },
      { onConflict: 'student_id,meal_date' }
    )

  if (error) redirect(`/student?error=${encodeURIComponent(error.message)}`)

  revalidatePath('/student')
  redirect('/student')
}
```

- [ ] **Step 2: Tick page**

Create `src/app/student/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { getTomorrowISTDateString, isBeforeCutoff } from '@/lib/time'
import { submitTick } from './actions'

export default async function StudentDashboard({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const tomorrow = getTomorrowISTDateString()

  const { data: settings } = await supabase
    .from('app_settings')
    .select('cutoff_time')
    .eq('id', 1)
    .single()

  const cutoffTime = settings?.cutoff_time?.slice(0, 5) ?? '22:00'
  const canSubmit = isBeforeCutoff(new Date(), cutoffTime)

  const { data: tick } = await supabase
    .from('meal_ticks')
    .select('breakfast, dinner')
    .eq('student_id', user!.id)
    .eq('meal_date', tomorrow)
    .maybeSingle()

  return (
    <div className="max-w-sm">
      <h1 className="mb-2 text-xl font-semibold">Tomorrow ({tomorrow})</h1>
      <p className="mb-4 text-sm text-gray-600">Daily cutoff: {cutoffTime} IST</p>
      {error && <p className="mb-4 rounded bg-red-100 p-2 text-sm text-red-700">{error}</p>}
      {!canSubmit && (
        <p className="mb-4 rounded bg-yellow-100 p-2 text-sm text-yellow-800">
          Today&apos;s cutoff has passed. Tomorrow&apos;s ticks are locked.
        </p>
      )}
      <form action={submitTick} className="flex flex-col gap-3">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="breakfast" defaultChecked={tick?.breakfast ?? false} disabled={!canSubmit} />
          Tomorrow&apos;s Breakfast
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="dinner" defaultChecked={tick?.dinner ?? false} disabled={!canSubmit} />
          Tomorrow&apos;s Dinner
        </label>
        <button type="submit" disabled={!canSubmit} className="rounded bg-blue-600 p-2 text-white disabled:opacity-50">
          Save my ticks
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Verify manually**

Log in as an approved student before the configured cutoff. Toggle both checkboxes on, save, reload the page, confirm they're still checked. In the Supabase dashboard, confirm a `meal_ticks` row exists for tomorrow's date. Temporarily set `app_settings.cutoff_time` to a time in the past (e.g., `00:01`) via SQL Editor, reload `/student`, confirm the form is now disabled and shows the locked message; reset `cutoff_time` back to `22:00` afterward.

- [ ] **Step 4: Commit**

```bash
git add src/app/student/page.tsx src/app/student/actions.ts
git commit -m "feat: add student daily meal tick page and cutoff-aware submit action"
```

---

## Task 12: Student Profile View

**Files:**
- Create: `src/app/student/profile/page.tsx`

**Interfaces:**
- Consumes: `createClient()` (Task 3), student layout (Task 7).

- [ ] **Step 1: Profile view page**

Create `src/app/student/profile/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'

export default async function StudentProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, room_number, permanent_address, contact_personal, contact_emergency, photo_path')
    .eq('id', user!.id)
    .single()

  let photoUrl: string | null = null
  if (profile?.photo_path) {
    const { data: signed } = await supabase.storage
      .from('profile-photos')
      .createSignedUrl(profile.photo_path, 60)
    photoUrl = signed?.signedUrl ?? null
  }

  return (
    <div className="max-w-sm">
      <h1 className="mb-4 text-xl font-semibold">My Profile</h1>
      {photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="Profile" className="mb-4 h-32 w-32 rounded-full object-cover" />
      )}
      <dl className="flex flex-col gap-2 text-sm">
        <div><dt className="font-medium">Name</dt><dd>{profile?.full_name}</dd></div>
        <div><dt className="font-medium">Room</dt><dd>{profile?.room_number}</dd></div>
        <div><dt className="font-medium">Address</dt><dd>{profile?.permanent_address}</dd></div>
        <div><dt className="font-medium">Personal contact</dt><dd>{profile?.contact_personal}</dd></div>
        <div><dt className="font-medium">Emergency contact</dt><dd>{profile?.contact_emergency}</dd></div>
      </dl>
    </div>
  )
}
```

- [ ] **Step 2: Verify manually**

Log in as an approved student with a photo set (from Task 9/10). Visit `/student/profile`, confirm all fields display and the photo loads via a signed URL. Confirm no fee/billing information appears anywhere on this page.

- [ ] **Step 3: Commit**

```bash
git add src/app/student/profile
git commit -m "feat: add read-only student profile view"
```

---

## Task 13: Admin Analytics — Tomorrow's Prep Counts

**Files:**
- Create: `src/app/admin/analytics/page.tsx`

**Interfaces:**
- Consumes: `createClient()` (Task 3), `getTomorrowISTDateString` (Task 4), admin layout (Task 8).

- [ ] **Step 1: Analytics page**

Create `src/app/admin/analytics/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { getTomorrowISTDateString } from '@/lib/time'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const tomorrow = getTomorrowISTDateString()

  const { data: ticks } = await supabase
    .from('meal_ticks')
    .select('breakfast, dinner, profiles!inner(status)')
    .eq('meal_date', tomorrow)
    .eq('profiles.status', 'approved')

  const breakfastCount = ticks?.filter((t) => t.breakfast).length ?? 0
  const dinnerCount = ticks?.filter((t) => t.dinner).length ?? 0

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Prep quantities for {tomorrow}</h1>
      <div className="flex gap-6">
        <div className="rounded border p-4 text-center">
          <div className="text-3xl font-bold">{breakfastCount}</div>
          <div className="text-sm text-gray-600">Breakfast</div>
        </div>
        <div className="rounded border p-4 text-center">
          <div className="text-3xl font-bold">{dinnerCount}</div>
          <div className="text-sm text-gray-600">Dinner</div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify manually**

With at least one approved student having ticked tomorrow's breakfast and/or dinner (Task 11), visit `/admin/analytics` as admin and confirm the counts match what was submitted.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/analytics
git commit -m "feat: add admin next-day meal prep analytics"
```

---

## Task 14: Admin Billing — Tally + Generate & Close Month

**Files:**
- Create: `src/app/admin/billing/page.tsx`
- Create: `src/app/admin/billing/actions.ts`
- Create: `src/app/admin/billing/CloseMonthButton.tsx`

**Interfaces:**
- Consumes: `createClient()` (Task 3), `calculateBill` (Task 5), `getISTMonthBounds` (Task 4), admin layout (Task 8).

- [ ] **Step 1: Generate & close action**

Create `src/app/admin/billing/actions.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { calculateBill } from '@/lib/billing'

export async function generateAndCloseMonth(formData: FormData) {
  const start = String(formData.get('month')) // 'YYYY-MM-01'
  const [y, m] = start.split('-').map(Number)
  const nextMonth = new Date(Date.UTC(y, m, 1)) // m is 1-indexed; Date.UTC's 0-indexed param rolls to next month
  const end = `${nextMonth.getUTCFullYear()}-${String(nextMonth.getUTCMonth() + 1).padStart(2, '0')}-01`

  const supabase = await createClient()

  const { data: students } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'student')
    .eq('status', 'approved')

  const { data: ticks } = await supabase
    .from('meal_ticks')
    .select('student_id, breakfast, dinner')
    .gte('meal_date', start)
    .lt('meal_date', end)

  const bills = (students ?? []).map((s) => {
    const studentTicks = (ticks ?? []).filter((t) => t.student_id === s.id)
    const breakfast_count = studentTicks.filter((t) => t.breakfast).length
    const dinner_count = studentTicks.filter((t) => t.dinner).length
    const total_ticks = breakfast_count + dinner_count
    return {
      student_id: s.id,
      month: start,
      breakfast_count,
      dinner_count,
      total_ticks,
      bill_amount: calculateBill(total_ticks),
    }
  })

  if (bills.length > 0) {
    const { error } = await supabase
      .from('monthly_bills')
      .upsert(bills, { onConflict: 'student_id,month', ignoreDuplicates: true })
    if (error) throw new Error(error.message)
  }

  revalidatePath('/admin/billing')
}
```

- [ ] **Step 2: Confirm button (Client Component)**

Create `src/app/admin/billing/CloseMonthButton.tsx`:

```tsx
'use client'

export function CloseMonthButton({ disabled, label }: { disabled: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="rounded bg-green-600 p-2 text-white disabled:opacity-50"
      onClick={(e) => {
        if (!confirm('Close this month and generate final bills for every student? This cannot be undone.')) {
          e.preventDefault()
        }
      }}
    >
      {label}
    </button>
  )
}
```

- [ ] **Step 3: Billing page**

Create `src/app/admin/billing/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { calculateBill } from '@/lib/billing'
import { getISTMonthBounds } from '@/lib/time'
import { generateAndCloseMonth } from './actions'
import { CloseMonthButton } from './CloseMonthButton'

export default async function BillingPage() {
  const supabase = await createClient()
  const { start, end, month } = getISTMonthBounds()

  const { data: students } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'student')
    .eq('status', 'approved')
    .order('full_name', { ascending: true })

  const { data: ticks } = await supabase
    .from('meal_ticks')
    .select('student_id, breakfast, dinner')
    .gte('meal_date', start)
    .lt('meal_date', end)

  const { data: alreadyClosed } = await supabase
    .from('monthly_bills')
    .select('student_id')
    .eq('month', start)

  const monthClosed = (alreadyClosed?.length ?? 0) > 0

  const rows = (students ?? []).map((s) => {
    const studentTicks = (ticks ?? []).filter((t) => t.student_id === s.id)
    const breakfastCount = studentTicks.filter((t) => t.breakfast).length
    const dinnerCount = studentTicks.filter((t) => t.dinner).length
    const totalTicks = breakfastCount + dinnerCount
    return {
      id: s.id,
      name: s.full_name,
      breakfastCount,
      dinnerCount,
      totalTicks,
      bill: calculateBill(totalTicks),
    }
  })

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Mess bill — {month} {monthClosed ? '(final)' : '(live preview)'}</h1>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="p-2">Student</th>
            <th className="p-2">Breakfast</th>
            <th className="p-2">Dinner</th>
            <th className="p-2">Total ticks</th>
            <th className="p-2">Bill</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b">
              <td className="p-2">{r.name}</td>
              <td className="p-2">{r.breakfastCount}</td>
              <td className="p-2">{r.dinnerCount}</td>
              <td className="p-2">{r.totalTicks}</td>
              <td className="p-2">₹{r.bill}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <form action={generateAndCloseMonth} className="mt-6">
        <input type="hidden" name="month" value={start} />
        <CloseMonthButton disabled={monthClosed} label={monthClosed ? 'Month already closed' : 'Generate & close this month'} />
      </form>
    </div>
  )
}
```

- [ ] **Step 4: Verify manually**

With a few ticks submitted (Task 11), visit `/admin/billing` as admin and confirm the live tally matches `calculateBill` for each student's tick count. Click "Generate & close this month," confirm it, then confirm: the page now shows "(final)," the button is disabled, and `monthly_bills` rows exist in the database. Then log in as a student and confirm `/student` now shows the tick form as locked for the closed month's dates (the trigger from Task 2 rejects writes once `monthly_bills` has a row for that student+month).

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/billing
git commit -m "feat: add admin billing tally and generate-and-close-month action"
```

---

## Task 15: Admin Settings — Cutoff Time

**Files:**
- Create: `src/app/admin/settings/page.tsx`
- Create: `src/app/admin/settings/actions.ts`

**Interfaces:**
- Consumes: `createClient()` (Task 3), admin layout (Task 8).

- [ ] **Step 1: Update action**

Create `src/app/admin/settings/actions.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateCutoffTime(formData: FormData) {
  const cutoffTime = String(formData.get('cutoff_time'))
  const supabase = await createClient()

  const { error } = await supabase
    .from('app_settings')
    .update({ cutoff_time: cutoffTime, updated_at: new Date().toISOString() })
    .eq('id', 1)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/settings')
  revalidatePath('/student')
}
```

- [ ] **Step 2: Settings page**

Create `src/app/admin/settings/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { updateCutoffTime } from './actions'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: settings } = await supabase
    .from('app_settings')
    .select('cutoff_time')
    .eq('id', 1)
    .single()

  return (
    <div className="max-w-sm">
      <h1 className="mb-4 text-xl font-semibold">Settings</h1>
      <form action={updateCutoffTime} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Daily cutoff time (IST)
          <input
            type="time"
            name="cutoff_time"
            defaultValue={settings?.cutoff_time?.slice(0, 5) ?? '22:00'}
            required
            className="rounded border p-2"
          />
        </label>
        <button type="submit" className="rounded bg-blue-600 p-2 text-white">Save</button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Verify manually**

As admin, visit `/admin/settings`, change the cutoff time, save, reload, confirm the new value persists. Confirm the student tick page (Task 11) reflects the new cutoff time.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/settings
git commit -m "feat: add admin cutoff-time settings page"
```

---

## Task 16: README + End-to-End Verification

**Files:**
- Create: `README.md`

**Interfaces:** None — final wrap-up task.

- [ ] **Step 1: Write the README**

Create `README.md`:

```markdown
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

`npm test` runs the Vitest unit tests for the billing formula and IST cutoff logic.

## Roles

- **Admin**: logs in directly, manages students, reviews next-day prep counts, and generates monthly bills.
- **Student**: signs up at `/signup`, waits for admin approval, then submits tomorrow's breakfast/dinner ticks daily before the cutoff time (default 22:00 IST, admin-configurable).

Mess bills are calculated automatically from each student's monthly tick count and are visible to admins only — students never see billing information.
```

- [ ] **Step 2: Full manual end-to-end verification**

Walk through, in order, confirming each works:
1. Student self-registration at `/signup` → lands on `/pending`.
2. Admin approves via `/admin/pending/[id]`, filling room/address/contacts/photo → student gains dashboard access.
3. Student submits tomorrow's breakfast/dinner tick at `/student` before cutoff → succeeds; after simulating cutoff passing → locked.
4. Admin views `/admin/analytics` → counts match submitted ticks.
5. Admin views `/admin/billing` → live tally matches `calculateBill`; clicking "Generate & close this month" produces final bills and locks that month's ticks.
6. Student never sees any billing UI or data anywhere in `/student/*`.
7. Admin edits a student's fee status and deletes a student via `/admin/students/[id]` → both take effect and the deleted student can no longer log in.
8. Admin changes the cutoff time at `/admin/settings` → reflected on the student tick page.

- [ ] **Step 3: Run full test suite**

Run: `npm test`
Expected: all unit tests pass (billing + time).

Run: `npm run build`
Expected: production build succeeds with no type errors.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add setup and testing instructions"
```

---

## Self-Review Notes

- **Spec coverage:** every §3–§7 requirement in the spec maps to a task above — student DB CRUD (10), photo/privacy handling (2, 9, 10, 12), meal opt-in + cutoff (2, 4, 11), prep analytics (13), auto-billing + admin-only visibility (2, 5, 14), profile view (12), monthly archive/lock (2, 14), responsive/security (Tailwind throughout, RLS in 2, server-side checks throughout), testing (4, 5, 16).
- **Type consistency checked:** `Profile`/`MealTick`/`MonthlyBill`/`AppSettings` (Task 3) match the columns used in every query; `calculateBill(totalTicks: number): number` (Task 5) is called identically in Tasks 13/14; `getTomorrowISTDateString`, `isBeforeCutoff`, `getISTMonthBounds` (Task 4) are called with matching signatures in Tasks 11, 13, 14.
- **No placeholders:** every step contains complete, working code or an exact command.
