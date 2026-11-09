import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, isBackendConfigured } from "@/lib/supabase/env";

/**
 * Next 16 renamed middleware to proxy. This authorizes nothing: it only
 * refreshes an expiring Supabase session and writes the rotated cookie back.
 * Access rules live in row-level security, not here.
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  if (!isBackendConfigured()) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });
  // getUser() (not getSession()) is the call that checks the token and refreshes it.
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)"],
};
