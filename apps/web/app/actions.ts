"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isBackendConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface FormState {
  error: string | null;
  sent?: boolean;
}

const USERNAME = /^[A-Za-z0-9_]{3,20}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Sign-in is a one-time link by email: no passwords to forget or leak. */
export async function sendMagicLink(_prev: FormState, form: FormData): Promise<FormState> {
  if (!isBackendConfigured()) return { error: "Sign-in isn't set up yet (no Supabase keys in .env.local)." };
  const email = String(form.get("email") ?? "").trim();
  if (!EMAIL.test(email)) return { error: "That doesn't look like an email address." };

  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) return { error: error.message };
  return { error: null, sent: true };
}

export async function saveProfile(_prev: FormState, form: FormData): Promise<FormState> {
  const username = String(form.get("username") ?? "").trim();
  const bioregion = String(form.get("bioregion") ?? "");
  if (!USERNAME.test(username)) return { error: "Usernames are 3 to 20 letters, numbers or underscores." };
  if (!bioregion) return { error: "Pick your home bioregion." };

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const { data: updated, error } = await supabase
    .from("profiles")
    .update({ username, bioregion_code: bioregion })
    .eq("id", data.user.id)
    .select("id");
  if (error) {
    if (error.code === "23505") return { error: "That username is taken." };
    if (error.code === "23503") return { error: "That bioregion isn't in the list." };
    return { error: error.message };
  }
  // RLS silently matches zero rows rather than erroring; say so instead of pretending it saved.
  if (!updated || updated.length === 0) return { error: "Your profile couldn't be saved. Try signing in again." };
  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
