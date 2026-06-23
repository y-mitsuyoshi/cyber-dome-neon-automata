import React from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import CardDisplay from './CardDisplay';
import MemorySlots from './MemorySlots';

const BattleArena: React.FC = () => {
  const { battleState } = useWebSocket();

  if (!battleState) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400 text-lg animate-pulse">Waiting for battle...</p>
      </div>
    );
  }

  const {
    playerHand,
    playerField,
    playerMemorySlots,
    opponentHand,
    opponentField,
    opponentMemorySlots,
  } = battleState;

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 min-h-screen bg-gray-950">
      {/* Player Area (left) */}
      <div className="flex-1 bg-slate-900/70 rounded-xl border border-cyan-600/30 p-4 shadow-lg">
        <h2 className="text-xl font-bold text-cyan-300 mb-4 flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-cyan-400" />
          YOUR ARENA
        </h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-xs uppercase tracking-wider text-cyan-400 mb-2">Hand</h3>
            <div className="flex flex-wrap gap-2">
              {playerHand.map((card, idx) => (
                <CardDisplay key={card.id ?? idx} card={card} />
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-xs uppercase tracking-wider text-cyan-400 mb-2">Field</h3>
            <div className="flex flex-wrap gap-2">
              {playerField.map((card, idx) => (
                <CardDisplay key={card.id ?? idx} card={card} />
              ))}
            </div>
          </div>
          <MemorySlots slots={playerMemorySlots ?? []} />
        </div>
      </div>

      {/* Opponent Area (right) */}
      <div className="flex-1 bg-slate-900/70 rounded-xl border border-red-600/30 p-4 shadow-lg">
        <h2 className="text-xl font-bold text-red-300 mb-4 flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-red-400" />
          OPPONENT ARENA
        </h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-xs uppercase tracking-wider text-red-400 mb-2">Hand</h3>
            <div className="flex flex-wrap gap-2">
              {opponentHand.map((card, idx) => (
                <CardDisplay key={card.id ?? idx} card={card} isOpponent />
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-xs uppercase tracking-wider text-red-400 mb-2">Field</h3>
            <div className="flex flex-wrap gap-2">
              {opponentField.map((card, idx) => (
                <CardDisplay key={card.id ?? idx} card={card} isOpponent />
              ))}
            </div>
          </div>
          <MemorySlots slots={opponentMemorySlots ?? []} />
        </div>
      </div>
    </div>
  );
};

export default BattleArena;
