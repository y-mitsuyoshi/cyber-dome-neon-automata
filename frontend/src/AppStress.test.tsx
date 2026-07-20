import { describe, it, expect, vi, beforeEach } from 'vitest';
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
    translateBattleResult: (result: string) => result,
  }),
}));

const wsMockState = {
  connected: true,
  lobbyState: null as any,
  chatMessages: [] as any[],
  gameId: null as string | null,
  phaseTrigger: false,
  battleTrigger: false,
  kicked: false,
};

// Mock WebSocket hook to allow dynamic stimulation
vi.mock('./hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    connected: wsMockState.connected,
    lobbyState: wsMockState.lobbyState,
    chatMessages: wsMockState.chatMessages,
    gameId: wsMockState.gameId,
    phaseTrigger: wsMockState.phaseTrigger,
    battleTrigger: wsMockState.battleTrigger,
    kicked: wsMockState.kicked,
    sendChatMessage: vi.fn(),
    resetTrigger: vi.fn(() => {
      wsMockState.phaseTrigger = false;
    }),
    resetBattleTrigger: vi.fn(() => {
      wsMockState.battleTrigger = false;
    }),
    resetGameId: vi.fn(() => {
      wsMockState.gameId = null;
    }),
    resetKicked: vi.fn(() => {
      wsMockState.kicked = false;
    }),
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
  battleSession: {
    sessionId: 'session_1',
    player1Name: 'PLAYER_ONE',
    player2Name: 'CPU_OPPONENT',
    player1Wins: 0,
    player2Wins: 0,
    requiredAction: 'DRAW',
    pendingActionPlayer: 'PLAYER_ONE',
    step: 1,
    log: [],
    isFinished: true, // Mark finished so we see the complete/continue button immediately
    player1Deck: [mockCard],
    player2Deck: [mockCard],
    player1Mem: [],
    player2Mem: [],
  },
};

describe('App Manual Transition Standby Stress Test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    wsMockState.connected = true;
    wsMockState.gameId = null;
    wsMockState.phaseTrigger = false;
  });

  it('shows waitingForOpponents standby overlay in multiplayer mode when completeBattle resolves to battle phase, and removes it on WS phase transition to results', async () => {
    // 1. Mock API calls
    const spyCreateLobby = vi.spyOn(clientApi, 'createLobby').mockResolvedValue({
      code: 'LOBBY123',
      host: 'PLAYER_ONE',
    });

    const spyGetGameState = vi.spyOn(clientApi, 'getGameState')
      .mockResolvedValueOnce({ ...mockGameState, phase: 'battle' }) // when game starts
      .mockResolvedValueOnce({ ...mockGameState, phase: 'results' }); // when phaseTrigger updates

    const spyCompleteBattle = vi.spyOn(clientApi, 'completeBattle').mockResolvedValue({
      ...mockGameState,
      phase: 'battle',
    });

    const { rerender } = render(<App />);

    // 2. Click "createArena" on title screen to enter multiplayer lobby state
    const createBtn = screen.getByText('createArena');
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(spyCreateLobby).toHaveBeenCalled();
    });

    // 3. Stimulate start game by updating wsMockState and rerendering
    wsMockState.gameId = 'test_game_123';
    rerender(<App />);

    await waitFor(() => {
      expect(spyGetGameState).toHaveBeenCalledWith('test_game_123', 'PLAYER_ONE');
    });

    // 4. Click complete button inside BattleArena view
    const completeBtn = screen.getByText('continueToStandings');
    fireEvent.click(completeBtn);

    await waitFor(() => {
      expect(spyCompleteBattle).toHaveBeenCalledWith('test_game_123', 'PLAYER_ONE');
    });

    // 5. Verify that the standby overlay "waitingForOpponents" is shown
    expect(screen.getByText('waitingForOpponents')).toBeDefined();

    // 6. Stimulate WebSocket transition to results phase
    wsMockState.phaseTrigger = true;
    rerender(<App />);

    await waitFor(() => {
      // The standby overlay should be gone
      expect(screen.queryByText('waitingForOpponents')).toBeNull();
    });
  });
});
