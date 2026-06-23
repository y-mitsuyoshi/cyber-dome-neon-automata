import React from 'react';
import CardDisplay from './CardDisplay';
import MemorySlots from './MemorySlots';
import { BattleState } from '../types/game';

interface BattleArenaProps {
  battleState: BattleState | null;
  playerId: string;
}

const BattleArena: React.FC<BattleArenaProps> = ({ battleState, playerId }) => {
  if (!battleState) {
    return <div className="p-8 text-center text-gray-400">Waiting for battle...</div>;
  }

  // Assume battleState has playerField, opponentField, playerHand, opponentHand, playerMemory, opponentMemory
  const {
    playerField = [],
    opponentField = [],
    playerHand = [],
    opponentHand = [],
    playerMemory = [],
    opponentMemory = [],
  } = battleState;

  return (
    <div className="flex h-full">
      {/* Player Side (Left) */}
      <div className="w-1/2 p-4 border-r border-gray-700">
        <h2 className="text-2xl font-bold text-cyan-400 mb-4">Your Field</h2>
        <div className="field-cards grid grid-cols-3 gap-2 mb-4">
          {playerField.map(card => (
            <CardDisplay key={card.id} card={card} side="player" />
          ))}
        </div>
        <h3 className="text-lg text-cyan-300 mb-2">Hand</h3>
        <div className="hand-cards flex flex-wrap gap-2">
          {playerHand.map(card => (
            <CardDisplay key={card.id} card={card} side="player" />
          ))}
        </div>
        <h3 className="text-lg text-cyan-300 mt-4 mb-2">Memory Slots</h3>
        <MemorySlots slots={playerMemory} />
      </div>

      {/* Opponent Side (Right) */}
      <div className="w-1/2 p-4">
        <h2 className="text-2xl font-bold text-red-400 mb-4">Opponent Field</h2>
        <div className="field-cards grid grid-cols-3 gap-2 mb-4">
          {opponentField.map(card => (
            <CardDisplay key={card.id} card={card} side="opponent" />
          ))}
        </div>
        <h3 className="text-lg text-red-300 mb-2">Hand</h3>
        <div className="hand-cards flex flex-wrap gap-2">
          {opponentHand.map(card => (
            <CardDisplay key={card.id} card={card} side="opponent" faceDown />
          ))}
        </div>
        <h3 className="text-lg text-red-300 mt-4 mb-2">Memory Slots</h3>
        <MemorySlots slots={opponentMemory} />
      </div>
    </div>
  );
};

export default BattleArena;
