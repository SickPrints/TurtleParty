// The Turtle Party rules engine.
//
// applyAction(state, action, playerId) is the one door: it either refuses the
// move with a plain-language reason, or returns the new state plus events the
// UI can animate. It never mutates the state it was given.
//
// The nine rulebook rules are marked "Rule N" where they are enforced.

import type {
  Action,
  ActionResult,
  CardDef,
  CardEffect,
  GameConfig,
  GameEvent,
  GameState,
  LoggedAction,
  Pair,
  PairTarget,
  PlayerState,
  RoomSettings,
  RuleOptions,
  StackItem,
} from "./types";
import { randomInt, rollD6, shuffleInPlace } from "./rng";

export const DEFAULT_OPTIONS: RuleOptions = {
  handSize: 5,
  pitchWithoutEffect: false,
  ongoingOnlyWhileTop: true,
  switchTopTriggersPairing: false,
  tieBreaker: "shared",
  endGame: "immediately",
};

export const DEFAULT_SETTINGS: RoomSettings = {
  markedWilds: true,
  showDeckTop: true,
};

/** Target value meaning "the pair this play is creating" (for Pairing Effects). */
export const THIS_PAIR = "this";
export const NEEDS_TARGET = "Choose a target pair for this effect.";

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;

// ---------------------------------------------------------------- setup (Rule 1)

export function createGame(config: GameConfig): GameState {
  const n = config.playerIds.length;
  if (n < MIN_PLAYERS || n > MAX_PLAYERS) {
    throw new Error(`Turtle Party needs ${MIN_PLAYERS} to ${MAX_PLAYERS} players (got ${n}).`);
  }
  if (new Set(config.playerIds).size !== n) throw new Error("Player ids must be unique.");
  const options = { ...DEFAULT_OPTIONS, ...config.options };
  const settings = { ...DEFAULT_SETTINGS, ...config.settings };
  if (config.deck.length < n * options.handSize) {
    throw new Error(`The deck needs at least ${n * options.handSize} cards to deal.`);
  }

  const cards: Record<string, CardDef> = {};
  const deck = config.deck.map((def, i) => {
    const uid = `c${i + 1}`;
    cards[uid] = def;
    return uid;
  });

  const s: GameState = {
    version: 1,
    options,
    settings,
    cards,
    players: config.playerIds.map((id) => ({ id, hand: [], pairs: [], autoPass: true })),
    deck,
    pond: [],
    dealer: 0,
    current: 0,
    playsRemaining: 1,
    turnNumber: 1,
    stack: [],
    passed: [],
    finalTurnsLeft: null,
    currentTurnIsFinal: false,
    status: "playing",
    winners: [],
    rng: config.seed >>> 0,
    nextId: 1,
  };

  shuffleInPlace(s, s.deck);
  s.dealer = randomInt(s, n);
  // Turns go clockwise from the dealer: the dealer takes the first turn.
  s.current = s.dealer;
  // Deal one at a time, clockwise, starting left of the dealer.
  for (let round = 0; round < options.handSize; round++) {
    for (let k = 1; k <= n; k++) s.players[(s.dealer + k) % n].hand.push(s.deck.shift()!);
  }
  if (s.deck.length === 0) {
    // The deal itself used every card, so nobody "drew the last card": in either
    // endGame mode, everyone gets one turn. Only happens with a tiny test deck.
    s.finalTurnsLeft = n;
    s.currentTurnIsFinal = true;
  }
  return s;
}

// ---------------------------------------------------------------- the one door

export function applyAction(state: GameState, action: Action, playerId: string): ActionResult {
  const error = validateAction(state, action, playerId);
  if (error) return { ok: false, error };
  const s = structuredClone(state);
  const events: GameEvent[] = [];
  execute(s, action, seatOf(s, playerId), events);
  return { ok: true, state: s, events };
}

/** Rebuild a game from its config and action log (testing, disputes, reconnects). */
export function replay(config: GameConfig, log: LoggedAction[]): GameState {
  let s = createGame(config);
  for (const [i, entry] of log.entries()) {
    const r = applyAction(s, entry.action, entry.playerId);
    if (!r.ok) throw new Error(`Replay failed at action ${i}: ${r.error}`);
    s = r.state;
  }
  return s;
}

/** Returns null if the action is legal, otherwise the reason it isn't. */
export function validateAction(s: GameState, action: Action, playerId: string): string | null {
  if (s.status !== "playing") return "The game is over.";
  const pi = seatOf(s, playerId);
  if (pi < 0) return "You are not seated at this table.";
  const p = s.players[pi];

  // Actions any player may take, on any turn.
  if (action.type === "setAutoPass") return null;
  if (action.type === "pass") {
    return awaitingResponse(s).includes(playerId) ? null : "Nothing is waiting on you.";
  }
  if (action.type === "discardAnytime") {
    // Rule 6: any turn, no play used, including in response to an effect.
    if (!p.hand.includes(action.card)) return "That card is not in your hand.";
    const effect = s.cards[action.card].effect;
    if (effect?.timing !== "discardAnytime") return "That card is not a Discard Anytime card.";
    if (s.stack.length > 0 && s.passed.includes(playerId)) return "You already passed on this effect.";
    // Rule 6: once an effect or dice roll has resolved, it's too late to answer it.
    if (s.stack.length === 0 && effect.actions.some((a) => a.kind === "cancel")) {
      return "There is no effect to respond to.";
    }
    return checkTarget(s, pi, effect, true, action.target, false);
  }

  // Everything else is the turn player's, and waits for the response window.
  if (pi !== s.current) return "It is not your turn.";
  if (s.stack.length > 0) return "Wait for the current effect to resolve.";

  if (action.type === "endTurn") return null; // Rule 8: you may stop any time.

  if (action.type === "switchTop") {
    // Rule 4: once per turn per pair, switch the top card for free.
    const found = locatePair(s, action.pairId);
    if (!found || found.owner !== pi) return "That is not one of your pairs.";
    if (found.pair.switchedThisTurn) return "You already switched this pair this turn.";
    const newTop = s.cards[found.pair.bottom];
    const fires =
      s.options.switchTopTriggersPairing &&
      isColourPair(newTop, s.cards[found.pair.top]) &&
      newTop.effect?.timing === "pairing";
    return checkTarget(s, pi, newTop.effect, fires, action.target, false);
  }

  // Rule 2: one play per turn, plus extra plays from effects.
  if (s.playsRemaining < 1) return "You have no plays left this turn.";

  if (action.type === "pitch") {
    // Rule 3: pitch a card with a Pitch Effect into the Pond; its effect fires.
    if (!p.hand.includes(action.card)) return "That card is not in your hand.";
    const effect = s.cards[action.card].effect;
    const hasPitch = effect?.timing === "pitch";
    if (!hasPitch && !s.options.pitchWithoutEffect) return "Only a card with a Pitch Effect can be pitched.";
    return checkTarget(s, pi, effect, hasPitch, action.target, false);
  }

  if (action.type === "pair") {
    // Rule 3: two from hand, or one from hand plus any card in the Pitch Pond.
    const [a, b] = action.cards;
    if (a === b) return "Pick two different cards.";
    const za = zoneOf(s, p, a);
    const zb = zoneOf(s, p, b);
    if (!za || !zb) return "Both cards must come from your hand or the Pitch Pond.";
    if (za === "pond" && zb === "pond") return "At least one card must come from your hand.";
    if (action.top !== a && action.top !== b) return "The top card must be one of the two cards.";
    if (!canPair(s.cards[a], s.cards[b])) return "A pair needs two cards of the same colour or the same value.";
    const top = s.cards[action.top];
    const bottom = s.cards[action.top === a ? b : a];
    // Rule 4 vs Rule 5: only a colour pair fires the top card's Pairing Effect.
    const fires = isColourPair(top, bottom) && top.effect?.timing === "pairing";
    return checkTarget(s, pi, top.effect, fires, action.target, true);
  }

  return "Unknown action.";
}

// ---------------------------------------------------------------- doing it

function execute(s: GameState, action: Action, pi: number, events: GameEvent[]): void {
  const p = s.players[pi];
  switch (action.type) {
    case "setAutoPass":
      p.autoPass = action.value;
      events.push({ type: "autoPassChanged", player: p.id, value: action.value });
      break;

    case "pass":
      s.passed.push(p.id);
      events.push({ type: "passed", player: p.id });
      break;

    case "discardAnytime":
      remove(p.hand, action.card);
      s.pond.push(action.card);
      events.push({ type: "discardAnytime", player: p.id, card: action.card });
      pushEffect(s, pi, action.card, action.target, s.stack[s.stack.length - 1]?.id, events);
      break;

    case "pitch": {
      remove(p.hand, action.card);
      s.pond.push(action.card);
      s.playsRemaining--;
      events.push({ type: "pitched", player: p.id, card: action.card });
      if (s.cards[action.card].effect?.timing === "pitch") {
        pushEffect(s, pi, action.card, action.target, undefined, events);
      }
      break;
    }

    case "pair": {
      const [a, b] = action.cards;
      for (const uid of [a, b]) if (!remove(p.hand, uid)) remove(s.pond, uid);
      const pair: Pair = {
        id: newId(s, "p"),
        top: action.top,
        bottom: action.top === a ? b : a,
        counters: 0,
        switchedThisTurn: false,
      };
      p.pairs.push(pair);
      s.playsRemaining--;
      events.push({ type: "paired", player: p.id, pair: pair.id, top: pair.top, bottom: pair.bottom });
      const top = s.cards[pair.top];
      if (isColourPair(top, s.cards[pair.bottom]) && top.effect?.timing === "pairing") {
        const target = action.target === THIS_PAIR ? pair.id : action.target;
        pushEffect(s, pi, pair.top, target, undefined, events);
      }
      break;
    }

    case "switchTop": {
      const { pair } = locatePair(s, action.pairId)!;
      [pair.top, pair.bottom] = [pair.bottom, pair.top];
      pair.switchedThisTurn = true;
      events.push({ type: "switchedTop", player: p.id, pair: pair.id, top: pair.top });
      const top = s.cards[pair.top];
      if (
        s.options.switchTopTriggersPairing &&
        isColourPair(top, s.cards[pair.bottom]) &&
        top.effect?.timing === "pairing"
      ) {
        pushEffect(s, pi, pair.top, action.target, undefined, events);
      }
      break;
    }

    case "endTurn":
      endTurn(s, events);
      return;
  }
  settle(s, events);
}

function pushEffect(
  s: GameState,
  controller: number,
  source: string,
  target: string | undefined,
  respondsTo: string | undefined,
  events: GameEvent[],
): void {
  const item: StackItem = {
    id: newId(s, "e"),
    controller,
    source,
    timing: s.cards[source].effect!.timing,
    cancelled: false,
  };
  if (target !== undefined) item.target = target;
  if (respondsTo !== undefined) item.respondsTo = respondsTo;
  s.stack.push(item);
  s.passed = []; // a new effect opens a fresh response window
  events.push({ type: "effectTriggered", effect: item.id, source, target: target ?? null });
}

/**
 * The response window. Resolve the newest effect whenever nobody is holding
 * the table up; stop as soon as someone (Auto-pass unchecked, holding a
 * Discard Anytime card, not yet passed) has to answer.
 */
function settle(s: GameState, events: GameEvent[]): void {
  while (s.status === "playing" && s.stack.length > 0 && awaitingResponse(s).length === 0) {
    const item = s.stack.pop()!;
    s.passed = [];
    resolve(s, item, events);
    if (s.status !== "playing") return; // the last card was drawn mid-effect
    checkSplits(s, events);
  }
}

function resolve(s: GameState, item: StackItem, events: GameEvent[]): void {
  if (item.cancelled) {
    events.push({ type: "effectCancelled", effect: item.id, source: item.source });
    return;
  }
  const effect = s.cards[item.source].effect!;
  const target = item.target !== undefined ? locatePair(s, item.target)?.pair : undefined;
  for (const a of effect.actions) {
    switch (a.kind) {
      case "playPlus":
        if (item.controller === s.current) s.playsRemaining += a.n;
        break;
      case "draw":
        drawCards(s, item.controller, a.n, events);
        if (s.status !== "playing") return; // game over: the rest of the effect never happens
        break;
      case "addCounters":
        if (target) {
          target.counters += a.n;
          events.push({ type: "counters", pair: target.id, change: a.n });
        }
        break;
      case "rollCounters": {
        const face = rollD6(s);
        events.push({ type: "diceRolled", face, player: s.players[item.controller].id });
        if (target) {
          const change = a.byFace[face - 1];
          target.counters += change;
          events.push({ type: "counters", pair: target.id, change });
        }
        break;
      }
      case "cancel": {
        const victim = s.stack.find((x) => x.id === item.respondsTo);
        if (victim) victim.cancelled = true;
        break;
      }
      case "valueBonus":
        break; // Ongoing: read live by pairValue()
      case "custom":
        events.push({ type: "customEffectNotImplemented", handler: a.handler, source: item.source });
        break;
    }
  }
  events.push({ type: "effectResolved", effect: item.id, source: item.source });
}

/** Rule 7: a pair worth 0 or less splits into the Pitch Pond; its counters go with it. */
function checkSplits(s: GameState, events: GameEvent[]): void {
  for (const pl of s.players) {
    for (const pair of [...pl.pairs]) {
      if (pairValue(s, pair) <= 0) {
        remove(pl.pairs, pair);
        s.pond.push(pair.top, pair.bottom);
        events.push({ type: "pairSplit", player: pl.id, pair: pair.id, cards: [pair.top, pair.bottom] });
      }
    }
  }
}

/** Draw from the top of the Central Deck. An empty deck just stops the draw. */
function drawCards(s: GameState, seat: number, n: number, events: GameEvent[]): void {
  const p = s.players[seat];
  let drawn = 0;
  for (let i = 0; i < n && s.deck.length > 0; i++) {
    p.hand.push(s.deck.shift()!);
    drawn++;
    if (s.deck.length === 0 && s.finalTurnsLeft === null) {
      events.push({ type: "lastCardDrawn", player: p.id });
      // Rule 9, "lastTurns": every player gets one last turn, starting with the next player.
      if (s.options.endGame === "lastTurns") s.finalTurnsLeft = s.players.length;
    }
  }
  if (drawn > 0) events.push({ type: "drew", player: p.id, count: drawn });
  // Rule 9, "immediately": drawing the last card ends the game on the spot.
  if (s.options.endGame === "immediately" && drawn > 0 && s.deck.length === 0 && s.finalTurnsLeft === null) {
    finish(s, events);
  }
}

/** Rule 8: draw back up to handsize, then play passes clockwise. */
function endTurn(s: GameState, events: GameEvent[]): void {
  const p = s.players[s.current];
  drawCards(s, s.current, Math.max(0, s.options.handSize - p.hand.length), events);
  if (s.status !== "playing") return; // drawing up took the last card
  events.push({ type: "turnEnded", player: p.id });

  if (s.currentTurnIsFinal) s.finalTurnsLeft!--;
  if (s.finalTurnsLeft === 0) {
    finish(s, events);
    return;
  }
  s.current = (s.current + 1) % s.players.length;
  s.playsRemaining = 1;
  s.turnNumber++;
  s.currentTurnIsFinal = s.finalTurnsLeft !== null;
  for (const pair of s.players[s.current].pairs) pair.switchedThisTurn = false;
  events.push({ type: "turnStarted", player: s.players[s.current].id, final: s.currentTurnIsFinal });
}

/** Rule 9: highest total party points wins. */
function finish(s: GameState, events: GameEvent[]): void {
  checkSplits(s, events); // Rule 7 still applies to a pair knocked to 0 just before the end
  const totals = scores(s);
  const best = Math.max(...s.players.map((p) => totals[p.id]));
  let leaders = s.players.filter((p) => totals[p.id] === best);
  if (leaders.length > 1 && s.options.tieBreaker !== "shared") {
    const counts = leaders.map((p) => p.pairs.length);
    const pick = s.options.tieBreaker === "mostPairs" ? Math.max(...counts) : Math.min(...counts);
    leaders = leaders.filter((p) => p.pairs.length === pick);
  }
  s.status = "finished";
  s.winners = leaders.map((p) => p.id);
  events.push({ type: "gameOver", winners: s.winners, scores: totals });
}

// ---------------------------------------------------------------- queries

/** Rule 7: the two card values added, plus counters, plus any active Ongoing bonus. */
export function pairValue(s: GameState, pair: Pair): number {
  const top = s.cards[pair.top];
  const bottom = s.cards[pair.bottom];
  let value = top.value + bottom.value + pair.counters;
  if (isColourPair(top, bottom)) {
    const sources = s.options.ongoingOnlyWhileTop ? [top] : [top, bottom];
    for (const card of sources) {
      if (card.effect?.timing !== "ongoing") continue;
      for (const a of card.effect.actions) if (a.kind === "valueBonus") value += a.n;
    }
  }
  return value;
}

export function scores(s: GameState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of s.players) out[p.id] = p.pairs.reduce((sum, pair) => sum + pairValue(s, pair), 0);
  return out;
}

/** Rule 4: same colour, and purple Wild cards are every colour. */
export function isColourPair(a: CardDef, b: CardDef): boolean {
  return a.colour === b.colour || a.colour === "purple" || b.colour === "purple";
}

/** Rule 4 or Rule 5: a legal pair is a colour pair or a number pair. */
export function canPair(a: CardDef, b: CardDef): boolean {
  return isColourPair(a, b) || a.value === b.value;
}

/** Players the table is waiting on right now (the response window). */
export function awaitingResponse(s: GameState): string[] {
  if (s.stack.length === 0 || s.status !== "playing") return [];
  return s.players
    .filter((p) => !p.autoPass && !s.passed.includes(p.id) && holdsDiscardAnytime(s, p))
    .map((p) => p.id);
}

export function holdsDiscardAnytime(s: GameState, p: PlayerState): boolean {
  return p.hand.some((uid) => s.cards[uid].effect?.timing === "discardAnytime");
}

export function locatePair(s: GameState, pairId: string): { owner: number; pair: Pair } | undefined {
  for (const [owner, pl] of s.players.entries()) {
    const pair = pl.pairs.find((x) => x.id === pairId);
    if (pair) return { owner, pair };
  }
  return undefined;
}

export function targetKindOf(effect: CardEffect | undefined): PairTarget | undefined {
  for (const a of effect?.actions ?? []) {
    if (a.kind === "addCounters" || a.kind === "rollCounters") return a.target;
  }
  return undefined;
}

export function validTargets(s: GameState, controller: number, kind: PairTarget): string[] {
  const out: string[] = [];
  s.players.forEach((pl, seat) => {
    const mine = seat === controller;
    if (kind === "anyPair" || (kind === "ownPair") === mine) for (const pair of pl.pairs) out.push(pair.id);
  });
  return out;
}

// ---------------------------------------------------------------- helpers

function checkTarget(
  s: GameState,
  controller: number,
  effect: CardEffect | undefined,
  fires: boolean,
  target: string | undefined,
  allowThisPair: boolean,
): string | null {
  const kind = fires ? targetKindOf(effect) : undefined;
  if (!kind) return target === undefined ? null : "This play takes no target.";
  const options = validTargets(s, controller, kind);
  if (allowThisPair && kind !== "opponentPair") options.push(THIS_PAIR);
  if (options.length === 0) return target === undefined ? null : "There is no valid target for this effect.";
  if (target === undefined) return NEEDS_TARGET;
  return options.includes(target) ? null : "That pair is not a valid target for this effect.";
}

function seatOf(s: GameState, playerId: string): number {
  return s.players.findIndex((p) => p.id === playerId);
}

function zoneOf(s: GameState, p: PlayerState, uid: string): "hand" | "pond" | null {
  if (p.hand.includes(uid)) return "hand";
  if (s.pond.includes(uid)) return "pond";
  return null;
}

function remove<T>(list: T[], item: T): boolean {
  const i = list.indexOf(item);
  if (i < 0) return false;
  list.splice(i, 1);
  return true;
}

function newId(s: GameState, prefix: string): string {
  return `${prefix}${s.nextId++}`;
}
