import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { isBackendConfigured } from "@/lib/supabase/env";
import { currentPlayer } from "@/lib/supabase/server";
import { signOut } from "./actions";

export default async function Home() {
  await connection(); // depends on who's signed in: never prerender
  const configured = isBackendConfigured();
  const { email, profile, bioregion } = configured
    ? await currentPlayer()
    : { email: null, profile: null, bioregion: null };

  // Signed in but no username or bioregion yet: finish setting up first.
  if (email && (!profile?.username || !profile.bioregion_code)) redirect("/welcome");

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">Turtle Party</h1>
      <p className="mt-3 text-muted">Pitch, pair and party with friends, online.</p>

      {!configured && (
        <p className="mt-8 rounded-md bg-warn/15 p-4 text-sm">
          Sign-in isn&apos;t connected yet. Add the Supabase URL and publishable key to{" "}
          <code>apps/web/.env.local</code> (see <code>.env.example</code>) and restart the dev server.
        </p>
      )}

      {configured && !email && (
        <Link
          href="/login"
          className="mt-8 inline-block rounded-md bg-shell px-5 py-2.5 font-medium text-on-shell"
        >
          Sign in to play
        </Link>
      )}

      {email && profile && (
        <section className="mt-8 rounded-lg border border-line bg-surface p-5">
          <p>
            Signed in as <strong>{profile.username}</strong>
          </p>
          <p className="mt-1 text-sm text-muted">
            Home: {bioregion?.name ?? profile.bioregion_code} ({profile.bioregion_code})
          </p>
          <div className="mt-4 flex gap-4 text-sm">
            <Link href="/welcome" className="underline">
              Edit profile
            </Link>
            <form action={signOut}>
              <button type="submit" className="underline">
                Sign out
              </button>
            </form>
          </div>
          <p className="mt-5 text-sm text-muted">Rooms and the tabletop arrive in Phase 1.</p>
        </section>
      )}
    </main>
  );
}
