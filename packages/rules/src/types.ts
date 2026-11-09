// Core data types for the Turtle Party rules engine.
// Everything here is plain JSON-safe data so a game state can be sent over a
// socket, snapshotted to Postgres, and replayed from seed + action log.

export type Colour = "red" | "orange" | "green" | "blue" | "yellow" | "purple"; // purple = Wild
export type CardValue = 1 | 2 | 3;
export type EffectTiming = "pairing" | "pitch" | "ongoing" | "discardAnytime";

/** Which pairs an effect may target. The player picks the exact pair when they make the play. */
export type PairTarget = "ownPair" | "opponentPair" | "anyPair";

/**
 * One step of a card effect, stored as data so the server can enforce it.
 * The printed wording lives in CardEffect.text; this is what the engine runs.
 * An effect with several targeted steps uses ONE chosen target for all of them.
 */
export type EffectAction =
  | { kind: "playPlus"; n: number } // "Play +n" for the turn player
  | { kind: "draw"; n: number } // the effect's controller draws n
  | { kind: "addCounters"; target: PairTarget; n: number } // +n / -n counters on a pair
  | { kind: "rollCounters"; target: PairTarget; byFace: [number, number, number, number, number, number] } // roll a D6, counters by face
  | { kind: "cancel" } // Discard Anytime: cancel the effect it responds to
  | { kind: "valueBonus"; n: number } // Ongoing: this pair is worth +n
  | { kind: "custom"; handler: string }; // cards that need code (Darthy Turtle, Flipsy) - not yet implemented

export interface CardEffect {
  timing: EffectTiming;
  actions: EffectAction[];
  text: string;
}

export interface CardDef {
  id: string;
  name: string;
  colour: Colour;
  value: CardValue;
  effect?: CardEffect;
  setCode?: string;
}

/**
 * Rule questions the rulebook doesn't settle yet. Each is a switch so Tommy's
 * answer is a one-line change. Defaults are the engine's best guess.
 */
export interface RuleOptions {
  handSize: number;
  /** Can a card WITHOUT a Pitch Effect be pitched (e.g. to clear a dead card)? */
  pitchWithoutEffect: boolean;
  /** Is an Ongoing Effect active only while its card is the top card of a colour pair? */
  ongoingOnlyWhileTop: boolean;
  /** Does switching which card is on top fire the new top card's Pairing Effect? */
  switchTopTriggersPairing: boolean;
  /** Tie-breaker for the final score. "shared" = everyone tied for most points wins. */
  tieBreaker: "shared" | "mostPairs" | "fewestPairs";
}

/** Room settings players choose in the lobby (playtest both ways). */
export interface RoomSettings {
  /** Purple Wild cards use the scratchy back, so opponents can count wilds in hand. */
  markedWilds: boolean;
  /** Everyone can see the back of the top card of the Central Deck. */
  showDeckTop: boolean;
}

export interface Pair {
  id: string;
  top: string; // card uid
  bottom: string; // card uid
  counters: number; // net +/- counters on the pair
  switchedThisTurn: boolean;
}

export interface PlayerState {
  id: string;
  hand: string[]; // card uids
  pairs: Pair[]; // the player's party
  /** Response-window "Auto-pass" box. Checked by default. */
  autoPass: boolean;
}

/** An effect waiting to resolve. Later items (responses) resolve first. */
export interface StackItem {
  id: string;
  controller: number; // seat index
  source: string; // card uid whose effect this is
  timing: EffectTiming;
  target?: string; // pair id
  respondsTo?: string; // stack item id this was played in response to
  cancelled: boolean;
}

export interface GameState {
  version: 1;
  options: RuleOptions;
  settings: RoomSettings;
  /** Every card in this game, by uid. Copies of one card get separate uids. */
  cards: Record<string, CardDef>;
  players: PlayerState[];
  deck: string[]; // Central Deck, index 0 = top
  pond: string[]; // Pitch Pond, face up
  dealer: number;
  current: number; // seat whose turn it is
  playsRemaining: number;
  turnNumber: number;
  stack: StackItem[];
  passed: string[]; // player ids who passed on the top stack item
  /** Set when the last card is drawn: how many final turns are left. */
  finalTurnsLeft: number | null;
  currentTurnIsFinal: boolean;
  status: "playing" | "finished";
  winners: string[];
  rng: number; // seeded generator state
  nextId: number;
}

export type Action =
  | { type: "pitch"; card: string; target?: string }
  | { type: "pair"; cards: [string, string]; top: string; target?: string }
  | { type: "switchTop"; pairId: string; target?: string }
  | { type: "discardAnytime"; card: string; target?: string }
  | { type: "pass" }
  | { type: "setAutoPass"; value: boolean }
  | { type: "endTurn" };

export type GameEvent = { type: string } & Record<string, unknown>;

export type ActionResult =
  | { ok: true; state: GameState; events: GameEvent[] }
  | { ok: false; error: string };

export interface GameConfig {
  playerIds: string[];
  deck: CardDef[];
  seed: number;
  options?: Partial<RuleOptions>;
  settings?: Partial<RoomSettings>;
}

export interface LoggedAction {
  playerId: string;
  action: Action;
}
