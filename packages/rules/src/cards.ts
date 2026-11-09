// PLACEHOLDER cards. These are NOT the official Alpha set - they exist only so
// the engine can be tested before Tommy uploads his card files. Every effect
// kind the engine supports appears at least once. Replace with the real
// Alpha 2 / Alpha 3 library when it lands.

import type { CardDef, CardEffect, CardValue, Colour } from "./types";

const FX: Record<string, CardEffect> = {
  draw1: { timing: "pitch", actions: [{ kind: "draw", n: 1 }], text: "Pitch Effect: draw 1 card." },
  playPlus: { timing: "pitch", actions: [{ kind: "playPlus", n: 1 }], text: "Pitch Effect: Play +1." },
  shrink: {
    timing: "pitch",
    actions: [{ kind: "addCounters", target: "opponentPair", n: -1 }],
    text: "Pitch Effect: put a -1 counter on an opponent's pair.",
  },
  dice: {
    timing: "pitch",
    actions: [{ kind: "rollCounters", target: "anyPair", byFace: [-2, -1, 0, 0, 1, 2] }],
    text: "Pitch Effect: roll a D6 for any pair. 1: -2, 2: -1, 3-4: nothing, 5: +1, 6: +2.",
  },
  grow: {
    timing: "pairing",
    actions: [{ kind: "addCounters", target: "ownPair", n: 1 }],
    text: "Pairing Effect: put a +1 counter on one of your pairs.",
  },
  pairPlay: { timing: "pairing", actions: [{ kind: "playPlus", n: 1 }], text: "Pairing Effect: Play +1." },
  steady: { timing: "ongoing", actions: [{ kind: "valueBonus", n: 1 }], text: "Ongoing Effect: this pair is worth +1." },
  block: { timing: "discardAnytime", actions: [{ kind: "cancel" }], text: "Discard Anytime: cancel an effect." },
};

const COLOUR_PATTERN: (keyof typeof FX | null)[] = [
  null, "draw1", "grow", null, "shrink", "steady", "playPlus", null, "pairPlay", "dice", "block",
];
const WILD_PATTERN: (keyof typeof FX | null)[] = [null, "grow", "draw1", null, "steady"];
const PLAIN: Colour[] = ["red", "orange", "green", "blue", "yellow"];

function build(): CardDef[] {
  const out: CardDef[] = [];
  // Interleave colours so any slice of the deck has an even colour spread.
  for (let i = 0; i < 22; i++) {
    for (const colour of PLAIN) {
      const fx = COLOUR_PATTERN[i % COLOUR_PATTERN.length];
      out.push(make(colour, ((i % 3) + 1) as CardValue, fx, i));
    }
    if (i < 10) {
      const fx = WILD_PATTERN[i % WILD_PATTERN.length];
      out.push(make("purple", ((i % 3) + 1) as CardValue, fx, i));
    }
  }
  return out; // 110 coloured + 10 wild = 120
}

function make(colour: Colour, value: CardValue, fx: keyof typeof FX | null, i: number): CardDef {
  const card: CardDef = {
    id: `placeholder-${colour}-${i + 1}`,
    name: `Placeholder ${colour} ${i + 1}`,
    colour,
    value,
    setCode: "PLACEHOLDER",
  };
  if (fx) card.effect = FX[fx];
  return card;
}

export const PLACEHOLDER_CARDS: readonly CardDef[] = build();

/** A placeholder deck of any size (repeats the 120-card set as copies if needed). */
export function placeholderDeck(size = 120): CardDef[] {
  return Array.from({ length: size }, (_, i) => PLACEHOLDER_CARDS[i % PLACEHOLDER_CARDS.length]);
}
