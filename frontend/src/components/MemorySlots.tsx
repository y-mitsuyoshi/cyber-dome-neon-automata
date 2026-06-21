import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { HardDrive, X } from 'lucide-react';
import type { Card, LiveMemorySlot } from '../types/game';
import { useTranslation } from '../context/TranslationContext';
import { useAudio } from '../context/AudioContext';

interface MemorySlotsProps {
  /** Rich slots carrying the full Card payloads (preferred). */
  liveSlots?: LiveMemorySlot[];
  /** Legacy slots: array of card-name arrays (still used by historical replay logs). */
  slots?: string[][];
  maxSlots?: number;
  label: string;
  side: 'left' | 'right';
  /** Accent color theme: cyan for the local player, magenta for the opponent. */
  accent?: 'cyan' | 'magenta';
}

const ACCENT = {
  cyan: {
    text: 'text-neon-cyan',
    border: 'border-neon-cyan/30',
    borderWarn: 'border-neon-amber',
    borderDanger: 'border-neon-red',
    fill: 'bg-neon-cyan',
    fillWarn: 'bg-neon-amber',
    fillDanger: 'bg-neon-red',
    slotBg: 'bg-cyan-900/10',
    slotBgWarn: 'bg-amber-900/20',
    slotBgDanger: 'bg-red-900/20',
    glow: 'rgba(0,240,255,0.1)',
    glowDanger: 'rgba(255,0,64,0.2)',
    stackBorder: 'border-neon-cyan/15',
    stackBorderWarn: 'border-neon-amber/20',
    stackBorderDanger: 'border-neon-red/20',
    stackBg: 'bg-cyan-950/10',
    stackBgWarn: 'bg-amber-950/20',
    stackBgDanger: 'bg-red-950/20',
  },
  magenta: {
    text: 'text-neon-magenta',
    border: 'border-neon-magenta/30',
    borderWarn: 'border-neon-amber',
    borderDanger: 'border-neon-red',
    fill: 'bg-neon-magenta',
    fillWarn: 'bg-neon-amber',
    fillDanger: 'bg-neon-red',
    slotBg: 'bg-purple-900/10',
    slotBgWarn: 'bg-amber-900/20',
    slotBgDanger: 'bg-red-900/20',
    glow: 'rgba(255,0,255,0.1)',
    glowDanger: 'rgba(255,0,64,0.2)',
    stackBorder: 'border-neon-magenta/15',
    stackBorderWarn: 'border-neon-amber/20',
    stackBorderDanger: 'border-neon-red/20',
    stackBg: 'bg-purple-950/10',
    stackBgWarn: 'bg-amber-950/20',
    stackBgDanger: 'bg-red-950/20',
  },
};

function MemorySlots({ liveSlots, slots, maxSlots = 6, label, side, accent = 'cyan' }: MemorySlotsProps) {
  const { t, translateCardName, translateCard } = useTranslation();
  const { playSE } = useAudio();
  const [pinned, setPinned] = useState<number | null>(null);

  const accentCfg = ACCENT[accent];

  // Normalize the incoming data into a unified shape: per-slot, either a single
  // representative Card (with effect text) or null when empty.
  const normalizedSlots = useMemo(() => {
    const arr: { card: Card | null; count: number; name: string | null }[] = [];
    if (liveSlots) {
      for (let i = 0; i < maxSlots; i++) {
        const slot = liveSlots[i];
        if (slot && slot.count > 0 && slot.cards && slot.cards.length > 0) {
          arr.push({ card: slot.cards[0], count: slot.count, name: slot.cardName });
        } else if (slot && slot.count > 0) {
          // Fallback when card payload wasn't shipped: synthesize a minimal card.
          arr.push({
            card: {
              id: 'mem_' + slot.cardName,
              name: slot.cardName,
              attribute: 'None',
              archetype: '',
              power: 0,
              rarity: 'Common',
              effect: '',
              effectType: '',
              cost: 0,
            },
            count: slot.count,
            name: slot.cardName,
          });
        } else {
          arr.push({ card: null, count: 0, name: null });
        }
      }
    } else if (slots) {
      for (let i = 0; i < maxSlots; i++) {
        const slot = slots[i] || [];
        if (slot.length > 0) {
          arr.push({
            card: {
              id: 'mem_' + slot[0],
              name: slot[0],
              attribute: 'None',
              archetype: '',
              power: 0,
              rarity: 'Common',
              effect: '',
              effectType: '',
              cost: 0,
            },
            count: slot.length,
            name: slot[0],
          });
        } else {
          arr.push({ card: null, count: 0, name: null });
        }
      }
    }
    return arr;
  }, [liveSlots, slots, maxSlots]);

  const filledCount = normalizedSlots.filter((s) => s.count > 0).length;
  const fillRatio = filledCount / maxSlots;
  const isWarning = fillRatio >= 5 / 6;
  const isDanger = filledCount >= maxSlots;

  // Pre-compute translated cards for each slot so we don't violate the rules of
  // hooks by calling useMemo inside the .map callback.
  const translatedCards = useMemo(
    () => normalizedSlots.map((s) => (s.card ? translateCard(s.card) : null)),
    [normalizedSlots, translateCard]
  );

  const progressColor = isDanger ? accentCfg.fillDanger : isWarning ? accentCfg.fillWarn : accentCfg.fill;
  const borderColor = isDanger
    ? accentCfg.borderDanger
    : isWarning
    ? accentCfg.borderWarn
    : accentCfg.border;

  return (
    <div className={`animate-fade-in relative ${side === 'right' ? 'text-right' : ''}`}>
      {/* Header */}
      <div className={`flex items-center gap-2 mb-2 ${side === 'right' ? 'flex-row-reverse' : ''}`}>
        <HardDrive size={14} className={isDanger ? 'text-neon-red animate-pulse' : accentCfg.text} />
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
        {normalizedSlots.map((slot, i) => {
          const isEmpty = slot.count === 0;
          const stackCount = slot.count;
          const card = slot.card;

          // Translated card precomputed above (hook-safe)
          const displayCard = translatedCards[i];
          const displayEffect = displayCard?.effect || '';
          const hasEffect = displayEffect.length > 0;

          const slotBg = isDanger
            ? accentCfg.slotBgDanger
            : isWarning
            ? accentCfg.slotBgWarn
            : accentCfg.slotBg;
          const slotBorder = isDanger
            ? 'border-neon-red/60 animate-warning-pulse'
            : isWarning
            ? 'border-neon-amber/50'
            : accentCfg.border;
          const glow = isDanger ? accentCfg.glowDanger : accentCfg.glow;

          return (
            <div key={i} className="relative">
              {/* Stack visual effect layers */}
              {!isEmpty && stackCount > 1 && (
                <>
                  <div className={`absolute inset-0 translate-x-1 translate-y-1 rounded border -z-10 ${
                    isDanger ? accentCfg.stackBorderDanger + ' ' + accentCfg.stackBgDanger :
                    isWarning ? accentCfg.stackBorderWarn + ' ' + accentCfg.stackBgWarn :
                    accentCfg.stackBorder + ' ' + accentCfg.stackBg
                  }`} />
                  {stackCount > 2 && (
                    <div className={`absolute inset-0 translate-x-2 translate-y-2 rounded border -z-20 ${
                      isDanger ? accentCfg.stackBorderDanger + ' ' + accentCfg.stackBgDanger :
                      isWarning ? accentCfg.stackBorderWarn + ' ' + accentCfg.stackBgWarn :
                      accentCfg.stackBorder + ' ' + accentCfg.stackBg
                    }`} />
                  )}
                </>
              )}
              <div
                onMouseEnter={() => { if (!isEmpty) playSE('hover'); }}
                onClick={() => { if (!isEmpty) setPinned(pinned === i ? null : i); }}
                className={`
                  relative rounded border px-2 py-1.5 text-left transition-all duration-300 cursor-pointer
                  ${isEmpty
                    ? 'border-cyber-border/30 bg-cyber-darker/50 cursor-default'
                    : `${slotBorder} ${slotBg} hover:scale-[1.03]`
                  }
                `}
                style={!isEmpty ? { boxShadow: `0 0 5px ${glow}` } : undefined}
              >
                {isEmpty ? (
                  <div className="text-[9px] text-cyber-border uppercase tracking-wider font-mono">
                    {t('emptySlotLabel')}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-1">
                      <div className="text-[10px] text-cyber-text truncate font-mono leading-tight flex-1">
                        {displayCard?.name || translateCardName(slot.name || '')}
                      </div>
                      {card && card.power > 0 && (
                        <div className={`text-[9px] font-black ${accentCfg.text} whitespace-nowrap`}>
                          {card.power}P
                        </div>
                      )}
                    </div>
                    {/* Effect indicator dot — visible at-a-glance so observers know
                        that this benched card carries a passive/triggered effect. */}
                    {hasEffect && (
                      <div className={`mt-1 flex items-center gap-1 text-[8px] uppercase tracking-wider ${
                        isDanger ? 'text-neon-red' : isWarning ? 'text-neon-amber' : accentCfg.text
                      }`}>
                        <span className="inline-block w-1 h-1 rounded-full bg-current animate-pulse" />
                        <span className="truncate">
                          {t('memEffectBadge') || 'EFFECT'}
                        </span>
                      </div>
                    )}
                    {stackCount > 1 && (
                      <div className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-neon-magenta text-[8px] font-black text-white flex items-center justify-center border border-white/20 animate-pulse"
                        style={{ boxShadow: '0 0 8px rgba(255,0,255,0.6)' }}>
                        x{stackCount}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pinned card detail popover — rendered via portal so it always sits
          above the battle arena's stacking contexts and isn't clipped by
          transformed ancestors. */}
      {pinned !== null && (() => {
        const slot = normalizedSlots[pinned];
        if (!slot || !slot.card) return null;
        const dc = translateCard(slot.card);
        return createPortal(
          <div className="fixed inset-0 z-[200]" onClick={() => setPinned(null)}>
            <div className="absolute inset-0 bg-cyber-dark/70 backdrop-blur-sm animate-fade-in" />
            <div
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] max-w-[90vw] bg-cyber-darker border-2 ${accentCfg.border} rounded-lg p-4 shadow-[0_0_30px_rgba(0,0,0,0.8)] animate-slide-in`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-2">
                <div className={`text-xs font-black ${accentCfg.text} uppercase tracking-widest`}>
                  {t('memDetailTitle') || 'BENCH MODULE'}
                </div>
                <button
                  onClick={() => setPinned(null)}
                  className="text-cyber-text-dim hover:text-white cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="text-sm font-bold text-white mb-1">{dc.name}</div>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider mb-3">
                <span className={accentCfg.text}>{dc.attribute}</span>
                {slot.card && slot.card.power > 0 && (
                  <span className={`font-bold ${accentCfg.text}`}>POW {slot.card.power}</span>
                )}
                {slot.count > 1 && (
                  <span className="bg-neon-magenta text-white px-1.5 py-0.5 rounded-full text-[9px] font-black">
                    x{slot.count}
                  </span>
                )}
              </div>
              {dc.effect ? (
                <p className="text-[11px] text-cyber-text leading-relaxed border-t border-cyber-border/40 pt-2">
                  {dc.effect}
                </p>
              ) : (
                <p className="text-[11px] text-cyber-text-dim italic border-t border-cyber-border/40 pt-2">
                  {t('memNoEffect') || 'No effect.'}
                </p>
              )}
            </div>
          </div>,
          document.body
        );
      })()}
    </div>
  );
}

export default MemorySlots;