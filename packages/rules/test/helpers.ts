import { applyAction, createGame, placeholderDeck } from "../src";
import type { Action, CardDef, CardEffect, CardValue, Colour, GameEvent, GameState, RuleOptions, RoomSettings } from "../src";

export const card = (id: string, colour: Colour, value: CardValue, effect?: CardEffect): CardDef => {
  const c: CardDef = { id, name: id, colour, value };
  if (effect) c.effect = effect;
  return c;
};

export const fx = {
  draw1: { timing: "pitch", actions: [{ kind: "draw", n: 1 }], text: "draw 1" } as CardEffect,
  playPlus: { timing: "pitch", actions: [{ kind: "playPlus", n: 1 }], text: "Play +1" } as CardEffect,
  shrink: { timing: "pitch", actions: [{ kind: "addCounters", target: "opponentPair", n: -1 }], text: "-1" } as CardEffect,
  dice: {
    timing: "pitch",
    actions: [{ kind: "rollCounters", target: "anyPair", byFace: [-2, -1, 0, 0, 1, 2] }],
    text: "roll",
  } as CardEffect,
  grow: { timing: "pairing", actions: [{ kind: "addCounters", target: "ownPair", n: 1 }], text: "+1" } as CardEffect,
  pairPlay: { timing: "pairing", actions: [{ kind: "playPlus", n: 1 }], text: "Play +1" } as CardEffect,
  steady: { timing: "ongoing", actions: [{ kind: "valueBonus", n: 1 }], text: "+1 while on top" } as CardEffect,
  block: { timing: "discardAnytime", actions: [{ kind: "cancel" }], text: "cancel" } as CardEffect,
  boost: {
    timing: "discardAnytime",
    actions: [{ kind: "addCounters", target: "ownPair", n: 1 }],
    text: "+1 on your pair",
  } as CardEffect,
};

/** Filler cards for the deck: unique ids, no effects. */
export const fillers = (n: number, prefix = "d"): CardDef[] =>
  Array.from({ length: n }, (_, i) => card(`${prefix}${i + 1}`, "blue", 1));

/**
 * A hand-built table: players p1, p2, ... with exactly the hands, deck and pond
 * given. Card uids are the card ids, so tests can name cards directly.
 * p1 is the dealer and takes the first turn.
 */
export function table(
  hands: CardDef[][],
  opts: {
    deck?: CardDef[];
    pond?: CardDef[];
    options?: Partial<RuleOptions>;
    settings?: Partial<RoomSettings>;
  } = {},
): GameState {
  const s = createGame({
    playerIds: hands.map((_, i) => `p${i + 1}`),
    deck: placeholderDeck(60),
    seed: 1,
    options: opts.options,
    settings: opts.settings,
  });
  s.cards = {};
  const reg = (d: CardDef) => {
    if (s.cards[d.id]) throw new Error(`duplicate test card id ${d.id}`);
    s.cards[d.id] = d;
    return d.id;
  };
  s.players.forEach((p, i) => {
    p.hand = hands[i].map(reg);
    p.pairs = [];
  });
  s.deck = (opts.deck ?? fillers(10)).map(reg);
  s.pond = (opts.pond ?? []).map(reg);
  s.dealer = 0;
  s.current = 0;
  s.playsRemaining = 1;
  return s;
}

/** Put a ready-made pair straight into a player's party. */
export function givePair(s: GameState, seat: number, id: string, top: CardDef, bottom: CardDef, counters = 0): void {
  s.cards[top.id] = top;
  s.cards[bottom.id] = bottom;
  s.players[seat].pairs.push({ id, top: top.id, bottom: bottom.id, counters, switchedThisTurn: false });
}

export function run(s: GameState, playerId: string, action: Action): { state: GameState; events: GameEvent[] } {
  const r = applyAction(s, action, playerId);
  if (!r.ok) throw new Error(`${playerId} ${JSON.stringify(action)} refused: ${r.error}`);
  return { state: r.state, events: r.events };
}

export const act = (s: GameState, playerId: string, action: Action): GameState => run(s, playerId, action).state;

export function refused(s: GameState, playerId: string, action: Action): string {
  const r = applyAction(s, action, playerId);
  if (r.ok) throw new Error(`expected ${JSON.stringify(action)} to be refused`);
  return r.error;
}

export const pair = (a: string, b: string, top = a, target?: string): Action =>
  target === undefined ? { type: "pair", cards: [a, b], top } : { type: "pair", cards: [a, b], top, target };
