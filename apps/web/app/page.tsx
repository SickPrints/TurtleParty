import Link from "next/link";
import { connection } from "next/server";
import { isBackendConfigured } from "@/lib/supabase/env";
import { currentPlayer } from "@/lib/supabase/server";

export default async function Home() {
  await connection(); // depends on who's playing: never prerender
  const configured = isBackendConfigured();
  const player = configured ? await currentPlayer() : null;

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">Turtle Party</h1>
      <p className="mt-3 text-muted">Pitch, pair and party with friends, online.</p>

      {!configured && (
        <p className="mt-8 rounded-md bg-warn/15 p-4 text-sm">
          The game isn&apos;t connected yet. Add the Supabase URL and publishable key to{" "}
          <code>apps/web/.env.local</code> (see <code>.env.example</code>) and restart the dev server.
        </p>
      )}

      {configured && !player?.signedIn && (
        <p className="mt-8 rounded-md border border-line bg-surface p-4">
          Type a name in the box at the top and press <strong>Play</strong>. No sign-up: this browser remembers you.
          <span className="mt-2 block text-sm text-muted">
            Played before on another device?{" "}
            <Link href="/login" className="underline">
              Sign in with email
            </Link>
          </span>
        </p>
      )}

      {player?.signedIn && (
        <section className="mt-8 rounded-lg border border-line bg-surface p-5">
          <p>
            Welcome, <strong>{player.profile?.username ?? "turtle"}</strong>.
          </p>
          {!player.bioregion && (
            <p className="mt-2 text-sm text-muted">
              <Link href="/profile" className="underline">
                Pick your home bioregion
              </Link>{" "}
              whenever you like. It&apos;s optional.
            </p>
          )}
          <p className="mt-4 text-sm text-muted">Rooms and the tabletop arrive in Phase 1.</p>
        </section>
      )}
    </main>
  );
}
