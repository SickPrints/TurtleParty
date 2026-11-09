"use client";

import { useActionState, useMemo, useState } from "react";
import type { Bioregion } from "@/lib/supabase/server";
import { saveProfile, type FormState } from "../actions";

export function ProfileForm({
  bioregions,
  initialUsername,
  initialBioregion,
}: {
  bioregions: Bioregion[];
  initialUsername: string;
  initialBioregion: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveProfile, { error: null });
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(initialBioregion);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return bioregions;
    return bioregions.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.code.toLowerCase() === q ||
        b.biogeographic_realm.toLowerCase().includes(q),
    );
  }, [bioregions, query]);

  const chosen = bioregions.find((b) => b.code === selected);

  return (
    <form action={action} className="mt-6 flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="username" className="text-sm font-medium">
          Username
        </label>
        <input
          id="username"
          name="username"
          defaultValue={initialUsername}
          required
          minLength={3}
          maxLength={20}
          pattern="[A-Za-z0-9_]{3,20}"
          title="3 to 20 letters, numbers or underscores"
          autoComplete="username"
          className="rounded-md border border-line bg-surface px-3 py-2"
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Home bioregion</legend>
        <input type="hidden" name="bioregion" value={selected} />
        <p className="text-sm">
          {chosen ? (
            <>
              Chosen: <strong>{chosen.name}</strong> <span className="text-muted">({chosen.code})</span>
            </>
          ) : (
            <span className="text-muted">None chosen yet.</span>
          )}
        </p>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search, e.g. Ozarks, prairie, NA22"
          aria-label="Search bioregions"
          className="rounded-md border border-line bg-surface px-3 py-2"
        />
        <ul role="listbox" aria-label="Bioregions" className="max-h-72 overflow-y-auto rounded-md border border-line">
          {matches.map((b) => (
            <li key={b.code} role="option" aria-selected={b.code === selected}>
              <button
                type="button"
                onClick={() => setSelected(b.code)}
                className={`flex w-full justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-pond/10 ${
                  b.code === selected ? "bg-pond/20 font-medium" : ""
                }`}
              >
                <span>{b.name}</span>
                <span className="shrink-0 text-muted">
                  {b.biogeographic_realm} · {b.code}
                </span>
              </button>
            </li>
          ))}
          {matches.length === 0 && <li className="px-3 py-2 text-sm text-muted">No bioregion matches that.</li>}
        </ul>
        <p className="text-xs text-muted">
          Bioregions from{" "}
          <a href="https://www.oneearth.org/bioregion-list/" className="underline" target="_blank" rel="noreferrer">
            One Earth
          </a>
          , Bioregions 2023 (CC BY-NC 4.0).
        </p>
      </fieldset>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-shell px-4 py-2 font-medium text-on-shell disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
