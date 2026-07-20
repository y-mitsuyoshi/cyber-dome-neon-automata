import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Podium from './Podium';
import type { Standing } from '../types/game';

// ── Mocks ───────────────────────────────────────────────────────────
vi.mock('../context/TranslationContext', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const dict: Record<string, string> = {
        rankGold: '金',
        rankSilver: '銀',
        rankBronze: '銅',
        youBadge: 'YOU',
      };
      return dict[key] ?? key;
    },
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

// ── Helpers ─────────────────────────────────────────────────────────
function makeStanding(name: string, isPlayer = false): Standing {
  return { name, wins: 3, fans: 10, isPlayer };
}

// ── Tests ───────────────────────────────────────────────────────────

describe('Podium', () => {
  // (a) REQ-RS-03: 3 名で 3-1-2 順 (中央が top[0]) に描画
  it('renders 3 players in [2nd, 1st, 3rd] order with center being top[0]', () => {
    const top = [
      makeStanding('FIRST'),   // top[0] = 1st
      makeStanding('SECOND'),  // top[1] = 2nd
      makeStanding('THIRD'),   // top[2] = 3rd
    ];

    const { container } = render(<Podium top={top} />);

    // Podium should render content (not null)
    expect(container.firstChild).not.toBeNull();

    // Names should be present in the document
    expect(screen.getByText('FIRST')).toBeDefined();
    expect(screen.getByText('SECOND')).toBeDefined();
    expect(screen.getByText('THIRD')).toBeDefined();

    // Verify order in DOM: 2nd should appear before 1st, 1st before 3rd
    const allText = document.body.textContent || '';
    const secondPos = allText.indexOf('SECOND');
    const firstPos = allText.indexOf('FIRST');
    const thirdPos = allText.indexOf('THIRD');

    expect(secondPos).toBeLessThan(firstPos);
    expect(firstPos).toBeLessThan(thirdPos);
  });

  // (b) REQ-RS-04: 自分の名前に YOU マーク
  it('shows YOU badge next to the player\'s own name', () => {
    const top = [
      makeStanding('FIRST', true),   // player
      makeStanding('SECOND', false),
      makeStanding('THIRD', false),
    ];

    render(<Podium top={top} playerName="FIRST" />);

    const youBadges = screen.getAllByText('YOU');
    expect(youBadges.length).toBeGreaterThanOrEqual(1);
  });

  // (c) REQ-RS-03: 2 名以下で非表示
  it('renders nothing when fewer than 3 players', () => {
    const top2 = [
      makeStanding('FIRST'),
      makeStanding('SECOND'),
    ];

    const { container } = render(<Podium top={top2} />);
    expect(container.firstChild).toBeNull();

    // Also test with 1 player
    const { container: container2 } = render(<Podium top={[makeStanding('FIRST')]} />);
    expect(container2.firstChild).toBeNull();

    // Also test with empty
    const { container: container3 } = render(<Podium top={[]} />);
    expect(container3.firstChild).toBeNull();
  });
});
