-- Feature: restrict meal-tick submission to a window (default 4:00 PM to
-- 10:00 PM IST) instead of allowing it any time before the cutoff. Admin can
-- edit both times from Settings, same as the existing cutoff_time.
alter table public.app_settings
  add column open_time time not null default '16:00';

-- Update the authoritative DB-side guard to also reject writes before the
-- window opens, not just after it closes.
create or replace function public.enforce_tick_write_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_open_time time;
  v_cutoff time;
  v_today_ist date;
  v_tomorrow_ist date;
  v_now_time_ist time;
  v_closed boolean;
begin
  select open_time, cutoff_time into v_open_time, v_cutoff from public.app_settings where id = 1;
  v_today_ist := (now() at time zone 'Asia/Kolkata')::date;
  v_tomorrow_ist := v_today_ist + 1;
  v_now_time_ist := (now() at time zone 'Asia/Kolkata')::time;

  if new.meal_date <> v_tomorrow_ist then
    raise exception 'Ticks can only be submitted for tomorrow (%), not %', v_tomorrow_ist, new.meal_date;
  end if;

  if v_now_time_ist < v_open_time then
    raise exception 'Meal selection opens at % IST', v_open_time;
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
