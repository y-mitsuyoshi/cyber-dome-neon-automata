import React from 'react';
import { Card } from '../types/game';

interface CardDisplayProps {
  card: Card;
  side?: 'player' | 'opponent';
  faceDown?: boolean;
}

const CardDisplay: React.FC<CardDisplayProps> = ({
  card,
  side = 'player',
  faceDown = false,
}) => {
  const borderColorClass = side === 'player' ? 'border-cyan-500' : 'border-red-500';
  const label = side === 'player' ? null : null; // could add a small label if needed

  return (
    <div
      className={`p-2 bg-gray-800 rounded-lg border-2 ${borderColorClass} shadow-md w-24 h-36 flex flex-col items-center justify-center transition-transform hover:scale-105`}
    >
      {faceDown ? (
        <div className="text-gray-400 text-center">
          <div className="text-4xl">?</div>
          <div className="text-xs mt-2">Opponent Card</div>
        </div>
      ) : (
        <>
          <img
            src={card.imageUrl || '/images/cards/default.png'}
            alt={card.name || 'Card'}
            className="w-16 h-20 object-contain mb-1"
          />
          <div className="text-white text-xs font-semibold truncate w-full text-center">
            {card.name || 'Unknown'}
          </div>
          <div className="text-gray-400 text-xs">
            Power: {card.power ?? '?'}
          </div>
        </>
      )}
    </div>
  );
};

export default CardDisplay;
