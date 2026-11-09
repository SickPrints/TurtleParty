// What one player is allowed to see. The server holds the full state and sends
// each player only this: their own hand, opponents' hand sizes (and card backs),
// the deck count, every party, and the whole Pitch Pond face up.

import type { CardDef, GameState, RoomSettings } from "./types";
import { awaitingResponse, isColourPair, pairValue, scores } from "./engine";

export type CardBack = "scratchy" | "clean";
export interface CardView extends CardDef {
  uid: string;
}

export interface PairView {
  id: string;
  top: CardView;
  bottom: CardView;
  counters: number;
  value: number;
  colourPair: boolean;
  switchedThisTurn: boolean;
}

export interface PlayerView {
  you: string;
  hand: CardView[];
  players: {
    id: string;
    handCount: number;
    handBacks: CardBack[];
    autoPass: boolean;
    score: number;
    pairs: PairView[];
  }[];
  deckCount: number;
  deckTopBack: CardBack | null;
  pond: CardView[];
  current: string;
  playsRemaining: number;
  stack: { id: string; controller: string; source: CardView; target: string | null; cancelled: boolean }[];
  awaiting: string[];
  status: GameState["status"];
  winners: string[];
  finalTurnsLeft: number | null;
  settings: RoomSettings;
}

/** Card back rule: purple Wilds use the scratchy back when "Marked wilds" is on. */
export function backOf(s: GameState, uid: string): CardBack {
  return s.settings.markedWilds && s.cards[uid].colour === "purple" ? "scratchy" : "clean";
}

function card(s: GameState, uid: string): CardView {
  return { uid, ...s.cards[uid] };
}

export function viewFor(s: GameState, playerId: string): PlayerView {
  const me = s.players.find((p) => p.id === playerId);
  const totals = scores(s);
  return {
    you: playerId,
    hand: me ? me.hand.map((uid) => card(s, uid)) : [],
    players: s.players.map((p) => ({
      id: p.id,
      handCount: p.hand.length,
      handBacks: p.hand.map((uid) => backOf(s, uid)),
      autoPass: p.autoPass,
      score: totals[p.id],
      pairs: p.pairs.map((pair) => ({
        id: pair.id,
        top: card(s, pair.top),
        bottom: card(s, pair.bottom),
        counters: pair.counters,
        value: pairValue(s, pair),
        colourPair: isColourPair(s.cards[pair.top], s.cards[pair.bottom]),
        switchedThisTurn: pair.switchedThisTurn,
      })),
    })),
    deckCount: s.deck.length,
    deckTopBack: s.settings.showDeckTop && s.deck.length > 0 ? backOf(s, s.deck[0]) : null,
    pond: s.pond.map((uid) => card(s, uid)),
    current: s.players[s.current].id,
    playsRemaining: s.playsRemaining,
    stack: s.stack.map((item) => ({
      id: item.id,
      controller: s.players[item.controller].id,
      source: card(s, item.source),
      target: item.target ?? null,
      cancelled: item.cancelled,
    })),
    awaiting: awaitingResponse(s),
    status: s.status,
    winners: s.winners,
    finalTurnsLeft: s.finalTurnsLeft,
    settings: s.settings,
  };
}
