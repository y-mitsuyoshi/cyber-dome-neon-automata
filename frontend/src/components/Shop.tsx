import { useState } from 'react';
import { RefreshCw, Trash2, Swords, CreditCard, Layers } from 'lucide-react';
import type { Card } from '../types/game';
import CardDisplay from './CardDisplay';
import { useTranslation } from '../context/TranslationContext';

interface ShopProps {
  round: number;
  maxRounds: number;
  credits: number;
  shopCards: Card[];
  deck: Card[];
  onBuy: (index: number) => void;
  onReroll: () => void;
  onDelete: (index: number) => void;
  onBattle: () => void;
  loading: boolean;
}

function Shop({ round, maxRounds, credits, shopCards, deck, onBuy, onReroll, onDelete, onBattle, loading }: ShopProps) {
  const [showDeck, setShowDeck] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-cyber-dark cyber-grid relative overflow-hidden">
      {/* Background gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(255,0,255,0.06) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-6">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6 animate-slide-in">
          {/* Round info */}
          <div className="flex items-center gap-4">
            <div className="border border-neon-cyan/30 rounded px-4 py-2 bg-cyber-surface/50 font-mono">
              <span className="text-[10px] uppercase tracking-widest text-cyber-text-dim block">
                {t('round')}
              </span>
              <span className="text-xl font-bold text-neon-cyan text-glow-cyan">{round}</span>
              <span className="text-cyber-text-dim text-sm">/{maxRounds}</span>
            </div>
          </div>

          {/* Credits */}
          <div className="flex items-center gap-2 border border-neon-amber/30 rounded px-4 py-2 bg-cyber-surface/50 font-mono">
            <CreditCard size={16} className="text-neon-amber" />
            <span className="text-[10px] uppercase tracking-widest text-cyber-text-dim">
              {t('credits')}
            </span>
            <span className="text-2xl font-bold text-neon-amber text-glow-amber ml-2">{credits}¢</span>
          </div>

          {/* Deck count */}
          <button
            onClick={() => { setShowDeck(!showDeck); setDeleteMode(false); }}
            className="flex items-center gap-2 border border-neon-magenta/30 rounded px-4 py-2 bg-cyber-surface/50 cursor-pointer hover:border-neon-magenta/60 transition-colors font-mono"
          >
            <Layers size={16} className="text-neon-magenta" />
            <span className="text-[10px] uppercase tracking-widest text-cyber-text-dim">
              {t('deckLabel')}
            </span>
            <span className="text-xl font-bold text-neon-magenta text-glow-magenta ml-2">{deck.length}</span>
          </button>
        </div>

        {/* Shop title */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black tracking-[0.2em] text-neon-magenta text-glow-magenta uppercase font-mono">
            {t('blackMarketHeader')}
          </h2>
          <p className="text-xs text-cyber-text-dim tracking-wider mt-1 font-mono">
            {t('shopSubtitle')}
          </p>
        </div>

        {/* Shop cards */}
        <div className="flex justify-center gap-6 mb-8">
          {shopCards.map((card, i) => (
            <div key={card.id || i} className="animate-slide-in" style={{ animationDelay: `${i * 0.15}s` }}>
              <CardDisplay
                card={card}
                showCost
                onClick={() => onBuy(i)}
                disabled={loading || credits < card.cost}
              />
              <button
                onClick={() => onBuy(i)}
                disabled={loading || credits < card.cost}
                className={`
                  mt-3 w-full py-2 rounded border text-xs uppercase tracking-wider font-bold font-mono
                  transition-all duration-300
                  ${credits >= card.cost
                    ? 'border-neon-green/50 text-neon-green hover:bg-neon-green/10 hover:border-neon-green cursor-pointer'
                    : 'border-cyber-border text-cyber-text-dim cursor-not-allowed opacity-50'
                  }
                `}
              >
                {credits >= card.cost 
                  ? t('buyBtn', { cost: card.cost })
                  : t('insufficientCredits')}
              </button>
            </div>
          ))}

          {shopCards.length === 0 && (
            <div className="text-center text-cyber-text-dim py-12 font-mono">
              <p className="text-lg mb-2">{t('noCardsAvailable')}</p>
              <p className="text-xs">{t('tryRerolling')}</p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex justify-center gap-4 mb-8 font-mono">
          <button
            onClick={onReroll}
            disabled={loading || credits < 1}
            className={`
              flex items-center gap-2 px-6 py-3 rounded border text-sm uppercase tracking-wider font-bold
              transition-all duration-300
              ${credits >= 1
                ? 'border-neon-cyan/50 text-neon-cyan hover:bg-neon-cyan/10 hover:border-neon-cyan cursor-pointer'
                : 'border-cyber-border text-cyber-text-dim cursor-not-allowed opacity-50'
              }
            `}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {t('rerollText')}
          </button>

          <button
            onClick={() => { setDeleteMode(!deleteMode); setShowDeck(true); }}
            disabled={loading || deck.length === 0}
            className={`
              flex items-center gap-2 px-6 py-3 rounded border text-sm uppercase tracking-wider font-bold
              transition-all duration-300
              ${deleteMode
                ? 'border-neon-red bg-neon-red/10 text-neon-red'
                : 'border-neon-red/50 text-neon-red hover:bg-neon-red/10 cursor-pointer'
              }
              ${deck.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <Trash2 size={16} />
            {deleteMode 
              ? t('cancelDelete') 
              : t('deleteCardText')}
          </button>

          <button
            onClick={onBattle}
            disabled={loading}
            className="flex items-center gap-2 px-8 py-3 rounded border-2 border-neon-green text-neon-green font-bold text-sm uppercase tracking-wider
              hover:bg-neon-green/10 hover:scale-105 transition-all duration-300 cursor-pointer"
            style={{
              boxShadow: '0 0 15px rgba(0,255,102,0.2), 0 0 30px rgba(0,255,102,0.1)',
            }}
          >
            <Swords size={18} />
            {t('enterArenaBtn')}
          </button>
        </div>

        {/* Deck panel */}
        {showDeck && (
          <div className="border border-cyber-border rounded-lg p-4 bg-cyber-surface/50 animate-slide-in max-w-3xl mx-auto font-mono">
            <h3 className="text-sm font-bold text-neon-cyan tracking-widest uppercase mb-3 flex items-center gap-2">
              <Layers size={14} />
              {t('yourDeckCount', { count: deck.length })}
            </h3>
            {deck.length === 0 ? (
              <p className="text-cyber-text-dim text-sm text-center py-4">
                {t('deckEmpty')}
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {deck.map((card, i) => (
                  <div
                    key={card.id || i}
                    onClick={deleteMode ? () => onDelete(i) : undefined}
                    className={`
                       transition-all duration-200
                      ${deleteMode ? 'cursor-pointer hover:bg-red-900/30 hover:border-neon-red rounded' : ''}
                    `}
                  >
                    <CardDisplay card={card} compact />
                    {deleteMode && (
                      <div className="text-[9px] text-neon-red text-center mt-1 uppercase tracking-wider font-bold">
                        {t('clickToDelete')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Shop;
