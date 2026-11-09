// Phase 0 gate: a full 4-player game passes in tests.
// Seeded bots play whole games through legalActions + applyAction, checking
// every step that no card is lost or duplicated, then the game is replayed
// from its seed + action log and must come out identical.

import { describe, expect, it } from "vitest";
import {
  applyAction,
  awaitingResponse,
  bundleSizes,
  createGame,
  legalActions,
  placeholderDeck,
  random,
  randomInt,
  replay,
  scores,
} from "../src";
import type { Action, GameConfig, GameState, LoggedAction } from "../src";

function allCards(s: GameState): string[] {
  return [
    ...s.deck,
    ...s.pond,
    ...s.players.flatMap((p) => [...p.hand, ...p.pairs.flatMap((pair) => [pair.top, pair.bottom])]),
  ];
}

function playBotGame(playerCount: number, seed: number) {
  const playerIds = Array.from({ length: playerCount }, (_, i) => `player${i + 1}`);
  const config: GameConfig = { playerIds, deck: placeholderDeck(bundleSizes(playerCount).deck), seed };
  let s = createGame(config);
  const total = Object.keys(s.cards).length;
  const log: LoggedAction[] = [];
  const bot = { rng: (seed * 7919 + playerCount) >>> 0 };
  let responses = 0;
  let turns = 0;

  const doAct = (playerId: string, action: Action) => {
    const r = applyAction(s, action, playerId);
    if (!r.ok) throw new Error(`${playerId} ${JSON.stringify(action)}: ${r.error}`);
    s = r.state;
    log.push({ playerId, action });
    const cards = allCards(s);
    expect(cards.length).toBe(total);
    expect(new Set(cards).size).toBe(total);
  };

  // One player unchecks Auto-pass so the response window gets exercised.
  doAct(playerIds[1], { type: "setAutoPass", value: false });

  for (let step = 0; s.status === "playing"; step++) {
    if (step > 50_000) throw new Error("game did not finish");
    const waiting = awaitingResponse(s);
    if (waiting.length > 0) {
      const acts = legalActions(s, waiting[0]);
      const a = acts[randomInt(bot, acts.length)];
      if (a.type === "discardAnytime") responses++;
      doAct(waiting[0], a);
      continue;
    }
    const pid = s.players[s.current].id;
    const plays = legalActions(s, pid).filter((a) => a.type !== "endTurn");
    const keepGoing = plays.length > 0 && (s.playsRemaining > 0 || random(bot) < 0.3);
    if (!keepGoing) turns++;
    doAct(pid, keepGoing ? plays[randomInt(bot, plays.length)] : { type: "endTurn" });
  }
  return { s, log, config, responses, turns };
}

describe("Phase 0 gate: full games", () => {
  it("a full 4-player game finishes, scores correctly and replays identically", { timeout: 120_000 }, () => {
    let responses = 0;
    for (let seed = 1; seed <= 10; seed++) {
      const { s, log, config, responses: r, turns } = playBotGame(4, seed);
      responses += r;
      expect(s.status).toBe("finished");
      expect(s.deck).toEqual([]);
      expect(turns).toBeGreaterThanOrEqual(8);
      const totals = scores(s);
      const best = Math.max(...Object.values(totals));
      expect(s.winners.length).toBeGreaterThan(0);
      for (const w of s.winners) expect(totals[w]).toBe(best);
      expect(replay(config, log)).toEqual(s);
    }
    expect(responses).toBeGreaterThan(0); // somebody answered an effect with a Discard Anytime card
  });

  it("2, 3, 5 and 6 player games finish too", { timeout: 120_000 }, () => {
    for (const n of [2, 3, 5, 6]) {
      for (let seed = 1; seed <= 3; seed++) {
        const { s, log, config } = playBotGame(n, seed);
        expect(s.status).toBe("finished");
        expect(replay(config, log)).toEqual(s);
      }
    }
  });
});
