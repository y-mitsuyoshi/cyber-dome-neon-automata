import { useState } from 'react';
import { X, Layers, Trash2, AlertCircle } from 'lucide-react';
import type { Card } from '../types/game';
import CardDisplay from './CardDisplay';
import { useTranslation } from '../context/TranslationContext';
import { useAudio } from '../context/AudioContext';

interface DeckViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  deck: Card[];
  credits?: number; // Needed to validate delete cost (2 credits)
  onDeleteCard?: (index: number) => void; // Called when deleting a card
  deleteModeSupported?: boolean; // True in Shop phase, False in Battle phase
}

export default function DeckViewerModal({
  isOpen,
  onClose,
  deck,
  credits = 0,
  onDeleteCard,
  deleteModeSupported = false,
}: DeckViewerModalProps) {
  const { playSE } = useAudio();
  const { t } = useTranslation();
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleDeleteClick = (index: number) => {
    setDeleteConfirmIndex(index);
  };

  const handleConfirmDelete = (index: number) => {
    if (onDeleteCard) {
      onDeleteCard(index);
    }
    setDeleteConfirmIndex(null);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-cyber-dark/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-5xl max-h-[85vh] bg-cyber-darker border-2 border-neon-magenta/40 p-6 rounded-lg shadow-[0_0_30px_rgba(255,0,255,0.15)] relative flex flex-col animate-slide-in">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 border-b border-neon-magenta/20 pb-4">
          <div className="flex items-center gap-3">
            <Layers className="text-neon-magenta animate-pulse" size={24} />
            <h2 className="text-xl font-black text-neon-magenta uppercase tracking-[0.2em] text-glow-magenta font-mono">
              {t('deckViewerModalTitle')}
            </h2>
            <span className="text-xs border border-neon-magenta/30 px-2 py-0.5 rounded text-neon-magenta font-mono">
              {deck.length} {t('deckDraw')}
            </span>
          </div>
          <button
            onClick={() => { playSE('click'); onClose(); }}
            onMouseEnter={() => playSE('hover')}
            className="p-1 text-cyber-border hover:text-neon-magenta hover:bg-neon-magenta/10 rounded transition-all cursor-pointer"
          >
            <X size={24} />
          </button>
        </div>

        {/* Info Banner for Delete Cost */}
        {deleteModeSupported && (
          <div className="mb-4 bg-cyber-surface/40 border border-cyber-border/40 p-3 rounded flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2 text-cyber-text-dim">
              <AlertCircle size={14} className="text-neon-amber animate-pulse" />
              <span>{t('deleteInfoText')}</span>
            </div>
            <div className="text-neon-amber font-bold">
              {t('credits')}: {credits}¢
            </div>
          </div>
        )}

        {/* Deck Grid */}
        <div className="overflow-y-auto flex-1 pr-2 scrollbar-thin scrollbar-thumb-neon-magenta/40 scrollbar-track-transparent pb-4">
          {deck.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-cyber-text-dim uppercase tracking-wider font-mono">
              <Layers size={48} className="text-cyber-border/30 mb-4 animate-pulse" />
              {t('deckEmpty')}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 justify-items-center">
              {deck.map((card, i) => {
                const isConfirming = deleteConfirmIndex === i;
                const canDelete = true;

                return (
                  <div key={`${card.id}-${i}`} className="flex flex-col items-center gap-2 relative group animate-card-reveal">
                    <CardDisplay card={card} showCost={false} />
                    
                    {deleteModeSupported && onDeleteCard && (
                      <div className="w-full mt-1">
                        {isConfirming ? (
                          <div className="flex gap-1 w-full animate-fade-in font-mono text-[10px]">
                            <button
                              onClick={() => handleConfirmDelete(i)}
                              onMouseEnter={() => playSE('hover')}
                              className="flex-1 py-1 rounded bg-neon-red/25 border border-neon-red text-neon-red font-bold uppercase cursor-pointer hover:bg-neon-red/40 transition-all"
                            >
                              CONFIRM
                            </button>
                            <button
                              onClick={() => { playSE('click'); setDeleteConfirmIndex(null); }}
                              onMouseEnter={() => playSE('hover')}
                              className="px-2 py-1 rounded border border-cyber-border text-cyber-text hover:bg-cyber-surface transition-all cursor-pointer"
                            >
                              X
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { playSE('click'); handleDeleteClick(i); }}
                            onMouseEnter={() => { if (canDelete) playSE('hover'); }}
                            disabled={!canDelete}
                            className={`w-full py-1 px-3 rounded border text-[10px] uppercase font-bold tracking-wider font-mono flex items-center justify-center gap-1.5 transition-all duration-300
                              ${canDelete
                                ? 'border-neon-red/50 text-neon-red hover:bg-neon-red/10 cursor-pointer shadow-[0_0_8px_rgba(255,0,80,0.1)]'
                                : 'border-cyber-border/40 text-cyber-text-dim/40 cursor-not-allowed opacity-40'
                              }
                            `}
                          >
                            <Trash2 size={10} />
                            {t('deleteCardText')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
