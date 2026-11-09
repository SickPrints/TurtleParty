"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isBackendConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface FormState {
  error: string | null;
  sent?: boolean;
  saved?: boolean;
}

const USERNAME = /^[A-Za-z0-9_]{3,20}$/;
const USERNAME_RULE = "Names are 3 to 20 letters, numbers or underscores.";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Guest-first: no sign-up. The first time this browser saves a name it gets
 * its own guest identity (Supabase anonymous sign-in), kept in its cookies,
 * so the browser remembers the player. Row-level security still works
 * because every guest has an id.
 */
async function ensurePlayer(supabase: SupabaseClient): Promise<{ id: string } | { error: string }> {
  const { data } = await supabase.auth.getUser();
  if (data.user) return { id: data.user.id };
  const { data: created, error } = await supabase.auth.signInAnonymously();
  if (error || !created.user) {
    if (error && /anonymous sign-ins are disabled/i.test(error.message)) {
      return { error: "Guest play is switched off in Supabase (Authentication > Sign In / Providers > Allow anonymous sign-ins)." };
    }
    return { error: error?.message ?? "Couldn't start a guest player." };
  }
  return { id: created.user.id };
}

function profileError(code: string | undefined, message: string): string {
  if (code === "23505") return "That name is taken.";
  if (code === "23503") return "That bioregion isn't in the list.";
  return message;
}

/** The top bar's name box: saves the name, starting a guest player if needed. */
export async function setName(_prev: FormState, form: FormData): Promise<FormState> {
  if (!isBackendConfigured()) return { error: "The game isn't connected yet." };
  const username = String(form.get("username") ?? "").trim();
  if (!USERNAME.test(username)) return { error: USERNAME_RULE };

  const supabase = await createSupabaseServerClient();
  const player = await ensurePlayer(supabase);
  if ("error" in player) return { error: player.error };

  const { data: updated, error } = await supabase
    .from("profiles")
    .update({ username })
    .eq("id", player.id)
    .select("id");
  if (error) return { error: profileError(error.code, error.message) };
  // Row-level security matches zero rows rather than erroring; say so instead of pretending it saved.
  if (!updated || updated.length === 0) return { error: "Your name couldn't be saved. Try reloading." };
  revalidatePath("/", "layout");
  return { error: null, saved: true };
}

/** Optional: a one-time link by email, to keep the same player across devices. */
export async function sendMagicLink(_prev: FormState, form: FormData): Promise<FormState> {
  if (!isBackendConfigured()) return { error: "Sign-in isn't set up yet (no Supabase keys in .env.local)." };
  const email = String(form.get("email") ?? "").trim();
  if (!EMAIL.test(email)) return { error: "That doesn't look like an email address." };

  const origin = (await headers()).get("origin") ?? "http://localhost:3100";
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) return { error: error.message };
  return { error: null, sent: true };
}

/** The profile page: name plus an optional home bioregion. */
export async function saveProfile(_prev: FormState, form: FormData): Promise<FormState> {
  const username = String(form.get("username") ?? "").trim();
  const bioregion = String(form.get("bioregion") ?? "") || null; // optional
  if (!USERNAME.test(username)) return { error: USERNAME_RULE };

  const supabase = await createSupabaseServerClient();
  const player = await ensurePlayer(supabase);
  if ("error" in player) return { error: player.error };

  const { data: updated, error } = await supabase
    .from("profiles")
    .update({ username, bioregion_code: bioregion })
    .eq("id", player.id)
    .select("id");
  if (error) return { error: profileError(error.code, error.message) };
  if (!updated || updated.length === 0) return { error: "Your profile couldn't be saved. Try reloading." };
  revalidatePath("/", "layout");
  redirect("/");
}

/** Only offered to email players: a guest who signs out can't get back in. */
export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
