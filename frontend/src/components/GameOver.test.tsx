import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import GameOver from './GameOver';
import type { Standing } from '../types/game';

// ── Mocks ───────────────────────────────────────────────────────────
const playSE = vi.fn();

vi.mock('../context/AudioContext', () => ({
  useAudio: () => ({ playSE }),
}));

vi.mock('../context/TranslationContext', () => ({
  useTranslation: () => ({
    locale: 'ja',
    t: (key: string, replacements?: Record<string, string | number>) => {
      // Provide enough translations for the component to render
      const dict: Record<string, string> = {
        tournamentCompleteLabel: 'TOURNAMENT COMPLETE',
        championAnnounce: `チャンピオン: ${replacements?.name ?? ''}`,
        championDesc: 'CHAMPION DESC',
        playerFinalRank: `Rank ${replacements?.rank} — ${replacements?.wins}W ${replacements?.fans}★`,
        finalRankingsHeader: 'FINAL RANKINGS',
        youBadge: 'YOU',
        playerWins: `${replacements?.wins}W`,
        newGameBtn: 'NEW GAME',
        rankGold: '金',
        rankSilver: '銀',
        rankBronze: '銅',
        yourResultSummary: 'YOUR RESULT',
        rankHeader: 'RANK',
        winsHeader: 'WINS',
        fansHeader: 'FANS',
      };
      return dict[key] ?? key;
    },
    translateCard: (card: any) => card,
    translateCardName: (name: string) => name,
    translateBattleDetail: (detail: string) => detail,
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
  rankTier: (rank: number) => {
    if (rank === 1) return 'gold';
    if (rank === 2) return 'silver';
    if (rank === 3) return 'bronze';
    return 'none';
  },
}));

vi.mock('../hooks/useCountUp', () => ({
  useCountUp: (target: number) => target,
}));

vi.mock('../components/Podium', () => ({
  default: ({ top }: { top: Standing[] }) => (
    <div data-testid="podium">
      {top.map((s: Standing) => (
        <span key={s.name}>{s.name}</span>
      ))}
    </div>
  ),
}));

vi.mock('../components/PlayerResultSummary', () => ({
  default: ({ rank, wins, fans }: { rank: number; wins: number; fans: number }) => (
    <div data-testid="player-summary">Rank {rank}, {wins}W, {fans}★</div>
  ),
}));

// ── Helpers ─────────────────────────────────────────────────────────
function makeStandings(
  entries: Array<{ name: string; wins: number; fans: number; isPlayer: boolean }>,
): Standing[] {
  return entries.map(e => ({ ...e }));
}

// ── Tests ───────────────────────────────────────────────────────────

describe('GameOver', () => {
  beforeEach(() => {
    playSE.mockClear();
  });

  // (a) REQ-RS-02: 再ソート廃止の回帰
  // サーバー順と異なる wins/fans 順の入力で、配列先頭が 1 位に表示される
  it('displays standings in server order without re-sorting (regression for sort removal)', () => {
    // Server sends: winner first even though they have fewer wins/fans
    const standings = makeStandings([
      { name: 'WINNER', wins: 1, fans: 5, isPlayer: false },    // 1st — server order
      { name: 'LOSER', wins: 3, fans: 20, isPlayer: true },    // 2nd — more wins/fans but lost final
      { name: 'THIRD', wins: 2, fans: 10, isPlayer: false },   // 3rd
      { name: 'FOURTH', wins: 1, fans: 2, isPlayer: false },   // 4th
    ]);

    render(<GameOver standings={standings} onRestart={vi.fn()} />);

    // Verify WINNER appears before LOSER in the DOM order (server order preserved)
    const allText = document.body.textContent || '';
    const winnerPos = allText.indexOf('WINNER');
    const loserPos = allText.indexOf('LOSER');
    expect(winnerPos).toBeLessThan(loserPos);

    // Champion announce should show WINNER
    expect(allText).toContain('チャンピオン: WINNER');
  });

  // (b) REQ-RS-03: SE 3-way branching
  it('plays fanfare for rank 1, victory for rank 2/3, defeat for rank 4+', () => {
    const rankCases: Array<{ rank: number; expectedSE: string }> = [
      { rank: 1, expectedSE: 'fanfare' },
      { rank: 2, expectedSE: 'victory' },
      { rank: 3, expectedSE: 'victory' },
      { rank: 4, expectedSE: 'defeat' },
    ];

    for (const { rank, expectedSE } of rankCases) {
      playSE.mockClear();
      const standings = makeStandings(
        Array.from({ length: 4 }, (_, i) => ({
          name: `P${i + 1}`,
          wins: 3 - i,
          fans: 10 - i,
          isPlayer: i === rank - 1,
        })),
      );

      const { unmount } = render(<GameOver standings={standings} onRestart={vi.fn()} />);
      expect(playSE).toHaveBeenCalledTimes(1);
      expect(playSE).toHaveBeenCalledWith(expectedSE);
      unmount();
    }
  });

  // (c) REQ-RS-01: 非優勝時に優勝者名が championAnnounce で表示される
  it('shows champion name via championAnnounce when player is not the winner', () => {
    const standings = makeStandings([
      { name: 'CHAMPION', wins: 3, fans: 15, isPlayer: false },
      { name: 'ME', wins: 2, fans: 10, isPlayer: true },
      { name: 'OTHER', wins: 1, fans: 5, isPlayer: false },
    ]);

    render(<GameOver standings={standings} onRestart={vi.fn()} />);

    // Champion name should be prominently displayed
    expect(screen.getByText('チャンピオン: CHAMPION')).toBeDefined();

    // Player's own rank summary should be shown (appears in both champion section and summary)
    const rank2Elements = screen.getAllByText(/Rank 2/);
    expect(rank2Elements.length).toBeGreaterThanOrEqual(1);
  });

  // (d) REQ-RS-04: 自分の行に youBadge がある
  it('shows YOU badge on the player\'s own row', () => {
    const standings = makeStandings([
      { name: 'WINNER', wins: 3, fans: 15, isPlayer: false },
      { name: 'ME', wins: 2, fans: 10, isPlayer: true },
      { name: 'OTHER', wins: 1, fans: 5, isPlayer: false },
    ]);

    render(<GameOver standings={standings} onRestart={vi.fn()} />);

    // There should be a YOU badge for the player (t('youBadge') returns 'YOU')
    const youBadges = screen.getAllByText('YOU');
    expect(youBadges.length).toBeGreaterThanOrEqual(1);
  });
});
