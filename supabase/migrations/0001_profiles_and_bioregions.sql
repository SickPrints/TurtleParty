-- 0001: profiles and bioregions (Phase 0).
--
-- Paste the whole file into the Supabase SQL editor and run it once.
-- Row-level security is on from day one: the browser holds the publishable
-- key, so every rule about who may read or write lives here, not in the app.

-- ---------------------------------------------------------------- bioregions

-- One Earth Bioregions 2023 (185 bioregions). Rows are seeded by 0002.
-- realm / subrealm are One Earth's 14 realms and 52 subrealms; they stay empty
-- until the full dataset is imported (that import also brings the map shapes).
create table public.bioregions (
  code text primary key check (code ~ '^(NA|NT|PA|AT|IM|AU|OC|AN)[0-9]{1,2}$'),
  name text not null unique,
  realm text,
  subrealm text,
  -- The biogeographic realm, read straight off the code's letters.
  biogeographic_realm text generated always as (
    case left(code, 2)
      when 'NA' then 'Nearctic'
      when 'NT' then 'Neotropic'
      when 'PA' then 'Palearctic'
      when 'AT' then 'Afrotropic'
      when 'IM' then 'Indomalayan'
      when 'AU' then 'Australasia'
      when 'OC' then 'Oceania'
      when 'AN' then 'Antarctic'
    end
  ) stored
);

comment on table public.bioregions is
  'One Earth Bioregions 2023 (oneearth.org), CC BY-NC 4.0. Free game only; get One Earth''s written permission before any tips or donations.';

alter table public.bioregions enable row level security;

-- Anyone, signed in or not, can read the list (the sign-up picker needs it).
create policy "bioregions are public"
  on public.bioregions for select
  to anon, authenticated
  using (true);
-- No insert/update/delete policies: only migrations change this table.

-- ---------------------------------------------------------------- profiles

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  bioregion_code text references public.bioregions (code),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- "Tommy" and "tommy" are the same username.
create unique index profiles_username_lower_key on public.profiles (lower(username));

alter table public.profiles enable row level security;

-- Usernames and bioregions are public: other players see them at the table.
create policy "profiles are public"
  on public.profiles for select
  to anon, authenticated
  using (true);

-- You can edit only your own profile...
create policy "edit your own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ...and only these two columns of it. No insert policy: the trigger below
-- creates the row. No delete policy: deleting the account removes it.
revoke update on public.profiles from anon, authenticated;
grant update (username, bioregion_code) on public.profiles to authenticated;

-- Create an empty profile whenever someone signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep updated_at honest.
create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();
