import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BattleArena from './BattleArena';
import { BattleState } from '../types/game';

const mockBattleState: BattleState = {
  playerField: [
    { id: 'p1', name: 'Virus A', power: 5, imageUrl: '/test.png' },
  ],
  opponentField: [
    { id: 'o1', name: 'Shield B', power: 3, imageUrl: '/test.png' },
  ],
  playerHand: [
    { id: 'p2', name: 'AI Core', power: 2 },
  ],
  opponentHand: [
    { id: 'o2', name: 'Netrunner X', power: 4 },
  ],
  playerMemory: [],
  opponentMemory: [],
};

describe('BattleArena', () => {
  it('renders player and opponent areas', () => {
    render(<BattleArena battleState={mockBattleState} playerId="player1" />);

    // Check headings
    expect(screen.getByText('Your Field')).toBeDefined();
    expect(screen.getByText('Opponent Field')).toBeDefined();
    expect(screen.getByText('Hand')).toBeDefined();

    // Check player field card
    expect(screen.getByText('Virus A')).toBeDefined();
    // Opponent field card
    expect(screen.getByText('Shield B')).toBeDefined();

    // Opponent hand should be face down (show '?')
    expect(screen.getAllByText('?')).toHaveLength(1); // only opponent hand is faceDown
  });

  it('shows waiting message when no battle state', () => {
    render(<BattleArena battleState={null} playerId="player1" />);
    expect(screen.getByText('Waiting for battle...')).toBeDefined();
  });
});
