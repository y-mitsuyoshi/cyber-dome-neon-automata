import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import Standings from './Standings';
import type { Standing, BattleResult } from '../types/game';

// ── Mocks ───────────────────────────────────────────────────────────
const playSE = vi.fn();

vi.mock('../context/AudioContext', () => ({
  useAudio: () => ({ playSE }),
}));

vi.mock('../context/TranslationContext', () => ({
  useTranslation: () => ({
    locale: 'ja',
    t: (key: string, replacements?: Record<string, string | number>) => {
      const dict: Record<string, string> = {
        standingsHeader: 'STANDINGS',
        roundOf: `Round ${replacements?.round}`,
        finalsLabel: 'FINALS',
        rankHeader: 'RANK',
        combatantHeader: 'COMBATANT',
        winsHeader: 'WINS',
        fansHeader: 'FANS',
        youBadge: 'YOU',
        nextRoundBtn: 'NEXT',
        finalResultsBtn: 'FINAL RESULTS',
        rankUp: '▲',
        rankDown: '▼',
        rankSame: '−',
        finalistBadge: 'FINALIST',
        championBadge: 'CHAMPION',
        rankGold: '金',
        rankSilver: '銀',
        rankBronze: '銅',
      };
      return dict[key] ?? key;
    },
    translateBattleResult: (text: string) => text,
  }),
}));

vi.mock('../utils/rankStyle', () => ({
  getRankVisual: (rank: number) => {
    if (rank === 1) return { rowClass: 'gold-row', textClass: 'text-gold', icon: 'trophy', labelKey: 'rankGold' };
    if (rank === 2) return { rowClass: 'silver-row', textClass: 'text-silver', icon: 'medal', labelKey: 'rankSilver' };
    if (rank === 3) return { rowClass: 'bronze-row', textClass: 'text-bronze', icon: 'medal', labelKey: 'rankBronze' };
    return { rowClass: '', textClass: '', icon: null, labelKey: '' };
  },
}));

vi.mock('../utils/rankHistory', () => ({
  getPreviousRanks: vi.fn(() => undefined),
  saveRanks: vi.fn(),
}));

// ── Helpers ─────────────────────────────────────────────────────────
function makeStandings(
  entries: Array<{ name: string; wins: number; fans: number; isPlayer: boolean }>,
): Standing[] {
  return entries.map(e => ({ ...e }));
}

const defaultProps = {
  round: 2,
  maxRounds: 7,
  battleResult: '',
  onNext: vi.fn(),
  loading: false,
  gameId: 'test-game',
  playerName: 'ME',
  lastResult: null as BattleResult | null,
};

// ── Tests ───────────────────────────────────────────────────────────

describe('Standings', () => {
  beforeEach(() => {
    playSE.mockClear();
  });

  // (a) REQ-UX-01: lastResult.winner === playerName で勝利バナー色
  it('shows victory banner color when lastResult.winner matches playerName', () => {
    const lastResult: BattleResult = {
      winner: 'ME',
      loser: 'OPPONENT',
      reason: 'battle_complete',
      log: [],
      fansGained: 2,
    };

    const { container } = render(
      <Standings
        {...defaultProps}
        lastResult={lastResult}
        battleResult="ME wins"
        standings={makeStandings([
          { name: 'ME', wins: 2, fans: 10, isPlayer: true },
          { name: 'OPPONENT', wins: 1, fans: 5, isPlayer: false },
        ])}
      />,
    );

    // Victory banner should have green styling (border-neon-green)
    const banner = container.querySelector('[class*="border-neon-green"]');
    expect(banner).toBeTruthy();

    // playSE should be called with victory
    expect(playSE).toHaveBeenCalledWith('victory');
  });

  // (a continued) Defeat case
  it('shows defeat banner color when lastResult.loser matches playerName', () => {
    const lastResult: BattleResult = {
      winner: 'OPPONENT',
      loser: 'ME',
      reason: 'battle_complete',
      log: [],
      fansGained: 0,
    };

    const { container } = render(
      <Standings
        {...defaultProps}
        lastResult={lastResult}
        battleResult="OPPONENT wins"
        standings={makeStandings([
          { name: 'OPPONENT', wins: 2, fans: 10, isPlayer: false },
          { name: 'ME', wins: 1, fans: 5, isPlayer: true },
        ])}
      />,
    );

    // Defeat banner should have red styling
    const banner = container.querySelector('[class*="border-neon-red"]');
    expect(banner).toBeTruthy();

    expect(playSE).toHaveBeenCalledWith('defeat');
  });

  // (a continued) null lastResult → neutral
  it('shows neutral banner when lastResult is null', () => {
    const { container } = render(
      <Standings
        {...defaultProps}
        lastResult={null}
        battleResult="some result"
        standings={makeStandings([
          { name: 'ME', wins: 1, fans: 5, isPlayer: true },
        ])}
      />,
    );

    // Neutral banner should have amber styling
    const banner = container.querySelector('[class*="border-neon-amber"]');
    expect(banner).toBeTruthy();

    // No SE should be played for neutral
    expect(playSE).not.toHaveBeenCalled();
  });

  // (b) REQ-UX-03: 前回値ありで ▲▼ 表示
  it('displays rank change indicators when previous ranks exist', async () => {
    // Mock rankHistory to return previous ranks
    const rankHistory = await import('../utils/rankHistory');
    const mockGetPreviousRanks = vi.mocked(rankHistory.getPreviousRanks);

    // Simulate previous ranks: ME was rank 3, OPP was rank 1
    const prevRanks = new Map<string, number>([
      ['ME', 3],
      ['OPP', 1],
    ]);
    mockGetPreviousRanks.mockReturnValue(prevRanks);

    render(
      <Standings
        {...defaultProps}
        standings={makeStandings([
          { name: 'OPP', wins: 3, fans: 15, isPlayer: false }, // was 1, now 1 → same
          { name: 'ME', wins: 2, fans: 10, isPlayer: true },   // was 3, now 2 → improved ▲
        ])}
      />,
    );

    // ME should have rank up indicator (▲)
    const allText = document.body.textContent || '';
    expect(allText).toContain('▲'); // ME moved from 3 to 2
  });
});
