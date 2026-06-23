import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BattleArena from './BattleArena';

vi.mock('../hooks/useWebSocket', () => ({
  useWebSocket: vi.fn(),
}));

import { useWebSocket } from '../hooks/useWebSocket';

const mockBattleState = {
  playerHand: [
    { id: 'p1', name: 'AI Core', power: 5, image: '/images/cards/ai_001.png' },
  ],
  playerField: [
    { id: 'p2', name: 'Virus Spike', power: 3, image: '/images/cards/virus_001.png' },
  ],
  playerMemorySlots: [],
  opponentHand: [
    { id: 'o1', name: 'Shield Wall', power: 2, image: '/images/cards/hw_001.png' },
  ],
  opponentField: [
    { id: 'o2', name: 'Firewall', power: 4, image: '/images/cards/nr_001.png' },
  ],
  opponentMemorySlots: [],
};

describe('BattleArena', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders player and opponent areas when battleState is available', () => {
    (useWebSocket as any).mockReturnValue({ battleState: mockBattleState });
    render(<BattleArena />);

    expect(screen.getByText('YOUR ARENA')).toBeDefined();
    expect(screen.getByText('OPPONENT ARENA')).toBeDefined();

    // Player cards appear
    expect(screen.getByText('AI Core')).toBeDefined();
    expect(screen.getByText('Virus Spike')).toBeDefined();

    // Opponent cards appear
    expect(screen.getByText('Shield Wall')).toBeDefined();
    expect(screen.getByText('Firewall')).toBeDefined();
  });

  it('shows waiting message when battleState is null', () => {
    (useWebSocket as any).mockReturnValue({ battleState: null });
    render(<BattleArena />);
    expect(screen.getByText('Waiting for battle...')).toBeDefined();
  });

  it('renders both hand and field sections for each player', () => {
    (useWebSocket as any).mockReturnValue({ battleState: mockBattleState });
    render(<BattleArena />);

    const headers = screen.getAllByRole('heading', { level: 3 });
    expect(headers.length).toBe(4);
  });
});
