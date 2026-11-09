// Deck makeup: each player brings a bundle; the shared deck is every bundle
// shuffled together. Half home bioregion, a quarter continent, a quarter personal.
// (Building the bundles from real pools is Phase 3; this is the size table.)

export interface BundleSizes {
  bundle: number;
  bioregion: number;
  continent: number;
  personal: number;
  deck: number;
}

export function bundleSizes(playerCount: number): BundleSizes {
  if (playerCount >= 2 && playerCount <= 4) {
    return { bundle: 30, bioregion: 15, continent: 8, personal: 7, deck: 30 * playerCount };
  }
  if (playerCount >= 5 && playerCount <= 6) {
    return { bundle: 25, bioregion: 13, continent: 6, personal: 6, deck: 25 * playerCount };
  }
  throw new Error(`No bundle table for ${playerCount} players (2 to 6 supported).`);
}
