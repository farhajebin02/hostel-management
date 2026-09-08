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
