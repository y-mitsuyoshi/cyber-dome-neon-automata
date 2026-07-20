import { describe, it, expect, beforeEach } from 'vitest';
import { saveRanks, getPreviousRanks, clearRanks } from './rankHistory';

describe('rankHistory', () => {
  beforeEach(() => {
    // Clear all games before each test
    clearRanks('game-1');
    clearRanks('game-2');
    clearRanks('game-3');
  });

  it('saves and retrieves rank data (round trip)', () => {
    const standings = [
      { name: 'Alice' },
      { name: 'Bob' },
      { name: 'Charlie' },
    ];

    saveRanks('game-1', standings);
    const prev = getPreviousRanks('game-1');

    expect(prev).toBeDefined();
    expect(prev!.get('Alice')).toBe(1);
    expect(prev!.get('Bob')).toBe(2);
    expect(prev!.get('Charlie')).toBe(3);
  });

  it('returns undefined for unknown game', () => {
    expect(getPreviousRanks('unknown-game')).toBeUndefined();
  });

  it('clears rank history for a game', () => {
    saveRanks('game-1', [{ name: 'A' }, { name: 'B' }]);
    expect(getPreviousRanks('game-1')).toBeDefined();

    clearRanks('game-1');
    expect(getPreviousRanks('game-1')).toBeUndefined();
  });

  it('isolates data between different games', () => {
    saveRanks('game-1', [{ name: 'A' }, { name: 'B' }]);
    saveRanks('game-2', [{ name: 'X' }, { name: 'Y' }, { name: 'Z' }]);

    expect(getPreviousRanks('game-1')!.get('A')).toBe(1);
    expect(getPreviousRanks('game-2')!.get('X')).toBe(1);
    expect(getPreviousRanks('game-2')!.get('Z')).toBe(3);

    clearRanks('game-1');
    expect(getPreviousRanks('game-1')).toBeUndefined();
    expect(getPreviousRanks('game-2')).toBeDefined();
  });

  it('overwrites previous data when saving again', () => {
    saveRanks('game-1', [{ name: 'A' }, { name: 'B' }]);
    saveRanks('game-1', [{ name: 'B' }, { name: 'A' }]);

    const prev = getPreviousRanks('game-1');
    expect(prev!.get('B')).toBe(1);
    expect(prev!.get('A')).toBe(2);
  });
});
