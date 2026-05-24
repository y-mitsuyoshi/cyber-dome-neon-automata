import { useState, useMemo, useEffect } from 'react';
import { Flag, Zap, User, Cpu, AlertTriangle, Trash2, Send, Layers } from 'lucide-react';
import type { BattleLogEntry, BattleSession, Card } from '../types/game';
import MemorySlots from './MemorySlots';
import CardDisplay from './CardDisplay';
import { useTranslation } from '../context/TranslationContext';
import { submitBattleAction } from '../api/client';
import DeckViewerModal from './DeckViewerModal';
import { useAudio } from '../context/AudioContext';

interface BattleArenaProps {
  gameId: string;
  playerName: string;
  battleSession: BattleSession | null;
  battleLog: BattleLogEntry[];
  opponent: string;
  onComplete: () => void;
  deck: Card[];
}

function BattleArena({
  gameId,
  playerName,
  battleSession,
  battleLog,
  opponent,
  onComplete,
  deck,
}: BattleArenaProps) {
  const { playSE } = useAudio();
  const [showDeckModal, setShowDeckModal] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lastStep, setLastStep] = useState<number>(0);
  const [lastFinished, setLastFinished] = useState<boolean>(false);

  const { t, translateBattleDetail } = useTranslation();

  // Play clash SE on step increment
  useEffect(() => {
    if (battleSession && battleSession.step > lastStep) {
      playSE('clash');
      setLastStep(battleSession.step);
    }
  }, [battleSession?.step, lastStep, playSE]);

  // Play victory/defeat SE on battle finished
  useEffect(() => {
    if (battleSession && battleSession.isFinished && !lastFinished) {
      if (battleSession.winner === playerName) {
        playSE('victory');
      } else {
        playSE('defeat');
      }
      setLastFinished(true);
    }
  }, [battleSession?.isFinished, battleSession?.winner, lastFinished, playerName, playSE]);

  // 1. Symmetrical: Extract player and opponent datasets from session
  const isP1 = battleSession?.player1Name === playerName;
  
  const myHand = useMemo(() => {
    if (!battleSession) return [];
    return isP1 ? battleSession.player1Hand : battleSession.player2Hand;
  }, [battleSession, isP1]);

  const myMem = useMemo(() => {
    if (!battleSession) return [];
    return isP1 ? battleSession.player1Mem : battleSession.player2Mem;
  }, [battleSession, isP1]);

  const myMemSlots = useMemo(() => {
    return myMem.map(slot => Array(slot.count).fill(slot.cardName));
  }, [myMem]);

  const myDiscard = useMemo(() => {
    if (!battleSession) return [];
    return isP1 ? battleSession.player1Discard : battleSession.player2Discard;
  }, [battleSession, isP1]);

  const opponentName = useMemo(() => {
    if (!battleSession) return opponent || 'CPU';
    return isP1 ? battleSession.player2Name : battleSession.player1Name;
  }, [battleSession, isP1, opponent]);

  const opponentHandCount = useMemo(() => {
    if (!battleSession) return 0;
    return isP1 ? battleSession.player2Hand.length : battleSession.player1Hand.length;
  }, [battleSession, isP1]);

  const opponentMem = useMemo(() => {
    if (!battleSession) return [];
    return isP1 ? battleSession.player2Mem : battleSession.player1Mem;
  }, [battleSession, isP1]);

  const opponentMemSlots = useMemo(() => {
    return opponentMem.map(slot => Array(slot.count).fill(slot.cardName));
  }, [opponentMem]);

  const opponentDiscardCount = useMemo(() => {
    if (!battleSession) return 0;
    return isP1 ? battleSession.player2Discard.length : battleSession.player1Discard.length;
  }, [battleSession, isP1]);

  // 2. Identify if local player has already committed this step
  const myCommittedAction = useMemo(() => {
    if (!battleSession || !battleSession.pendingActions) return null;
    return battleSession.pendingActions[playerName] || null;
  }, [battleSession, playerName]);

  const opponentCommitted = useMemo(() => {
    if (!battleSession || !battleSession.pendingActions) return false;
    return battleSession.pendingActions[opponentName] !== undefined;
  }, [battleSession, opponentName]);

  // 3. Handle Action submission (PLAY or DISCARD)
  const handleAction = async (actionType: 'PLAY' | 'DISCARD') => {
    if (!selectedCardId || submitting || !battleSession) return;
    setSubmitting(true);
    setError(null);

    try {
      await submitBattleAction(gameId, playerName, actionType, selectedCardId);
      playSE(actionType === 'PLAY' ? 'play' : 'discard');
      setSelectedCardId(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'GRID_LOCK: Failed to transmit action.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Selected card reference for render preview
  const selectedCard = useMemo(() => {
    return myHand.find((c) => c.id === selectedCardId) || null;
  }, [myHand, selectedCardId]);

  // Battle session ended or logs fully completed
  const isFinished = battleSession?.isFinished || battleSession == null;

  return (
    <div className="min-h-screen bg-cyber-dark relative overflow-hidden flex flex-col justify-between p-4">
      {/* Space grid scanner backgrounds */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 20%, rgba(0,240,255,0.03) 0%, transparent 60%), radial-gradient(ellipse at 50% 80%, rgba(255,0,255,0.03) 0%, transparent 60%)',
        }}
      />
      <div className="absolute inset-0 cyber-grid pointer-events-none" />

      {/* 1. Header layer */}
      <div className="relative z-10 max-w-7xl mx-auto w-full text-center">
        <h2 className="text-xl font-black tracking-[0.3em] uppercase text-neon-magenta text-glow-magenta font-mono animate-slide-in">
          {t('battleArenaHeader')}
        </h2>
        <div className="flex items-center justify-center gap-6 mt-1 font-mono text-xs">
          <div className="flex items-center gap-1.5">
            <User size={12} className="text-neon-cyan" />
            <span className="text-neon-cyan font-bold">{playerName}</span>
          </div>
          <span className="text-neon-red font-black text-sm">VS</span>
          <div className="flex items-center gap-1.5">
            <Cpu size={12} className="text-neon-magenta" />
            <span className="text-neon-magenta font-bold">{opponentName}</span>
          </div>
        </div>
      </div>

      {/* 2. Middle Arena Layer */}
      <div className="relative z-10 max-w-7xl mx-auto w-full grid grid-cols-[220px_1fr_220px] gap-6 items-center my-4 flex-1">
        {/* Left Side: Local Player Info & Memory */}
        <div className="font-mono flex flex-col gap-3 self-start">
          <MemorySlots slots={myMemSlots} label={t('yourMemory')} side="left" />
          <div className="border border-cyber-border/30 rounded p-2.5 bg-cyber-surface/30">
            <div className="text-[9px] text-cyber-text-dim uppercase tracking-wider">{t('discardMatrix')}</div>
            <div className="text-sm font-bold text-neon-cyan">{myDiscard.length} Units</div>
          </div>
          <button
            onClick={() => setShowDeckModal(true)}
            className="flex items-center justify-center gap-2 border border-neon-cyan/45 hover:border-neon-cyan rounded p-2 bg-cyber-surface/30 text-neon-cyan font-bold hover:bg-neon-cyan/10 transition-all text-xs cursor-pointer uppercase tracking-wider font-mono shadow-[0_0_8px_rgba(0,240,255,0.1)]"
          >
            <Layers size={14} className="text-neon-cyan animate-pulse" />
            {t('viewDeckBtn')}
          </button>
        </div>

        {/* Center Stage: Duel Field */}
        <div className="flex flex-col items-center justify-center min-h-[380px] border border-cyber-border/20 rounded-xl bg-cyber-surface/10 backdrop-blur-sm p-6 relative">
          {battleSession && !isFinished ? (
            <>
              {/* Step indicator */}
              <div className="absolute top-3 text-[10px] text-cyber-text-dim uppercase tracking-widest font-mono">
                {t('stepLabel')} {battleSession.step} / 10
              </div>

              {/* Flag status */}
              <div
                className={`flex items-center gap-2 mb-6 px-4 py-1.5 rounded border transition-all duration-300 ${
                  battleSession.flagHolder === playerName
                    ? 'border-neon-cyan/50 bg-cyan-900/10 text-neon-cyan'
                    : battleSession.flagHolder === opponentName
                    ? 'border-neon-magenta/50 bg-purple-900/10 text-neon-magenta'
                    : 'border-cyber-border bg-cyber-surface/30 text-cyber-text-dim'
                }`}
                style={{
                  boxShadow:
                    battleSession.flagHolder === playerName
                      ? '0 0 12px rgba(0,240,255,0.15)'
                      : battleSession.flagHolder === opponentName
                      ? '0 0 12px rgba(255,0,255,0.15)'
                      : 'none',
                }}
              >
                <Flag size={14} className={battleSession.flagHolder === playerName ? 'text-neon-cyan' : 'text-neon-magenta'} />
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  {t('accessLabel')}{
                    battleSession.flagHolder === playerName 
                      ? t('playerSelf') 
                      : battleSession.flagHolder === opponentName 
                      ? opponentName 
                      : battleSession.flagHolder || t('noneLabel')
                  }
                </span>
                {battleSession.flagPower > 0 && (
                  <span className="text-[10px] border-l border-current/30 pl-2 ml-1 font-mono font-black">
                    {battleSession.flagPower} POW
                  </span>
                )}
              </div>

              {/* Action submission waiting overlay */}
              {myCommittedAction ? (
                <div className="flex flex-col items-center justify-center text-center font-mono py-12 animate-pulse">
                  <div className="relative w-16 h-16 mb-4">
                    <div className="absolute inset-0 rounded-full border-4 border-t-neon-cyan border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                    <div className="absolute inset-2 rounded-full border-4 border-b-neon-magenta border-t-transparent border-r-transparent border-l-transparent animate-spin-reverse" />
                  </div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-1">
                    {t('syncingNeuralMatrix')}
                  </h4>
                  <p className="text-[10px] text-cyber-text-dim max-w-xs">
                    {opponentCommitted
                      ? t('combatProtocolDesc')
                      : t('awaitingOpponentDecision', { name: opponentName })}
                  </p>
                </div>
              ) : (
                /* Card play/preview and decision box */
                <div className="flex flex-col items-center w-full max-w-sm">
                  {selectedCard ? (
                    <div className="flex flex-col items-center gap-4 animate-card-reveal">
                      <div className="scale-95">
                        <CardDisplay card={selectedCard} />
                      </div>
                      <div className="flex items-center gap-3 font-mono">
                        <button
                          onClick={() => handleAction('PLAY')}
                          disabled={submitting}
                          className="flex items-center gap-1.5 px-5 py-2 rounded border border-neon-cyan bg-cyan-950/20 text-neon-cyan text-xs font-bold uppercase tracking-wider hover:bg-neon-cyan/10 transition-all cursor-pointer shadow-[0_0_10px_rgba(0,240,255,0.1)]"
                        >
                          <Send size={12} />
                          {t('readyForBattle')}
                        </button>
                        <button
                          onClick={() => handleAction('DISCARD')}
                          disabled={submitting}
                          className="flex items-center gap-1.5 px-5 py-2 rounded border border-neon-red bg-red-950/20 text-neon-red text-xs font-bold uppercase tracking-wider hover:bg-neon-red/10 transition-all cursor-pointer shadow-[0_0_10px_rgba(255,0,80,0.1)]"
                        >
                          <Trash2 size={12} />
                          {t('discardBtn')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center py-16 border border-dashed border-cyber-border/30 rounded-xl px-12 w-full">
                      <Zap size={28} className="text-cyber-border/40 animate-pulse mb-3" />
                      <p className="text-[11px] text-cyber-text-dim tracking-wider uppercase">
                        {t('selectCardPrompt')}
                      </p>
                    </div>
                  )}

                  {error && (
                    <div className="mt-3 flex items-center gap-1.5 text-[10px] text-neon-red bg-red-950/10 border border-neon-red/20 px-3 py-1.5 rounded font-mono">
                      <AlertTriangle size={12} />
                      <span>{error}</span>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Results Screen */
            <div className="flex flex-col items-center text-center font-mono py-6">
              <Zap size={32} className="text-neon-green text-glow-green mb-4 animate-bounce" />
              <h3 className="text-lg font-black tracking-widest text-white uppercase mb-2">
                {t('gridSimTerminated')}
              </h3>
              <p className="text-xs text-cyber-text-dim max-w-sm mb-6 leading-relaxed">
                {t('gridSimDesc')}
              </p>
              <button
                onClick={onComplete}
                className="px-8 py-2.5 rounded-lg border-2 border-neon-green text-neon-green font-bold text-xs uppercase tracking-widest hover:bg-neon-green/10 transition-all cursor-pointer shadow-[0_0_15px_rgba(0,255,102,0.15)] animate-pulse"
              >
                {t('continueBtn')}
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Opponent Info & Memory */}
        <div className="font-mono flex flex-col gap-3 self-start">
          <MemorySlots slots={opponentMemSlots} label={t('npcMemoryLabel', { opponent: opponentName })} side="right" />
          <div className="border border-cyber-border/30 rounded p-2.5 bg-cyber-surface/30 text-right">
            <div className="text-[9px] text-cyber-text-dim uppercase tracking-wider">{t('handModules')}</div>
            <div className="text-sm font-bold text-neon-magenta">{opponentHandCount} Active</div>
          </div>
          <div className="border border-cyber-border/30 rounded p-2.5 bg-cyber-surface/30 text-right">
            <div className="text-[9px] text-cyber-text-dim uppercase tracking-wider">{t('discardMatrix')}</div>
            <div className="text-sm font-bold text-neon-magenta">{opponentDiscardCount} Units</div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Layer: Hand (Scrollable Hand) */}
      <div className="relative z-10 max-w-7xl mx-auto w-full border-t border-cyber-border/30 pt-4 font-mono">
        <div className="flex justify-between items-center mb-2 px-1">
          <span className="text-[10px] text-cyber-text-dim uppercase tracking-widest">
            {t('yourAugmentationHand', { count: myHand.length })}
          </span>
          <span className="text-[9px] text-cyber-text-dim/50 uppercase">
            {t('noDrawAdvice')}
          </span>
        </div>

        {myHand.length > 0 ? (
          <div className="flex items-center gap-3 overflow-x-auto pb-4 px-1 scrollbar-thin scrollbar-thumb-cyber-border/50">
            {myHand.map((c) => {
              const isSelected = c.id === selectedCardId;
              return (
                <div
                  key={c.id}
                  onClick={() => !myCommittedAction && setSelectedCardId(c.id)}
                  className={`transition-all duration-300 relative rounded-lg ${
                    myCommittedAction ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'
                  }`}
                >
                  <CardDisplay card={c} showCost={false} />
                  {isSelected && (
                    <div className="absolute inset-0 rounded-lg border-2 border-neon-cyan shadow-[0_0_15px_rgba(0,240,255,0.4)] pointer-events-none" />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-xs text-cyber-text-dim border border-dashed border-cyber-border/20 rounded-lg">
            {t('noHandRemaining')}
          </div>
        )}
      </div>

      {/* 4. Bottom Feed Log */}
      {battleLog.length > 0 && (
        <div className="relative z-10 max-w-3xl mx-auto w-full mt-4 border border-cyber-border/20 rounded-lg p-2.5 bg-cyber-surface/40 max-h-24 overflow-y-auto font-mono text-[10px]">
          <div className="text-[9px] text-cyber-text-dim uppercase tracking-widest mb-1.5 font-bold">
            {t('combatLogHeader')}
          </div>
          {battleLog
            .slice(0)
            .reverse()
            .map((log, i) => {
              const displayLogAction = translateBattleDetail(log.details || log.action);
              const displayLogEffect = log.effectTriggered ? translateBattleDetail(log.effectTriggered) : '';

              return (
                <div
                  key={i}
                  className={`py-0.5 border-b border-cyber-border/5 last:border-0 ${
                    i === 0 ? 'text-cyber-text' : 'text-cyber-text-dim/60'
                  }`}
                >
                  <span className={`font-bold ${log.player === playerName ? 'text-neon-cyan' : 'text-neon-magenta'}`}>
                    [{log.player || 'SYSTEM'}]
                  </span>{' '}
                  {displayLogAction}
                  {log.effectTriggered && log.effectTriggered !== 'None' && log.effectTriggered !== '' && (
                    <span className="text-neon-green ml-2">⚡ {displayLogEffect}</span>
                  )}
                </div>
              );
            })}
        </div>
      )}

      <DeckViewerModal
        isOpen={showDeckModal}
        onClose={() => setShowDeckModal(false)}
        deck={deck}
        deleteModeSupported={false}
      />
    </div>
  );
}

export default BattleArena;
