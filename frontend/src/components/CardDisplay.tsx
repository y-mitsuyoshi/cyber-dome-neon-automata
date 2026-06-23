import React from 'react';

/**
 * Minimal card shape matching what the battle state provides.
 * Can be extended or replaced with the project-wide CardState type.
 */
interface CardState {
  id: string;
  cardDefId: string;
  name?: string;
  power?: number;
}

interface CardDisplayProps {
  card: CardState;
  faceDown?: boolean;
  playerSide?: 'player' | 'opponent';
}

export function CardDisplay({ card, faceDown = false, playerSide = 'player' }: CardDisplayProps) {
  const borderColor =
    playerSide === 'player'
      ? 'border-cyan-500/60 hover:border-cyan-400'
      : 'border-red-500/60 hover:border-red-400';

  if (faceDown) {
    return (
      <div
        className={`card-display w-20 h-28 border-2 ${borderColor} rounded-lg bg-gray-800 flex items-center justify-center cursor-default transition-colors select-none`}
        title="Opponent's card (hidden)"
      >
        <div className="text-gray-600 text-xs font-mono text-center">
          <div className="text-lg mb-1">?</div>
          HIDDEN
        </div>
      </div>
    );
  }

  return (
    <div
      className={`card-display w-20 h-28 border-2 ${borderColor} rounded-lg bg-gray-800 overflow-hidden flex flex-col transition-colors`}
      title={card.name || card.cardDefId}
    >
      {/* Card image area */}
      <div className="h-14 flex items-center justify-center bg-gray-900/50">
        <img
          src={`/images/cards/${card.cardDefId}.png`}
          alt={card.name || card.cardDefId}
          className="max-h-full max-w-full object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/images/cards/default.png';
          }}
        />
      </div>

      {/* Card info area */}
      <div className="flex-1 px-1 py-0.5 flex flex-col justify-center">
        <div className="text-white text-[10px] leading-tight truncate">
          {card.name || card.cardDefId}
        </div>
        {card.power !== undefined && (
          <div className="text-cyan-300 text-xs font-mono font-bold">
            {card.power}
          </div>
        )}
      </div>
    </div>
  );
}
