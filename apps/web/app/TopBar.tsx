import Link from "next/link";
import { isBackendConfigured } from "@/lib/supabase/env";
import { currentPlayer } from "@/lib/supabase/server";
import { NameField } from "./NameField";

/** On every page: the game's name, your name, and your home bioregion. */
export async function TopBar() {
  const configured = isBackendConfigured();
  const player = configured ? await currentPlayer() : null;
  const signedIn = player?.signedIn ?? false;

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
        <Link href="/" className="font-semibold tracking-tight">
          Turtle Party
        </Link>
        {configured && (
          <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-2">
            <NameField key={player?.profile?.username ?? ""} initial={player?.profile?.username ?? ""} signedIn={signedIn} />
            {signedIn && (
              <Link href="/profile" className="text-sm text-muted underline-offset-2 hover:underline">
                {player?.bioregion ? player.bioregion.name : "Pick home bioregion"}
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
