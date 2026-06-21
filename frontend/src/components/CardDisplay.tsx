import { useMemo, useRef } from 'react';
import { Cpu, Bug, HardDrive, User, Zap, Shield, Building, Rocket, Film, Ghost, Skull, Grid } from 'lucide-react';
import type { Card } from '../types/game';
import { useTranslation } from '../context/TranslationContext';
import { useAudio } from '../context/AudioContext';

interface CardDisplayProps {
  card: Card;
  showCost?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  compact?: boolean;
  basePower?: number;
}

// Canonical art mapping for every card in the pool.
// Images only exist for 4 buckets (ai_/hw_/nr_/virus_, 20 each = 80 files).
// Non-bucket attributes are routed to a thematically close bucket and
// distributed across the 20 slots so each card gets a distinct image.
const CARD_IMAGE_MAP: Record<string, string> = {
  // --- Starter (6) ---
  starter_scout_1a: 'virus_001',
  starter_scout_1b: 'virus_002',
  starter_scout_1c: 'virus_003',
  starter_scout_2a: 'hw_001',
  starter_scout_2b: 'hw_002',
  starter_mascot: 'ai_001',

  // --- Deck A (28) ---
  // Mainframe -> hw bucket
  a_jester: 'hw_003', a_hermit: 'hw_004', a_stable_boy: 'hw_005', a_pig: 'hw_006',
  // Sector -> ai bucket
  a_talent: 'ai_002', a_reporter: 'ai_003',
  // Orbit -> ai bucket
  a_rescue_pod: 'ai_004', a_ai: 'ai_005', a_shapeshifter: 'ai_006', a_cow: 'ai_007',
  // HoloMedia -> hw bucket
  a_makeup_artist: 'hw_007', a_gangster: 'hw_008', a_moviestar: 'hw_009', a_cat: 'hw_010',
  // DeepWeb -> virus bucket
  a_merman: 'virus_004', a_treasure: 'virus_005', a_sailor: 'virus_006', a_parrot: 'virus_007',
  // Daemon -> nr bucket
  a_butler: 'nr_001', a_skeleton: 'nr_002', a_spider: 'nr_003',
  // Matrix -> virus bucket
  a_clown: 'virus_008', a_juggler: 'virus_009', a_vendor: 'virus_010', a_pony: 'virus_011',

  // --- Deck B (28) ---
  // Mainframe -> hw bucket
  b_knight: 'hw_011', b_blacksmith: 'hw_012', b_magician: 'hw_013', b_horse: 'hw_014',
  // Sector -> ai bucket
  b_mascot: 'ai_008', b_dog: 'ai_009',
  // Orbit -> ai bucket
  b_ufo: 'ai_010', b_band: 'ai_011', b_clone: 'ai_012', b_alien: 'ai_013',
  // HoloMedia -> hw bucket
  b_cowboy: 'hw_015', b_comic: 'hw_016', b_director: 'hw_017', b_lion: 'hw_018',
  // DeepWeb -> virus bucket
  b_cook: 'virus_012', b_navigator: 'virus_013', b_lifeguard: 'virus_014', b_shark: 'virus_015',
  // Daemon -> nr bucket
  b_ghost: 'nr_004', b_teenager: 'nr_005', b_necromancer: 'nr_006', b_bat: 'nr_007',
  // Matrix -> virus bucket
  b_mime: 'virus_016', b_pyrotechnist: 'virus_017', b_fortune_teller: 'virus_018', b_duck: 'virus_019',

  // --- Deck C (15) ---
  // Mainframe -> hw bucket
  c_bard: 'hw_019', c_prince: 'hw_020', c_dragon: 'hw_001',
  // Sector -> ai bucket
  c_champion: 'ai_014', c_fanbus: 'ai_015',
  // Orbit -> ai bucket
  c_hologram: 'ai_016', c_geek: 'ai_017', c_slime: 'ai_018',
  // HoloMedia -> hw bucket
  c_hero: 'hw_002', c_trex: 'hw_003', c_villain: 'hw_004',
  // DeepWeb -> virus bucket
  c_siren: 'virus_020', c_kraken: 'virus_001', c_submarine: 'virus_002',
  // Daemon -> nr bucket
  c_vampire: 'nr_008', c_pumpkin: 'nr_009', c_werewolf: 'nr_010',
  // Matrix -> virus bucket
  c_illusionist: 'virus_003', c_bumper_car: 'virus_004', c_teddybear: 'virus_005',
};

const attributeConfig = {
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
function CardDisplay({ card, showCost = false, onClick, disabled = false, compact = false, basePower }: CardDisplayProps) {
  const { translateCard, t } = useTranslation();
  const { playSE } = useAudio();
  const hoverGuard = useRef<number>(0);
  
  // Translate the card details for rendering
  const displayCard = useMemo(() => translateCard(card), [card, translateCard]);

  const cardImagePath = useMemo(() => {
    // Card IDs from the backend carry an instance suffix (e.g. "a_jester_0").
    // Strip the trailing "_<n>" to look up the canonical art for the card.
    const baseId = card.id.replace(/_\d+$/, '');
    const file = CARD_IMAGE_MAP[baseId] || CARD_IMAGE_MAP[card.id] || 'default';
    return `/images/cards/${file}.png`;
  }, [card.id]);

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
      <div className="flex items-center justify-between mb-3">
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded ${attr.bg} border ${attr.border}`}>
          <AttrIcon size={14} className={attr.color} />
          <span className={`text-xs font-bold ${attr.color}`}>{displayCard.attribute}</span>
        </div>
        <div
          className="relative flex flex-col items-center justify-center w-12 h-12 rounded-lg border-2"
          style={{
            borderColor: attr.glow,
            boxShadow: `0 0 10px ${attr.glow}40, inset 0 0 10px ${attr.glow}20`,
          }}
        >
          <Zap size={8} className={`absolute top-0.5 right-0.5 ${attr.color} opacity-50`} />
          <span className={`text-lg font-black leading-none ${attr.color}`} style={{ textShadow: `0 0 10px ${attr.glow}` }}>
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

