import { describe, it, expect } from 'vitest';
import { getCardImagePath, stripInstanceSuffix, preloadCardImage, preloadAllCardImages } from './cardImage';

describe('cardImage utils', () => {
  it('stripInstanceSuffix removes _0, _1, etc suffixes', () => {
    expect(stripInstanceSuffix('a_jester_0')).toBe('a_jester');
    expect(stripInstanceSuffix('b_knight_3')).toBe('b_knight');
    expect(stripInstanceSuffix('starter_scout_1a_0')).toBe('starter_scout_1a');
  });

  it('getCardImagePath returns webp image paths', () => {
    expect(getCardImagePath('starter_scout_1a')).toBe('/images/cards/nr_001.webp');
    expect(getCardImagePath('a_jester')).toBe('/images/cards/virus_001.webp');
    expect(getCardImagePath('b_knight')).toBe('/images/cards/ai_006.webp');
  });

  it('preloadCardImage and preloadAllCardImages run without error', () => {
    expect(() => preloadCardImage('/images/cards/virus_001.webp')).not.toThrow();
    expect(() => preloadAllCardImages()).not.toThrow();
  });
});
