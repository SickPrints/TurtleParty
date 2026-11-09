# Turtle Party Digital

Free, browser-based, real-time multiplayer Turtle Party. See `CLAUDE.md` for the rules, the plan and the working rules, and the [build plan doc](https://claude.ai/artifact/JCv7AHgMisu2vJaVMdqb2G) for the architecture.

## Layout

| Folder | What | Status |
| --- | --- | --- |
| `packages/rules` | The rules engine, shared by server and browser | Phase 0, built |
| `apps/web` | Next.js app (Vercel): magic-link sign-in, username and home bioregion | Phase 0, built |
| `apps/server` | Socket.io game server (Railway or Fly.io) | not started |
| `supabase/` | Migrations; see `supabase/README.md` for the paste-in steps | Phase 0, written, not yet applied |

## Commands

Run from the repo root (works the same on Windows):

```
npm install
npm test
npm run typecheck
npm run dev        # web app at http://localhost:3100
npm run build
npm run lint
```

The web app needs `apps/web/.env.local`; copy `apps/web/.env.example`. Without it the site still loads and says sign-in isn't connected.

## The rules engine

One door: `applyAction(state, action, playerId)` returns the new state and a list of events to animate, or a plain-language reason the move is illegal. It never changes the state it's given.

- `createGame(config)` shuffles and deals from a seed. `replay(config, log)` rebuilds any game from its seed and action log.
- `legalActions(state, playerId)` lists every legal move. The browser uses it to grey out illegal moves; the test bots use it to play whole games.
- `viewFor(state, playerId)` is what that player is allowed to see: their own hand, opponents' hand sizes and card backs, the deck count, every party, and the whole Pitch Pond.
- Card effects are data (`timing` + `actions`), so most cards need no code. The few that do (Darthy Turtle, Flipsy) will use a `custom` handler. That isn't written yet.
- Cards in `src/cards.ts` are **placeholders**, not the Alpha set. They're there so the engine can be tested before the real card files arrive.

**Phase 0 gate:** `test/fullgame.test.ts` plays 10 full 4-player games with seeded bots, plus 2, 3, 5 and 6 player games. On every move it checks that no card is lost or duplicated. At the end it checks that the scores and winner are right and that replaying the log gives the identical game.

## Rule questions: what the engine does until Tommy decides

Each question is a switch in `RuleOptions` (`src/types.ts`) or a single spot in `src/engine.ts`, so an answer is a small change.

| Question | Engine does now | Where |
| --- | --- | --- |
| Can a card without a Pitch Effect be pitched? | No | `pitchWithoutEffect` |
| Drawing when the deck is empty | The draw just stops | `drawCards` |
| Tie-breaker | Tied players share the win (`mostPairs` / `fewestPairs` also available) | `tieBreaker` |
| Do counters vanish when a pair splits? | Yes | `checkSplits` |
| Is an Ongoing Effect active only while its card is on top? | Yes, and only in a colour pair | `ongoingOnlyWhileTop` |

New questions that came up while building:

| Question | Engine does now | Where |
| --- | --- | --- |
| Does switching the top card fire the new top card's Pairing Effect? | No | `switchTopTriggersPairing` |
| Who takes the first turn: the dealer, or the player to the dealer's left? | The dealer ("clockwise from the dealer") | `createGame` |
| Where does a played Discard Anytime card go? | The Pitch Pond | `execute` |
| If a Discard Anytime card gives "Play +1" on someone else's turn, does anyone get the play? | No, Play +1 only helps the turn player | `resolve` |
| Can an effect with no valid target still be played? | Yes; the targeted part does nothing | `checkTarget` |
