import { useMemo } from 'react';
import { HardDrive } from 'lucide-react';
import { useTranslation } from '../context/TranslationContext';

interface MemorySlotsProps {
  slots: string[][];
  maxSlots?: number;
  label: string;
  side: 'left' | 'right';
}

function MemorySlots({ slots, maxSlots = 6, label, side }: MemorySlotsProps) {
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
      <div className={`grid grid-cols-2 gap-1.5 ${side === 'right' ? 'direction-rtl' : ''}`}>
        {slotArray.map((slot, i) => {
          const isEmpty = slot.length === 0;
          const slotName = slot.length > 0 ? slot[0] : null;
          const stackCount = slot.length;

          return (
            <div
              key={i}
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
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-neon-magenta text-[8px] font-bold text-white flex items-center justify-center"
                      style={{ boxShadow: '0 0 6px rgba(255,0,255,0.5)' }}>
                      {stackCount}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MemorySlots;
