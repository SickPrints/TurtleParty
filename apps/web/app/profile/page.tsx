import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { isBackendConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient, currentPlayer, type Bioregion } from "@/lib/supabase/server";
import { signOut } from "../actions";
import { ProfileForm } from "./ProfileForm";

/** Your name and (optionally) your home bioregion. Reached from the top bar. */
export default async function ProfilePage() {
  await connection(); // depends on who's playing: never prerender
  if (!isBackendConfigured()) redirect("/");
  const { signedIn, isGuest, email, profile } = await currentPlayer();
  if (!signedIn) redirect("/"); // type a name in the top bar first

  const supabase = await createSupabaseServerClient();
  const { data: bioregions } = await supabase
    .from("bioregions")
    .select("code, name, biogeographic_realm")
    .order("name")
    .returns<Bioregion[]>();

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Your profile</h1>
      <p className="mt-2 text-sm text-muted">
        {isGuest ? "You're playing as a guest. This browser remembers you." : `Signed in as ${email}.`}
      </p>
      <ProfileForm
        bioregions={bioregions ?? []}
        initialUsername={profile?.username ?? ""}
        initialBioregion={profile?.bioregion_code ?? ""}
      />
      <div className="mt-10 border-t border-line pt-5 text-sm text-muted">
        {isGuest ? (
          <p>
            Want the same player on another device?{" "}
            <Link href="/login" className="underline">
              Sign in with email
            </Link>
            . Clearing this browser&apos;s data forgets a guest.
          </p>
        ) : (
          <form action={signOut}>
            <button type="submit" className="underline">
              Sign out
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
