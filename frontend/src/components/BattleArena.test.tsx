import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import BattleArena from './BattleArena';
import type { BattleLogEntry, Card } from '../types/game';

vi.mock('../context/AudioContext', () => ({
  useAudio: () => ({ playSE: vi.fn() }),
}));

vi.mock('../context/TranslationContext', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    translateCardName: (name: string) => name,
    translateBattleDetail: (detail: string) => detail,
    translateCard: (card: Card) => card,
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

const mockLogWithBothSides: BattleLogEntry[] = [
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
    playerMemSlots: ['CardA(x1)', 'CardB(x2)'],
    cpuMemSlots: ['CardC(x1)'],
    playerDeckCount: 10,
    cpuDeckCount: 8,
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

  it('renders left and right side information', () => {
    const { container } = render(
      <BattleArena
        gameId="test"
        playerName="PLAYER_ONE"
        battleSession={null}
        battleLog={mockLogWithBothSides}
        opponent="CPU"
        onComplete={() => {}}
        deck={mockDeck}
        onStep={async () => {}}
        onSubmitAction={async (_actionType, _cardIds) => {}}
        loading={false}
        opponentIsNPC={true}
      />
    );

    // Left side: player memory label (translation key)
    expect(container.textContent).toContain('yourMemory');
    // Right side: opponent memory label
    expect(container.textContent).toContain('npcMemoryLabel');
    // Player deck count
    expect(container.textContent).toContain('10');
    // Opponent deck count
    expect(container.textContent).toContain('8');
  });
});
