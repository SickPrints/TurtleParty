// One block per rulebook rule, plus the digital-only rules.

import { describe, expect, it } from "vitest";
import { applyAction, awaitingResponse, bundleSizes, createGame, pairValue, placeholderDeck, rollD6, viewFor } from "../src";
import { act, card, fillers, fx, givePair, pair, refused, run, table } from "./helpers";
import type { CardEffect } from "../src";

describe("Rule 1: setup", () => {
  it("deals 5 cards to each of 4 players and the dealer starts", () => {
    const s = createGame({ playerIds: ["a", "b", "c", "d"], deck: placeholderDeck(120), seed: 42 });
    expect(s.players.map((p) => p.hand.length)).toEqual([5, 5, 5, 5]);
    expect(s.deck.length).toBe(100);
    expect(s.current).toBe(s.dealer);
    expect(s.playsRemaining).toBe(1);
  });

  it("supports 2 to 6 players and refuses 1 or 7", () => {
    for (let n = 2; n <= 6; n++) {
      const ids = Array.from({ length: n }, (_, i) => `p${i}`);
      expect(() => createGame({ playerIds: ids, deck: placeholderDeck(bundleSizes(n).deck), seed: 1 })).not.toThrow();
    }
    expect(() => createGame({ playerIds: ["solo"], deck: placeholderDeck(), seed: 1 })).toThrow();
    const seven = Array.from({ length: 7 }, (_, i) => `p${i}`);
    expect(() => createGame({ playerIds: seven, deck: placeholderDeck(), seed: 1 })).toThrow();
  });

  it("the same seed deals the same game; a different seed doesn't", () => {
    const make = (seed: number) => createGame({ playerIds: ["a", "b"], deck: placeholderDeck(60), seed });
    expect(make(7)).toEqual(make(7));
    expect(make(7).deck).not.toEqual(make(8).deck);
  });
});

describe("Rule 2: one play per turn, plus Play +1", () => {
  const hand = () => [card("r1", "red", 1), card("r2", "red", 2), card("b1", "blue", 1), card("b3", "blue", 3)];

  it("refuses a second play", () => {
    let s = table([hand(), []]);
    s = act(s, "p1", pair("r1", "r2"));
    expect(refused(s, "p1", pair("b1", "b3"))).toMatch(/no plays left/);
  });

  it("Play +1 gives exactly one extra play", () => {
    let s = table([[card("plus", "green", 1, fx.playPlus), ...hand()], []]);
    s = act(s, "p1", { type: "pitch", card: "plus" });
    expect(s.playsRemaining).toBe(1);
    s = act(s, "p1", pair("r1", "r2"));
    expect(refused(s, "p1", pair("b1", "b3"))).toMatch(/no plays left/);
  });
});

describe("Rule 3: a play is a pitch or a pair", () => {
  it("a pitch goes to the Pitch Pond and its effect fires", () => {
    let s = table([[card("dr", "red", 1, fx.draw1), card("x", "blue", 2)], []], { deck: fillers(3) });
    s = act(s, "p1", { type: "pitch", card: "dr" });
    expect(s.pond).toEqual(["dr"]);
    expect(s.players[0].hand).toEqual(["x", "d1"]);
  });

  it("a card without a Pitch Effect can't be pitched (unless the option allows it)", () => {
    const plain = () => [[card("x", "blue", 2)], []];
    expect(refused(table(plain()), "p1", { type: "pitch", card: "x" })).toMatch(/Pitch Effect/);
    const s = act(table(plain(), { options: { pitchWithoutEffect: true } }), "p1", { type: "pitch", card: "x" });
    expect(s.pond).toEqual(["x"]);
  });

  it("pairs two cards from hand", () => {
    const s = act(table([[card("r1", "red", 1), card("r2", "red", 2)], []]), "p1", pair("r1", "r2"));
    expect(s.players[0].hand).toEqual([]);
    expect(s.players[0].pairs).toHaveLength(1);
  });

  it("pairs one card from hand with ANY card in the Pitch Pond", () => {
    let s = table([[card("r1", "red", 1)], []], { pond: [card("g1", "green", 1), card("r3", "red", 3)] });
    s = act(s, "p1", pair("r1", "g1")); // not the newest pond card - any card is fair game
    expect(s.pond).toEqual(["r3"]);
    expect(s.players[0].pairs[0]).toMatchObject({ top: "r1", bottom: "g1" });
  });

  it("refuses two cards from the Pond, or a card you don't hold", () => {
    const s = table([[card("r1", "red", 1)], [card("theirs", "red", 2)]], {
      pond: [card("g1", "green", 1), card("g2", "green", 2)],
    });
    expect(refused(s, "p1", pair("g1", "g2"))).toMatch(/from your hand/);
    expect(refused(s, "p1", pair("r1", "theirs"))).toMatch(/hand or the Pitch Pond/);
  });
});

describe("Rule 4: colour pairs fire the top card's effects", () => {
  it("only the top card's Pairing Effect fires", () => {
    const hand = () => [card("pp", "red", 1, fx.pairPlay), card("r2", "red", 2)];
    expect(act(table([hand(), []]), "p1", pair("pp", "r2", "pp")).playsRemaining).toBe(1); // fired
    expect(act(table([hand(), []]), "p1", pair("pp", "r2", "r2")).playsRemaining).toBe(0); // on the bottom
  });

  it("a purple Wild is every colour", () => {
    let s = table([[card("w", "purple", 1, fx.pairPlay), card("r3", "red", 3)], []]);
    s = act(s, "p1", pair("w", "r3", "w"));
    expect(s.playsRemaining).toBe(1); // a colour pair, so the Wild's Pairing Effect fired
  });

  it("a Pairing Effect can target the pair it is creating", () => {
    let s = table([[card("gr", "red", 1, fx.grow), card("r2", "red", 2)], []]);
    expect(refused(s, "p1", pair("gr", "r2"))).toMatch(/Choose a target/);
    s = act(s, "p1", pair("gr", "r2", "gr", "this"));
    expect(s.players[0].pairs[0].counters).toBe(1);
    expect(pairValue(s, s.players[0].pairs[0])).toBe(4);
  });

  it("switching the top card is free, once per turn per pair, and moves the Ongoing bonus", () => {
    let s = table([[], []], { deck: fillers(20) }); // both players draw 5, so 10 cards would end the game
    givePair(s, 0, "P", card("st", "red", 2, fx.steady), card("r1", "red", 1));
    expect(pairValue(s, s.players[0].pairs[0])).toBe(4); // 2 + 1 + Ongoing 1
    s = act(s, "p1", { type: "switchTop", pairId: "P" });
    expect(pairValue(s, s.players[0].pairs[0])).toBe(3); // Ongoing card now on the bottom
    expect(s.playsRemaining).toBe(1); // free
    expect(refused(s, "p1", { type: "switchTop", pairId: "P" })).toMatch(/already switched/);
    s = act(act(s, "p1", { type: "endTurn" }), "p2", { type: "endTurn" });
    expect(() => act(s, "p1", { type: "switchTop", pairId: "P" })).not.toThrow(); // new turn
  });
});

describe("Rule 5: number-only pairs score but activate nothing", () => {
  it("scores the two values with no effect", () => {
    let s = table([[card("pp", "blue", 1, fx.pairPlay), card("r1", "red", 1)], []]);
    s = act(s, "p1", pair("pp", "r1", "pp"));
    expect(s.playsRemaining).toBe(0); // Pairing Effect did not fire
    expect(pairValue(s, s.players[0].pairs[0])).toBe(2);
  });

  it("an Ongoing Effect does nothing in a number-only pair", () => {
    const s = table([[], []]);
    givePair(s, 0, "P", card("st", "blue", 2, fx.steady), card("r2", "red", 2));
    expect(pairValue(s, s.players[0].pairs[0])).toBe(4);
  });

  it("refuses cards that match neither colour nor value", () => {
    const s = table([[card("r1", "red", 1), card("b2", "blue", 2)], []]);
    expect(refused(s, "p1", pair("r1", "b2"))).toMatch(/same colour or the same value/);
  });
});

describe("Rule 6: Discard Anytime", () => {
  it("can be played on someone else's turn without using a play", () => {
    let s = table([[card("r1", "red", 1)], [card("bo", "green", 1, fx.boost)]]);
    givePair(s, 1, "Q", card("g1", "green", 1), card("g2", "green", 2));
    s = act(s, "p2", { type: "discardAnytime", card: "bo", target: "Q" });
    expect(s.players[1].pairs[0].counters).toBe(1);
    expect(s.pond).toContain("bo");
    expect(s.playsRemaining).toBe(1); // p1's play is untouched
  });

  it("can answer an effect, and cancel it", () => {
    let s = table([[card("dr", "red", 1, fx.draw1)], [card("bl", "green", 1, fx.block)]], { deck: fillers(3) });
    s = act(s, "p2", { type: "setAutoPass", value: false });
    s = act(s, "p1", { type: "pitch", card: "dr" });
    expect(awaitingResponse(s)).toEqual(["p2"]);
    s = act(s, "p2", { type: "discardAnytime", card: "bl" });
    expect(s.stack).toEqual([]);
    expect(s.players[0].hand).toEqual([]); // the draw was cancelled
    expect(s.pond).toEqual(["dr", "bl"]);
  });

  it("is too late once the effect has resolved", () => {
    let s = table([[card("dr", "red", 1, fx.draw1)], [card("bl", "green", 1, fx.block)]]);
    s = act(s, "p1", { type: "pitch", card: "dr" }); // p2 has Auto-pass on, so it resolves at once
    expect(s.players[0].hand).toEqual(["d1"]);
    expect(refused(s, "p2", { type: "discardAnytime", card: "bl" })).toMatch(/no effect to respond to/);
  });
});

describe("Rule 7: pair value and splitting", () => {
  it("is the two values plus counters; at 0 or less the pair splits into the Pond", () => {
    let s = table([[card("s1", "red", 1, fx.shrink), card("s2", "red", 2, fx.shrink)], []]);
    givePair(s, 1, "Q", card("g1", "green", 1), card("o1", "orange", 1)); // worth 2
    s.playsRemaining = 2;
    s = act(s, "p1", { type: "pitch", card: "s1", target: "Q" });
    expect(pairValue(s, s.players[1].pairs[0])).toBe(1);
    const { state, events } = run(s, "p1", { type: "pitch", card: "s2", target: "Q" });
    expect(state.players[1].pairs).toEqual([]);
    expect(state.pond).toEqual(["s1", "s2", "g1", "o1"]);
    expect(events.map((e) => e.type)).toContain("pairSplit");
  });

  it("a -1 effect can't target your own pair", () => {
    const s = table([[card("s1", "red", 1, fx.shrink)], []]);
    givePair(s, 0, "mine", card("r1", "red", 1), card("r2", "red", 2));
    expect(refused(s, "p1", { type: "pitch", card: "s1", target: "mine" })).toMatch(/no valid target/);
  });
});

describe("Rule 8: end of turn", () => {
  it("draws back up to handsize and passes play clockwise", () => {
    let s = table([[card("r1", "red", 1), card("r2", "red", 2)], []], { deck: fillers(10) });
    s = act(s, "p1", pair("r1", "r2"));
    s = act(s, "p1", { type: "endTurn" });
    expect(s.players[0].hand).toHaveLength(5);
    expect(s.current).toBe(1);
    expect(s.playsRemaining).toBe(1);
  });

  it("draws what's left when the deck runs short", () => {
    const s = act(table([[], []], { deck: fillers(2) }), "p1", { type: "endTurn" });
    expect(s.players[0].hand).toHaveLength(2);
    expect(s.deck).toEqual([]);
  });
});

describe("Rule 9: end of game", () => {
  it("drawing the last card ends the game immediately (the default)", () => {
    let s = table([[card("r1", "red", 1), card("r2", "red", 2)], [card("g3", "green", 3), card("g2", "green", 2)], []], {
      deck: fillers(1),
    });
    s = act(s, "p1", pair("r1", "r2"));
    s = act(s, "p1", { type: "endTurn" }); // draws the last card
    expect(s.status).toBe("finished");
    expect(s.winners).toEqual(["p1"]); // p2 never got to pair: 3 points beats 0
  });

  it("if an effect draws the last card mid-turn, the game ends there and the rest of the effect never happens", () => {
    const drawThenPlay = { timing: "pitch", actions: [{ kind: "draw", n: 1 }, { kind: "playPlus", n: 1 }], text: "draw 1, Play +1" } as CardEffect;
    let s = table([[card("dp", "red", 1, drawThenPlay)], [], []], { deck: fillers(1) });
    s = act(s, "p1", { type: "pitch", card: "dp" });
    expect(s.status).toBe("finished");
    expect(s.playsRemaining).toBe(0); // the Play +1 after the draw didn't happen
    expect(s.players[0].hand).toHaveLength(1);
  });

  it("a pair knocked to 0 just before the end still splits before scoring", () => {
    const s = table([[], []], { deck: fillers(1) });
    givePair(s, 0, "A", card("r1", "red", 1), card("r1b", "red", 1));
    s.players[0].pairs[0].counters = -2; // worth 0
    const t = act(s, "p1", { type: "endTurn" });
    expect(t.status).toBe("finished");
    expect(t.players[0].pairs).toEqual([]);
  });

  describe('with endGame: "lastTurns"', () => {
    const lastTurns = { endGame: "lastTurns" } as const;

    it("after the last card is drawn every player gets one last turn, starting with the next player", () => {
      let s = table([[card("r1", "red", 1), card("r2", "red", 2)], [card("g3", "green", 3), card("g2", "green", 2)], []], {
        deck: fillers(1),
        options: lastTurns,
      });
      s = act(s, "p1", pair("r1", "r2"));
      s = act(s, "p1", { type: "endTurn" }); // draws the last card
      expect(s.finalTurnsLeft).toBe(3);
      s = act(s, "p2", pair("g3", "g2"));
      s = act(s, "p2", { type: "endTurn" });
      s = act(s, "p3", { type: "endTurn" });
      expect(s.status).toBe("playing");
      s = act(s, "p1", { type: "endTurn" }); // p1's last turn
      expect(s.status).toBe("finished");
      expect(s.winners).toEqual(["p2"]); // 5 points beats 3
    });

    it("if an effect draws the last card mid-turn, that player still gets a last turn later", () => {
      let s = table([[card("dr", "red", 1, fx.draw1)], [], []], { deck: fillers(1), options: lastTurns });
      s = act(s, "p1", { type: "pitch", card: "dr" });
      expect(s.finalTurnsLeft).toBe(3);
      for (const p of ["p1", "p2", "p3"]) s = act(s, p, { type: "endTurn" });
      expect(s.status).toBe("playing");
      s = act(s, "p1", { type: "endTurn" });
      expect(s.status).toBe("finished");
    });
  });

  it("a tie is shared by default; the tie-breaker option can split it", () => {
    const setup = (tieBreaker: "shared" | "mostPairs") => {
      const s = table([[], []], { deck: fillers(1), options: { tieBreaker } });
      givePair(s, 0, "A", card("r3", "red", 3), card("r1", "red", 1)); // 4 points, 1 pair
      givePair(s, 1, "B", card("g1", "green", 1), card("g1b", "green", 1)); // 2 + 2 = 4 points, 2 pairs
      givePair(s, 1, "C", card("o1", "orange", 1), card("o1b", "orange", 1));
      return act(s, "p1", { type: "endTurn" }); // last card drawn: game over
    };
    expect(setup("shared").winners).toEqual(["p1", "p2"]);
    expect(setup("mostPairs").winners).toEqual(["p2"]);
  });
});

describe("Digital: the response window", () => {
  const hands = () => [
    [card("dr", "red", 1, fx.draw1), card("r9", "red", 2)],
    [card("bl", "green", 1, fx.block)],
    [card("plain", "blue", 1)],
  ];

  it("Auto-pass on (the default) never holds the table up", () => {
    const s = act(table(hands()), "p1", { type: "pitch", card: "dr" });
    expect(s.stack).toEqual([]);
  });

  it("an unchecked box makes the game wait for that player, and only them", () => {
    let s = table(hands());
    s = act(s, "p2", { type: "setAutoPass", value: false });
    s = act(s, "p3", { type: "setAutoPass", value: false }); // no Discard Anytime card, so never waited on
    s = act(s, "p1", { type: "pitch", card: "dr" });
    expect(awaitingResponse(s)).toEqual(["p2"]);
    expect(refused(s, "p1", { type: "endTurn" })).toMatch(/Wait/);
    expect(refused(s, "p3", { type: "pass" })).toMatch(/Nothing is waiting/);
    s = act(s, "p2", { type: "pass" });
    expect(s.stack).toEqual([]);
    expect(s.players[0].hand).toHaveLength(2); // the draw went through
  });

  it("re-checking Auto-pass releases the table", () => {
    let s = act(table(hands()), "p2", { type: "setAutoPass", value: false });
    s = act(s, "p1", { type: "pitch", card: "dr" });
    expect(s.stack).toHaveLength(1);
    s = act(s, "p2", { type: "setAutoPass", value: true });
    expect(s.stack).toEqual([]);
  });
});

describe("Digital: hidden information and card backs", () => {
  it("a player sees their own hand, never an opponent's hand or the deck", () => {
    const s = table([[card("mine", "red", 1)], [card("SECRET-HAND", "purple", 2)]], {
      deck: [card("SECRET-DECK", "blue", 1)],
    });
    const json = JSON.stringify(viewFor(s, "p1"));
    expect(json).toContain("mine");
    expect(json).not.toContain("SECRET-HAND");
    expect(json).not.toContain("SECRET-DECK");
    expect(viewFor(s, "p1").players[1].handCount).toBe(1);
  });

  it("marked wilds show a scratchy back; the setting turns it off", () => {
    const hands = () => [[card("r1", "red", 1)], [card("w", "purple", 2), card("y", "yellow", 1)]];
    const deck = () => [card("w2", "purple", 1)];
    const on = viewFor(table(hands(), { deck: deck() }), "p1");
    expect(on.players[1].handBacks).toEqual(["scratchy", "clean"]);
    expect(on.deckTopBack).toBe("scratchy");
    const off = viewFor(table(hands(), { deck: deck(), settings: { markedWilds: false, showDeckTop: false } }), "p1");
    expect(off.players[1].handBacks).toEqual(["clean", "clean"]);
    expect(off.deckTopBack).toBeNull();
  });
});

describe("Digital: seeded dice", () => {
  it("the same state rolls the same die", () => {
    const s = table([[card("dice", "red", 1, fx.dice)], []]);
    givePair(s, 1, "Q", card("g3", "green", 3), card("g3b", "green", 3)); // 6, so it can't split
    const a = applyAction(s, { type: "pitch", card: "dice", target: "Q" }, "p1");
    const b = applyAction(s, { type: "pitch", card: "dice", target: "Q" }, "p1");
    expect(a).toEqual(b);
    const faces = Array.from({ length: 600 }, (_, i) => rollD6({ rng: i }));
    expect(new Set(faces)).toEqual(new Set([1, 2, 3, 4, 5, 6]));
  });
});

describe("Deck makeup table", () => {
  it("matches the plan: 60 / 90 / 120 / 125 / 150", () => {
    expect([2, 3, 4, 5, 6].map((n) => bundleSizes(n).deck)).toEqual([60, 90, 120, 125, 150]);
    expect(bundleSizes(4)).toMatchObject({ bioregion: 15, continent: 8, personal: 7 });
    expect(bundleSizes(6)).toMatchObject({ bundle: 25, bioregion: 13, continent: 6, personal: 6 });
  });
});
