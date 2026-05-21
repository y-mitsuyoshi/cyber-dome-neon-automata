import { useState } from 'react';
import { Terminal, AlertCircle } from 'lucide-react';
import type { GameState } from './types/game';
import TitleScreen from './components/TitleScreen';
import Shop from './components/Shop';
import BattleArena from './components/BattleArena';
import Standings from './components/Standings';
import GameOver from './components/GameOver';
import {
  createNewGame,
  buyCard,
  rerollShop,
  deleteCard,
  startBattle,
  nextRound,
} from './api/client';

function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartGame = async () => {
    setLoading(true);
    setError(null);
    try {
      const state = await createNewGame();
      setGameState(state);
    } catch (err: any) {
      console.error(err);
      setError('INITIALIZATION_FAILED: Network timeout or server unreachable.');
    } finally {
      setLoading(false);
    }
  };

  const handleBuyCard = async (index: number) => {
    if (!gameState) return;
    setLoading(true);
    setError(null);
    try {
      const state = await buyCard(gameState.gameId, index);
      setGameState(state);
    } catch (err: any) {
      console.error(err);
      setError('TRANSACTION_FAILED: Refused by core protocol.');
    } finally {
      setLoading(false);
    }
  };

  const handleRerollShop = async () => {
    if (!gameState) return;
    setLoading(true);
    setError(null);
    try {
      const state = await rerollShop(gameState.gameId);
      setGameState(state);
    } catch (err: any) {
      console.error(err);
      setError('REROLL_FAILED: Grid connection instability.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCard = async (index: number) => {
    if (!gameState) return;
    setLoading(true);
    setError(null);
    try {
      const state = await deleteCard(gameState.gameId, index);
      setGameState(state);
    } catch (err: any) {
      console.error(err);
      setError('DELETE_FAILED: Memory core locked.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartBattle = async () => {
    if (!gameState) return;
    setLoading(true);
    setError(null);
    try {
      const state = await startBattle(gameState.gameId);
      setGameState(state);
    } catch (err: any) {
      console.error(err);
      setError('SIMULATION_FAILED: Neural network overflow.');
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
    if (gameState.round >= gameState.maxRounds) {
      // Game over, navigate to final screen handled by state phase
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const state = await nextRound(gameState.gameId);
      setGameState(state);
    } catch (err: any) {
      console.error(err);
      setError('ROUND_ADVANCE_FAILED: Sector breach detected.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = () => {
    setGameState(null);
    setError(null);
  };

  // Rendering conditional screen logic
  return (
    <div className="min-h-screen bg-cyber-dark text-cyber-text flex flex-col">
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
            Acknowledge
          </button>
        </div>
      )}

      {/* Main Switchboard */}
      {!gameState ? (
        <TitleScreen onStart={handleStartGame} loading={loading} />
      ) : gameState.round > gameState.maxRounds && gameState.phase === 'results' ? (
        <GameOver standings={gameState.standings} onRestart={handleRestart} />
      ) : gameState.phase === 'shop' ? (
        <Shop
          round={gameState.round}
          maxRounds={gameState.maxRounds}
          credits={gameState.credits}
          shopCards={gameState.shopCards}
          deck={gameState.deck}
          onBuy={handleBuyCard}
          onReroll={handleRerollShop}
          onDelete={handleDeleteCard}
          onBattle={handleStartBattle}
          loading={loading}
        />
      ) : gameState.phase === 'battle' ? (
        <BattleArena
          battleLog={gameState.battleLog}
          opponent={gameState.opponent}
          onComplete={handleBattleComplete}
        />
      ) : (
        <Standings
          standings={gameState.standings}
          round={gameState.round}
          maxRounds={gameState.maxRounds}
          battleResult={gameState.battleResult}
          onNext={handleNextRound}
          loading={loading}
        />
      )}

      {/* Network Connectivity Status Footer */}
      <footer className="w-full text-center py-2 text-[9px] text-cyber-border uppercase tracking-widest border-t border-cyber-border/10 bg-cyber-darker">
        <div className="flex items-center justify-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
          <span>Antigravity NetLink-982 Active</span>
          <span className="mx-2">|</span>
          <Terminal size={8} className="inline mr-1" />
          <span>Cyber-Dome Autonomous Grid System</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
