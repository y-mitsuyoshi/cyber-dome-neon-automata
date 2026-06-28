import { useMemo, useRef } from 'react';
import { Cpu, Bug, HardDrive, User, Zap, Shield, Building, Rocket, Film, Ghost, Skull, Grid } from 'lucide-react';
import type { Card } from '../types/game';
import { useTranslation } from '../context/TranslationContext';
import { useAudio } from '../context/AudioContext';
import { getCardImagePath } from '../utils/cardImage';

interface CardDisplayProps {
  card: Card;
  showCost?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  compact?: boolean;
  basePower?: number;
  size?: 'sm' | 'md';
}const attributeConfig = {
  Virus: { color: 'text-red-400', bg: 'bg-red-900/30', border: 'border-red-500/50', glow: '#ff0040', icon: Bug },
  AI: { color: 'text-blue-400', bg: 'bg-blue-900/30', border: 'border-blue-500/50', glow: '#4488ff', icon: Cpu },
  Hardware: { color: 'text-amber-400', bg: 'bg-amber-900/30', border: 'border-amber-500/50', glow: '#ffbf00', icon: HardDrive },
  Netrunner: { color: 'text-green-400', bg: 'bg-green-900/30', border: 'border-green-500/50', glow: '#00ff66', icon: User },

  Mainframe: { color: 'text-amber-400', bg: 'bg-amber-900/30', border: 'border-amber-500/50', glow: '#ffbf00', icon: Shield },
  Sector: { color: 'text-blue-400', bg: 'bg-blue-900/30', border: 'border-blue-500/50', glow: '#4488ff', icon: Building },
  Orbit: { color: 'text-cyan-400', bg: 'bg-cyan-900/30', border: 'border-cyan-500/50', glow: '#00f0ff', icon: Rocket },
  HoloMedia: { color: 'text-pink-400', bg: 'bg-pink-900/30', border: 'border-pink-500/50', glow: '#ff00aa', icon: Film },
  DeepWeb: { color: 'text-emerald-400', bg: 'bg-emerald-900/30', border: 'border-emerald-500/50', glow: '#00ff66', icon: Skull },
  Daemon: { color: 'text-purple-400', bg: 'bg-purple-900/30', border: 'border-purple-500/50', glow: '#aa00ff', icon: Ghost },
  Matrix: { color: 'text-yellow-400', bg: 'bg-yellow-900/30', border: 'border-yellow-500/50', glow: '#ffff00', icon: Grid },
  None: { color: 'text-gray-400', bg: 'bg-gray-900/30', border: 'border-gray-500/50', glow: '#888888', icon: User },
  Starter: { color: 'text-gray-400', bg: 'bg-gray-900/30', border: 'border-gray-500/50', glow: '#888888', icon: User }
};
function CardDisplay({ card, showCost = false, onClick, disabled = false, compact = false, basePower, size = 'md' }: CardDisplayProps) {
  const { translateCard, t } = useTranslation();
  const { playSE } = useAudio();
  const hoverGuard = useRef<number>(0);
  
  // Translate the card details for rendering
  const displayCard = useMemo(() => translateCard(card), [card, translateCard]);

  const cardImagePath = useMemo(() => getCardImagePath(card.id), [card.id]);

  // Use original English values for style lookups
  const attr = attributeConfig[card.attribute as keyof typeof attributeConfig] || attributeConfig.None;
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
      default:
        return {
          className: 'border-neon-cyan/40',
          shadow: '0 0 8px rgba(0,240,255,0.2)',
        };
    }
  }, [card.rarity]);

  if (compact) {
    const isBuffed = basePower !== undefined && basePower !== displayCard.power;
    return (
      <div className={`flex items-center gap-2 px-2 py-1 rounded border ${attr.border} ${attr.bg} text-xs`}>
        <AttrIcon size={12} className={attr.color} />
        <span className="text-cyber-text truncate flex-1">{displayCard.name}</span>
        <span className={`font-bold flex items-center gap-1 ${attr.color}`}>
          {displayCard.power}
          {isBuffed && (
            <span className={`text-[8px] font-bold ${displayCard.power > basePower ? 'text-emerald-400' : 'text-rose-400'}`}>
              ({displayCard.power > basePower ? `+${displayCard.power - basePower}` : `${displayCard.power - basePower}`})
            </span>
          )}
        </span>
      </div>
    );
  }

  return (
    <div
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => {
        if (disabled) return;
        const now = Date.now();
        if (now - hoverGuard.current > 80) {
          hoverGuard.current = now;
          playSE('hover');
        }
      }}
      className={`
        relative group rounded-lg border-2 ${rarityStyle.className}
        bg-cyber-surface/80 backdrop-blur-sm
        transition-all duration-300 ease-out
        ${!disabled ? 'cursor-pointer hover:scale-105 hover:-translate-y-1' : 'opacity-60 cursor-not-allowed'}
        ${compact ? 'p-2' : size === 'sm' ? 'p-2 w-28' : 'p-4 w-48'}
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
      {size !== 'sm' && (
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
      )}

      {/* Card name */}
      <h3 className={`font-bold text-white mb-2 tracking-wide leading-tight ${size === 'sm' ? 'text-[10px] min-h-[1.6rem]' : 'text-sm min-h-[2.5rem]'}`}>
        {displayCard.name}
      </h3>

      {/* Card Image */}
      <div className={`relative w-full ${size === 'sm' ? 'h-16 mb-2' : 'h-24 mb-3'} rounded overflow-hidden border border-cyber-border/40 bg-cyber-darker group-hover:border-neon-cyan/30 transition-colors`}>
        <img
          src={cardImagePath}
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
      <div className={`flex items-center justify-between ${size === 'sm' ? 'mb-1' : 'mb-3'}`}>
        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${attr.bg} border ${attr.border}`}>
          <AttrIcon size={size === 'sm' ? 10 : 14} className={attr.color} />
          {size !== 'sm' && <span className={`text-xs font-bold ${attr.color}`}>{displayCard.attribute}</span>}
        </div>
        <div
          className={`relative flex flex-col items-center justify-center rounded-lg border-2 ${size === 'sm' ? 'w-8 h-8' : 'w-12 h-12'}`}
          style={{
            borderColor: attr.glow,
            boxShadow: `0 0 10px ${attr.glow}40, inset 0 0 10px ${attr.glow}20`,
          }}
        >
          <Zap size={size === 'sm' ? 6 : 8} className={`absolute top-0.5 right-0.5 ${attr.color} opacity-50`} />
          <span className={`${size === 'sm' ? 'text-sm' : 'text-lg'} font-black leading-none ${attr.color}`} style={{ textShadow: `0 0 10px ${attr.glow}` }}>
            {displayCard.power}
          </span>
          {basePower !== undefined && basePower !== displayCard.power && (
            <span className={`text-[8px] font-black leading-none mt-0.5 ${displayCard.power > basePower ? 'text-emerald-400' : 'text-rose-400'}`}>
              {displayCard.power > basePower ? `+${displayCard.power - basePower}` : `${displayCard.power - basePower}`}
            </span>
          )}
        </div>
      </div>

      {/* Effect */}
      {size !== 'sm' && (
      <div className="text-[11px] text-cyber-text-dim leading-relaxed border-t border-cyber-border pt-2 min-h-[2.5rem]">
        {displayCard.effect}
      </div>
      )}

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

