import Link from "next/link";
import { redirect } from "next/navigation";
import { isBackendConfigured } from "@/lib/supabase/env";
import { currentPlayer } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";

const ERRORS: Record<string, string> = {
  link: "That sign-in link didn't work. Links expire, and must be opened in the same browser you asked from. Send a new one.",
  "missing-code": "That sign-in link was incomplete. Send a new one.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  // Already signed in by email: nothing to do here. (A guest may still sign in to an email account.)
  if (isBackendConfigured()) {
    const player = await currentPlayer();
    if (player.signedIn && !player.isGuest) redirect("/");
  }
  const { error } = await searchParams;
  return (
    <main className="mx-auto w-full max-w-md px-4 py-12">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="mt-2 text-sm text-muted">We&apos;ll email you a link. No password needed.</p>
      {error && ERRORS[error] && <p className="mt-4 rounded-md bg-warn/15 p-3 text-sm">{ERRORS[error]}</p>}
      <LoginForm />
      <p className="mt-8 text-sm">
        <Link href="/" className="underline">
          Back
        </Link>
      </p>
    </main>
  );
}
