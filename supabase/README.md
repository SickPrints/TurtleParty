# Supabase (Turtle Party project, owned by the sickprints organization)

**Tommy pastes SQL into the dashboard himself.** Claude never connects to the live project.

## Migrations

Run each file once, in order, in **SQL Editor > New query**: paste the whole file, then Run.

| File | What it does | Check afterwards (one query) | Expect | Applied |
| --- | --- | --- | --- | --- |
| `0001_profiles_and_bioregions.sql` | `bioregions` and `profiles` tables, row-level security, a profile row created at every sign-up | `select count(*) from pg_policies where schemaname = 'public';` | `3` | 2026-11-08 |
| `0002_seed_bioregions.sql` | The 185 One Earth bioregions | `select count(*) from public.bioregions;` | `185` | 2026-11-08 |
| `0003_grant_table_access.sql` | Table access for the website's roles. New Supabase projects don't grant it by default, so without it every read is "permission denied" | the query at the bottom of the file | `true` | 2026-11-08 |

**Every new table needs its own `grant` lines**, as well as row-level security policies. New Supabase projects don't grant table access to the website automatically.

`realm` and `subrealm` are empty for now. The One Earth web list gives only codes and names. Filling them in, and adding the map shapes, means importing One Earth's dataset, which is a separate download.

## One-time dashboard settings

1. **Authentication > URL Configuration**
   - Site URL: `https://turtleparty.vercel.app` (the live site; it was `http://localhost:3100` before 2026-11-12)
   - Redirect URLs: add `https://turtleparty.vercel.app/**` and keep `http://localhost:3100/**` for local work (both set by Tommy 2026-11-12)
2. **Authentication > Sign In / Providers > Allow anonymous sign-ins**: turn it **on**. This is the main way in: "Start playing" gives each browser a guest identity with no email. Supabase limits new guests per hour from one internet address (about 30 by default), which is plenty for now. Before a public launch, add a bot check (Supabase supports Cloudflare Turnstile) so nobody can mass-create guests.
3. **Authentication > Sign In / Providers > Email**: leave it on. Email is optional, for keeping the same player on another device, and uses a one-time link, so there are no passwords.
   - Supabase's built-in email sender allows 2 emails per hour and only delivers to members of the project's organization. Set up a custom SMTP sender (for example Resend, with DNS records added in Squarespace for turtleparty.org) before other players need email.
4. **Project Settings > API keys**: copy the **Project URL** and the **publishable** key into `apps/web/.env.local` (copy `apps/web/.env.example`). Never use the secret / service_role key there.

## Licence

The bioregion list is from One Earth (CC BY-NC 4.0). Credit them wherever the list appears; the sign-up picker does. It's fine while the game is free. Get One Earth's written permission before adding tips or donations.
