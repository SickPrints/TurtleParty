"use client";

import { useActionState } from "react";
import { sendMagicLink, type FormState } from "../actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(sendMagicLink, { error: null });

  if (state.sent) {
    return (
      <p className="mt-6 rounded-md bg-pond/15 p-4">
        Check your email for a sign-in link. Open it in this browser.
      </p>
    );
  }
  return (
    <form action={action} className="mt-6 flex flex-col gap-3">
      <label htmlFor="email" className="text-sm font-medium">
        Email
      </label>
      <input
        id="email"
        name="email"
        type="email"
        required
        autoComplete="email"
        className="rounded-md border border-line bg-surface px-3 py-2"
      />
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-shell px-4 py-2 font-medium text-on-shell disabled:opacity-60"
      >
        {pending ? "Sending..." : "Email me a sign-in link"}
      </button>
    </form>
  );
}
