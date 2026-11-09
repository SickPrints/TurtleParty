// Seeded random numbers (mulberry32). The generator's state lives inside the
// game state, so the same seed + the same actions always give the same game.

export interface HasRng {
  rng: number;
}

/** A float in [0, 1). Advances the generator stored on `s`. */
export function random(s: HasRng): number {
  const t = (s.rng + 0x6d2b79f5) >>> 0;
  s.rng = t;
  let r = Math.imul(t ^ (t >>> 15), t | 1);
  r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
  return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
}

/** An integer in [0, n). */
export function randomInt(s: HasRng, n: number): number {
  return Math.floor(random(s) * n);
}

/** A six-sided die: 1 to 6. */
export function rollD6(s: HasRng): number {
  return randomInt(s, 6) + 1;
}

/** Fisher-Yates shuffle, in place. */
export function shuffleInPlace<T>(s: HasRng, items: T[]): void {
  for (let i = items.length - 1; i > 0; i--) {
    const j = randomInt(s, i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
}
