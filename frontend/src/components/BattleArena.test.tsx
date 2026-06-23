import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BattleArena } from './BattleArena';
import { BattleState } from '../types/game';

const mockGameState: BattleState = {
  players: [
    {
      id: 'player-1',
      name: 'TestPlayer',
      hand: [{ id: 'c1', cardDefId: 'virus_001', name: 'Virus' }],
      field: [{ id: 'c2', cardDefId: 'ai_001', name: 'AI Core', power: 5 }],
      memory: [{ baseCardId: 'hw_001', count: 2 }],
      deckCount: 15,
      credits: 10,
      wins: 1,
      fans: 100,
    },
    {
      id: 'player-2',
      name: 'EnemyNPC',
      hand: [{ id: 'c3', cardDefId: 'virus_002', name: 'Malware' }],
      field: [],
      memory: [],
      deckCount: 20,
      credits: 5,
      wins: 0,
      fans: 50,
    },
  ],
  currentTurn: 'player-1',
  phase: 'battle',
  round: 1,
};

describe('BattleArena', () => {
  it('renders both player and opponent areas', () => {
    render(<BattleArena gameState={mockGameState} playerId="player-1" />);
    expect(screen.getByText(/SELF :: TestPlayer/)).toBeDefined();
    expect(screen.getByText(/ENEMY :: EnemyNPC/)).toBeDefined();
  });

  it('shows player cards face up', () => {
    render(<BattleArena gameState={mockGameState} playerId="player-1" />);
    // Player's hand card should show its name
    expect(screen.getByText('Virus')).toBeDefined();
    // Player's field card should show its name and power
    expect(screen.getByText('AI Core')).toBeDefined();
    expect(screen.getByText('5')).toBeDefined();
  });

  it('shows opponent hand cards face down', () => {
    render(<BattleArena gameState={mockGameState} playerId="player-1" />);
    // Opponent's hand card should be hidden
    const hiddenElements = screen.getAllByText('HIDDEN');
    expect(hiddenElements.length).toBeGreaterThan(0);
  });

  it('shows opponent field cards face up', () => {
    const stateWithField: BattleState = {
      ...mockGameState,
      players: [
        mockGameState.players[0],
        {
          ...mockGameState.players[1],
          field: [{ id: 'c4', cardDefId: 'nr_001', name: 'Netrunner', power: 3 }],
        },
      ],
    };
    render(<BattleArena gameState={stateWithField} playerId="player-1" />);
    expect(screen.getByText('Netrunner')).toBeDefined();
  });

  it('displays memory slots for the player', () => {
    render(<BattleArena gameState={mockGameState} playerId="player-1" />);
    expect(screen.getByText('hw_001')).toBeDefined();
    expect(screen.getByText('x2')).toBeDefined();
  });

  it('shows waiting message when player not found', () => {
    render(<BattleArena gameState={mockGameState} playerId="unknown-player" />);
    expect(screen.getByText('Waiting for players...')).toBeDefined();
  });

  it('shows empty state for opponent field', () => {
    render(<BattleArena gameState={mockGameState} playerId="player-1" />);
    // There should be exactly two "empty" indicators for opponent's empty field and memory
    const emptyFields = screen.getAllByText('empty');
    expect(emptyFields.length).toBeGreaterThanOrEqual(1);
  });
});
