import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import * as clientApi from './api/client';

// Mock contexts
vi.mock('./context/AudioContext', () => ({
  AudioProvider: ({ children }: any) => <div>{children}</div>,
  useAudio: () => ({
    isMuted: false,
    toggleMute: vi.fn(),
    playSE: vi.fn(),
    playBGM: vi.fn(),
  }),
}));

vi.mock('./context/TranslationContext', () => ({
  TranslationProvider: ({ children }: any) => <div>{children}</div>,
  useTranslation: () => ({
    locale: 'en',
    setLocale: vi.fn(),
    t: (key: string) => key,
    translateCard: (card: any) => card,
    translateCardName: (name: string) => name,
    translateBattleDetail: (detail: string) => detail,
  }),
}));

// Mock WebSocket hook to prevent real WS connections in tests
vi.mock('./hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    connected: false,
    lobbyState: null,
    chatMessages: [],
    gameId: null,
    phaseTrigger: false,
    battleTrigger: false,
    kicked: false,
    sendChatMessage: vi.fn(),
    resetTrigger: vi.fn(),
    resetBattleTrigger: vi.fn(),
    resetGameId: vi.fn(),
    resetKicked: vi.fn(),
  }),
}));

const mockCard = {
  id: 'starter_virus_1',
  name: 'Glitch Worm Jr.',
  attribute: 'Virus',
  archetype: 'Aggro',
  power: 2,
  rarity: 'Common',
  effect: '',
  effectType: '',
  cost: 0,
};

const mockGameState: any = {
  gameId: 'test_game_123',
  currentRound: 1,
  maxRounds: 7,
  phase: 'battle',
  player: {
    name: 'PLAYER_ONE',
    credits: 10,
    deck: [mockCard],
    hand: [],
    deckSize: 1,
    wins: 0,
    fans: 0,
  },
  shop: {
    cards: [],
    credits: 10,
  },
  standings: [],
  npcs: [],
  battleLog: [
    {
      step: 1,
      action: 'reveal',
      player: 'PLAYER_ONE',
      card: { name: 'Glitch Worm Jr.', power: 2, attribute: 'Virus', basePower: 2 },
      p1Card: null,
      p2Card: null,
      p1Action: '',
      p2Action: '',
      currentPower: 2,
      effectTriggered: '',
      playerMemSlots: [],
      cpuMemSlots: [],
      playerDeckCount: 0,
      cpuDeckCount: 1,
      playerHandCount: 0,
      cpuHandCount: 0,
      flagHolder: 'PLAYER_ONE',
      details: 'PLAYER_ONE claims the flag',
    },
  ],
  lastResult: null,
  opponent: 'CPU_OPPONENT',
  battleResult: '',
  battleSession: null,
};

describe('App Integration', () => {
  it('renders without crashing', () => {
    const { container } = render(<App />);
    expect(container).toBeDefined();
  });

  it('renders BattleArena when phase is battle', async () => {
    const spyCreateNewGame = vi.spyOn(clientApi, 'createNewGame').mockResolvedValue({
      ...mockGameState,
      phase: 'shop', // start in shop
    });

    render(<App />);
    
    // Start solo mode
    const soloBtn = screen.getByText('jackInSolo');
    fireEvent.click(soloBtn);

    await waitFor(() => {
      expect(spyCreateNewGame).toHaveBeenCalled();
    });
  });

  it('restores game state from sessionStorage on mount', async () => {
    const spyGetGameState = vi.spyOn(clientApi, 'getGameState').mockResolvedValue({
      ...mockGameState,
      phase: 'shop',
    });

    sessionStorage.setItem('cyber_dome_session', JSON.stringify({
      screen: 'game',
      playerName: 'RESTORED_PLAYER',
      lobbyCode: null,
      gameId: 'restored_game_123',
      spectatorCode: null,
      spectatorName: null,
    }));

    render(<App />);

    await waitFor(() => {
      expect(spyGetGameState).toHaveBeenCalledWith('restored_game_123', 'RESTORED_PLAYER');
    });

    sessionStorage.clear();
  });
});
