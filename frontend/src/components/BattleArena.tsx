import { useState, useMemo, useEffect } from 'react';
import { Flag, Zap, User, Cpu, AlertTriangle, Trash2, Send, Layers, Crosshair, Activity, Clock, Shield, Flame } from 'lucide-react';
import type { BattleLogEntry, BattleSession, Card, BattleLogCard } from '../types/game';
import MemorySlots from './MemorySlots';
import CardDisplay from './CardDisplay';
import { useTranslation } from '../context/TranslationContext';
// Battle action is now handled via App.tsx to keep gameState synchronized
import DeckViewerModal from './DeckViewerModal';
import { useAudio } from '../context/AudioContext';

const convertToFullCard = (logCard: BattleLogCard): Card => {
  const attribute = (['Virus', 'AI', 'Hardware', 'Netrunner'].includes(logCard.attribute)
    ? logCard.attribute
    : 'Virus') as 'Virus' | 'AI' | 'Hardware' | 'Netrunner';

  return {
    id: logCard.id || 'default',
    name: logCard.name,
    attribute,
    archetype: 'Control',
    power: logCard.power,
    rarity: 'Common',
    effect: '',
    effectType: '',
    cost: 0,
  };
};

interface BattleArenaProps {
  gameId: string;
  playerName: string;
  battleSession: BattleSession | null;
  battleLog: BattleLogEntry[];
  opponent: string;
  onComplete: () => void;
  deck: Card[];
  onSubmitAction: (actionType: 'PLAY' | 'DISCARD', cardId: string) => Promise<void>;
  loading: boolean;
}

function BattleArena({
  gameId: _gameId,
  playerName,
  battleSession,
  battleLog,
  opponent,
  onComplete,
  deck,
  onSubmitAction,
  loading,
}: BattleArenaProps) {
  const { playSE } = useAudio();
  const [showDeckModal, setShowDeckModal] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lastStep, setLastStep] = useState<number>(0);
  const [lastFinished, setLastFinished] = useState<boolean>(false);
  const [acknowledgedStep, setAcknowledgedStep] = useState<number>(0);
  const [showClashOverlay, setShowClashOverlay] = useState<boolean>(false);

  const { t, translateBattleDetail } = useTranslation();

  // Play clash SE on step increment
  useEffect(() => {
    if (battleSession && battleSession.step > lastStep) {
      playSE('clash');
      setLastStep(battleSession.step);
      setShowClashOverlay(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battleSession?.isFinished, battleSession?.winner, lastFinished, playerName, playSE]);

  // Retrieve details of the clash that just finished
  const resolvedLog = useMemo(() => {
    if (!battleSession) return null;
    const stepToFind = acknowledgedStep + 1;
    const log = battleSession.log || [];
    return log.find((l) => l.step === stepToFind) || null;
  }, [battleSession, acknowledgedStep]);

  // 1. Symmetrical: Extract player and opponent datasets from session
  const isP1 = battleSession?.player1Name === playerName;
  
  const myHand = useMemo(() => {
    if (!battleSession) return [];
    const hand = isP1 ? battleSession.player1Hand : battleSession.player2Hand;
    return hand || [];
  }, [battleSession, isP1]);

  const myMem = useMemo(() => {
    if (!battleSession) return [];
    const mem = isP1 ? battleSession.player1Mem : battleSession.player2Mem;
    return mem || [];
  }, [battleSession, isP1]);

  const myMemSlots = useMemo(() => {
    return (myMem || []).map(slot => Array(slot.count || 0).fill(slot.cardName));
  }, [myMem]);

  const myDiscard = useMemo(() => {
    if (!battleSession) return [];
    const discard = isP1 ? battleSession.player1Discard : battleSession.player2Discard;
    return discard || [];
  }, [battleSession, isP1]);

  const opponentName = useMemo(() => {
    if (!battleSession) return opponent || 'CPU';
    return isP1 ? battleSession.player2Name : battleSession.player1Name;
  }, [battleSession, isP1, opponent]);

  const opponentHandCount = useMemo(() => {
    if (!battleSession) return 0;
    const hand = isP1 ? battleSession.player2Hand : battleSession.player1Hand;
    return hand ? hand.length : 0;
  }, [battleSession, isP1]);

  const opponentMem = useMemo(() => {
    if (!battleSession) return [];
    const mem = isP1 ? battleSession.player2Mem : battleSession.player1Mem;
    return mem || [];
  }, [battleSession, isP1]);

  const opponentMemSlots = useMemo(() => {
    return (opponentMem || []).map(slot => Array(slot.count || 0).fill(slot.cardName));
  }, [opponentMem]);

  const opponentDiscardCount = useMemo(() => {
    if (!battleSession) return 0;
    const discard = isP1 ? battleSession.player2Discard : battleSession.player1Discard;
    return discard ? discard.length : 0;
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
    if (!selectedCardId || submitting || !battleSession || loading) return;
    setSubmitting(true);
    setError(null);

    try {
      await onSubmitAction(actionType, selectedCardId);
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

          {/* Battle Timeline */}
          {battleSession && battleSession.log && battleSession.log.length > 0 && (
            <div className="border border-neon-cyan/20 rounded p-2.5 bg-cyan-950/10 max-h-48 overflow-y-auto">
              <div className="flex items-center gap-1.5 mb-2">
                <Clock size={10} className="text-neon-cyan" />
                <span className="text-[9px] text-neon-cyan uppercase tracking-widest font-bold">Turn Log</span>
              </div>
              <div className="flex flex-col gap-1">
                {battleSession.log.map((log) => {
                  const myCard = isP1 ? log.p1Card : log.p2Card;
                  const oppCard = isP1 ? log.p2Card : log.p1Card;
                  const myAction = isP1 ? log.p1Action : log.p2Action;
                  const oppAction = isP1 ? log.p2Action : log.p1Action;

                  return (
                    <div key={log.step} className="border-l-2 border-cyber-border/30 pl-2 py-0.5">
                      <div className="text-[9px] text-cyber-text-dim mb-0.5">Step {log.step}</div>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-1 h-1 rounded-full ${myAction === 'PLAY' ? 'bg-neon-cyan' : 'bg-neon-red'}`} />
                          <span className="text-[9px] text-neon-cyan truncate">{myAction === 'PLAY' ? myCard?.name || '?' : 'DISCARD'}</span>
                          {myAction === 'PLAY' && <span className="text-[8px] text-cyber-text-dim">{myCard?.power}P</span>}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className={`w-1 h-1 rounded-full ${oppAction === 'PLAY' ? 'bg-neon-magenta' : 'bg-neon-red'}`} />
                          <span className="text-[9px] text-neon-magenta truncate">{oppAction === 'PLAY' ? oppCard?.name || '?' : 'DISCARD'}</span>
                          {oppAction === 'PLAY' && <span className="text-[8px] text-cyber-text-dim">{oppCard?.power}P</span>}
                        </div>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1">
                        <Flag size={8} className={log.flagHolder === playerName ? 'text-neon-cyan' : 'text-neon-magenta'} />
                        <span className="text-[8px] text-cyber-text-dim">
                          {log.flagHolder === playerName ? 'You' : opponentName} +{log.currentPower}P
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
                className={`flex flex-col items-center gap-1 mb-6 px-6 py-2 rounded-lg border transition-all duration-500 ${
                  battleSession.flagHolder === playerName
                    ? 'border-neon-cyan/60 bg-cyan-900/15 text-neon-cyan'
                    : battleSession.flagHolder === opponentName
                    ? 'border-neon-magenta/60 bg-purple-900/15 text-neon-magenta'
                    : 'border-cyber-border bg-cyber-surface/30 text-cyber-text-dim'
                }`}
                style={{
                  boxShadow:
                    battleSession.flagHolder === playerName
                      ? '0 0 20px rgba(0,240,255,0.25), inset 0 0 10px rgba(0,240,255,0.05)'
                      : battleSession.flagHolder === opponentName
                      ? '0 0 20px rgba(255,0,255,0.25), inset 0 0 10px rgba(255,0,255,0.05)'
                      : 'none',
                }}
              >
                <div className="flex items-center gap-2">
                  <Flame size={14} className={battleSession.flagHolder === playerName ? 'text-neon-cyan animate-pulse' : 'text-neon-magenta animate-pulse'} />
                  <span className="text-[11px] font-black uppercase tracking-[0.2em]">
                    {t('accessLabel')}{
                      battleSession.flagHolder === playerName
                        ? t('playerSelf')
                        : battleSession.flagHolder === opponentName
                        ? opponentName
                        : battleSession.flagHolder || t('noneLabel')
                    }
                  </span>
                </div>
                {battleSession.flagPower > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Zap size={10} className="opacity-60" />
                    <span className="text-sm font-mono font-black tracking-wider">
                      {battleSession.flagPower} POW
                    </span>
                  </div>
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
                      <div className="flex flex-col items-center gap-3 font-mono">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleAction('PLAY')}
                            disabled={submitting || loading}
                            className="flex items-center gap-1.5 px-5 py-2 rounded border border-neon-cyan bg-cyan-950/20 text-neon-cyan text-xs font-bold uppercase tracking-wider hover:bg-neon-cyan/10 transition-all cursor-pointer shadow-[0_0_10px_rgba(0,240,255,0.1)] disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Send size={12} />
                            {t('readyForBattle')}
                          </button>
                          <button
                            onClick={() => handleAction('DISCARD')}
                            disabled={submitting || loading}
                            className="flex items-center gap-1.5 px-5 py-2 rounded border border-neon-red bg-red-950/20 text-neon-red text-xs font-bold uppercase tracking-wider hover:bg-neon-red/10 transition-all cursor-pointer shadow-[0_0_10px_rgba(255,0,80,0.1)] disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Trash2 size={12} />
                            {t('discardBtn')}
                          </button>
                        </div>
                        {(submitting || loading) && (
                          <div className="flex items-center gap-2 text-[10px] text-neon-cyan animate-pulse">
                            <div className="w-3 h-3 rounded-full border-2 border-t-transparent border-neon-cyan animate-spin" />
                            <span>TRANSMITTING NEURAL PACKET...</span>
                          </div>
                        )}
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

          {/* Latest Clash Replay Panel */}
          {resolvedLog && (
            <div className="border border-neon-amber/30 rounded p-3 bg-amber-950/10">
              <div className="flex items-center gap-1.5 mb-2">
                <Crosshair size={10} className="text-neon-amber" />
                <span className="text-[9px] text-neon-amber uppercase tracking-widest font-bold">Latest Clash / 最新の激突</span>
              </div>
              <div className="flex flex-col gap-2">
                {/* My latest move */}
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${resolvedLog.p1Action === 'PLAY' ? 'bg-neon-cyan' : 'bg-neon-red'}`} />
                  <span className="text-[10px] text-cyber-text truncate">
                    {isP1
                      ? (resolvedLog.p1Action === 'PLAY' ? resolvedLog.p1Card?.name || '—' : 'DISCARD')
                      : (resolvedLog.p2Action === 'PLAY' ? resolvedLog.p2Card?.name || '—' : 'DISCARD')}
                  </span>
                  <span className="text-[9px] text-neon-cyan ml-auto">
                    {isP1
                      ? (resolvedLog.p1Action === 'PLAY' ? `${resolvedLog.p1Card?.power || 0} POW` : '—')
                      : (resolvedLog.p2Action === 'PLAY' ? `${resolvedLog.p2Card?.power || 0} POW` : '—')}
                  </span>
                </div>
                {/* Opponent latest move */}
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${(isP1 ? resolvedLog.p2Action : resolvedLog.p1Action) === 'PLAY' ? 'bg-neon-magenta' : 'bg-neon-red'}`} />
                  <span className="text-[10px] text-cyber-text truncate">
                    {isP1
                      ? (resolvedLog.p2Action === 'PLAY' ? resolvedLog.p2Card?.name || '—' : 'DISCARD')
                      : (resolvedLog.p1Action === 'PLAY' ? resolvedLog.p1Card?.name || '—' : 'DISCARD')}
                  </span>
                  <span className="text-[9px] text-neon-magenta ml-auto">
                    {isP1
                      ? (resolvedLog.p2Action === 'PLAY' ? `${resolvedLog.p2Card?.power || 0} POW` : '—')
                      : (resolvedLog.p1Action === 'PLAY' ? `${resolvedLog.p1Card?.power || 0} POW` : '—')}
                  </span>
                </div>
                {/* Flag after clash */}
                <div className="mt-1 pt-1 border-t border-cyber-border/20 flex items-center gap-1.5">
                  <Flag size={10} className={resolvedLog.flagHolder === playerName ? 'text-neon-cyan' : 'text-neon-magenta'} />
                  <span className="text-[9px] font-bold uppercase tracking-wider">
                    {resolvedLog.flagHolder === playerName ? 'You hold flag' : `${opponentName} holds flag`}
                  </span>
                  {resolvedLog.currentPower > 0 && (
                    <span className="text-[9px] text-cyber-text-dim ml-auto">{resolvedLog.currentPower} POW</span>
                  )}
                </div>
              </div>
            </div>
          )}
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
                  onClick={() => {
                    if (!myCommittedAction) {
                      playSE('cardSelect');
                      setSelectedCardId(c.id);
                    }
                  }}
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
      {(battleLog || []).length > 0 && (
        <div className="relative z-10 max-w-4xl mx-auto w-full mt-4 border border-cyber-border/30 rounded-lg p-3 bg-cyber-surface/50 max-h-32 overflow-y-auto font-mono text-[10px] shadow-inner">
          <div className="flex items-center gap-2 mb-2 border-b border-cyber-border/20 pb-1">
            <Activity size={12} className="text-neon-green" />
            <span className="text-[9px] text-neon-green uppercase tracking-widest font-bold">
              {t('combatLogHeader')}
            </span>
            <span className="text-[9px] text-cyber-text-dim ml-auto">
              {battleLog.length} events
            </span>
          </div>
          <div className="flex flex-col gap-1">
            {(battleLog || [])
              .slice(0)
              .reverse()
              .map((log, i) => {
                const displayLogAction = translateBattleDetail(log.details || log.action);
                const displayLogEffect = log.effectTriggered ? translateBattleDetail(log.effectTriggered) : '';
                const isPlayer = log.player === playerName;
                const isSystem = !log.player || log.player === 'SYSTEM';

                return (
                  <div
                    key={i}
                    className={`flex items-start gap-2 py-1 px-1.5 rounded ${
                      i === 0 ? 'bg-cyber-surface/40 border border-cyber-border/10' : ''
                    }`}
                  >
                    <div className={`mt-0.5 min-w-[14px] ${isSystem ? 'text-neon-green' : isPlayer ? 'text-neon-cyan' : 'text-neon-magenta'}`}>
                      {isSystem ? <Shield size={10} /> : <Crosshair size={10} />}
                    </div>
                    <div className="flex-1">
                      <span className={`font-bold ${isSystem ? 'text-neon-green' : isPlayer ? 'text-neon-cyan' : 'text-neon-magenta'}`}>
                        {isSystem ? '[SYS]' : `[${log.player}]`}
                      </span>{' '}
                      <span className={i === 0 ? 'text-cyber-text' : 'text-cyber-text-dim/70'}>
                        {displayLogAction}
                      </span>
                      {log.effectTriggered && log.effectTriggered !== 'None' && log.effectTriggered !== '' && (
                        <span className="text-neon-green ml-1.5 inline-flex items-center gap-1">
                          <Zap size={8} />
                          {displayLogEffect}
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] text-cyber-text-dim/40 whitespace-nowrap">
                      Step {log.step}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      <DeckViewerModal
        isOpen={showDeckModal}
        onClose={() => setShowDeckModal(false)}
        deck={deck}
        deleteModeSupported={false}
      />

      {/* 5. Symmetrical Clash Visualizer Overlay */}
      {showClashOverlay && resolvedLog && (
        <div className="fixed inset-0 z-50 bg-cyber-dark/95 backdrop-blur-md flex flex-col justify-between p-6 animate-fade-in font-mono">
          {/* Scanning lines */}
          <div className="absolute inset-0 cyber-grid pointer-events-none opacity-30" />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at 50% 50%, rgba(255,0,255,0.06) 0%, transparent 70%)',
            }}
          />

          {/* Header */}
          <div className="text-center relative z-10">
            <h3 className="text-lg font-black tracking-[0.3em] uppercase text-neon-magenta text-glow-magenta animate-pulse">
              MATRIX CLASH RESOLVED
            </h3>
            <span className="text-[10px] text-cyber-text-dim uppercase tracking-widest block mt-1">
              SECURE SECTOR ACCESS - STEP {resolvedLog.step}
            </span>
          </div>

          {/* Main Visualizer */}
          <div className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-8 my-4 relative z-10 max-w-5xl mx-auto w-full">
            {/* Player 1 Card (YOU) */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] text-neon-cyan font-bold uppercase tracking-wider">
                {playerName} (YOU)
              </span>
              {resolvedLog.p1Action === 'PLAY' && resolvedLog.p1Card ? (
                <div className="animate-card-reveal transform scale-105">
                  <CardDisplay card={convertToFullCard(resolvedLog.p1Card)} />
                </div>
              ) : (
                <div className="w-48 h-72 rounded-lg border-2 border-dashed border-neon-red/35 bg-red-950/10 flex flex-col items-center justify-center p-4 text-center text-neon-red opacity-60">
                  <span className="text-xs font-black tracking-widest uppercase mb-1">DISCARDED</span>
                  <span className="text-[9px] text-cyber-text-dim uppercase">Module Bypassed</span>
                </div>
              )}
            </div>

            {/* VS Emblem & Effects */}
            <div className="flex flex-col items-center text-center max-w-xs px-4">
              <div className="relative w-16 h-16 flex items-center justify-center mb-3">
                <div className="absolute inset-0 rounded-full border-2 border-neon-magenta animate-ping opacity-25" />
                <div className="w-12 h-12 rounded-full border-2 border-neon-magenta bg-cyber-darker flex items-center justify-center font-black text-neon-magenta text-glow-magenta text-sm">
                  VS
                </div>
              </div>

              {/* Clash details */}
              <p className="text-xs text-white uppercase font-bold tracking-wider leading-relaxed border-y border-cyber-border/20 py-2.5 w-full">
                {translateBattleDetail(resolvedLog.details)}
              </p>

              {/* Triggered effects */}
              {resolvedLog.effectTriggered && resolvedLog.effectTriggered !== 'None' && resolvedLog.effectTriggered !== '' && (
                <div className="mt-3 bg-neon-green/5 border border-neon-green/30 text-neon-green text-[10px] px-3 py-1.5 rounded animate-flicker w-full">
                  <span className="font-black uppercase tracking-wider block mb-0.5">⚡ SYSTEM EFFECT</span>
                  {translateBattleDetail(resolvedLog.effectTriggered)}
                </div>
              )}

              {/* Flag holder update */}
              <div className="mt-4 flex flex-col items-center gap-1.5">
                <span className="text-[9px] text-cyber-text-dim uppercase tracking-wider">CURRENT FLAG ACCESS</span>
                <div className={`flex items-center gap-2 px-3 py-1 rounded border text-[11px] font-bold ${
                  resolvedLog.flagHolder === playerName
                    ? 'border-neon-cyan text-neon-cyan bg-cyan-950/15'
                    : resolvedLog.flagHolder === opponentName
                    ? 'border-neon-magenta text-neon-magenta bg-purple-950/15'
                    : 'border-cyber-border text-cyber-text-dim'
                }`}>
                  <Flag size={12} />
                  <span className="uppercase">{resolvedLog.flagHolder === playerName ? 'PLAYER (YOU)' : resolvedLog.flagHolder || 'NONE'}</span>
                  {resolvedLog.currentPower > 0 && <span className="font-mono">({resolvedLog.currentPower} POW)</span>}
                </div>
              </div>
            </div>

            {/* Player 2 Card (OPPONENT) */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] text-neon-magenta font-bold uppercase tracking-wider">
                {opponentName}
              </span>
              {resolvedLog.p2Action === 'PLAY' && resolvedLog.p2Card ? (
                <div className="animate-card-reveal transform scale-105" style={{ animationDelay: '0.2s' }}>
                  <CardDisplay card={convertToFullCard(resolvedLog.p2Card)} />
                </div>
              ) : (
                <div className="w-48 h-72 rounded-lg border-2 border-dashed border-neon-red/35 bg-red-950/10 flex flex-col items-center justify-center p-4 text-center text-neon-red opacity-60">
                  <span className="text-xs font-black tracking-widest uppercase mb-1">DISCARDED</span>
                  <span className="text-[9px] text-cyber-text-dim uppercase">Module Bypassed</span>
                </div>
              )}
            </div>
          </div>

          {/* Action button */}
          <div className="text-center pb-4 relative z-10">
            <button
              onClick={() => {
                if (!battleSession) return;
                playSE('click');
                setAcknowledgedStep(battleSession.step);
                setShowClashOverlay(false);
              }}
              className="px-8 py-3 rounded-lg border-2 border-neon-green text-neon-green font-bold text-xs uppercase tracking-widest hover:bg-neon-green/10 transition-all cursor-pointer shadow-[0_0_15px_rgba(0,255,102,0.15)] animate-pulse"
            >
              {battleSession?.isFinished ? 'CONCLUDE SIMULATION / シミュレーション完了' : 'PROCEED TO NEXT PROTOCOL / 次のターンへ'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default BattleArena;
