import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, X, ChevronDown, ChevronUp } from 'lucide-react';
import type { Card } from '../types/game';
import { useTranslation } from '../context/TranslationContext';
import { useAudio } from '../context/AudioContext';

interface DiscardPileProps {
  /** Cards currently in this player's banish / discard area. */
  cards: Card[];
  label: string;
  side: 'left' | 'right';
  accent?: 'cyan' | 'magenta';
}

const ACCENT_TEXT = {
  cyan: 'text-neon-cyan',
  magenta: 'text-neon-magenta',
};
const ACCENT_BORDER = {
  cyan: 'border-neon-cyan/30',
  magenta: 'border-neon-magenta/30',
};

function DiscardPile({ cards, label, side, accent = 'cyan' }: DiscardPileProps) {
  const { t, translateCard, translateCardName } = useTranslation();
  const { playSE } = useAudio();
  const [expanded, setExpanded] = useState(false);
  const [pinned, setPinned] = useState<number | null>(null);

  const count = cards.length;

  // Tally unique card names with their stacked count so the list doesn't bloat.
  const summary = useMemo(() => {
    const map = new Map<string, { card: Card; count: number }>();
    for (const c of cards) {
      const key = c.name;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(key, { card: c, count: 1 });
      }
    }
    return Array.from(map.values());
  }, [cards]);

  const accentText = ACCENT_TEXT[accent];
  const accentBorder = ACCENT_BORDER[accent];

  return (
    <div className={`animate-fade-in ${side === 'right' ? 'text-right' : ''}`}>
      {/* Header */}
      <div
        className={`flex items-center gap-2 mb-1.5 cursor-pointer select-none ${side === 'right' ? 'flex-row-reverse' : ''}`}
        onClick={() => { playSE('click'); setExpanded(!expanded); }}
      >
        <Trash2 size={12} className={count > 0 ? accentText : 'text-cyber-border'} />
        <span className="text-[10px] uppercase tracking-widest text-cyber-text-dim font-bold">
          {label}
        </span>
        <span className={`text-[10px] font-mono ${count > 0 ? accentText : 'text-cyber-border'}`}>
          {count}
        </span>
        {count > 0 && (
          expanded
            ? <ChevronUp size={12} className="text-cyber-text-dim" />
            : <ChevronDown size={12} className="text-cyber-text-dim" />
        )}
      </div>

      {/* Empty placeholder */}
      {count === 0 ? (
        <div className="border border-dashed border-cyber-border/20 rounded px-2 py-1.5 text-[9px] text-cyber-border uppercase tracking-wider font-mono">
          {t('discardEmpty') || 'EMPTY / なし'}
        </div>
      ) : expanded ? (
        <div className={`border ${accentBorder} bg-cyber-darker/60 rounded p-1.5 space-y-1 max-h-[160px] overflow-y-auto`}>
          {summary.map(({ card, count: stackCount }, idx) => {
            const dc = translateCard(card);
            const hasEffect = (dc.effect || '').length > 0;
            return (
              <div
                key={card.id + card.name}
                onMouseEnter={() => playSE('hover')}
                onClick={() => setPinned(pinned === idx ? null : idx)}
                className={`relative rounded border ${accentBorder} bg-cyber-surface/40 px-2 py-1 text-left cursor-pointer hover:bg-cyber-surface/70 transition-all ${side === 'right' ? 'text-left' : ''}`}
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="text-[10px] text-cyber-text truncate font-mono leading-tight flex-1">
                    {dc.name || translateCardName(card.name)}
                  </div>
                  <div className="flex items-center gap-1">
                    {card.power > 0 && (
                      <div className={`text-[9px] font-black ${accentText} whitespace-nowrap`}>
                        {card.power}P
                      </div>
                    )}
                    {stackCount > 1 && (
                      <div className="bg-neon-magenta text-white text-[8px] font-black px-1 rounded-full border border-white/20">
                        x{stackCount}
                      </div>
                    )}
                  </div>
                </div>
                {hasEffect && (
                  <div className={`mt-0.5 text-[8px] leading-tight text-cyber-text-dim line-clamp-2`}>
                    {dc.effect}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        // Collapsed preview: show up to 4 thumbnails with a "+N" overflow.
        <div className={`flex flex-wrap gap-1 ${side === 'right' ? 'justify-end' : ''}`}>
          {summary.slice(0, 4).map(({ card, count: stackCount }) => (
            <div
              key={card.id + card.name + '_thumb'}
              className={`relative rounded border ${accentBorder} bg-cyber-darker/60 px-1.5 py-0.5 text-[9px] font-mono ${accentText}`}
              title={card.name}
            >
              {translateCardName(card.name).slice(0, 6)}
              {stackCount > 1 && (
                <span className="ml-0.5 text-neon-magenta">x{stackCount}</span>
              )}
            </div>
          ))}
          {summary.length > 4 && (
            <div className="rounded border border-cyber-border/40 bg-cyber-darker/60 px-1.5 py-0.5 text-[9px] font-mono text-cyber-text-dim">
              +{summary.length - 4}
            </div>
          )}
        </div>
      )}

      {/* Pinned detail popover — rendered via portal for reliable stacking. */}
      {pinned !== null && (() => {
        const target = summary[pinned]?.card;
        if (!target) return null;
        const dc = translateCard(target);
        return createPortal(
          <div className="fixed inset-0 z-[200]" onClick={() => setPinned(null)}>
            <div className="absolute inset-0 bg-cyber-dark/70 backdrop-blur-sm animate-fade-in" />
            <div
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] max-w-[90vw] bg-cyber-darker border-2 ${accentBorder} rounded-lg p-4 shadow-[0_0_30px_rgba(0,0,0,0.8)] animate-slide-in`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-2">
                <div className={`text-xs font-black ${accentText} uppercase tracking-widest`}>
                  {t('discardDetailTitle') || 'DISCARD MODULE'}
                </div>
                <button onClick={() => setPinned(null)} className="text-cyber-text-dim hover:text-white cursor-pointer">
                  <X size={14} />
                </button>
              </div>
              <div className="text-sm font-bold text-white mb-1">{dc.name}</div>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider mb-3">
                <span className={accentText}>{dc.attribute}</span>
                {target.power > 0 && <span className={`font-bold ${accentText}`}>POW {target.power}</span>}
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

export default DiscardPile;