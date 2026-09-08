-- Fix (final whole-branch review): a pending student's JWT could still write
-- meal_ticks rows even though the UI never lets them reach the tick form.
-- Those rows were inert while pending (analytics and billing both filter
-- status='approved'), but became live the moment the student was approved
-- later in the same month. Require approved status at the RLS layer, not
-- just in the UI.
alter policy "Students can insert own ticks"
  on public.meal_ticks
  with check (
    auth.uid() = student_id
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and status = 'approved'
    )
  );

alter policy "Students can update own ticks"
  on public.meal_ticks
  using (
    auth.uid() = student_id
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and status = 'approved'
    )
  )
  with check (
    auth.uid() = student_id
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and status = 'approved'
    )
  );

-- Fix (ledger item, escalated by final review): back-stop the billing
-- page's ?month= query param, which feeds this column - a malformed value
-- should fail the write rather than silently store a non-month date.
alter table public.monthly_bills
  add constraint monthly_bills_month_is_first_of_month
  check (month = date_trunc('month', month)::date);
