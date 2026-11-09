// Every legal action for one player right now. The browser uses this to grey
// out illegal moves; the test bot uses it to play whole games. It goes
// through validateAction, so it can never disagree with the server.

import type { Action, GameState } from "./types";
import { NEEDS_TARGET, THIS_PAIR, awaitingResponse, canPair, validateAction } from "./engine";

export function legalActions(s: GameState, playerId: string): Action[] {
  const out: Action[] = [];
  const p = s.players.find((x) => x.id === playerId);
  if (!p || s.status !== "playing") return out;

  const pairIds = s.players.flatMap((pl) => pl.pairs.map((pair) => pair.id));
  const targets = [...pairIds, THIS_PAIR];

  // Try the action bare; only if it needs a target, try each possible one.
  const consider = (base: Action) => {
    const err = validateAction(s, base, playerId);
    if (err === null) out.push(base);
    else if (err === NEEDS_TARGET) {
      for (const target of targets) {
        const withTarget = { ...base, target } as Action;
        if (validateAction(s, withTarget, playerId) === null) out.push(withTarget);
      }
    }
  };

  if (awaitingResponse(s).includes(playerId)) out.push({ type: "pass" });
  for (const card of p.hand) consider({ type: "discardAnytime", card });

  const isTurn = s.players[s.current].id === playerId && s.stack.length === 0;
  if (!isTurn) return out;

  out.push({ type: "endTurn" });
  for (const pair of p.pairs) consider({ type: "switchTop", pairId: pair.id });
  if (s.playsRemaining < 1) return out;

  for (const card of p.hand) consider({ type: "pitch", card });
  const partners = [...p.hand, ...s.pond];
  for (const [i, a] of p.hand.entries()) {
    for (const [j, b] of partners.entries()) {
      if (j < p.hand.length && j <= i) continue; // each hand+hand pair once
      if (!canPair(s.cards[a], s.cards[b])) continue;
      consider({ type: "pair", cards: [a, b], top: a });
      consider({ type: "pair", cards: [a, b], top: b });
    }
  }
  return out;
}
