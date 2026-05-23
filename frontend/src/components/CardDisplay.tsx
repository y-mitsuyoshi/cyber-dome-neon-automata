import { useMemo } from 'react';
import { Cpu, Bug, HardDrive, User, Zap } from 'lucide-react';
import type { Card } from '../types/game';
import { useTranslation } from '../context/TranslationContext';

interface CardDisplayProps {
  card: Card;
  showCost?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  compact?: boolean;
}

const attributeConfig = {
  Virus: { color: 'text-red-400', bg: 'bg-red-900/30', border: 'border-red-500/50', glow: '#ff0040', icon: Bug },
  AI: { color: 'text-blue-400', bg: 'bg-blue-900/30', border: 'border-blue-500/50', glow: '#4488ff', icon: Cpu },
  Hardware: { color: 'text-amber-400', bg: 'bg-amber-900/30', border: 'border-amber-500/50', glow: '#ffbf00', icon: HardDrive },
  Netrunner: { color: 'text-green-400', bg: 'bg-green-900/30', border: 'border-green-500/50', glow: '#00ff66', icon: User },
};

function CardDisplay({ card, showCost = false, onClick, disabled = false, compact = false }: CardDisplayProps) {
  const { translateCard, t } = useTranslation();
  
  // Translate the card details for rendering
  const displayCard = useMemo(() => translateCard(card), [card, translateCard]);

  // Use original English values for style lookups
  const attr = attributeConfig[card.attribute];
  const AttrIcon = attr.icon;

  const rarityStyle = useMemo(() => {
    switch (card.rarity) {
      case 'Common':
        return {
          className: 'border-neon-cyan/40',
          shadow: '0 0 8px rgba(0,240,255,0.2)',
        };
      case 'Rare':
        return {
          className: 'border-neon-magenta/60 animate-neon-pulse',
          shadow: '0 0 15px rgba(255,0,255,0.3)',
        };
      case 'Epic':
        return {
          className: 'border-neon-amber/70 animate-epic-aura',
          shadow: '0 0 20px rgba(255,191,0,0.4)',
        };
    }
  }, [card.rarity]);

  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-2 py-1 rounded border ${attr.border} ${attr.bg} text-xs`}>
        <AttrIcon size={12} className={attr.color} />
        <span className="text-cyber-text truncate flex-1">{displayCard.name}</span>
        <span className={`font-bold ${attr.color}`}>{displayCard.power}</span>
      </div>
    );
  }

  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`
        relative group rounded-lg border-2 ${rarityStyle.className}
        bg-cyber-surface/80 backdrop-blur-sm
        transition-all duration-300 ease-out
        ${!disabled ? 'cursor-pointer hover:scale-105 hover:-translate-y-1' : 'opacity-60 cursor-not-allowed'}
        ${compact ? 'p-2' : 'p-4 w-48'}
      `}
      style={{ boxShadow: rarityStyle.shadow }}
    >
      {/* Scanline overlay */}
      <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none opacity-20">
        <div
          className="absolute w-full h-px bg-gradient-to-r from-transparent via-neon-cyan/50 to-transparent"
          style={{ animation: 'scanline 6s linear infinite' }}
        />
      </div>

      {/* Rarity indicator */}
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[10px] uppercase tracking-widest font-bold ${
          card.rarity === 'Epic' ? 'text-neon-amber text-glow-amber' :
          card.rarity === 'Rare' ? 'text-neon-magenta text-glow-magenta' :
          'text-neon-cyan'
        }`}>
          {displayCard.rarity}
        </span>
        <span className={`text-[10px] uppercase tracking-wider ${attr.color}`}>
          {displayCard.archetype}
        </span>
      </div>

      {/* Card name */}
      <h3 className="text-sm font-bold text-white mb-2 tracking-wide leading-tight min-h-[2.5rem]">
        {displayCard.name}
      </h3>

      {/* Card Image */}
      <div className="relative w-full h-24 mb-3 rounded overflow-hidden border border-cyber-border/40 bg-cyber-darker group-hover:border-neon-cyan/30 transition-colors">
        <img
          src={`/images/cards/${card.id}.png`}
          alt={displayCard.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = '/images/cards/default.png';
          }}
        />
        {/* Hologram lines overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent pointer-events-none" />
      </div>

      {/* Attribute & Power */}
      <div className="flex items-center justify-between mb-3">
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded ${attr.bg} border ${attr.border}`}>
          <AttrIcon size={14} className={attr.color} />
          <span className={`text-xs font-bold ${attr.color}`}>{displayCard.attribute}</span>
        </div>
        <div
          className="relative flex items-center justify-center w-12 h-12 rounded-lg border-2"
          style={{
            borderColor: attr.glow,
            boxShadow: `0 0 10px ${attr.glow}40, inset 0 0 10px ${attr.glow}20`,
          }}
        >
          <Zap size={10} className={`absolute top-0.5 right-0.5 ${attr.color} opacity-50`} />
          <span className={`text-xl font-black ${attr.color}`} style={{ textShadow: `0 0 10px ${attr.glow}` }}>
            {displayCard.power}
          </span>
        </div>
      </div>

      {/* Effect */}
      <div className="text-[11px] text-cyber-text-dim leading-relaxed border-t border-cyber-border pt-2 min-h-[2.5rem]">
        {displayCard.effect}
      </div>

      {/* Cost */}
      {showCost && (
        <div className="mt-2 pt-2 border-t border-cyber-border flex items-center justify-between">
          <span className="text-[10px] text-cyber-text-dim uppercase tracking-wider">{t('cost')}</span>
          <span className="text-sm font-bold text-neon-amber text-glow-amber">{displayCard.cost}¢</span>
        </div>
      )}

      {/* Hover glow overlay */}
      {!disabled && (
        <div
          className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            boxShadow: `inset 0 0 30px ${attr.glow}15, 0 0 30px ${attr.glow}30`,
          }}
        />
      )}
    </div>
  );
}

export default CardDisplay;

