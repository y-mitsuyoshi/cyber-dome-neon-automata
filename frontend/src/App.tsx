import { useState, useEffect } from 'react';
import { Terminal, AlertCircle, ShieldAlert } from 'lucide-react';
import type { GameState } from './types/game';
import TitleScreen from './components/TitleScreen';
import LobbyScreen from './components/LobbyScreen';
import Shop from './components/Shop';
import BattleArena from './components/BattleArena';
import Standings from './components/Standings';
import GameOver from './components/GameOver';
import { useWebSocket } from './hooks/useWebSocket';
import { useTranslation } from './context/TranslationContext';
import {
  createNewGame,
  getGameState,
  buyCard,
  rerollShop,
  deleteCard,
  startBattle,
  nextRound,
  createLobby,
  joinLobby,
  addNPC,
  removeNPC,
  startGame,
} from './api/client';

type Screen = 'title' | 'lobby' | 'game';

function App() {
  const [screen, setScreen] = useState<Screen>('title');
  const [playerName, setPlayerName] = useState<string>('PLAYER_ONE');
  const [lobbyCode, setLobbyCode] = useState<string | null>(null);
  
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Standby waiting states for multiplayer sync
  const [waitingForBattle, setWaitingForBattle] = useState<boolean>(false);
  const [waitingForNextRound, setWaitingForNextRound] = useState<boolean>(false);

  const { locale, setLocale, t } = useTranslation();

  // WebSocket Hook
  const {
    connected,
    lobbyState,
    chatMessages,
    gameId: wsGameId,
    phaseTrigger,
    battleTrigger,
    kicked,
    sendChatMessage,
    resetTrigger,
    resetBattleTrigger,
    resetGameId,
    resetKicked,
  } = useWebSocket(lobbyCode, lobbyCode ? playerName : null);

  // WS Kicked Redirection Listener
  useEffect(() => {
    if (kicked) {
      setScreen('title');
      setLobbyCode(null);
      setGameState(null);
      setError(t('disconnectedMainframe'));
      resetKicked();
    }
  }, [kicked]);

  // 1. Listen for WS start event
  useEffect(() => {
    if (wsGameId) {
      const initGame = async () => {
        setLoading(true);
        try {
          const state = await getGameState(wsGameId, playerName);
          setGameState(state);
          setScreen('game');
          resetGameId();
          setWaitingForBattle(false);
          setWaitingForNextRound(false);
        } catch (err: any) {
          setError(`SYNC_FAILED: ${err.message || 'Failed to pull arena state.'}`);
        } finally {
          setLoading(false);
        }
      };
      initGame();
    }
  }, [wsGameId]);

  // 2. Listen for WS round/phase sync event
  useEffect(() => {
    if (phaseTrigger && gameState) {
      const syncState = async () => {
        try {
          const state = await getGameState(gameState.gameId, playerName);
          setGameState(state);
          // Auto release standby blocks once state phase updates
          if (state.phase === 'battle') {
            setWaitingForBattle(false);
          }
          if (state.phase === 'shop') {
            setWaitingForNextRound(false);
          }
        } catch (err: any) {
          // Silent fallback on desync
        } finally {
          resetTrigger();
        }
      };
      syncState();
    }
  }, [phaseTrigger]);

  // 2.5 Listen for WS battle events
  useEffect(() => {
    if (battleTrigger && gameState) {
      const syncBattleState = async () => {
        try {
          const state = await getGameState(gameState.gameId, playerName);
          setGameState(state);
        } catch (err) {
          // Silent fallback on battle sync
        } finally {
          resetBattleTrigger();
        }
      };
      syncBattleState();
    }
  }, [battleTrigger, gameState, playerName, resetBattleTrigger]);

  // 3. Auto-resync game state on WebSocket reconnection
  useEffect(() => {
    if (connected && screen === 'game' && gameState) {
      const syncOnReconnect = async () => {
        try {
          const state = await getGameState(gameState.gameId, playerName);
          setGameState(state);
          if (state.phase === 'battle') {
            setWaitingForBattle(false);
          }
          if (state.phase === 'shop') {
            setWaitingForNextRound(false);
          }
        } catch (err) {
          // Silent fallback on reconnect pull
        }
      };
      syncOnReconnect();
    }
  }, [connected]);

  // OFFLINE SOLO START
  const handleStartSolo = async () => {
    setLoading(true);
    setError(null);
    setPlayerName('PLAYER_ONE');
    setLobbyCode(null);
    try {
      const state = await createNewGame();
      setGameState(state);
      setScreen('game');
    } catch (err: any) {
      setError(`INITIALIZATION_FAILED: ${err.message || 'Network timeout.'}`);
    } finally {
      setLoading(false);
    }
  };

  // MULTIPLAYER CREATION
  const handleCreateLobby = async (name: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await createLobby(name);
      setPlayerName(name);
      setLobbyCode(res.code);
      setScreen('lobby');
    } catch (err: any) {
      setError(`LOBBY_CREATION_FAILED: ${err.message || 'Sector breach.'}`);
    } finally {
      setLoading(false);
    }
  };

  // MULTIPLAYER JOIN
  const handleJoinLobby = async (code: string, name: string) => {
    setLoading(true);
    setError(null);
    try {
      await joinLobby(code, name);
      setPlayerName(name);
      setLobbyCode(code);
      setScreen('lobby');
    } catch (err: any) {
      setError(`LOBBY_JOIN_FAILED: ${err.message || 'Key refused by core gateway.'}`);
    } finally {
      setLoading(false);
    }
  };

  // LOBBY NPC ACTIONS
  const handleAddNPC = async () => {
    if (!lobbyCode) return;
    try {
      await addNPC(lobbyCode);
    } catch (err: any) {
      setError(`NPC_DEPLOY_FAILED: ${err.message || 'Memory bank full.'}`);
    }
  };

  const handleRemoveNPC = async (npcName: string) => {
    if (!lobbyCode) return;
    try {
      await removeNPC(lobbyCode, npcName);
    } catch (err: any) {
      setError(`NPC_PURGE_FAILED: ${err.message || 'Connection locked.'}`);
    }
  };

  const handleStartMultiplayerGame = async () => {
    if (!lobbyCode) return;
    setLoading(true);
    setError(null);
    try {
      await startGame(lobbyCode);
    } catch (err: any) {
      setError(`TOURNAMENT_START_FAILED: ${err.message || 'Matrix mismatch.'}`);
    } finally {
      setLoading(false);
    }
  };

  // GAME CORE ACTIONS
  const handleBuyCard = async (index: number) => {
    if (!gameState) return;
    setLoading(true);
    setError(null);
    try {
      const state = await buyCard(gameState.gameId, index, playerName);
      setGameState(state);
    } catch (err: any) {
      setError(`TRANSACTION_FAILED: ${err.message || 'Refused by core protocol.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRerollShop = async () => {
    if (!gameState) return;
    setLoading(true);
    setError(null);
    try {
      const state = await rerollShop(gameState.gameId, playerName);
      setGameState(state);
    } catch (err: any) {
      setError(`REROLL_FAILED: ${err.message || 'Grid connection instability.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCard = async (index: number) => {
    if (!gameState) return;
    setLoading(true);
    setError(null);
    try {
      const state = await deleteCard(gameState.gameId, index, playerName);
      setGameState(state);
    } catch (err: any) {
      setError(`DELETE_FAILED: ${err.message || 'Memory core locked.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStartBattle = async () => {
    if (!gameState) return;
    setLoading(true);
    setError(null);
    try {
      const state = await startBattle(gameState.gameId, playerName);
      setGameState(state);
      
      // If multiplayer and server returns shop phase (it means not everyone is ready), show standby overlay
      if (lobbyCode && state.phase === 'shop') {
        setWaitingForBattle(true);
      }
    } catch (err: any) {
      setError(`SIMULATION_FAILED: ${err.message || 'Neural network overflow.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBattleComplete = () => {
    if (!gameState) return;
    setGameState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        phase: 'results' as const,
      };
    });
  };

  const handleNextRound = async () => {
    if (!gameState) return;
    if (gameState.currentRound >= gameState.maxRounds) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const state = await nextRound(gameState.gameId, playerName);
      setGameState(state);
      
      // If multiplayer and server returns results phase (it means not everyone clicked next round), show standby overlay
      if (lobbyCode && state.phase === 'results') {
        setWaitingForNextRound(true);
      }
    } catch (err: any) {
      setError(`ROUND_ADVANCE_FAILED: ${err.message || 'Sector breach detected.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = () => {
    setScreen('title');
    setLobbyCode(null);
    setGameState(null);
    setError(null);
    setWaitingForBattle(false);
    setWaitingForNextRound(false);
  };

  // Render screens based on screen state
  return (
    <div className="min-h-screen bg-cyber-dark text-cyber-text flex flex-col relative">
      {/* Global Error Alert Banner */}
      {error && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-red-950/90 border border-neon-red/50 text-neon-red px-4 py-3 rounded flex items-center justify-between shadow-lg backdrop-blur-md animate-flicker">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} />
            <span className="text-xs font-bold uppercase tracking-widest">{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-[10px] uppercase border border-neon-red/30 px-2 py-0.5 rounded hover:bg-neon-red/10 cursor-pointer"
          >
            {t('acknowledgeBtn')}
          </button>
        </div>
      )}

      {/* MULTIPLAYER STANDBY OVERLAYS */}
      {waitingForBattle && (
        <div className="fixed inset-0 z-40 bg-cyber-dark/80 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in p-4 text-center">
          <ShieldAlert size={48} className="text-neon-cyan animate-pulse mb-4 text-glow-cyan" />
          <h2 className="text-xl font-bold tracking-[0.25em] text-neon-cyan text-glow-cyan uppercase mb-2">
            {t('combatProtocolReady')}
          </h2>
          <p className="text-xs font-mono text-cyber-text-dim max-w-sm uppercase tracking-wider animate-pulse">
            {t('combatProtocolDesc')}
          </p>
        </div>
      )}

      {waitingForNextRound && (
        <div className="fixed inset-0 z-40 bg-cyber-dark/80 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in p-4 text-center">
          <ShieldAlert size={48} className="text-neon-magenta animate-pulse mb-4 text-glow-magenta" />
          <h2 className="text-xl font-bold tracking-[0.25em] text-neon-magenta text-glow-magenta uppercase mb-2">
            {t('advancingSector')}
          </h2>
          <p className="text-xs font-mono text-cyber-text-dim max-w-sm uppercase tracking-wider animate-pulse">
            {t('advancingSectorDesc')}
          </p>
        </div>
      )}

      {/* Screen Router */}
      {screen === 'title' && (
        <TitleScreen
          onStartSolo={handleStartSolo}
          onCreateLobby={handleCreateLobby}
          onJoinLobby={handleJoinLobby}
          loading={loading}
        />
      )}

      {screen === 'lobby' && (
        <LobbyScreen
          lobbyState={lobbyState}
          playerName={playerName}
          chatMessages={chatMessages}
          connected={connected}
          onSendChat={sendChatMessage}
          onAddNPC={handleAddNPC}
          onRemoveNPC={handleRemoveNPC}
          onStartGame={handleStartMultiplayerGame}
          loading={loading}
        />
      )}

      {screen === 'game' && gameState && (
        <>
          {gameState.currentRound > gameState.maxRounds && gameState.phase === 'results' ? (
            <GameOver standings={gameState.standings} onRestart={handleRestart} />
          ) : gameState.phase === 'shop' ? (
            <Shop
              round={gameState.currentRound}
              maxRounds={gameState.maxRounds}
              credits={gameState.player.credits}
              shopCards={gameState.shop.cards}
              deck={gameState.player.deck}
              onBuy={handleBuyCard}
              onReroll={handleRerollShop}
              onDelete={handleDeleteCard}
              onBattle={handleStartBattle}
              loading={loading}
            />
          ) : gameState.phase === 'battle' ? (
            <BattleArena
              gameId={gameState.gameId}
              playerName={playerName}
              battleSession={gameState.battleSession}
              battleLog={gameState.battleLog}
              opponent={gameState.opponent}
              onComplete={handleBattleComplete}
            />
          ) : (
            <Standings
              standings={gameState.standings}
              round={gameState.currentRound}
              maxRounds={gameState.maxRounds}
              battleResult={gameState.battleResult}
              onNext={handleNextRound}
              loading={loading}
            />
          )}
        </>
      )}

      {/* Network Status Footer */}
      <footer className="w-full py-2.5 text-[9px] text-cyber-border uppercase tracking-widest border-t border-cyber-border/10 bg-cyber-darker">
        <div className="flex flex-col sm:flex-row items-center justify-between px-6 gap-2">
          <div className="flex items-center gap-2">
            <span className={`inline-block w-1.5 h-1.5 rounded-full bg-neon-green ${lobbyCode ? 'animate-pulse' : ''}`} />
            <span>Antigravity NetLink-982 {lobbyCode ? 'MULTIPLAYER' : 'SOLO'}</span>
            <span className="mx-2">|</span>
            <Terminal size={8} className="inline mr-1" />
            <span>Cyber-Dome Autonomous Grid System</span>
          </div>
          
          {/* Cyber Lang Toggle Selector */}
          <div className="flex items-center gap-1 font-mono text-[9px]">
            <button
              onClick={() => setLocale('en')}
              className={`px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                locale === 'en'
                  ? 'text-neon-cyan border border-neon-cyan/30 bg-neon-cyan/5 font-bold shadow-[0_0_8px_rgba(0,242,254,0.1)]'
                  : 'text-cyber-border hover:text-cyber-text'
              }`}
            >
              EN
            </button>
            <span className="text-cyber-border/30">/</span>
            <button
              onClick={() => setLocale('ja')}
              className={`px-1.5 py-0.5 rounded cursor-pointer transition-all flex items-center gap-1 ${
                locale === 'ja'
                  ? 'text-neon-magenta border border-neon-magenta/30 bg-neon-magenta/5 font-bold shadow-[0_0_8px_rgba(255,0,127,0.1)]'
                  : 'text-cyber-border hover:text-cyber-text'
              }`}
            >
              🌐 日本語
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
