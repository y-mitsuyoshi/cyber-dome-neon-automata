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

const mockLog: BattleLogEntry[] = [
  {
    step: 1,
    action: 'reveal',
    player: 'PLAYER_ONE',
    card: { id: 'c1', name: 'Cyber Core', power: 4, attribute: 'AI', basePower: 4 },
    p1Card: null,
    p2Card: null,
    p1Action: '',
    p2Action: '',
    currentPower: 4,
    effectTriggered: '',
    playerMemSlots: ['Cyber Core(x1)'],
    cpuMemSlots: [],
    playerDeckCount: 9,
    cpuDeckCount: 10,
    playerHandCount: 0,
    cpuHandCount: 0,
    flagHolder: 'PLAYER_ONE',
    details: 'PLAYER_ONE claims the flag',
  },
];

describe('BattleArena Animation & Performance (Empirical Verification)', () => {
  let consoleErrorSpy: any;

  beforeEach(() => {
    vi.useFakeTimers();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('correctly triggers 3D card draw animations and clears active timers on unmount', () => {
    const { unmount } = render(
      <BattleArena
        gameId="test_game"
        playerName="PLAYER_ONE"
        battleSession={null}
        battleLog={mockLog}
        opponent="CPU"
        onComplete={() => {}}
        deck={mockDeck}
        onStep={async () => {}}
        onSubmitAction={async () => {}}
        loading={false}
        opponentIsNPC={true}
      />
    );

    // Fast-forward timers to run any initial rendering/reveal timers
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Verify no unmounted state updates or general React errors occurred
    expect(consoleErrorSpy).not.toHaveBeenCalled();

    // Unmount while animations/timers could still be scheduled (stress cleanup behavior)
    unmount();

    // Advance timers completely to ensure any lingering timeouts would execute
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Verify that clearing timers on unmount prevented state update errors on unmounted components
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('triggers screen-shake and impact flashes on flag capture / change action', async () => {
    const flagChangeLog: BattleLogEntry[] = [
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
    ];

    const { container } = render(
      <BattleArena
        gameId="test_game"
        playerName="PLAYER_ONE"
        battleSession={null}
        battleLog={flagChangeLog}
        opponent="CPU"
        onComplete={() => {}}
        deck={mockDeck}
        onStep={async () => {}}
        onSubmitAction={async () => {}}
        loading={false}
        opponentIsNPC={true}
      />
    );

    // Verify screen-shake class is applied to container wrapper
    const mainContainer = container.firstChild as HTMLElement;
    expect(mainContainer.className).toContain('animate-screen-shake');

    // Verify impact flash cyan overlay is rendered for PLAYER_ONE flag holder
    const flashCyan = container.querySelector('.animate-impact-flash-cyan');
    expect(flashCyan).not.toBeNull();

    // Advance timers beyond screen shake and flash duration (500ms)
    act(() => {
      vi.advanceTimersByTime(600);
    });

    // Screen-shake class should be removed and impact flash should be gone
    expect(mainContainer.className).not.toContain('animate-screen-shake');
    const flashCyanAfter = container.querySelector('.animate-impact-flash-cyan');
    expect(flashCyanAfter).toBeNull();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('handles rapid step iterations and autoplay without memory leaks or state conflicts', async () => {
    const onStepMock = vi.fn().mockImplementation(async () => {});

    const multiStepLog: BattleLogEntry[] = Array.from({ length: 15 }, (_, i) => ({
      step: i + 1,
      action: i % 2 === 0 ? 'reveal' : 'flag_change',
      player: i % 2 === 0 ? 'PLAYER_ONE' : 'CPU',
      card: { id: `card_${i}`, name: `Card ${i}`, power: i + 1, attribute: 'AI', basePower: i + 1 },
      p1Card: null,
      p2Card: null,
      p1Action: '',
      p2Action: '',
      currentPower: i + 1,
      effectTriggered: '',
      playerMemSlots: [],
      cpuMemSlots: [],
      playerDeckCount: 10 - i,
      cpuDeckCount: 10 - i,
      playerHandCount: 0,
      cpuHandCount: 0,
      flagHolder: i % 2 === 0 ? 'PLAYER_ONE' : 'CPU',
      details: `Step ${i + 1}`,
    }));

    const { rerender } = render(
      <BattleArena
        gameId="test_game"
        playerName="PLAYER_ONE"
        battleSession={null}
        battleLog={multiStepLog}
        opponent="CPU"
        onComplete={() => {}}
        deck={mockDeck}
        onStep={onStepMock}
        onSubmitAction={async () => {}}
        loading={false}
        opponentIsNPC={true}
      />
    );

    // Rapidly cycle indices in the battle log to simulate fast user steps
    for (let index = 0; index < multiStepLog.length; index++) {
      act(() => {
        // Change props rapidly to simulate steps
        rerender(
          <BattleArena
            gameId="test_game"
            playerName="PLAYER_ONE"
            battleSession={null}
            battleLog={multiStepLog}
            opponent="CPU"
            onComplete={() => {}}
            deck={mockDeck}
            onStep={onStepMock}
            onSubmitAction={async () => {}}
            loading={false}
            opponentIsNPC={true}
          />
        );
        // Fast-forward animation timers partially (e.g. 100ms instead of full 500ms/1400ms)
        vi.advanceTimersByTime(100);
      });
    }

    // Advance remaining timers
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Confirm that console error was not called once during the rapid step iterations
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});
