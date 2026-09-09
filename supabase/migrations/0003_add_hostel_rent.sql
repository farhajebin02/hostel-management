-- Feature: hostel rent, a flat monthly amount added on top of the mess fee
-- to make up the student's total bill (rent + mess fee = total). Admin can
-- edit the rent amount from Settings, same as the cutoff time.
alter table public.app_settings
  add column hostel_rent numeric not null default 2700;

-- Archived per student per month, alongside the existing mess-fee columns,
-- so a later rent change never retroactively alters an already-closed
-- month's bill (same immutability reasoning as bill_amount).
alter table public.monthly_bills
  add column rent_amount numeric not null default 0;
