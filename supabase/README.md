# Supabase (Turtle Party project, sickprints organization)

Same rule as Building Integrity: **Tommy pastes SQL into the dashboard himself.** Claude never connects to the live project.

## Migrations

Run each file once, in order, in **SQL Editor > New query**: paste the whole file, then Run.

| File | What it does | Check afterwards (one query) | Expect |
| --- | --- | --- | --- |
| `0001_profiles_and_bioregions.sql` | `bioregions` and `profiles` tables, row-level security, a profile row created at every sign-up | `select count(*) from pg_policies where schemaname = 'public';` | `3` |
| `0002_seed_bioregions.sql` | The 185 One Earth bioregions | `select count(*) from public.bioregions;` | `185` |

`realm` and `subrealm` are empty for now. The One Earth web list gives only codes and names. Filling them in, and adding the map shapes, means importing One Earth's dataset, which is a separate download.

## One-time dashboard settings

1. **Authentication > URL Configuration**
   - Site URL: `http://localhost:3100` (change it to the real address at launch)
   - Redirect URLs: add `http://localhost:3100/**`
2. **Authentication > Sign In / Providers > Email**: leave it on. Sign-in is a magic link, so there are no passwords.
   - Supabase's built-in email sender only allows a few emails per hour. That's fine for testing, but set up a custom SMTP sender before real players arrive.
3. **Project Settings > API keys**: copy the **Project URL** and the **publishable** key into `apps/web/.env.local` (copy `apps/web/.env.example`). Never use the secret / service_role key there.

## Licence

The bioregion list is from One Earth (CC BY-NC 4.0). Credit them wherever the list appears; the sign-up picker does. It's fine while the game is free. Get One Earth's written permission before adding tips or donations.
