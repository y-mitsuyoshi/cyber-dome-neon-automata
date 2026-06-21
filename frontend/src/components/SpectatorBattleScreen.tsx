import { useMemo, useState, useEffect } from 'react';
import { Eye, Flag, Activity, Zap } from 'lucide-react';
import type { BattleSession, Card, BattleLogCard, LiveMemorySlot, SpectatorCombatant, Standing } from '../types/game';
import CardDisplay from './CardDisplay';
import MemorySlots from './MemorySlots';
import DiscardPile from './DiscardPile';
import { useTranslation } from '../context/TranslationContext';
import { useAudio } from '../context/AudioContext';

interface SpectatorBattleScreenProps {
  gameId: string;
  combatants: SpectatorCombatant[];
  battleSessions: BattleSession[];
  matchups: { p1: string; p2: string }[];
  battleLogs: Record<string, import('../types/game').BattleLogEntry[]>;
  standings: Standing[];
  currentRound: number;
  maxRounds: number;
  phase: string;
  onRefresh: () => void;
}

const convertToFullCard = (logCard: BattleLogCard | Card | null | undefined): Card => {
  if (!logCard) {
    return {
      id: 'default',
      name: 'UNKNOWN',
      attribute: 'None',
      archetype: 'Control',
      power: 0,
      rarity: 'Common',
      effect: '',
      effectType: '',
      cost: 0,
    };
  }
  return {
    id: logCard.id || 'default',
    name: logCard.name,
    attribute: logCard.attribute || 'None',
    archetype: 'Control',
    power: logCard.power,
    rarity: 'Common',
    effect: 'effect' in logCard ? logCard.effect : '',
    effectType: logCard.effectType || '',
    cost: 0,
  };
};

// A single duel panel: shows both combatants' memory, discard, and the central clash.
function DuelPanel({ session }: { session: BattleSession }) {
  const { t, translateBattleDetail } = useTranslation();
  const { playSE } = useAudio();
  const [selectedSide, setSelectedSide] = useState<'p1' | 'p2'>('p1');

  const p1Name = session.player1Name;
  const p2Name = session.player2Name;

  // Determine who is the flag holder vs challenger.
  const flagHolderName = session.flagHolder;
  const currentFlagCard = session.flagHolder ? convertToFullCard(session.activeCards[0]) : null;
  const currentClashCards = (session.flagHolder ? session.activeCards.slice(1) : session.activeCards).map(convertToFullCard);

  const latestEntry = session.log && session.log.length > 0 ? session.log[session.log.length - 1] : null;
  const latestHasEffect = !!(latestEntry?.effectTriggered && latestEntry.effectTriggered !== 'None' && latestEntry.effectTriggered !== '');
  const latestEffectText = latestHasEffect ? translateBattleDetail(latestEntry!.effectTriggered) : '';

  const p1Mem: LiveMemorySlot[] = session.player1Mem || [];
  const p2Mem: LiveMemorySlot[] = session.player2Mem || [];
  const p1Discard: Card[] = session.player1Discard || [];
  const p2Discard: Card[] = session.player2Discard || [];

  const isFinished = session.isFinished;
  const winnerName = session.winner;

  return (
    <div className={`border rounded-lg p-3 bg-cyber-surface/10 backdrop-blur-sm relative overflow-hidden ${
      isFinished ? 'border-neon-green/40 shadow-[0_0_15px_rgba(0,255,102,0.1)]' : 'border-cyber-border/30'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2 font-mono">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-neon-cyan font-bold text-glow-cyan">{p1Name}</span>
          <span className="text-neon-red font-black">VS</span>
          <span className="text-neon-magenta font-bold text-glow-magenta">{p2Name}</span>
        </div>
        <div className="flex items-center gap-2 text-[9px] uppercase tracking-widest">
          {isFinished ? (
            <span className="text-neon-green font-bold border border-neon-green/40 px-1.5 py-0.5 rounded bg-green-950/20 animate-pulse">
              {t('specFinished') || 'FINISHED'} — {winnerName}
            </span>
          ) : (
            <span className="text-cyber-text-dim border border-cyber-border/40 px-1.5 py-0.5 rounded">
              {t('specStep') || 'STEP'} {session.step}
            </span>
          )}
          <span className="text-cyber-text-dim">
            {t('specRound') || 'Turn'}: {session.turnOwner === p1Name ? p1Name : p2Name}
          </span>
        </div>
      </div>

      {/* Side selector */}
      <div className="flex items-center gap-1 mb-2 text-[9px] font-mono uppercase tracking-widest">
        <span className="text-cyber-text-dim mr-1">{t('specView') || 'VIEW'}:</span>
        <button
          onClick={() => { playSE('click'); setSelectedSide('p1'); }}
          className={`px-2 py-0.5 rounded border cursor-pointer transition-all ${selectedSide === 'p1' ? 'border-neon-cyan text-neon-cyan bg-cyan-950/20' : 'border-cyber-border/40 text-cyber-text-dim hover:text-white'}`}
        >
          {p1Name}
        </button>
        <button
          onClick={() => { playSE('click'); setSelectedSide('p2'); }}
          className={`px-2 py-0.5 rounded border cursor-pointer transition-all ${selectedSide === 'p2' ? 'border-neon-magenta text-neon-magenta bg-purple-950/20' : 'border-cyber-border/40 text-cyber-text-dim hover:text-white'}`}
        >
          {p2Name}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[180px_1fr_180px] gap-3 items-start">
        {/* P1 side */}
        <div className="font-mono flex flex-col gap-2 order-2 lg:order-1">
          <MemorySlots liveSlots={p1Mem} label={`${p1Name} MEM`} side="left" accent="cyan" />
          <DiscardPile cards={p1Discard} label={`${p1Name} 除外`} side="left" accent="cyan" />
          <div className="border border-cyber-border/30 rounded p-1.5 bg-cyber-surface/30 flex justify-between items-center text-[10px]">
            <span className="text-cyber-text-dim uppercase">{t('deckLabel') || 'DECK'}</span>
            <span className="text-neon-cyan font-bold">{session.player1Deck.length}</span>
          </div>
        </div>

        {/* Center arena */}
        <div className="flex flex-col items-center justify-between min-h-[360px] border border-cyber-border/20 rounded-lg bg-cyber-darker/40 p-3 relative order-1 lg:order-2">
          {/* Defender zone */}
          <div className="flex flex-col items-center w-full">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded border text-[9px] font-mono font-bold mb-2 ${
              flagHolderName === p1Name
                ? 'border-neon-cyan text-neon-cyan bg-cyan-950/15 text-glow-cyan'
                : flagHolderName === p2Name
                ? 'border-neon-magenta text-neon-magenta bg-purple-950/15 text-glow-magenta'
                : 'border-cyber-border text-cyber-text-dim'
            }`}>
              <Flag size={10} />
              <span className="uppercase">
                {flagHolderName === p1Name ? `${p1Name} DEF` : flagHolderName === p2Name ? `${p2Name} DEF` : (t('flagUnclaimed') || 'FLAG NONE')}
              </span>
              {session.flagPower > 0 && <span className="ml-1 text-white font-black">{session.flagPower}P</span>}
            </div>
            <div className="flex items-center justify-center min-h-[120px]">
              {currentFlagCard ? (
                <div key={currentFlagCard.id + '_' + currentFlagCard.power} className="transform scale-75 transition-all animate-card-reveal">
                  <CardDisplay card={currentFlagCard} disabled />
                </div>
              ) : (
                <div className="text-[9px] text-cyber-text-dim/40 border border-dashed border-cyber-border/30 rounded p-4 font-mono text-center">
                  {t('noDefender') || 'NO DEFENDER'}
                </div>
              )}
            </div>
          </div>

          {/* Challenger zone */}
          <div className="flex flex-col items-center w-full mt-2">
            <div className="text-[8px] font-mono text-cyber-text-dim/60 uppercase tracking-widest mb-1 flex items-center gap-2">
              <span>{t('challengerZone') || 'CHALLENGERS'}</span>
              {session.challengerPower > 0 && (
                <span className="text-neon-green font-black px-1 border border-neon-green/35 rounded bg-green-950/10">
                  {session.challengerPower}P
                </span>
              )}
            </div>
            <div className="relative flex items-center justify-center min-h-[130px] w-full">
              {currentClashCards.length > 0 ? (
                <div className="relative" style={{ minHeight: 130, minWidth: Math.max(120, currentClashCards.length * 30 + 96) }}>
                  {currentClashCards.map((cCard, idx) => {
                    const isLatest = idx === currentClashCards.length - 1;
                    const offset = idx * 26;
                    return (
                      <div
                        key={cCard.id + '_' + idx}
                        className="absolute transition-all duration-300"
                        style={{
                          left: `calc(50% - 96px + ${offset}px)`,
                          transform: `scale(${isLatest ? 0.7 : 0.6})`,
                          zIndex: isLatest ? 10 : idx + 1,
                          opacity: isLatest ? 1 : 0.75,
                        }}
                      >
                        {isLatest && <div className="absolute inset-0 rounded-lg animate-card-reveal shadow-[0_0_15px_rgba(0,240,255,0.3)] pointer-events-none" />}
                        <CardDisplay card={cCard} disabled />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-[9px] text-cyber-text-dim/40 border border-dashed border-cyber-border/30 rounded p-4 font-mono text-center">
                  {t('awaitingDraw') || 'AWAITING DRAW'}
                </div>
              )}
            </div>

            {/* Effect banner */}
            {latestHasEffect && (
              <div className={`mt-2 w-full max-w-md px-2 py-1 rounded border text-[9px] font-mono leading-relaxed animate-fade-in ${
                latestEntry?.player === p1Name
                  ? 'border-neon-cyan/40 bg-cyan-950/15 text-neon-cyan'
                  : 'border-neon-magenta/40 bg-purple-950/15 text-neon-magenta'
              }`}>
                <div className="flex items-start gap-1.5">
                  <Zap size={10} className="mt-0.5 flex-shrink-0 animate-pulse" />
                  <div>
                    <div className="uppercase tracking-widest text-[8px] font-bold mb-0.5 opacity-80">
                      {t('effectTriggered') || 'EFFECT'}
                    </div>
                    <div className="text-cyber-text">{latestEffectText}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* P2 side */}
        <div className="font-mono flex flex-col gap-2 order-3">
          <MemorySlots liveSlots={p2Mem} label={`${p2Name} MEM`} side="right" accent="magenta" />
          <DiscardPile cards={p2Discard} label={`${p2Name} 除外`} side="right" accent="magenta" />
          <div className="border border-cyber-border/30 rounded p-1.5 bg-cyber-surface/30 text-right flex justify-between items-center text-[10px]">
            <span className="text-neon-magenta font-bold">{session.player2Deck.length}</span>
            <span className="text-cyber-text-dim uppercase">{t('deckLabel') || 'DECK'}</span>
          </div>
        </div>
      </div>

      {/* Latest log line */}
      {latestEntry && (
        <div className="mt-2 border-t border-cyber-border/20 pt-2 text-[9px] font-mono text-cyber-text-dim flex items-start gap-1.5">
          <Activity size={10} className="mt-0.5 text-neon-green flex-shrink-0" />
          <span>{translateBattleDetail(latestEntry.details || latestEntry.action)}</span>
        </div>
      )}
    </div>
  );
}

function SpectatorBattleScreen({
  combatants: _combatants,
  battleSessions,
  matchups,
  standings,
  currentRound,
  maxRounds,
  phase,
  onRefresh,
}: SpectatorBattleScreenProps) {
  const { t } = useTranslation();
  const { playSE } = useAudio();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  // Auto-pick the first active (non-finished) session for the spectator.
  const activeSessions = useMemo(() => battleSessions.filter((s) => !s.isFinished), [battleSessions]);
  const finishedSessions = useMemo(() => battleSessions.filter((s) => s.isFinished), [battleSessions]);

  useEffect(() => {
    if (activeSessions.length > 0 && (selectedSessionId === null || !battleSessions.find((s) => s.sessionId === selectedSessionId && !s.isFinished))) {
      setSelectedSessionId(activeSessions[0].sessionId);
    }
  }, [activeSessions, battleSessions, selectedSessionId]);

  const selectedSession = battleSessions.find((s) => s.sessionId === selectedSessionId) || battleSessions[0] || null;

  return (
    <div className="min-h-screen bg-cyber-dark relative overflow-hidden flex flex-col p-4 select-none">
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 50% 20%, rgba(0,240,255,0.03) 0%, transparent 60%), radial-gradient(ellipse at 50% 80%, rgba(255,0,255,0.03) 0%, transparent 60%)',
      }} />
      <div className="absolute inset-0 cyber-grid pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 max-w-7xl mx-auto w-full text-center mb-3">
        <h2 className="text-xl font-black tracking-[0.3em] uppercase text-neon-amber text-glow-amber font-mono animate-slide-in flex items-center justify-center gap-2">
          <Eye size={18} className="animate-pulse" />
          {t('specTitle') || 'SPECTATOR MODE / 観戦モード'}
        </h2>
        <div className="flex items-center justify-center gap-6 mt-1 font-mono text-[10px] text-cyber-text-dim">
          <span>{t('round') || 'ROUND'} {currentRound} / {maxRounds}</span>
          <span className="uppercase tracking-widest border border-cyber-border/40 px-2 py-0.5 rounded">{phase}</span>
          <button
            onClick={() => { playSE('click'); onRefresh(); }}
            className="border border-neon-cyan/40 text-neon-cyan px-2 py-0.5 rounded hover:bg-neon-cyan/10 cursor-pointer transition-all uppercase tracking-widest"
          >
            ⟳ {t('specRefresh') || 'REFRESH'}
          </button>
        </div>
      </div>

      {/* Standings mini-bar */}
      <div className="relative z-10 max-w-7xl mx-auto w-full mb-3 flex flex-wrap gap-1.5 justify-center">
        {standings.map((s, i) => (
          <div key={s.name} className={`px-2 py-1 rounded border text-[9px] font-mono ${
            i === 0 ? 'border-neon-amber/40 text-neon-amber bg-amber-950/15' : 'border-cyber-border/40 text-cyber-text-dim'
          }`}>
            <span className="font-bold">{i + 1}.</span> {s.name} <span className="text-neon-cyan">{s.wins}W</span> <span className="text-neon-magenta">{s.fans}F</span>
          </div>
        ))}
      </div>

      {/* Body */}
      <div className="relative z-10 max-w-7xl mx-auto w-full flex-1 flex flex-col gap-3">
        {battleSessions.length === 0 ? (
          <div className="text-center py-12 text-cyber-text-dim font-mono text-xs uppercase tracking-widest">
            {t('specNoBattles') || 'NO ACTIVE BATTLES / 進行中のバトルはありません'}
          </div>
        ) : (
          <>
            {/* Session switcher tabs */}
            <div className="flex flex-wrap gap-1.5">
              {battleSessions.map((s) => {
                const isSel = selectedSession?.sessionId === s.sessionId;
                const isFin = s.isFinished;
                return (
                  <button
                    key={s.sessionId}
                    onClick={() => { playSE('click'); setSelectedSessionId(s.sessionId); }}
                    className={`px-3 py-1.5 rounded border text-[10px] font-mono uppercase tracking-wider cursor-pointer transition-all flex items-center gap-1.5 ${
                      isSel
                        ? 'border-neon-amber text-neon-amber bg-amber-950/15 shadow-[0_0_10px_rgba(255,191,0,0.15)]'
                        : isFin
                        ? 'border-neon-green/30 text-neon-green/70 bg-green-950/10'
                        : 'border-cyber-border/40 text-cyber-text-dim hover:text-white'
                    }`}
                  >
                    {isFin && <span className="w-1.5 h-1.5 rounded-full bg-neon-green" />}
                    {s.player1Name} <span className="text-neon-red">×</span> {s.player2Name}
                  </button>
                );
              })}
            </div>

            {/* Selected duel panel */}
            {selectedSession && <DuelPanel session={selectedSession} />}

            {/* Finished battles list (collapsed) */}
            {finishedSessions.length > 0 && (
              <div className="mt-2 border-t border-cyber-border/20 pt-2">
                <div className="text-[9px] uppercase tracking-widest text-neon-green/60 font-mono mb-1.5 flex items-center gap-1">
                  <Activity size={10} /> {t('specCompleted') || 'COMPLETED BATTLES / 終了済み'}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {finishedSessions.map((s) => (
                    <div key={s.sessionId} className="px-2 py-1 rounded border border-neon-green/30 text-[9px] font-mono text-neon-green/70 bg-green-950/10">
                      {s.player1Name} × {s.player2Name} → <span className="font-bold text-neon-green">{s.winner}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Matchups footer */}
      <div className="relative z-10 max-w-7xl mx-auto w-full mt-3 border-t border-cyber-border/20 pt-2 flex flex-wrap gap-1.5 justify-center text-[9px] font-mono text-cyber-text-dim">
        <span className="uppercase tracking-widest text-cyber-text-dim/60 mr-1">{t('specMatchups') || 'MATCHUPS'}:</span>
        {matchups.map((m, i) => (
          <span key={i} className="px-1.5 py-0.5 rounded border border-cyber-border/30">
            {m.p1} <span className="text-neon-red">×</span> {m.p2}
          </span>
        ))}
      </div>
    </div>
  );
}

export default SpectatorBattleScreen;