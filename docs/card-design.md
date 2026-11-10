# Card design: original ratios and colour vibes

This is the reference for anyone making Turtle Party cards, and for the server when it builds a bundle.

**The rule:** new cards change the effect while keeping that card's theme. They don't change its colour, its value or the deck's ratios. The Alpha deck's ratios have been playtested, so they're the baseline.

## Colour vibes

The colours and their feel, in Tommy's words (2026-11-09):

| Colour | Element | Vibe | Typical effects |
| --- | --- | --- | --- |
| Red | Fire | Chaotic, discardy | Making others discard, dice chaos, shrinking a whole party |
| Orange | Wind | Swift | Quick hits that knock a pair's value down |
| Blue | Water | Wizardry | Retargeting, bigger hands, pulling from the Pitch Pond |
| Green | Earth | Strong | Protection, extra plays, growing your pairs |
| Yellow | — | Party favors | Ongoing Effects that keep working while on top |
| Purple | — | Wild | Every colour at once, so it colour-pairs with anything |

The "typical effects" column was checked against the Alpha 4 cards (2026-11-09). One surprise: red and orange share the same 1-value card text ("Negate an effect until the end of the turn"), so at value 1 the colours aren't yet distinct.

## Original ratios (the Alpha deck, 120 cards)

Counted 2026-11-09 from the Alpha 2 and Alpha 3 print PDFs. Each PDF is one full 120-card deck, and both follow the **same template exactly**. Copy counts come from counting the cards on the sheets; no card prints its own count.

### The template

| Colour | Value 3 · Pairing | Value 2 · Pitch | Value 1 · Discard Anytime | Value 1 · Ongoing | Total |
| --- | --- | --- | --- | --- | --- |
| Red | 9 | 10 | 5 | — | 24 |
| Orange | 9 | 10 | 5 | — | 24 |
| Green | 9 | 10 | 5 | — | 24 |
| Blue | 9 | 10 | 5 | — | 24 |
| Yellow | — | — | — | 12 (4 cards × 3) | 12 |
| Purple (wild) | 4 (Wild Turtle) | 4 (Wild Tortoise) | — | 4 (Wild Leatherback) | 12 |
| **Total** | **40** | **44** | **20** | **16** | **120** |

The wilds are Ongoing ("Wild cards are every color"), whatever their value. By value: 40 threes, 44 twos, 36 ones. By timing: Pairing 36, Pitch 40, Ongoing 24, Discard Anytime 20.

### The rules hiding in the template

- **In red, orange, green and blue, value decides timing.** Every 3 is a Pairing card, every 2 a Pitch card, every 1 a Discard Anytime card. No exceptions in either set.
- **Discard Anytime cards are all 1s**, never higher. As Tommy put it: fairly disposable, handy for finishing a same-colour pair, at the cost of their defensive use.
- **Each colour slot holds one card name.** A deck has one 3, one 2 and one 1 per colour, at 9 / 10 / 5 copies. The one exception: Alpha 2 and 3 split orange's Pitch slot 9 + 1 between Two Dice and Icky Wings.
- **Yellow is all 1s and all Ongoing**: four names, 3 copies each.
- **Purple is one wild at each value**, 4 copies each.
- **Pitch cards nearly always give another play.** All 2-value Pitch cards say "Play +1" except Multicorn (Play +2) and Shenanigans (no extra play).

### Alpha 4: two choices per slot

Alpha 4 is the cleanest art and has 35 cards. That's every slot above with **two** card names to choose from in each colour, eight yellows and the three wilds. It's essentially Alpha 2 and Alpha 3 combined. It has no deck list of its own yet, so how a 120-card Alpha 4 deck splits the 9 / 10 / 5 copies between the two names in each slot is open.

| Colour | 3 · Pairing | 2 · Pitch | 1 · Discard Anytime |
| --- | --- | --- | --- |
| Red | Volcano, Farty Turtle | Blacksmith, Sawblade | Fireback, Firebolt |
| Orange | Space Station, Darnation | Two Dice, Icky Wings | Flicker, Ancient Turtle |
| Green | Reinforcements, Castle Turtle | Multicorn, Toolbox | Rumpy Stumpy, Play Maker |
| Blue | Wiz Book, Bubbler | Shenanigans, Jetpack Boost | Magic Trick, Flipsy |

Yellow (all 1 · Ongoing): Darthy Turtle, Party Turtle, Trophy Crypt, Hand of Necromancy, Cultist, Sword Birdie, Egg Nest, Turtle Party. Purple: Wild Turtle (3), Wild Tortoise (2), Wild Leatherback (1).

Every card's exact wording is in `docs/cards/alpha4-transcribed.json` and `docs/cards/alpha2-3-transcribed.json`.

## How a new card fits

A new card takes over a slot: it keeps the slot's colour, value and timing, and changes only the effect, staying true to the colour's vibe. The template above stays the same, so the deck keeps its playtested balance.

## Card styles

Tommy's idea (2026-11-09): a player's starting deck is a basic set in the older **Alpha 1** style. Cards that come from a bioregion or continent use the newer **Alpha 4** style.
