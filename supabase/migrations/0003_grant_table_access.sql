-- 0003: let the website reach the tables at all.
--
-- New Supabase projects no longer grant table access to the website's roles
-- (anon = not started yet, authenticated = any player, guests included)
-- automatically. Without these grants the row-level security policies in
-- 0001 never get a chance to run: every read fails with "permission denied",
-- which left the bioregion picker empty and the name box unable to save.
--
-- Row-level security still decides WHICH rows; these grants only open the door.
-- Paste the whole file into the SQL editor and run it once, after 0002.

grant usage on schema public to anon, authenticated;

-- Anyone can read the bioregion list and public profiles (the policies say so too).
grant select on public.bioregions to anon, authenticated;
grant select on public.profiles to anon, authenticated;

-- Players may change only their own name and bioregion (0001's policy limits it to their own row).
grant update (username, bioregion_code) on public.profiles to authenticated;

-- Check afterwards (one query, expect: true):
-- select has_table_privilege('anon', 'public.bioregions', 'select')
--    and has_table_privilege('authenticated', 'public.profiles', 'select')
--    and has_column_privilege('authenticated', 'public.profiles', 'username', 'update') as ok;
