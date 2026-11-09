"use client";

import { useActionState, useState } from "react";
import { setName, type FormState } from "./actions";

/**
 * Type a name and press Play: that's the whole sign-up. Afterwards the box
 * shows your name and a Save button appears only when you change it.
 */
export function NameField({ initial, signedIn }: { initial: string; signedIn: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(setName, { error: null });
  const [value, setValue] = useState(initial);
  const changed = value.trim() !== initial;

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <label htmlFor="topbar-name" className="text-sm text-muted">
        {signedIn ? "Playing as" : "Your name"}
      </label>
      <input
        id="topbar-name"
        name="username"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="e.g. snapper_tom"
        maxLength={20}
        autoComplete="nickname"
        className="w-36 rounded-md border border-line bg-background px-2 py-1 text-sm"
      />
      {(!signedIn || changed) && (
        <button
          type="submit"
          disabled={pending || value.trim().length === 0}
          className="rounded-md bg-shell px-3 py-1 text-sm font-medium text-on-shell disabled:opacity-60"
        >
          {pending ? "..." : signedIn ? "Save" : "Play"}
        </button>
      )}
      {state.error && (
        <span role="alert" className="basis-full text-xs text-danger sm:basis-auto">
          {state.error}
        </span>
      )}
    </form>
  );
}
