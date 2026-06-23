import React from 'react';
import { CardData } from '../types/game';

interface CardDisplayProps {
  card: CardData;
  isOpponent?: boolean;
}

const CardDisplay: React.FC<CardDisplayProps> = ({ card, isOpponent = false }) => {
  const borderColor = isOpponent ? 'border-red-500/60' : 'border-cyan-500/60';
  const bgColor = isOpponent ? 'bg-red-950/50' : 'bg-cyan-950/50';
  const glowClass = isOpponent ? 'shadow-red-500/20' : 'shadow-cyan-500/20';

  return (
    <div
      className={`relative w-28 h-40 rounded-lg border-2 ${borderColor} ${bgColor} ${glowClass} shadow-lg p-2 flex flex-col items-center justify-between transition-all hover:scale-105`}
    >
      {card.image && (
        <img
          src={card.image}
          alt={card.name}
          className="w-12 h-12 object-contain mt-1"
          loading="lazy"
        />
      )}
      <span className="text-xs font-semibold text-gray-100 text-center leading-tight mt-1">
        {card.name}
      </span>
      <div className="flex items-center gap-1 text-[10px] text-gray-400">
        <span className="text-yellow-400">⚡</span>
        <span>{card.power ?? '?'}</span>
      </div>
      {isOpponent && (
        <span className="absolute top-1 right-1 text-[9px] font-bold text-red-300 bg-red-900/80 px-1 rounded">
          ENEMY
        </span>
      )}
    </div>
  );
};

export default CardDisplay;
