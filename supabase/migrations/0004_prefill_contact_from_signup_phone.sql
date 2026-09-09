-- Feature: phone-number signup/login. Students now sign up with a phone
-- number (stored as user_metadata.phone; their actual auth identity is a
-- synthetic email so no SMS provider is required). Pre-fill contact_personal
-- from that phone number so admin doesn't have to re-type it at approval
-- time - it stays editable in case the admin needs to correct it.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, status, full_name, contact_personal)
  values (
    new.id,
    'student',
    'pending',
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone'
  );
  return new;
end;
$$;
