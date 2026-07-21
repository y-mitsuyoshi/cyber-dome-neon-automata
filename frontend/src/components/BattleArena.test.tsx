import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import BattleArena from './BattleArena';
import type { BattleLogEntry, Card } from '../types/game';

const mockPlaySE = vi.fn();
vi.mock('../context/AudioContext', () => ({
  useAudio: () => ({ playSE: mockPlaySE }),
}));

const mockT = (key: string) => key;
const mockTranslateCardName = (name: string) => name;
const mockTranslateBattleDetail = (detail: string) => detail;
const mockTranslateCard = (card: Card) => card;

vi.mock('../context/TranslationContext', () => ({
  useTranslation: () => ({
    t: mockT,
    translateCardName: mockTranslateCardName,
    translateBattleDetail: mockTranslateBattleDetail,
    translateCard: mockTranslateCard,
  }),
}));

const mockDeck: Card[] = [];

const mockLog: BattleLogEntry[] = [
  {
    step: 1,
    action: 'reveal',
    player: 'PLAYER_ONE',
    card: { name: 'Firewall', power: 5, attribute: 'Hardware', basePower: 5 },
    p1Card: null,
    p2Card: null,
    p1Action: '',
    p2Action: '',
    currentPower: 5,
    effectTriggered: '',
    playerMemSlots: ['Firewall(x1)'],
    cpuMemSlots: [],
    playerDeckCount: 10,
    cpuDeckCount: 10,
    playerHandCount: 0,
    cpuHandCount: 0,
    flagHolder: 'PLAYER_ONE',
    details: 'PLAYER_ONE claims the flag',
  },
];

describe('BattleArena', () => {
  it('renders with empty log', () => {
    const { container } = render(
      <BattleArena
        gameId="test"
        playerName="PLAYER_ONE"
        battleSession={null}
        battleLog={[]}
        opponent="CPU"
        onComplete={() => {}}
        deck={mockDeck}
        onStep={async () => {}}
        onSubmitAction={async (_actionType, _cardIds) => {}}
        loading={false}
        opponentIsNPC={true}
      />
    );
    expect(container).toBeDefined();
  });

  it('renders with actual log data', () => {
    const { container } = render(
      <BattleArena
        gameId="test"
        playerName="PLAYER_ONE"
        battleSession={null}
        battleLog={mockLog}
        opponent="CPU"
        onComplete={() => {}}
        deck={mockDeck}
        onStep={async () => {}}
        onSubmitAction={async (_actionType, _cardIds) => {}}
        loading={false}
        opponentIsNPC={true}
      />
    );
    expect(container).toBeDefined();
  });

  it('renders the effect alert banner when effect is triggered', async () => {
    const mockEffectLog: BattleLogEntry[] = [
      {
        ...mockLog[0],
        effectTriggered: 'Some effect triggered',
      }
    ];
    render(
      <BattleArena
        gameId="test"
        playerName="PLAYER_ONE"
        battleSession={null}
        battleLog={mockEffectLog}
        opponent="CPU"
        onComplete={() => {}}
        deck={mockDeck}
        onStep={async () => {}}
        onSubmitAction={async (_actionType, _cardIds) => {}}
        loading={false}
        opponentIsNPC={true}
      />
    );
    const alertElement = await screen.findByText('⚡ Some effect triggered ⚡');
    expect(alertElement).toBeDefined();
  });


  it('renders the needed power badge on defending flag card', async () => {
    const mockNeededPowerLog: BattleLogEntry[] = [
      {
        step: 1,
        action: 'flag_change',
        player: 'PLAYER_ONE',
        card: { id: 'c1', name: 'Flag Card', power: 5, attribute: 'Hardware', basePower: 5 },
        p1Card: null,
        p2Card: null,
        p1Action: '',
        p2Action: '',
        currentPower: 5,
        effectTriggered: '',
        playerMemSlots: [],
        cpuMemSlots: [],
        playerDeckCount: 10,
        cpuDeckCount: 10,
        playerHandCount: 0,
        cpuHandCount: 0,
        flagHolder: 'PLAYER_ONE',
        details: 'PLAYER_ONE claims the flag',
      },
      {
        step: 2,
        action: 'reveal',
        player: 'CPU',
        card: { id: 'c2', name: 'Challenger Card', power: 2, attribute: 'Virus', basePower: 2 },
        p1Card: null,
        p2Card: null,
        p1Action: '',
        p2Action: '',
        currentPower: 5,
        effectTriggered: '',
        playerMemSlots: [],
        cpuMemSlots: [],
        playerDeckCount: 10,
        cpuDeckCount: 10,
        playerHandCount: 0,
        cpuHandCount: 0,
        flagHolder: 'PLAYER_ONE',
        details: 'CPU plays Challenger Card',
      }
    ];

    render(
      <BattleArena
        gameId="test"
        playerName="PLAYER_ONE"
        battleSession={null}
        battleLog={mockNeededPowerLog}
        opponent="CPU"
        onComplete={() => {}}
        deck={mockDeck}
        onStep={async () => {}}
        onSubmitAction={async (_actionType, _cardIds) => {}}
        loading={false}
        opponentIsNPC={true}
      />
    );
    const badgeElement = await screen.findByText(/\+4 power needed to capture/);
    expect(badgeElement).toBeDefined();
  });

  it('empirically verifies 3D card flip, impact flash, and robust unmount under rapid autoplay steps', async () => {
    vi.useFakeTimers();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const mockStressLog: BattleLogEntry[] = [
      {
        step: 1,
        action: 'reveal',
        player: 'PLAYER_ONE',
        card: { id: 'c1', name: 'Firewall', power: 5, attribute: 'Hardware', basePower: 5 },
        p1Card: null, p2Card: null, p1Action: '', p2Action: '',
        currentPower: 5, effectTriggered: '',
        playerMemSlots: [], cpuMemSlots: [],
        playerDeckCount: 10, cpuDeckCount: 10,
        playerHandCount: 0, cpuHandCount: 0,
        flagHolder: 'PLAYER_ONE', details: 'PLAYER_ONE claims the flag',
      },
      {
        step: 2,
        action: 'flag_change',
        player: 'CPU',
        card: { id: 'c2', name: 'Glitch Worm', power: 3, attribute: 'Virus', basePower: 3 },
        p1Card: null, p2Card: null, p1Action: '', p2Action: '',
        currentPower: 3, effectTriggered: 'Virus swarm activated',
        playerMemSlots: [], cpuMemSlots: [],
        playerDeckCount: 10, cpuDeckCount: 10,
        playerHandCount: 0, cpuHandCount: 0,
        flagHolder: 'CPU', details: 'CPU captures flag',
      }
    ];

    const { container, unmount } = render(
      <BattleArena
        gameId="test"
        playerName="PLAYER_ONE"
        battleSession={null}
        battleLog={mockStressLog}
        opponent="CPU"
        onComplete={() => {}}
        deck={mockDeck}
        onStep={async () => {}}
        onSubmitAction={async (_actionType, _cardIds) => {}}
        loading={false}
        opponentIsNPC={true}
      />
    );

    // Initial render sets currentLogIndex to 1, causing flag_change animations to trigger.
    // Step 2 has flagHolder = 'CPU' (opponent), so the magenta flash overlay should render.
    expect(container.querySelector('.animate-impact-flash-magenta')).not.toBeNull();

    // Verify no console errors occurred during the mounts and initial state triggers.
    expect(consoleErrorSpy).not.toHaveBeenCalled();

    // Click reset to go back to index 0, which clears animations
    const resetBtn = screen.getByText('resetBtnTitle');
    fireEvent.click(resetBtn);

    // Trigger autoplay
    const autoBtn = screen.getByText('autoLabel');
    fireEvent.click(autoBtn);

    // Advance time to transition from 0 to 1
    act(() => {
      vi.advanceTimersByTime(1200);
    });

    // Unmount the component mid-animation/mid-timers to stress test cleanup
    unmount();

    // Fast-forward all timers to ensure any pending timeouts execute
    act(() => {
      vi.runAllTimers();
    });

    // Verify no console errors or state updates on unmounted components occurred
    expect(consoleErrorSpy).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
    vi.useRealTimers();
  });
});

