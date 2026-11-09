import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { cache } from "react";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env";

/**
 * A Supabase client acting as whoever holds the session cookie, so every
 * query is subject to the row-level security policies in supabase/migrations.
 * Next 16: cookies() is async, so this is too.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Server Components can't write cookies. The refreshed cookie is
          // written by proxy.ts or the next action instead (the documented
          // @supabase/ssr pattern).
        }
      },
    },
  });
}

export interface Profile {
  id: string;
  username: string | null;
  bioregion_code: string | null;
}

export interface Bioregion {
  code: string;
  name: string;
  biogeographic_realm: string;
}

export interface CurrentPlayer {
  signedIn: boolean;
  /** A guest: anonymous sign-in, no email attached. */
  isGuest: boolean;
  email: string | null;
  profile: Profile | null;
  bioregion: Bioregion | null;
}

/** The current player (guest or email) and their profile. Cached per request (top bar + page). */
export const currentPlayer = cache(async (): Promise<CurrentPlayer> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { signedIn: false, isGuest: false, email: null, profile: null, bioregion: null };
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, bioregion_code")
    .eq("id", data.user.id)
    .maybeSingle<Profile>();
  let bioregion: Bioregion | null = null;
  if (profile?.bioregion_code) {
    const { data: b } = await supabase
      .from("bioregions")
      .select("code, name, biogeographic_realm")
      .eq("code", profile.bioregion_code)
      .maybeSingle<Bioregion>();
    bioregion = b ?? null;
  }
  return {
    signedIn: true,
    isGuest: data.user.is_anonymous === true,
    email: data.user.email ?? null,
    profile: profile ?? null,
    bioregion,
  };
});
