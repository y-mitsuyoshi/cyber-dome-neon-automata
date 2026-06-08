import { useState, useMemo, useEffect, useRef } from 'react';
import { Flag, Zap, User, Cpu, Play, Pause, FastForward, RotateCcw, Layers, Shield, Flame, Activity } from 'lucide-react';
import type { BattleLogEntry, BattleSession, Card, BattleLogCard } from '../types/game';
import MemorySlots from './MemorySlots';
import CardDisplay from './CardDisplay';
import { useTranslation } from '../context/TranslationContext';
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
  battleSession: BattleSession | null; // Ignored as simulation is backend-only now
  battleLog: BattleLogEntry[];
  opponent: string;
  onComplete: () => void;
  deck: Card[];
  onSubmitAction: (actionType: 'PLAY' | 'DISCARD', cardId: string) => Promise<void>; // Retained for type compatibility
  loading: boolean;
}

function BattleArena({
  gameId: _gameId,
  playerName,
  battleLog = [],
  opponent,
  onComplete,
  deck,
  onSubmitAction: _onSubmitAction,
  loading: _loading,
}: BattleArenaProps) {
  const { playSE } = useAudio();
  const { t, translateBattleDetail, translateCardName } = useTranslation();
  const [showDeckModal, setShowDeckModal] = useState(false);

  // Replay playback states
  const [currentLogIndex, setCurrentLogIndex] = useState<number>(0);
  const [isAutoPlay, setIsAutoPlay] = useState<boolean>(true);
  const [playSpeed, setPlaySpeed] = useState<number>(1000); // ms per step

  const latestLogEndRef = useRef<HTMLDivElement | null>(null);

  // Initialize and check if log is empty
  const hasLog = battleLog && battleLog.length > 0;

  // Auto-scroll the visual action log to the latest event
  useEffect(() => {
    if (latestLogEndRef.current) {
      latestLogEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentLogIndex]);

  // Handle automatic step increments
  useEffect(() => {
    if (!isAutoPlay || !hasLog) return;
    if (currentLogIndex >= battleLog.length - 1) {
      setIsAutoPlay(false);
      return;
    }

    const timer = setTimeout(() => {
      setCurrentLogIndex((prev) => prev + 1);
    }, playSpeed);

    return () => clearTimeout(timer);
  }, [isAutoPlay, currentLogIndex, battleLog, playSpeed, hasLog]);

  // Audio cues triggered on step transitions
  const lastPlayedIndexRef = useRef<number>(-1);
  useEffect(() => {
    if (!hasLog || currentLogIndex < 0 || currentLogIndex === lastPlayedIndexRef.current) return;
    lastPlayedIndexRef.current = currentLogIndex;
    const entry = battleLog[currentLogIndex];

    if (entry.action === 'reveal') {
      playSE('clash');
    } else if (entry.action === 'flag_change' || entry.action === 'redirect') {
      playSE('roll'); // Flag captures/redirects
    } else if (entry.action === 'memory_overflow' || entry.action === 'deck_empty') {
      playSE('discard');
    }

    // Battle concluded
    if (currentLogIndex === battleLog.length - 1) {
      const winner = battleLog[battleLog.length - 1].flagHolder;
      if (winner === playerName) {
        playSE('victory');
      } else if (winner === opponent) {
        playSE('defeat');
      }
    }
  }, [currentLogIndex, battleLog, playerName, opponent, playSE, hasLog]);

  // Helper to parse "CardName(xCount)" strings into raw nested slot arrays for MemorySlots
  const parseMemSlots = (slots: string[] | undefined | null): string[][] => {
    if (!slots) return [];
    return slots.map((slotStr) => {
      const match = slotStr.match(/^(.+)\(x(\d+)\)$/);
      if (match) {
        const name = match[1];
        const count = parseInt(match[2], 10);
        return Array(count).fill(name);
      }
      return [slotStr];
    });
  };

  // Determine which side of the simulation this player is logged under
  const isPlayerSide = useMemo(() => {
    if (!hasLog) return true;
    return battleLog.some((e) => e.player === playerName);
  }, [battleLog, playerName, hasLog]);

  // Current entry snapshot based on replay head index
  const currentEntry = useMemo(() => {
    if (!hasLog || currentLogIndex < 0) return null;
    return battleLog[Math.min(currentLogIndex, battleLog.length - 1)];
  }, [battleLog, currentLogIndex, hasLog]);

  // Memory Slots for the current step
  const myMemSlots = useMemo(() => {
    if (!currentEntry) return [];
    const rawSlots = isPlayerSide ? currentEntry.playerMemSlots : currentEntry.cpuMemSlots;
    return parseMemSlots(rawSlots);
  }, [currentEntry, isPlayerSide]);

  const opponentMemSlots = useMemo(() => {
    if (!currentEntry) return [];
    const rawSlots = isPlayerSide ? currentEntry.cpuMemSlots : currentEntry.playerMemSlots;
    return parseMemSlots(rawSlots);
  }, [currentEntry, isPlayerSide]);

  // Deck counts for the current step
  const myDeckCount = useMemo(() => {
    if (!currentEntry) return 0;
    return isPlayerSide ? currentEntry.playerDeckCount : currentEntry.cpuDeckCount;
  }, [currentEntry, isPlayerSide]);

  const opponentDeckCount = useMemo(() => {
    if (!currentEntry) return 0;
    return isPlayerSide ? currentEntry.cpuDeckCount : currentEntry.playerDeckCount;
  }, [currentEntry, isPlayerSide]);

  // Calculate the active challenger cards played in this segment (before next flag claim)
  const currentClashCards = useMemo(() => {
    if (!hasLog || currentLogIndex < 0) return [];
    const cards: BattleLogCard[] = [];
    for (let i = currentLogIndex; i >= 0; i--) {
      const entry = battleLog[i];
      if (entry.action === 'flag_change') {
        break;
      }
      if (entry.action === 'reveal' && entry.player !== entry.flagHolder && entry.card) {
        cards.unshift(entry.card);
      }
    }
    return cards;
  }, [battleLog, currentLogIndex, hasLog]);

  // Calculate the active defender card currently holding the flag
  const currentFlagCard = useMemo(() => {
    if (!hasLog || currentLogIndex < 0) return null;
    for (let i = currentLogIndex; i >= 0; i--) {
      const entry = battleLog[i];
      if (entry.action === 'flag_change' && entry.card) {
        return entry.card;
      }
      if (i === 0 && entry.action === 'reveal' && entry.card) {
        return entry.card;
      }
    }
    return null;
  }, [battleLog, currentLogIndex, hasLog]);

  // Determine whose turn it is to draw/reveal cards
  const isMyDrawTurn = useMemo(() => {
    if (!currentEntry) return false;
    return currentEntry.player === playerName && currentEntry.action === 'reveal';
  }, [currentEntry, playerName]);

  const isOpponentDrawTurn = useMemo(() => {
    if (!currentEntry) return false;
    return currentEntry.player === opponent && currentEntry.action === 'reveal';
  }, [currentEntry, opponent]);

  if (!hasLog) {
    return (
      <div className="min-h-screen bg-cyber-dark flex flex-col items-center justify-center font-mono">
        <Activity className="text-neon-cyan animate-pulse mb-4" size={32} />
        <p className="text-xs text-cyber-text-dim uppercase tracking-widest">{t('awaitingCombatData')}</p>
      </div>
    );
  }

  const isReplayFinished = currentLogIndex >= battleLog.length - 1;
  const flagHolderName = currentEntry ? currentEntry.flagHolder : 'None';
  const flagPowerValue = currentEntry ? currentEntry.currentPower : 0;

  return (
    <div className="min-h-screen bg-cyber-dark relative overflow-hidden flex flex-col justify-between p-4">
      {/* Background gradients */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 20%, rgba(0,240,255,0.03) 0%, transparent 60%), radial-gradient(ellipse at 50% 80%, rgba(255,0,255,0.03) 0%, transparent 60%)',
        }}
      />
      <div className="absolute inset-0 cyber-grid pointer-events-none" />

      {/* 1. Header Layer */}
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
            <span className="text-neon-magenta font-bold">{opponent}</span>
          </div>
        </div>
      </div>

      {/* 2. Main Dual Board Area */}
      <div className="relative z-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-[220px_1fr_220px] gap-6 items-center my-4 flex-1">
        {/* Left Col: Local Player State */}
        <div className="font-mono flex flex-col gap-3 self-start order-2 lg:order-1">
          <MemorySlots slots={myMemSlots} label={t('yourMemory')} side="left" />
          <div className="border border-cyber-border/30 rounded p-2.5 bg-cyber-surface/30 flex justify-between items-center">
            <div>
              <div className="text-[9px] text-cyber-text-dim uppercase tracking-wider">{t('deckLabel') || 'DECK MODULES'}</div>
              <div className="text-sm font-bold text-neon-cyan">{myDeckCount} Units</div>
            </div>
            <Layers size={18} className="text-neon-cyan/50" />
          </div>

          <button
            onClick={() => setShowDeckModal(true)}
            className="flex items-center justify-center gap-2 border border-neon-cyan/45 hover:border-neon-cyan rounded p-2 bg-cyber-surface/30 text-neon-cyan font-bold hover:bg-neon-cyan/10 transition-all text-xs cursor-pointer uppercase tracking-wider font-mono shadow-[0_0_8px_rgba(0,240,255,0.1)]"
          >
            <Layers size={14} className="text-neon-cyan" />
            {t('viewDeckBtn')}
          </button>
        </div>

        {/* Center: Duel Arena */}
        <div className="flex flex-col items-center justify-between min-h-[460px] border border-cyber-border/20 rounded-xl bg-cyber-surface/10 backdrop-blur-sm p-6 relative order-1 lg:order-2">
          
          {/* Top Step Counter */}
          <div className="text-[10px] text-cyber-text-dim uppercase tracking-widest font-mono">
            {t('battleStep')} / 進捗: {currentLogIndex + 1} / {battleLog.length}
          </div>

          {/* Active Turn Indicator Banner */}
          <div className="my-3 w-full max-w-md text-center">
            {isReplayFinished ? (
              <div className="text-neon-green text-glow-green text-xs font-bold font-mono tracking-widest uppercase border border-neon-green/30 bg-green-950/15 py-1.5 rounded animate-pulse">
                SYS_STATUS: CLASH RESOLVED / バトル決着
              </div>
            ) : isMyDrawnTurn ? (
              <div className="text-neon-cyan text-glow-cyan text-xs font-bold font-mono tracking-widest uppercase border border-neon-cyan/30 bg-cyan-950/15 py-1.5 rounded animate-flicker">
                &gt;&gt; PLAYER DRAW TURN / あなたのめくり番 &lt;&lt;
              </div>
            ) : isOpponentDrawTurn ? (
              <div className="text-neon-magenta text-glow-magenta text-xs font-bold font-mono tracking-widest uppercase border border-neon-magenta/30 bg-purple-950/15 py-1.5 rounded animate-flicker">
                &gt;&gt; OPPONENT DRAW TURN / 相手のめくり番 &lt;&lt;
              </div>
            ) : (
              <div className="text-cyber-text-dim text-xs font-bold font-mono tracking-widest uppercase border border-cyber-border/20 bg-cyber-surface/10 py-1.5 rounded">
                STANDBY PROTOCOL / 分析同調中
              </div>
            )}
          </div>

          {/* Core Arena Display (Defender vs Challenger cards) */}
          <div className="flex-1 w-full flex flex-col justify-center gap-4 my-2">
            {/* DEFENDER ZONE */}
            <div className="flex flex-col items-center p-3 border border-cyber-border/20 rounded-lg bg-cyber-surface/5">
              <div
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded border text-[10px] font-mono font-bold transition-all ${
                  flagHolderName === playerName
                    ? 'border-neon-cyan text-neon-cyan bg-cyan-950/10 text-glow-cyan shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                    : flagHolderName === opponent
                    ? 'border-neon-magenta text-neon-magenta bg-purple-950/10 text-glow-magenta shadow-[0_0_15px_rgba(255,0,255,0.15)]'
                    : 'border-cyber-border text-cyber-text-dim bg-cyber-dark/50'
                }`}
              >
                <Flag size={12} className={flagHolderName === playerName ? 'animate-pulse text-neon-cyan' : flagHolderName === opponent ? 'text-neon-magenta animate-pulse' : ''} />
                <span className="uppercase">
                  {flagHolderName === playerName
                    ? 'DEFENDING / あなたが支配中'
                    : flagHolderName === opponent
                    ? `DEFENDING / ${opponent} が支配中`
                    : 'FLAG UNCLAIMED / フラグなし'}
                </span>
                {flagPowerValue > 0 && <span className="ml-2 font-black border-l border-cyber-border/40 pl-2 text-white">{flagPowerValue} POW</span>}
              </div>

              {/* Defender Card Visual */}
              <div className="mt-3 flex items-center justify-center min-h-[140px]">
                {currentFlagCard ? (
                  <div className="transform scale-90 transition-transform">
                    <CardDisplay card={convertToFullCard(currentFlagCard)} basePower={currentFlagCard.basePower} disabled />
                  </div>
                ) : (
                  <div className="text-[10px] text-cyber-text-dim/40 border border-dashed border-cyber-border/30 rounded p-6 font-mono text-center">
                    NO DEFENSIVE GRID INTRUSION / 支配中のプログラムはありません
                  </div>
                )}
              </div>
            </div>

            {/* CHALLENGER / ATTACKER ZONE */}
            <div className="flex flex-col items-center p-3 border border-cyber-border/20 rounded-lg bg-cyber-surface/5">
              <div className="text-[9px] font-mono text-cyber-text-dim/60 uppercase tracking-widest mb-2">
                ACTIVE CHALLENGE AUGMENTATIONS / 挑戦者めくりカード
              </div>

              {/* Horizontally stack or arrange revealed cards */}
              <div className="flex items-center justify-center gap-2 flex-wrap min-h-[140px] w-full px-2">
                {currentClashCards.length > 0 ? (
                  currentClashCards.map((cCard, idx) => (
                    <div key={idx} className="transform scale-75 -mx-4 first:ml-0 last:mr-0 transition-transform duration-300">
                      <CardDisplay card={convertToFullCard(cCard)} basePower={cCard.basePower} disabled />
                    </div>
                  ))
                ) : (
                  <div className="text-[10px] text-cyber-text-dim/40 border border-dashed border-cyber-border/30 rounded p-6 font-mono text-center w-full">
                    AWAITING DECK DRAW INTRUSION / ドローされるのを待っています
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Resolution status details */}
          <div className="w-full text-center mt-2 px-4 py-2 border border-cyber-border/10 rounded bg-cyber-dark/40 min-h-[50px] flex items-center justify-center">
            <p className="text-[10px] font-mono text-cyber-text leading-relaxed">
              {currentEntry ? translateBattleDetail(currentEntry.details) : 'INITIALIZING REPLAY ENGINE...'}
              {currentEntry?.effectTriggered && currentEntry.effectTriggered !== 'None' && currentEntry.effectTriggered !== '' && (
                <span className="text-neon-green block font-bold mt-1 text-[9px]">
                  ⚡ {translateBattleDetail(currentEntry.effectTriggered)}
                </span>
              )}
            </p>
          </div>

        </div>

        {/* Right Col: Opponent State */}
        <div className="font-mono flex flex-col gap-3 self-start order-3">
          <MemorySlots slots={opponentMemSlots} label={t('npcMemoryLabel', { opponent })} side="right" />
          <div className="border border-cyber-border/30 rounded p-2.5 bg-cyber-surface/30 text-right flex justify-between items-center">
            <Layers size={18} className="text-neon-magenta/50" />
            <div>
              <div className="text-[9px] text-cyber-text-dim uppercase tracking-wider">{t('deckLabel') || 'DECK MODULES'}</div>
              <div className="text-sm font-bold text-neon-magenta">{opponentDeckCount} Units</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Replay Controllers */}
      <div className="relative z-10 max-w-3xl mx-auto w-full border border-cyber-border/30 rounded-lg p-3 bg-cyber-darker/90 backdrop-blur-md mb-3 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
        {/* Play/Pause controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAutoPlay(!isAutoPlay)}
            disabled={isReplayFinished}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider cursor-pointer border transition-all ${
              isReplayFinished
                ? 'border-cyber-border/35 text-cyber-text-dim cursor-not-allowed opacity-50'
                : isAutoPlay
                ? 'border-neon-magenta text-neon-magenta hover:bg-neon-magenta/10 shadow-[0_0_8px_rgba(255,0,255,0.1)]'
                : 'border-neon-green text-neon-green hover:bg-neon-green/10 shadow-[0_0_8px_rgba(0,255,0,0.1)]'
            }`}
          >
            {isAutoPlay ? <Pause size={12} /> : <Play size={12} />}
            {isAutoPlay ? 'PAUSE / 一時停止' : 'AUTO / オート'}
          </button>

          <button
            onClick={() => {
              playSE('click');
              setCurrentLogIndex((prev) => Math.min(prev + 1, battleLog.length - 1));
              setIsAutoPlay(false);
            }}
            disabled={isReplayFinished}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider cursor-pointer border transition-all ${
              isReplayFinished
                ? 'border-cyber-border/35 text-cyber-text-dim cursor-not-allowed opacity-50'
                : 'border-neon-cyan text-neon-cyan hover:bg-neon-cyan/10 shadow-[0_0_8px_rgba(0,240,255,0.1)]'
            }`}
          >
            <FastForward size={12} />
            {t('nextStepBtnTitle') || 'DRAW / めくる'}
          </button>

          <button
            onClick={() => {
              playSE('shuffle');
              setCurrentLogIndex(0);
              setIsAutoPlay(false);
              lastPlayedIndexRef.current = -1;
            }}
            className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded text-[10px] border border-cyber-border/50 text-cyber-text-dim hover:text-white hover:border-cyber-border transition-all cursor-pointer"
            title="Reset Replay"
          >
            <RotateCcw size={12} />
            {t('resetBtnTitle') || 'RESTART / 最初から'}
          </button>
        </div>

        {/* Playback Speed selector */}
        <div className="flex items-center gap-1.5 text-[10px]">
          <span className="text-cyber-text-dim">SPEED / 速度:</span>
          {([
            { label: '0.5x', value: 1600 },
            { label: '1.0x', value: 1000 },
            { label: '2.0x', value: 500 },
            { label: '4.0x', value: 200 },
          ]).map((speedOpt) => (
            <button
              key={speedOpt.label}
              onClick={() => {
                playSE('click');
                setPlaySpeed(speedOpt.value);
              }}
              className={`px-1.5 py-0.5 border rounded cursor-pointer transition-all ${
                playSpeed === speedOpt.value
                  ? 'border-neon-cyan text-neon-cyan bg-neon-cyan/5 font-bold shadow-[0_0_6px_rgba(0,240,255,0.15)]'
                  : 'border-cyber-border/30 text-cyber-text-dim hover:text-white'
              }`}
            >
              {speedOpt.label}
            </button>
          ))}
        </div>

        {/* Proceed to standings button */}
        <div>
          {isReplayFinished ? (
            <button
              onClick={onComplete}
              className="px-6 py-2 rounded border-2 border-neon-green text-neon-green text-glow-green font-bold text-[10px] uppercase tracking-widest hover:bg-neon-green/10 transition-all cursor-pointer shadow-[0_0_12px_rgba(0,255,102,0.2)] animate-pulse"
            >
              {t('continueBtn') || 'STANDINGS / リザルト確認 →'}
            </button>
          ) : (
            <button
              onClick={() => {
                playSE('click');
                setCurrentLogIndex(battleLog.length - 1);
                setIsAutoPlay(false);
              }}
              className="px-4 py-2 rounded border border-cyber-border/40 text-cyber-text-dim text-[10px] uppercase tracking-wider hover:text-white hover:border-cyber-border transition-all cursor-pointer"
            >
              {t('skipSim') || 'SKIP / 結末へスキップ'}
            </button>
          )}
        </div>
      </div>

      {/* 4. Bottom Event Log feed */}
      <div className="relative z-10 max-w-4xl mx-auto w-full border border-cyber-border/30 rounded-lg p-3 bg-cyber-surface/50 max-h-32 overflow-y-auto font-mono text-[10px] shadow-inner">
        <div className="flex items-center gap-2 mb-2 border-b border-cyber-border/20 pb-1">
          <Activity size={12} className="text-neon-green" />
          <span className="text-[9px] text-neon-green uppercase tracking-widest font-bold">
            {t('combatLogHeader')} / 実況ログ
          </span>
          <span className="text-[9px] text-cyber-text-dim ml-auto">
            {currentLogIndex + 1} / {battleLog.length} events
          </span>
        </div>
        
        <div className="flex flex-col gap-1">
          {battleLog.slice(0, currentLogIndex + 1).map((log, i) => {
            const displayLogAction = translateBattleDetail(log.details || log.action);
            const displayLogEffect = log.effectTriggered ? translateBattleDetail(log.effectTriggered) : '';
            const isPlayer = log.player === playerName;
            const isSystem = !log.player || log.player === 'SYSTEM';

            return (
              <div
                key={i}
                className={`flex items-start gap-2 py-1 px-1.5 rounded ${
                  i === currentLogIndex ? 'bg-cyber-surface/40 border border-cyber-border/10' : ''
                }`}
              >
                <div className={`mt-0.5 min-w-[14px] ${isSystem ? 'text-neon-green' : isPlayer ? 'text-neon-cyan' : 'text-neon-magenta'}`}>
                  {isSystem ? <Shield size={10} /> : <User size={10} />}
                </div>
                <div className="flex-1">
                  <span className={`font-bold ${isSystem ? 'text-neon-green' : isPlayer ? 'text-neon-cyan' : 'text-neon-magenta'}`}>
                    {isSystem ? '[SYS]' : `[${log.player}]`}
                  </span>{' '}
                  <span className={i === currentLogIndex ? 'text-cyber-text font-semibold' : 'text-cyber-text-dim/70'}>
                    {displayLogAction}
                  </span>
                  {log.effectTriggered && log.effectTriggered !== 'None' && log.effectTriggered !== '' && (
                    <span className="text-neon-green ml-1.5 inline-flex items-center gap-1 font-bold">
                      ⚡ {displayLogEffect}
                    </span>
                  )}
                </div>
                <span className="text-[9px] text-cyber-text-dim/40 whitespace-nowrap">
                  Step {log.step}
                </span>
              </div>
            );
          })}
          <div ref={latestLogEndRef} />
        </div>
      </div>

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
