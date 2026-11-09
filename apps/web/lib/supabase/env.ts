// Supabase settings, read from the environment (apps/web/.env.local).
// Imports nothing, so proxy.ts can use it without pulling in next/headers.

function firstEnv(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.length > 0) return value;
  }
  return "";
}

export const SUPABASE_URL = firstEnv("NEXT_PUBLIC_SUPABASE_URL");

/** Browser-safe. Row-level security is what makes it safe; it grants nothing by itself. */
export const SUPABASE_PUBLISHABLE_KEY = firstEnv(
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
);

/** Missing keys must mean "you can't sign in yet", never a crashed page. */
export function isBackendConfigured(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_PUBLISHABLE_KEY.length > 0;
}
