import { redirect } from "next/navigation";
import { connection } from "next/server";
import { isBackendConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient, currentPlayer, type Bioregion } from "@/lib/supabase/server";
import { ProfileForm } from "./ProfileForm";

/** First stop after sign-in: pick a username and a home bioregion. Also the edit-profile page. */
export default async function WelcomePage() {
  await connection(); // depends on who's signed in: never prerender
  if (!isBackendConfigured()) redirect("/");
  const { email, profile } = await currentPlayer();
  if (!email) redirect("/login");

  const supabase = await createSupabaseServerClient();
  const { data: bioregions } = await supabase
    .from("bioregions")
    .select("code, name, biogeographic_realm")
    .order("name")
    .returns<Bioregion[]>();

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-12">
      <h1 className="text-2xl font-semibold">{profile?.username ? "Your profile" : "Welcome to Turtle Party"}</h1>
      <p className="mt-2 text-sm text-muted">
        Signed in as {email}. Choose the name other players will see, and the bioregion you call home.
      </p>
      <ProfileForm
        bioregions={bioregions ?? []}
        initialUsername={profile?.username ?? ""}
        initialBioregion={profile?.bioregion_code ?? ""}
      />
    </main>
  );
}
