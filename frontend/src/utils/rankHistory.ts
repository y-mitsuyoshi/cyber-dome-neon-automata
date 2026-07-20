/// Rank history store — module-scope Map keyed by gameId → (playerName → rank).

type RankMap = Map<string, number>;
const store = new Map<string, RankMap>();

/** Persist current standings order (array index = rank) for the given game. */
export function saveRanks(gameId: string, standings: { name: string }[]): void {
  const map = new Map<string, number>();
  standings.forEach((s, i) => map.set(s.name, i + 1));
  store.set(gameId, map);
}

/** Retrieve previous ranks for a game. Returns undefined if no prior save. */
export function getPreviousRanks(gameId: string): RankMap | undefined {
  return store.get(gameId);
}

/** Clear rank history for a specific game (call on restart). */
export function clearRanks(gameId: string): void {
  store.delete(gameId);
}
