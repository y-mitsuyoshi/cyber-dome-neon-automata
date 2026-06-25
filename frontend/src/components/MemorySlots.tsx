import { useMemo } from 'react';
import { HardDrive } from 'lucide-react';
import { useTranslation } from '../context/TranslationContext';
import CardDisplay from './CardDisplay';
import type { Card } from '../types/game';

interface MemorySlotsProps {
  slots: string[][];
  cards?: Card[][];
  onCardClick?: (card: Card) => void;
  maxSlots?: number;
  label: string;
  side: 'left' | 'right';
}

function MemorySlots({ slots, cards, onCardClick, maxSlots = 6, label, side }: MemorySlotsProps) {
  const { t, translateCardName } = useTranslation();
  const filledCount = slots.filter(s => s.length > 0).length;
  const fillRatio = filledCount / maxSlots;
  const isWarning = fillRatio >= 5 / 6;
  const isDanger = filledCount >= maxSlots;

  const slotArray = useMemo(() => {
    const arr: string[][] = [];
    for (let i = 0; i < maxSlots; i++) {
      arr.push(slots[i] || []);
    }
    return arr;
  }, [slots, maxSlots]);

  const progressColor = isDanger
    ? 'bg-neon-red'
    : isWarning
    ? 'bg-neon-amber'
    : 'bg-neon-cyan';

  const borderColor = isDanger
    ? 'border-neon-red'
    : isWarning
    ? 'border-neon-amber'
    : 'border-neon-cyan/30';

  return (
    <div className={`animate-fade-in ${side === 'right' ? 'text-right' : ''}`}>
      {/* Header */}
      <div className={`flex items-center gap-2 mb-2 ${side === 'right' ? 'flex-row-reverse' : ''}`}>
        <HardDrive size={14} className={isDanger ? 'text-neon-red' : 'text-neon-cyan'} />
        <span className="text-[10px] uppercase tracking-widest text-cyber-text-dim font-bold">
          {label}
        </span>
      </div>

      {/* Memory progress bar */}
      <div className={`w-full h-1.5 bg-cyber-darker rounded-full mb-3 overflow-hidden border ${borderColor}`}>
        <div
          className={`h-full ${progressColor} transition-all duration-500 rounded-full`}
          style={{ width: `${(filledCount / maxSlots) * 100}%` }}
        />
      </div>

      <div className={`text-[10px] mb-2 ${
        isDanger ? 'text-neon-red text-glow-red font-bold' :
        isWarning ? 'text-neon-amber text-glow-amber' :
        'text-cyber-text-dim'
      }`}>
        {t('memoryLabel', { filled: filledCount, max: maxSlots })}
      </div>

      {/* Slot grid */}
      <div className={`grid ${cards && cards.length > 0 ? 'grid-cols-1' : 'grid-cols-2'} gap-1.5 ${side === 'right' ? 'direction-rtl' : ''}`}>
        {slotArray.map((slot, i) => {
          const isEmpty = slot.length === 0;
          const slotName = slot.length > 0 ? slot[0] : null;
          const stackCount = slot.length;

          const hasCardObj = cards && cards[i] && cards[i].length > 0;
          const cardObj = hasCardObj ? cards[i][0] : null;

          return (
            <div key={i} className="relative">
              {/* Stack visual effect layers */}
              {!isEmpty && stackCount > 1 && (
                <>
                  <div className={`absolute inset-0 translate-x-1 translate-y-1 rounded border -z-10 ${
                    isDanger ? 'border-neon-red/20 bg-red-950/20' :
                    isWarning ? 'border-neon-amber/20 bg-amber-950/20' :
                    'border-neon-cyan/15 bg-cyan-950/10'
                  }`} />
                  {stackCount > 2 && (
                    <div className={`absolute inset-0 translate-x-2 translate-y-2 rounded border -z-20 ${
                      isDanger ? 'border-neon-red/10 bg-red-950/10' :
                      isWarning ? 'border-neon-amber/10 bg-amber-950/10' :
                      'border-neon-cyan/5 bg-cyan-950/5'
                    }`} />
                  )}
                </>
              )}
              {hasCardObj ? (
                <>
                  <CardDisplay
                    card={cardObj!}
                    disabled={side === 'right'}
                    onClick={onCardClick && side !== 'right' ? () => onCardClick(cardObj!) : undefined}
                  />
                  {stackCount > 1 && (
                    <div className="absolute -top-1.5 -right-1.5 z-20 min-w-[16px] h-4 px-1 rounded-full bg-neon-magenta text-[8px] font-black text-white flex items-center justify-center border border-white/20 animate-pulse"
                      style={{ boxShadow: '0 0 8px rgba(255,0,255,0.6)' }}>
                      x{stackCount}
                    </div>
                  )}
                </>
              ) : (
                <div
                  className={`
                    relative rounded border px-2 py-1.5 text-left
                    transition-all duration-300
                    ${isEmpty
                      ? 'border-cyber-border/30 bg-cyber-darker/50'
                      : isDanger
                      ? `border-neon-red/60 bg-red-900/20 animate-warning-pulse`
                      : isWarning
                      ? `border-neon-amber/50 bg-amber-900/20`
                      : `border-neon-cyan/30 bg-cyan-900/10`
                    }
                  `}
                  style={
                    !isEmpty
                      ? {
                          boxShadow: isDanger
                            ? '0 0 8px rgba(255,0,64,0.2)'
                            : '0 0 5px rgba(0,240,255,0.1)',
                        }
                      : undefined
                  }
                >
                  {isEmpty ? (
                    <div className="text-[9px] text-cyber-border uppercase tracking-wider font-mono">
                      {t('emptySlotLabel')}
                    </div>
                  ) : (
                    <>
                      <div className="text-[10px] text-cyber-text truncate font-mono leading-tight">
                        {translateCardName(slotName || '')}
                      </div>
                      {stackCount > 1 && (
                        <div className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-neon-magenta text-[8px] font-black text-white flex items-center justify-center border border-white/20 animate-pulse"
                          style={{ boxShadow: '0 0 8px rgba(255,0,255,0.6)' }}>
                          x{stackCount}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MemorySlots;
