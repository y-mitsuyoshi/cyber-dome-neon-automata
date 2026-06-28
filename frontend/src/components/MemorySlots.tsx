import { useMemo, useState } from 'react';
import { HardDrive } from 'lucide-react';
import { useTranslation } from '../context/TranslationContext';
import { getCardImagePath } from '../utils/cardImage';
import type { Card, MemorySlot } from '../types/game';
import CardDisplay from './CardDisplay';

interface MemorySlotsProps {
  slots: MemorySlot[];
  maxSlots?: number;
  label: string;
  side: 'left' | 'right';
  compact?: boolean;
}

function MemorySlots({ slots, maxSlots = 6, label, side, compact = false }: MemorySlotsProps) {
  const { t, translateCardName } = useTranslation();
  const filledCount = slots.filter(s => s.count > 0).length;
  const isWarning = filledCount >= 5;
  const isDanger = filledCount >= maxSlots;

  const slotArray = useMemo(() => {
    const arr: MemorySlot[] = [];
    for (let i = 0; i < maxSlots; i++) {
      arr.push(slots[i] || { cardName: '', cards: [], count: 0 });
    }
    return arr;
  }, [slots, maxSlots]);

  const accent = side === 'right' ? 'magenta' : 'cyan';

  const progressColor = isDanger
    ? 'bg-neon-red'
    : isWarning
    ? 'bg-neon-amber'
    : side === 'right'
    ? 'bg-neon-magenta'
    : 'bg-neon-cyan';

  const borderColor = isDanger
    ? 'border-neon-red'
    : isWarning
    ? 'border-neon-amber'
    : side === 'right'
    ? 'border-neon-magenta/30'
    : 'border-neon-cyan/30';

  return (
    <div className={`animate-fade-in ${side === 'right' ? 'text-right' : ''}`}>
      {/* Header */}
      <div className={`flex items-center gap-2 mb-1.5 ${side === 'right' ? 'flex-row-reverse' : ''}`}>
        <HardDrive size={13} className={isDanger ? 'text-neon-red animate-pulse' : side === 'right' ? 'text-neon-magenta' : 'text-neon-cyan'} />
        <span className="text-[10px] uppercase tracking-widest text-cyber-text-dim font-bold">{label}</span>
        <span className={`text-[10px] font-bold ml-auto ${side === 'right' ? 'ml-0 mr-auto' : ''} ${
          isDanger ? 'text-neon-red' : isWarning ? 'text-neon-amber' : 'text-cyber-text-dim'
        }`}>
          {filledCount}/{maxSlots}
        </span>
      </div>

      {/* Memory progress bar */}
      <div className={`w-full h-1 bg-cyber-darker rounded-full mb-2 overflow-hidden border ${borderColor}`}>
        <div
          className={`h-full ${progressColor} transition-all duration-500 rounded-full`}
          style={{ width: `${(filledCount / maxSlots) * 100}%` }}
        />
      </div>

      {/* Slot grid — horizontal compact row of card thumbnails like a real bench */}
      <div className={`flex gap-1.5 ${side === 'right' ? 'flex-row-reverse' : ''} ${compact ? 'overflow-x-auto pb-1' : 'flex-wrap'}`}>
        {slotArray.map((slot, i) => {
          const isEmpty = slot.count === 0;
          const topCard: Card | null = slot.cards.length > 0 ? slot.cards[slot.cards.length - 1] : null;
          const imgPath = topCard ? getCardImagePath(topCard.id) : null;

          return (
            <MemSlot
              key={i}
              slot={slot}
              isEmpty={isEmpty}
              topCard={topCard}
              imgPath={imgPath}
              compact={compact}
              isDanger={isDanger}
              isWarning={isWarning}
              accent={accent}
              t={t}
              translateCardName={translateCardName}
            />
          );
        })}
      </div>
    </div>
  );
}

interface MemSlotProps {
  slot: MemorySlot;
  isEmpty: boolean;
  topCard: Card | null;
  imgPath: string | null;
  compact: boolean;
  isDanger: boolean;
  isWarning: boolean;
  accent: 'cyan' | 'magenta';
  t: (key: string, params?: Record<string, string | number>) => string;
  translateCardName: (name: string) => string;
}

function MemSlot({ slot, isEmpty, topCard, imgPath, compact, isDanger, isWarning, accent, t, translateCardName }: MemSlotProps) {
  const [hover, setHover] = useState(false);
  return (
    <div
      className="relative shrink-0"
      style={{ width: compact ? 44 : 64, height: compact ? 56 : 82 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Hover popover: full-size card preview */}
      {hover && topCard && (
        <div className="absolute z-50 bottom-full mb-2 left-1/2 -translate-x-1/2 pointer-events-none">
          <CardDisplay card={topCard} disabled />
        </div>
      )}
      {/* Stack visual effect layers (card-back feel) */}
      {!isEmpty && slot.count > 1 && (
        <>
          <div className={`absolute inset-0 translate-x-1 translate-y-1 rounded border -z-10 ${
            isDanger ? 'border-neon-red/20 bg-red-950/30' : `border-${accent === 'cyan' ? 'neon-cyan' : 'neon-magenta'}/20 bg-cyber-darker/60`
          }`} />
          {slot.count > 2 && (
            <div className={`absolute inset-0 translate-x-2 translate-y-2 rounded border -z-20 ${
              isDanger ? 'border-neon-red/10 bg-red-950/20' : `border-${accent === 'cyan' ? 'neon-cyan' : 'neon-magenta'}/10 bg-cyber-darker/40`
            }`} />
          )}
        </>
      )}

      <div
        className={`relative w-full h-full rounded overflow-hidden border transition-all duration-300 ${
          isEmpty
            ? 'border-cyber-border/30 bg-cyber-darker/40 flex items-center justify-center'
            : isDanger
            ? `border-neon-red/60 animate-warning-pulse`
            : isWarning
            ? `border-neon-amber/50`
            : `border-${accent === 'cyan' ? 'neon-cyan' : 'neon-magenta'}/40`
        }`}
        style={
          !isEmpty
            ? {
                boxShadow: isDanger
                  ? '0 0 8px rgba(255,0,64,0.3)'
                  : accent === 'cyan' ? '0 0 6px rgba(0,240,255,0.15)' : '0 0 6px rgba(255,0,255,0.15)',
              }
            : undefined
        }
        title={isEmpty ? t('emptySlotLabel') : `${translateCardName(slot.cardName)} ×${slot.count}`}
      >
        {isEmpty ? (
          <span className="text-[8px] text-cyber-border/60 uppercase tracking-wider font-mono">—</span>
        ) : imgPath ? (
          <>
            <img
              src={imgPath}
              alt={slot.cardName}
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.src = '/images/cards/default.png'; }}
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-1 py-0.5">
              <div className="text-[8px] text-white font-mono leading-tight truncate text-left">
                {translateCardName(slot.cardName)}
              </div>
            </div>
            {topCard && (
              <div className={`absolute top-0.5 right-0.5 text-[9px] font-black px-1 rounded ${
                accent === 'cyan' ? 'text-neon-cyan' : 'text-neon-magenta'
              } bg-black/60`}>
                {topCard.power}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full px-1">
            <div className="text-[8px] text-cyber-text truncate font-mono leading-tight text-center w-full">
              {translateCardName(slot.cardName)}
            </div>
            {topCard && (
              <div className={`text-[10px] font-black mt-0.5 ${accent === 'cyan' ? 'text-neon-cyan' : 'text-neon-magenta'}`}>
                {topCard.power}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stack count badge */}
      {!isEmpty && slot.count > 1 && (
        <div className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-neon-magenta text-[8px] font-black text-white flex items-center justify-center border border-white/30 animate-pulse"
          style={{ boxShadow: '0 0 8px rgba(255,0,255,0.6)' }}>
          ×{slot.count}
        </div>
      )}
    </div>
  );
}

export default MemorySlots;