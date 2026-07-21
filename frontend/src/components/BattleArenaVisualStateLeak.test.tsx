import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import BattleArena from './BattleArena';
import type { BattleLogEntry, Card } from '../types/game';

const stableAudio = { playSE: vi.fn() };
vi.mock('../context/AudioContext', () => ({
  useAudio: () => stableAudio,
}));

const stableTranslation = {
  t: (key: string) => key,
  translateCardName: (name: string) => name,
  translateBattleDetail: (detail: string) => detail,
  translateCard: (card: Card) => card,
};
vi.mock('../context/TranslationContext', () => ({
  useTranslation: () => stableTranslation,
}));

const mockDeck: Card[] = [
  {
    id: 'card_1',
    name: 'Cyber Core',
    attribute: 'AI',
    archetype: 'Control',
    power: 4,
    rarity: 'Common',
    effect: '',
    effectType: '',
    cost: 0,
  }
];

describe('BattleArena Visual State Leak (Empirical Verification)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('proves that flash states are leaked when step transitions occur rapidly', () => {
    const stepLog: BattleLogEntry[] = [
      {
        step: 1,
        action: 'flag_change',
        player: 'PLAYER_ONE',
        card: { id: 'c1', name: 'Cyber Core', power: 4, attribute: 'AI', basePower: 4 },
        p1Card: null,
        p2Card: null,
        p1Action: '',
        p2Action: '',
        currentPower: 4,
        effectTriggered: '',
        playerMemSlots: [],
        cpuMemSlots: [],
        playerDeckCount: 9,
        cpuDeckCount: 10,
        playerHandCount: 0,
        cpuHandCount: 0,
        flagHolder: 'PLAYER_ONE',
        details: 'PLAYER_ONE captures the flag',
      },
      {
        step: 2,
        action: 'reveal',
        player: 'CPU',
        card: { id: 'c2', name: 'Opponent Card', power: 3, attribute: 'AI', basePower: 3 },
        p1Card: null,
        p2Card: null,
        p1Action: '',
        p2Action: '',
        currentPower: 3,
        effectTriggered: '',
        playerMemSlots: [],
        cpuMemSlots: [],
        playerDeckCount: 9,
        cpuDeckCount: 9,
        playerHandCount: 0,
        cpuHandCount: 0,
        flagHolder: 'PLAYER_ONE',
        details: 'CPU reveals a card',
      },
    ];

    const { container, rerender } = render(
      <BattleArena
        gameId="test_game"
        playerName="PLAYER_ONE"
        battleSession={null}
        battleLog={[stepLog[0]]}
        opponent="CPU"
        onComplete={() => {}}
        deck={mockDeck}
        onStep={async () => {}}
        onSubmitAction={async () => {}}
        loading={false}
        opponentIsNPC={true}
      />
    );

    // Initially at step 1: flag_change triggers flash overlay
    expect(container.querySelector('.animate-impact-flash-cyan')).not.toBeNull();

    // Advance timer partially (100ms), before 500ms flash duration is complete
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Verify flash is still active
    expect(container.querySelector('.animate-impact-flash-cyan')).not.toBeNull();

    // Advance to step 2 (reveal action) before flash duration completes by updating battleLog
    act(() => {
      rerender(
        <BattleArena
          gameId="test_game"
          playerName="PLAYER_ONE"
          battleSession={null}
          battleLog={stepLog}
          opponent="CPU"
          onComplete={() => {}}
          deck={mockDeck}
          onStep={async () => {}}
          onSubmitAction={async () => {}}
          loading={false}
          opponentIsNPC={true}
        />
      );
    });

    // Advance timer by more than 1000ms (so any pending timeout should have fired, and the states cleared by cleanup)
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Verify flash overlay is null (removed from DOM)
    expect(container.querySelector('.animate-impact-flash-cyan')).toBeNull();
  });
});
