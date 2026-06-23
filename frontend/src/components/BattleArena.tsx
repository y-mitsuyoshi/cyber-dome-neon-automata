import React from 'react';
import { CardDisplay } from './CardDisplay';
import { MemorySlots } from './MemorySlots';
import { BattleState } from '../types/game';

interface BattleArenaProps {
  gameState: BattleState;
  playerId: string;
}

export function BattleArena({ gameState, playerId }: BattleArenaProps) {
  const player = gameState.players.find(p => p.id === playerId);
  const opponent = gameState.players.find(p => p.id !== playerId);

  if (!player || !opponent) {
    return (
      <div className="flex items-center justify-center h-64 text-cyan-400 font-mono text-lg">
        Waiting for players...
      </div>
    );
  }

  return (
    <div className="battle-arena flex flex-row gap-2 w-full h-full min-h-screen p-4">
      {/* ===== Player Area (Left) ===== */}
      <div className="player-area flex-1 flex flex-col gap-4">
        {/* Player Hand */}
        <div className="border border-cyan-500/30 rounded-lg bg-gray-900/60 p-3">
          <div className="text-cyan-400 font-bold text-sm mb-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-cyan-400 rounded-full inline-block animate-pulse" />
            <span className="font-mono">SELF :: {player.name}</span>
          </div>
          <div className="text-cyan-600 text-xs mb-1 font-mono">// HAND</div>
          <div className="flex flex-wrap gap-1">
            {player.hand.length === 0 && (
              <div className="text-gray-600 text-xs italic">empty</div>
            )}
            {player.hand.map(card => (
              <CardDisplay key={card.id} card={card} playerSide="player" />
            ))}
          </div>
        </div>

        {/* Player Field */}
        <div className="border border-cyan-500/30 rounded-lg bg-gray-900/60 p-3">
          <div className="text-cyan-600 text-xs mb-1 font-mono">// FIELD</div>
          <div className="flex flex-wrap gap-1">
            {player.field.length === 0 && (
              <div className="text-gray-600 text-xs italic">empty</div>
            )}
            {player.field.map(card => (
              <CardDisplay key={card.id} card={card} playerSide="player" />
            ))}
          </div>
        </div>

        {/* Player Memory */}
        <MemorySlots slots={player.memory} side="player" />
      </div>

      {/* ===== Center Divider ===== */}
      <div className="w-px bg-gradient-to-b from-transparent via-cyan-500/30 to-transparent" />

      {/* ===== Opponent Area (Right) ===== */}
      <div className="opponent-area flex-1 flex flex-col gap-4">
        {/* Opponent Hand (face down) */}
        <div className="border border-red-500/30 rounded-lg bg-gray-900/60 p-3">
          <div className="text-red-400 font-bold text-sm mb-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-400 rounded-full inline-block animate-pulse" />
            <span className="font-mono">ENEMY :: {opponent.name}</span>
          </div>
          <div className="text-red-600 text-xs mb-1 font-mono">// HAND</div>
          <div className="flex flex-wrap gap-1">
            {opponent.hand.length === 0 && (
              <div className="text-gray-600 text-xs italic">empty</div>
            )}
            {opponent.hand.map(card => (
              <CardDisplay key={card.id} card={card} faceDown playerSide="opponent" />
            ))}
          </div>
        </div>

        {/* Opponent Field */}
        <div className="border border-red-500/30 rounded-lg bg-gray-900/60 p-3">
          <div className="text-red-600 text-xs mb-1 font-mono">// FIELD</div>
          <div className="flex flex-wrap gap-1">
            {opponent.field.length === 0 && (
              <div className="text-gray-600 text-xs italic">empty</div>
            )}
            {opponent.field.map(card => (
              <CardDisplay key={card.id} card={card} playerSide="opponent" />
            ))}
          </div>
        </div>

        {/* Opponent Memory */}
        <MemorySlots slots={opponent.memory} side="opponent" />
      </div>
    </div>
  );
}
