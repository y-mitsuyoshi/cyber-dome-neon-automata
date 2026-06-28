import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Flag, User, Cpu, Play, Pause, RotateCcw, Layers, Shield, Activity } from 'lucide-react';
import type { BattleLogEntry, BattleSession, Card, BattleLogCard, MemorySlot } from '../types/game';
import MemorySlots from './MemorySlots';
import CardDisplay from './CardDisplay';
import { useTranslation } from '../context/TranslationContext';
import DeckViewerModal from './DeckViewerModal';
import { useAudio } from '../context/AudioContext';

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

interface PlayerStack {
  flagCard: Card | null;
  challengerCards: Card[];
  isDefending: boolean;
}

interface BuildPlayerStackArgs {
  player: 'me' | 'opp';
  playerName: string;
  opponent: string;
  isLiveMode: boolean;
  battleSession: BattleSession | null;
  battleLog: BattleLogEntry[];
  currentLogIndex: number;
  hasLog: boolean;
}

function buildPlayerStack(args: BuildPlayerStackArgs): PlayerStack {
  const { player, playerName, opponent, isLiveMode, battleSession, battleLog, currentLogIndex, hasLog } = args;
  const myName = player === 'me' ? playerName : opponent;
  const empty: PlayerStack = { flagCard: null, challengerCards: [], isDefending: false };

  if (!hasLog || currentLogIndex < 0) return empty;

  const logList = isLiveMode && battleSession ? battleSession.log : battleLog;
  let defenderName = '';
  let flagCard: Card | null = null;
  let flagChangeIdx = -1;

  for (let i = currentLogIndex; i >= 0; i--) {
    const entry = logList[i];
    if (entry && entry.action === 'flag_change' && entry.card) {
      defenderName = entry.flagHolder;
      flagCard = convertToFullCard(entry.card);
      flagChangeIdx = i;
      break;
    }
  }

  const isDefending = defenderName === myName;
  if (flagChangeIdx === -1) {
    // Before the first flag change: reveal cards belong to the player who played them.
    const challengerCards: Card[] = [];
    for (let i = 0; i <= currentLogIndex; i++) {
      const entry = logList[i];
      if (entry && entry.action === 'reveal' && entry.player === myName && entry.card) {
        challengerCards.push(convertToFullCard(entry.card));
      }
    }
    return {
      flagCard: null,
      challengerCards,
      isDefending: false,
    };
  }

  if (isDefending) {
    // Collect all cards this player revealed to claim the flag
    // (i.e. from the flagChangeIdx backwards until the previous flag change or start)
    const defenderCards: Card[] = [];
    let startIdx = 0;
    for (let i = flagChangeIdx - 1; i >= 0; i--) {
      if (logList[i]?.action === 'flag_change') {
        startIdx = i + 1;
        break;
      }
    }
    for (let i = startIdx; i <= flagChangeIdx; i++) {
      const entry = logList[i];
      if (entry && entry.action === 'reveal' && entry.player === myName && entry.card) {
        defenderCards.push(convertToFullCard(entry.card));
      }
    }
    return {
      flagCard,
      challengerCards: defenderCards,
      isDefending: true,
    };
  }

  const challengerCards: Card[] = [];
  for (let i = flagChangeIdx + 1; i <= currentLogIndex; i++) {
    const entry = logList[i];
    if (!entry) continue;
    if (entry.action === 'flag_change') break;
    if (entry.action === 'reveal' && entry.player === myName && entry.card) {
      challengerCards.push(convertToFullCard(entry.card));
    }
  }
  return { flagCard: null, challengerCards, isDefending: false };
}

interface PlayerStackViewProps {
  stack: PlayerStack;
  side: 'me' | 'opp';
  isMyDrawTurn: boolean;
  flagPower: number;
  challengerPower: number;
  ownerLabel: string;
}

function StackCardThumb({ card, isFlag }: { card: Card; isFlag: boolean }) {
  const [hover, setHover] = useState(false);
  const thumbRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const handleMouseEnter = useCallback(() => {
    setHover(true);
    if (thumbRef.current) {
      const rect = thumbRef.current.getBoundingClientRect();
      setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHover(false);
    setTooltipPos(null);
  }, []);

  return (
    <div
      ref={thumbRef}
      className="relative transition-all duration-200"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <CardDisplay card={card} disabled size="sm" />
      {isFlag && (
        <div className={`absolute -top-2 left-1/2 -translate-x-1/2 flex items-center gap-0.5 text-[8px] font-mono font-bold text-neon-amber bg-cyber-darker border border-neon-amber/50 px-1 py-0.5 rounded-full shadow-[0_0_8px_rgba(255,191,0,0.4)] whitespace-nowrap z-20`}>
          <Flag size={8} /> FLAG
        </div>
      )}
      {hover && tooltipPos && createPortal(
        <div
          className="pointer-events-none animate-fade-in"
          style={{
            position: 'fixed',
            left: tooltipPos.x,
            top: tooltipPos.y,
            transform: 'translate(-50%, -100%) translateY(-8px)',
            zIndex: 9999,
          }}
        >
          <CardDisplay card={card} disabled />
        </div>,
        document.body
      )}
    </div>
  );
}

function PlayerStackView({ stack, side, isMyDrawTurn, flagPower, challengerPower, ownerLabel }: PlayerStackViewProps) {
  const accent = side === 'me' ? 'neon-cyan' : 'neon-magenta';

  const isDefending = stack.isDefending;
  const cards = useMemo(() => {
    const arr = [...stack.challengerCards];
    if (isDefending && stack.flagCard) {
      const lastCard = arr[arr.length - 1];
      if (!lastCard || lastCard.id !== stack.flagCard.id) {
        arr.push(stack.flagCard);
      }
    }
    return arr;
  }, [stack.challengerCards, isDefending, stack.flagCard]);

  // One-by-one reveal: each new card appears 400ms after the previous
  const [visibleCount, setVisibleCount] = useState(0);
  const prevCardsLen = useRef(0);
  const wasDefending = useRef(isDefending);
  const revealTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const roleChanged = wasDefending.current !== isDefending;
    const cardsReset = cards.length < prevCardsLen.current;

    if (roleChanged || cardsReset) {
      revealTimers.current.forEach(clearTimeout);
      revealTimers.current = [];
      prevCardsLen.current = 0;
      setVisibleCount(0);
    }
    wasDefending.current = isDefending;

    const oldLen = prevCardsLen.current;
    const newLen = cards.length;
    if (newLen > oldLen) {
      for (let i = oldLen; i < newLen; i++) {
        const delay = (i - oldLen) * 400;
        const t = setTimeout(() => setVisibleCount(i + 1), delay);
        revealTimers.current.push(t);
      }
    } else {
      setVisibleCount(newLen);
    }
    prevCardsLen.current = newLen;
    return () => { revealTimers.current.forEach(clearTimeout); };
  }, [cards.length, isDefending]);

  const [newKeys, setNewKeys] = useState<string[]>([]);
  const prevKeys = useRef<string[]>([]);
  const currentKeys = useMemo(
    () => cards.slice(0, visibleCount).map((c, idx) => `${c.id}_${idx}`),
    [cards, visibleCount]
  );
  useEffect(() => {
    const news = currentKeys.filter(k => !prevKeys.current.includes(k));
    setNewKeys(news);
    prevKeys.current = currentKeys;
  }, [currentKeys]);

  const visibleCards = cards.slice(0, visibleCount);
  const hasAny = cards.length > 0;

  if (!hasAny && visibleCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className={`text-[10px] uppercase tracking-widest font-mono border border-dashed border-${accent}/30 rounded-lg px-4 py-2 text-${accent}/40`}>
          {side === 'opp' ? `${ownerLabel} のカードを待っています` : 'カードをめくってください'}
        </div>
      </div>
    );
  }

  const cumulative = isDefending ? flagPower : challengerPower;
  const needed = Math.max(0, flagPower - cumulative + 1);
  const willTake = !isDefending && challengerPower > flagPower;
  const flagCardName = stack.flagCard ? stack.flagCard.name : '';

  const CARD_W = 112;
  const OVERLAP = 54;
  const n = visibleCards.length;
  const stackWidth = Math.max(CARD_W, CARD_W + (n - 1) * OVERLAP);

  return (
    <div className="flex flex-col items-center gap-1 relative h-full justify-center">
      {/* Status badge */}
      <div className={`flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider flex-wrap justify-center ${willTake ? 'text-neon-green' : `text-${accent}`}`}>
        {isDefending ? (
          <>
            <Flag size={11} className="animate-pulse" />
            <span>{ownerLabel}: 防衛中</span>
            {flagCardName && (
              <span className="text-neon-amber font-black border border-neon-amber/30 px-1.5 rounded bg-amber-950/20">
                🃏 {flagCardName}
              </span>
            )}
            <span className="text-white font-black border border-white/20 px-1.5 rounded bg-cyber-darker">POW {flagPower}</span>
          </>
        ) : (
          <>
            <span>{ownerLabel}: 挑戦中</span>
            <span className="text-white font-black border border-white/20 px-1.5 rounded bg-cyber-darker">計 {cumulative} POW</span>
            {!willTake && flagPower > 0 && (
              <span className="text-neon-amber border border-neon-amber/40 px-1.5 rounded bg-amber-950/20">あと {needed} POW 必要</span>
            )}
            {willTake && (
              <span className="text-neon-green border border-neon-green/40 px-1.5 rounded bg-green-950/20 animate-pulse">🏴 フラッグ奪取！</span>
            )}
          </>
        )}
      </div>

      {/* Fanned stack */}
      <div className="relative" style={{ width: stackWidth, height: 140 }}>
        {n === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`text-[10px] uppercase tracking-widest font-mono border border-dashed border-${accent}/30 rounded-lg px-4 py-2 text-${accent}/40`}>
              {isMyDrawTurn ? 'カードをめくる' : '待機中'}
            </div>
          </div>
        ) : (
          visibleCards.map((cCard, idx) => {
            const isLatest = idx === n - 1;
            const isFlag = isDefending && isLatest;
            const cardKey = `${cCard.id}_${idx}`;
            const isNew = newKeys.includes(cardKey);

            const cardClass = isNew
              ? (side === 'me' ? 'animate-draw-card-me' : 'animate-draw-card-opp')
              : (side === 'me'
                  ? (isLatest ? 'card-static-me-latest' : 'card-static-me')
                  : (isLatest ? 'card-static-opp-latest' : 'card-static-opp'));

            return (
              <div
                key={cardKey}
                className={`absolute top-0 ${cardClass} transition-all duration-200 hover:-translate-y-3 hover:scale-105 hover:!z-[99] hover:filter hover:brightness-110 cursor-pointer`}
                style={{ left: idx * OVERLAP, zIndex: idx, opacity: isLatest ? 1 : 0.85 }}
              >
                <StackCardThumb card={cCard} isFlag={!!isFlag} />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}


interface BattleArenaProps {
  gameId: string;
  playerName: string;
  battleSession: BattleSession | null;
  battleLog: BattleLogEntry[];
  opponent: string;
  onComplete: () => void;
  deck: Card[];
  onStep: () => Promise<void>;
  onSubmitAction: (actionType: string, cardIds: string[]) => Promise<void>;
  loading: boolean;
  opponentIsNPC: boolean;
}

function BattleArena({
  gameId: _gameId,
  playerName,
  battleSession,
  battleLog = [],
  opponent,
  onComplete,
  deck,
  onStep,
  onSubmitAction,
  loading: _loading,
  opponentIsNPC,
}: BattleArenaProps) {
  "use no memo";
  const { playSE } = useAudio();
  const { t, translateBattleDetail } = useTranslation();
  const [showDeckModal, setShowDeckModal] = useState(false);

  // Replay playback states (for non-live historical log viewer fallback)
  const [currentLogIndex, setCurrentLogIndex] = useState<number>(0);
  const [liveLogIndex, setLiveLogIndex] = useState<number>(0);
  const [isAutoPlay, setIsAutoPlay] = useState<boolean>(false);
  const [playSpeed, setPlaySpeed] = useState<number>(1200); // ms per step (slowed down from 1000ms for readability)
  const [flashState, setFlashState] = useState<'cyan' | 'magenta' | null>(null);

  // Interactive selection state
  const [selectedCards, setSelectedCards] = useState<string[]>([]);

  const latestLogEndRef = useRef<HTMLDivElement | null>(null);

  const isLiveMode = battleSession !== null;
  const hasLog = isLiveMode ? (battleSession.log.length > 0) : (battleLog && battleLog.length > 0);
  const activeLog = isLiveMode ? (battleSession?.log || []) : battleLog;
  const activeStepIndex = isLiveMode ? liveLogIndex : currentLogIndex;

  // Track the actual log length we have visualized
  const lastLogLengthRef = useRef(0);

  // Synchronize liveLogIndex step-by-step
  useEffect(() => {
    if (isLiveMode && battleSession) {
      const actualLen = battleSession.log.length;
      if (lastLogLengthRef.current === 0) {
        setLiveLogIndex(Math.max(0, actualLen - 1));
        lastLogLengthRef.current = actualLen;
      } else if (actualLen > lastLogLengthRef.current) {
        lastLogLengthRef.current = actualLen;
      }
    }
  }, [isLiveMode, battleSession]);

  const isVisualizing = isLiveMode && battleSession && liveLogIndex < battleSession.log.length - 1;

  useEffect(() => {
    if (isVisualizing && battleSession) {
      const timer = setTimeout(() => {
        setLiveLogIndex(prev => prev + 1);
      }, 1400); // 1400ms delay per draw step for highly readable flow
      return () => clearTimeout(timer);
    }
  }, [isVisualizing, liveLogIndex, battleSession]);

  // Set log index to end when battle completes and transitions to replay mode
  useEffect(() => {
    if (!isLiveMode && battleLog && battleLog.length > 0) {
      setCurrentLogIndex(battleLog.length - 1);
    }
  }, [isLiveMode, battleLog]);

  // Auto-scroll log
  useEffect(() => {
    if (latestLogEndRef.current && typeof latestLogEndRef.current.scrollIntoView === 'function') {
      latestLogEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeStepIndex, battleSession?.log.length]);

  // Reset selected cards when required action changes
  useEffect(() => {
    setSelectedCards([]);
  }, [battleSession?.requiredAction, battleSession?.pendingActionPlayer]);

  // Auto-Play timer effect (only triggers when user explicitly enables auto-play)
  useEffect(() => {
    if (!isAutoPlay) return;

    if (isLiveMode && battleSession) {
      if (battleSession.isFinished || battleSession.requiredAction !== 'DRAW') {
        setIsAutoPlay(false);
        return;
      }
      const timer = setTimeout(() => {
        onStep().catch(() => setIsAutoPlay(false));
      }, playSpeed);
      return () => clearTimeout(timer);
    } else if (!isLiveMode) {
      if (currentLogIndex >= battleLog.length - 1) {
        setIsAutoPlay(false);
        return;
      }
      const timer = setTimeout(() => {
        setCurrentLogIndex((prev) => prev + 1);
      }, playSpeed);
      return () => clearTimeout(timer);
    }
  }, [isAutoPlay, isLiveMode, battleSession, currentLogIndex, battleLog, playSpeed, onStep]);

  // Audio/Visual feedback cues
  const lastPlayedIndexRef = useRef<number>(-1);
  

  useEffect(() => {
    if (!hasLog || activeLog.length === 0) return;
    const targetIdx = activeStepIndex;
    if (targetIdx === lastPlayedIndexRef.current) return;
    lastPlayedIndexRef.current = targetIdx;

    const entry = activeLog[targetIdx];
    if (!entry) return;

    if (entry.action === 'reveal') {
      playSE('clash');
    } else if (entry.action === 'flag_change') {
      playSE('roll');
      if (entry.flagHolder === playerName) {
        setFlashState('cyan');
      } else if (entry.flagHolder === opponent) {
        setFlashState('magenta');
      }
      setTimeout(() => setFlashState(null), 400);
    } else if (entry.action === 'memory_overflow' || entry.action === 'deck_empty') {
      playSE('discard');
    }

    if (targetIdx === activeLog.length - 1 && (isLiveMode ? battleSession.isFinished : currentLogIndex === battleLog.length - 1)) {
      const winner = entry.flagHolder;
      if (winner === playerName) {
        playSE('victory');
      } else if (winner === opponent) {
        playSE('defeat');
      }
    }
  }, [activeStepIndex, activeLog, playerName, opponent, playSE, hasLog, isLiveMode, battleSession?.isFinished, battleLog.length]);

  // Helper to parse live slots into MemorySlot[]
  const mapLiveMemSlots = (slots: MemorySlot[] | undefined): MemorySlot[] => {
    if (!slots) return [];
    return slots;
  };

  // Helper to parse historical string slots into minimal MemorySlot[] (no Card images available)
  const parseMemSlots = (slots: string[] | undefined | null): MemorySlot[] => {
    if (!slots) return [];
    return slots.map((slotStr) => {
      const match = slotStr.match(/^(.+)\(x(\d+)\)$/);
      if (match) {
        const name = match[1];
        const count = parseInt(match[2], 10);
        return { cardName: name, cards: [], count };
      }
      return { cardName: slotStr, cards: [], count: 1 };
    });
  };

  // Dual Board bindings (Dynamic depending on live vs historical mode)
  const isPlayer1 = useMemo(() => {
    const cur = (playerName || '').trim().toLowerCase();
    if (isLiveMode && battleSession) {
      const p1 = (battleSession.player1Name || '').trim().toLowerCase();
      return p1 === cur;
    }
    if (battleLog && battleLog.length > 0) {
      const p1 = (battleLog[0].player || '').trim().toLowerCase();
      return p1 === cur;
    }
    return true;
  }, [isLiveMode, battleSession, playerName, battleLog]);

  const myMemSlots = useMemo(() => {
    if (isLiveMode) {
      return mapLiveMemSlots(isPlayer1 ? battleSession.player1Mem : battleSession.player2Mem);
    }
    const currentEntry = hasLog ? battleLog[Math.min(activeStepIndex, battleLog.length - 1)] : null;
    if (!currentEntry) return [];
    return parseMemSlots(isPlayer1 ? currentEntry.playerMemSlots : currentEntry.cpuMemSlots);
  }, [isLiveMode, battleSession, activeStepIndex, battleLog, isPlayer1, hasLog]);

  const opponentMemSlots = useMemo(() => {
    if (isLiveMode) {
      return mapLiveMemSlots(isPlayer1 ? battleSession.player2Mem : battleSession.player1Mem);
    }
    const currentEntry = hasLog ? battleLog[Math.min(activeStepIndex, battleLog.length - 1)] : null;
    if (!currentEntry) return [];
    return parseMemSlots(isPlayer1 ? currentEntry.cpuMemSlots : currentEntry.playerMemSlots);
  }, [isLiveMode, battleSession, activeStepIndex, battleLog, isPlayer1, hasLog]);

  const myDeckCount = useMemo(() => {
    if (isLiveMode) {
      return isPlayer1 ? battleSession.player1Deck.length : battleSession.player2Deck.length;
    }
    const currentEntry = hasLog ? battleLog[Math.min(activeStepIndex, battleLog.length - 1)] : null;
    if (!currentEntry) return 0;
    return isPlayer1 ? currentEntry.playerDeckCount : currentEntry.cpuDeckCount;
  }, [isLiveMode, battleSession, activeStepIndex, battleLog, hasLog, isPlayer1]);

  const opponentDeckCount = useMemo(() => {
    if (isLiveMode) {
      return isPlayer1 ? battleSession.player2Deck.length : battleSession.player1Deck.length;
    }
    const currentEntry = hasLog ? battleLog[Math.min(activeStepIndex, battleLog.length - 1)] : null;
    if (!currentEntry) return 0;
    return isPlayer1 ? currentEntry.cpuDeckCount : currentEntry.playerDeckCount;
  }, [isLiveMode, battleSession, activeStepIndex, battleLog, isPlayer1, hasLog]);

  // Card Visuals: each player has their own stack of revealed cards.
  const buildMyStack = useMemo(() => buildPlayerStack({
    player: 'me', playerName, opponent, isLiveMode, battleSession,
    battleLog, currentLogIndex: activeStepIndex, hasLog,
  }), [playerName, opponent, isLiveMode, battleSession, battleLog, activeStepIndex, hasLog]);

  const buildOppStack = useMemo(() => buildPlayerStack({
    player: 'opp', playerName, opponent, isLiveMode, battleSession,
    battleLog, currentLogIndex: activeStepIndex, hasLog,
  }), [playerName, opponent, isLiveMode, battleSession, battleLog, activeStepIndex, hasLog]);

  const myStack = buildMyStack;
  const oppStack = buildOppStack;

  // Draw turns status
  const isMyDrawTurn = useMemo(() => {
    if (isLiveMode) {
      return battleSession.turnOwner === playerName && battleSession.requiredAction === 'DRAW' && !battleSession.isFinished;
    }
    const nextEntry = (hasLog && currentLogIndex + 1 < battleLog.length) ? battleLog[currentLogIndex + 1] : null;
    return nextEntry ? nextEntry.player === playerName && nextEntry.action === 'reveal' : false;
  }, [isLiveMode, battleSession, currentLogIndex, battleLog, playerName, hasLog]);

  const isOpponentDrawTurn = useMemo(() => {
    if (isLiveMode) {
      return battleSession.turnOwner !== playerName && battleSession.requiredAction === 'DRAW' && !battleSession.isFinished;
    }
    const nextEntry = (hasLog && currentLogIndex + 1 < battleLog.length) ? battleLog[currentLogIndex + 1] : null;
    return nextEntry ? nextEntry.player === opponent && nextEntry.action === 'reveal' : false;
  }, [isLiveMode, battleSession, currentLogIndex, battleLog, opponent, hasLog, playerName]);

  const displayedLog = useMemo(() => {
    if (isLiveMode) return activeLog;
    return activeLog.slice(0, activeStepIndex + 1);
  }, [isLiveMode, activeLog, currentLogIndex]);

  const liveStatusMessage = useMemo(() => {
    if (!hasLog || activeLog.length === 0) return { text: t('initializingArenaLink'), color: 'text-cyber-text-dim' };
    const targetIdx = activeStepIndex;
    const entry = activeLog[targetIdx];
    if (!entry) return { text: t('initializingArenaLink'), color: 'text-cyber-text-dim' };

    const actionPlayer = entry.player;
    const isPlayer = actionPlayer === playerName;
    const pName = isPlayer ? 'あなた' : actionPlayer;
    const color = isPlayer ? 'text-neon-cyan text-glow-cyan' : 'text-neon-magenta text-glow-magenta';

    switch (entry.action) {
      case 'reveal':
        if (entry.card) {
          return {
            text: `${pName} が 「${entry.card.name}」 (POW ${entry.card.power}) をめくりました！`,
            color,
            card: entry.card,
          };
        }
        return { text: `${pName} がカードをめくりました`, color };
      case 'flag_change': {
        const winnerName = entry.flagHolder === playerName ? 'あなた' : entry.flagHolder;
        const winnerColor = entry.flagHolder === playerName ? 'text-neon-cyan text-glow-cyan' : 'text-neon-magenta text-glow-magenta';
        return {
          text: `🚩 ${winnerName} がフラッグを奪いました！ (防衛パワー: ${entry.currentPower})`,
          color: winnerColor + ' font-black scale-105',
        };
      }
      case 'memory_overflow':
        return {
          text: `⚠️ ${pName} のメモリが満杯 (オーバーフロー) になりました！`,
          color: 'text-neon-red animate-pulse',
        };
      case 'deck_empty':
        return {
          text: `🚫 ${pName} の山札がなくなりました！`,
          color: 'text-neon-red animate-pulse',
        };
      default:
        return {
          text: translateBattleDetail(entry.details || entry.action),
          color: 'text-cyber-text',
        };
    }
  }, [activeLog, currentLogIndex, hasLog, isLiveMode, playerName, t, translateBattleDetail]);

  const isReplayFinished = isLiveMode ? battleSession.isFinished : (currentLogIndex >= battleLog.length - 1);
  const flagPowerValue = isLiveMode ? battleSession.flagPower : (hasLog ? activeLog[currentLogIndex].currentPower : 0);
  const challengerPower = isLiveMode ? battleSession.challengerPower : 0;

  // Active Choice Config
  const showChoiceUI = isLiveMode && battleSession.requiredAction !== 'DRAW' && battleSession.pendingActionPlayer === playerName && !battleSession.isFinished;

  const choiceConfig = useMemo(() => {
    if (!showChoiceUI) return null;
    const action = battleSession.requiredAction;
    switch (action) {
      case 'CHOOSE_REPORTER':
        return {
          title: 'REPORTER DETECTED / リポーター効果発動',
          instructions: '山札の上のカードを1枚選択してください。選択したカードが山札の一番上になり、もう1枚は山札の一番下に置かれます。',
          maxSelect: 1,
          minSelect: 1,
          isOptional: false,
        };
      case 'CHOOSE_JUGGLER':
      case 'CHOOSE_BUMPER_CAR':
        return {
          title: 'JUGGLER / バンパーカー効果発動',
          instructions: '山札の上のカードを並び替えたい順に選択してください。最初に選択したカードが山札の一番上になります。',
          maxSelect: battleSession.actionOptions.length,
          minSelect: battleSession.actionOptions.length,
          isOptional: false,
        };
      case 'CHOOSE_SAILOR':
      case 'CHOOSE_PROPHET':
        return {
          title: 'SAILOR / 船乗り・予知能力者効果発動',
          instructions: '山札からカードを1枚選択し、山札の底（予知能力者の場合は山札のトップ）に移動します。',
          maxSelect: 1,
          minSelect: 1,
          isOptional: false,
        };
      case 'CHOOSE_BUTLER':
      case 'CHOOSE_PUMPKIN':
        return {
          title: 'BUTLER / 執事・パンプキン効果発動',
          instructions: 'ベンチから除外するカードを最大2枚選択してください。（選択しなくても構いません）',
          maxSelect: 2,
          minSelect: 0,
          isOptional: true,
        };
      case 'CHOOSE_MAGICIAN':
        return {
          title: 'MAGICIAN / 魔術師効果発動',
          instructions: 'ベンチからパワー3以下のカードを1枚選択して除外してください。',
          maxSelect: 1,
          minSelect: 0,
          isOptional: true,
        };
      case 'CHOOSE_VAMPIRE':
        return {
          title: 'VAMPIRE / バンパイア効果発動',
          instructions: 'ベンチからBデッキのカードを1枚選択し、山札の一番上に戻します。',
          maxSelect: 1,
          minSelect: 0,
          isOptional: true,
        };
      case 'CHOOSE_MOVIESTAR':
        return {
          title: 'MOVIESTAR / ムービースター効果発動',
          instructions: 'ベンチからパワー1または2の映画カードを最大2枚選択し、山札の上に戻します。',
          maxSelect: 2,
          minSelect: 0,
          isOptional: true,
        };
      case 'CHOOSE_SIREN':
        return {
          title: 'SIREN / サイレン効果発動',
          instructions: '相手のベンチからカードを1枚選択し、除外エリアに送ります。',
          maxSelect: 1,
          minSelect: 0,
          isOptional: true,
        };
      default:
        return {
          title: 'CARD EFFECT TRIGGERED / カード効果選択',
          instructions: 'カードを選択してください。',
          maxSelect: 1,
          minSelect: 0,
          isOptional: true,
        };
    }
  }, [showChoiceUI, battleSession]);

  const handleSelectCard = (id: string) => {
    if (!choiceConfig) return;
    playSE('hover');
    if (choiceConfig.maxSelect === 1) {
      if (selectedCards.includes(id)) {
        setSelectedCards([]);
      } else {
        setSelectedCards([id]);
      }
    } else {
      if (selectedCards.includes(id)) {
        setSelectedCards(selectedCards.filter((x) => x !== id));
      } else {
        if (selectedCards.length < choiceConfig.maxSelect) {
          setSelectedCards([...selectedCards, id]);
        }
      }
    }
  };

  const handleConfirmChoice = () => {
    if (!isLiveMode || !choiceConfig) return;
    playSE('click');
    onSubmitAction(battleSession.requiredAction, selectedCards);
  };

  const handleSkipChoice = () => {
    if (!isLiveMode) return;
    playSE('click');
    onSubmitAction(battleSession.requiredAction, []);
  };

  const isSelectionValid = useMemo(() => {
    if (!choiceConfig) return false;
    return (
      selectedCards.length >= choiceConfig.minSelect &&
      selectedCards.length <= choiceConfig.maxSelect
    );
  }, [selectedCards, choiceConfig]);

  const speedOptions = [
    { label: '0.5x', value: 1600 },
    { label: '1.0x', value: 1000 },
    { label: '2.0x', value: 500 },
    { label: '4.0x', value: 200 },
  ];

  const flagHolder = hasLog && activeLog && activeLog[activeStepIndex] ? activeLog[activeStepIndex].flagHolder : '';

  return (
    <div className="h-screen bg-cyber-dark relative overflow-hidden flex flex-col p-2 sm:p-4 select-none">
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

      {/* 2. Main Vertical Battle Board — Opponent (top) vs Player (bottom) */}
      <div className="relative z-10 max-w-5xl mx-auto w-full flex flex-col gap-2 my-2 flex-1 min-h-0">

        {/* ===== OPPONENT PANEL (TOP) ===== */}
        <div className="flex flex-col gap-1 border border-neon-magenta/20 rounded-xl bg-cyber-surface/5 p-2 font-mono shrink-0">
          {/* Opponent header row: name | deck */}
          <div className="flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Cpu size={14} className="text-neon-magenta shrink-0" />
              <span className="text-neon-magenta font-bold truncate">{opponent}</span>
              {oppStack.isDefending && (
                <span className="flex items-center gap-0.5 text-[8px] uppercase tracking-wider text-neon-amber font-bold border border-neon-amber/40 px-1 py-0.5 rounded bg-amber-950/20 animate-pulse">
                  <Flag size={8} /> DEFENDING
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="text-cyber-text-dim uppercase tracking-wider">{t('deckLabel')}</span>
              <span className="text-neon-magenta font-bold flex items-center gap-1">
                <Layers size={10} />{opponentDeckCount}
              </span>
            </div>
          </div>
          {/* Opponent memory */}
          <MemorySlots slots={opponentMemSlots} label={t('npcMemoryLabel', { opponent })} side="right" compact />
        </div>

        {/* ===== CENTRAL BATTLEGROUND (PLAYMAT) ===== */}
        <div className={`flex flex-row border rounded-2xl bg-cyber-surface/20 backdrop-blur-sm relative overflow-hidden flex-1 min-h-0 transition-all duration-300 ${
          flagHolder === playerName ? 'border-neon-cyan/40 shadow-[0_0_15px_rgba(0,240,255,0.1)]' :
          flagHolder === opponent ? 'border-neon-magenta/40 shadow-[0_0_15px_rgba(255,0,255,0.1)]' :
          'border-cyber-border/40'
        }`}>
          {/* Flash overlays inside playmat */}
          {flashState === 'cyan' && (
            <div className="absolute inset-0 bg-neon-cyan/20 border-2 border-neon-cyan shadow-[inset_0_0_50px_rgba(0,240,255,0.4)] rounded-2xl pointer-events-none z-30 animate-fade-in" style={{ animationDuration: '100ms' }} />
          )}
          {flashState === 'magenta' && (
            <div className="absolute inset-0 bg-neon-magenta/20 border-2 border-neon-magenta shadow-[inset_0_0_50px_rgba(255,0,255,0.4)] rounded-2xl pointer-events-none z-30 animate-fade-in" style={{ animationDuration: '100ms' }} />
          )}

          {/* Player Stack (Left) */}
          <div className="flex-1 flex items-center justify-center min-h-0 relative px-4 py-2 border-r border-cyber-border/10 overflow-hidden">
            <PlayerStackView
              stack={myStack}
              side="me"
              isMyDrawTurn={isMyDrawTurn}
              flagPower={flagPowerValue}
              challengerPower={challengerPower}
              ownerLabel={playerName}
            />
          </div>

          {/* Center Flag/Trophy Bar (Playmat Vertical Divider) */}
          <div className="shrink-0 w-24 h-full flex flex-col items-center justify-between py-6 bg-cyber-darker/60 relative z-20 font-mono">
            {/* Top: Opponent Challenger Power */}
            <div className="h-8 flex items-center justify-center text-center">
              {!isReplayFinished && flagHolder === playerName && challengerPower > 0 && (
                <div className="flex flex-col items-center text-[10px] text-neon-magenta font-bold uppercase tracking-wider animate-pulse">
                  <span className="text-[7px] text-cyber-text-dim">CHALLENGER</span>
                  <span>POW {challengerPower}</span>
                </div>
              )}
            </div>

            {/* Center: Flag Indicator */}
            <div className="flex flex-col items-center gap-1.5">
              <div className={`flex items-center justify-center w-9 h-9 rounded-full border-2 ${
                flagHolder === playerName ? 'border-neon-cyan bg-cyan-950/20 text-neon-cyan shadow-[0_0_12px_rgba(0,240,255,0.4)] animate-pulse' :
                flagHolder === opponent ? 'border-neon-magenta bg-purple-950/20 text-neon-magenta shadow-[0_0_12px_rgba(255,0,255,0.4)] animate-pulse' :
                'border-neon-amber bg-amber-950/20 text-neon-amber shadow-[0_0_12px_rgba(255,191,0,0.4)]'
              } transition-all duration-300`}>
                <Flag size={16} className={flagHolder ? 'animate-pulse' : ''} />
              </div>
              <div className="text-center">
                <div className="text-[7px] uppercase text-cyber-text-dim tracking-widest font-bold">FLAG POWER</div>
                <div className="text-sm font-black text-white leading-none">{flagPowerValue}</div>
              </div>
            </div>

            {/* Bottom: Player Challenger Power */}
            <div className="h-8 flex items-center justify-center text-center">
              {!isReplayFinished && flagHolder === opponent && challengerPower > 0 && (
                <div className="flex flex-col items-center text-[10px] text-neon-cyan font-bold uppercase tracking-wider animate-pulse">
                  <span className="text-[7px] text-cyber-text-dim">CHALLENGER</span>
                  <span>POW {challengerPower}</span>
                </div>
              )}
            </div>
          </div>

          {/* Opponent Stack (Right) */}
          <div className="flex-1 flex items-center justify-center min-h-0 relative px-4 py-2 border-l border-cyber-border/10 overflow-hidden">
            <PlayerStackView
              stack={oppStack}
              side="opp"
              isMyDrawTurn={isOpponentDrawTurn}
              flagPower={flagPowerValue}
              challengerPower={challengerPower}
              ownerLabel={opponent}
            />
          </div>
        </div>

        {/* ===== PLAYER PANEL (BOTTOM) ===== */}
        <div className="flex flex-col gap-1 border border-neon-cyan/20 rounded-xl bg-cyber-surface/5 p-2 font-mono shrink-0">
          {/* Player memory */}
          <MemorySlots slots={myMemSlots} label={t('yourMemory')} side="left" compact />
          
          {/* Player header row */}
          <div className="flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <User size={14} className="text-neon-cyan shrink-0" />
              <span className="text-neon-cyan font-bold truncate">{playerName}</span>
              {myStack.isDefending && (
                <span className="flex items-center gap-0.5 text-[8px] uppercase tracking-wider text-neon-amber font-bold border border-neon-amber/40 px-1 py-0.5 rounded bg-amber-950/20 animate-pulse">
                  <Flag size={8} /> DEFENDING
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDeckModal(true)}
                className="flex items-center gap-1.5 border border-neon-cyan/45 hover:border-neon-cyan rounded px-2 py-1 bg-cyber-surface/30 text-neon-cyan font-bold hover:bg-neon-cyan/10 transition-all text-[10px] cursor-pointer uppercase tracking-wider font-mono"
              >
                <Layers size={12} className="text-neon-cyan" />
                {t('viewDeckBtn')}
              </button>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-cyber-text-dim uppercase tracking-wider">{t('deckLabel')}</span>
                <span className="text-neon-cyan font-bold flex items-center gap-1">
                  <Layers size={12} />{myDeckCount}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ===== CONTROLS PANEL (BOTTOM CENTER) ===== */}
        <div className="flex flex-col items-center gap-1.5 py-0.5 z-10 shrink-0">
          {/* Active Turn Indicator Banner */}
          <div className="w-full max-w-lg text-center">
            {isReplayFinished ? (
              <div className="text-neon-green text-glow-green text-[11px] font-bold font-mono tracking-widest uppercase border border-neon-green/30 bg-green-950/15 py-1 rounded animate-pulse">
                🏁 バトル決着
              </div>
            ) : isMyDrawTurn ? (
              <div className="text-neon-cyan text-glow-cyan text-[11px] font-bold font-mono tracking-widest uppercase border border-neon-cyan/30 bg-cyan-950/15 py-1.5 px-3 rounded animate-pulse">
                {!flagHolder ? (
                  <>&gt;&gt; あなたの山札からカードをめくります &lt;&lt;</>
                ) : flagHolder === playerName ? (
                  <>&gt;&gt; あなたは防衛中 — 相手がカードをめくります &lt;&lt;</>
                ) : (
                  <>&gt;&gt; あなたが挑戦！自分の山札からめくります &lt;&lt;</>
                )}
              </div>
            ) : isOpponentDrawTurn ? (
              <div className="text-neon-magenta text-glow-magenta text-[11px] font-bold font-mono tracking-widest uppercase border border-neon-magenta/30 bg-purple-950/15 py-1.5 px-3 rounded animate-pulse">
                {!flagHolder ? (
                  <>&gt;&gt; {opponent} の山札からカードをめくります &lt;&lt;</>
                ) : flagHolder === opponent ? (
                  <>&gt;&gt; {opponent} は防衛中 — あなたがめくります &lt;&lt;</>
                ) : (
                  <>&gt;&gt; {opponent} が挑戦中 — 相手の山札からめくります &lt;&lt;</>
                )}
              </div>
            ) : showChoiceUI ? (
              <div className="text-neon-magenta text-glow-magenta text-[11px] font-bold font-mono tracking-widest uppercase border border-neon-magenta/40 bg-purple-950/30 py-1 rounded animate-pulse">
                ⚡ 効果選択待機中 ⚡
              </div>
            ) : isLiveMode && battleSession.requiredAction !== 'DRAW' && battleSession.pendingActionPlayer !== playerName ? (
              <div className="text-neon-magenta text-glow-magenta text-[11px] font-bold font-mono tracking-widest uppercase border border-neon-magenta/20 bg-purple-950/10 py-1 rounded animate-pulse">
                ⏳ {opponent} の効果選択中...
              </div>
            ) : (
              <div className="text-cyber-text-dim text-xs font-bold font-mono tracking-widest uppercase border border-cyber-border/20 bg-cyber-surface/10 py-1.5 rounded">
                {t('battleStep')} / 進捗: {isLiveMode ? activeLog.length : currentLogIndex + 1}{isLiveMode ? '' : ` / ${battleLog.length}`}
              </div>
            )}
          </div>

          {/* Action resolution details — Large Live Display */}
          <div className="w-full max-w-2xl text-center px-4 py-2 border-2 border-cyber-border/20 rounded-xl bg-cyber-darker/80 min-h-[50px] flex flex-col items-center justify-center shadow-lg relative overflow-hidden">
            {/* Ambient scanlines */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent pointer-events-none opacity-40" />
            <p className={`text-xs font-mono font-bold leading-relaxed tracking-wider transition-all duration-300 ${liveStatusMessage.color}`}>
              {liveStatusMessage.text}
            </p>
            {activeLog.length > 0 && activeLog[activeStepIndex]?.effectTriggered && activeLog[activeStepIndex].effectTriggered !== 'None' && activeLog[activeStepIndex].effectTriggered !== '' && (
              <span className="text-neon-green font-bold mt-1 text-[10px] animate-pulse flex items-center gap-1">
                ⚡ {translateBattleDetail(activeLog[activeStepIndex].effectTriggered)}
              </span>
            )}
          </div>

          {/* Interactive Choice Panel (inline, not overlay) */}
          {showChoiceUI && choiceConfig && (
            <div className="w-full max-w-3xl bg-cyber-darker/95 backdrop-blur-md flex flex-col items-center p-3 border-2 border-neon-magenta/40 rounded-xl animate-fade-in relative z-40">
              <div className="text-neon-magenta text-glow-magenta font-black tracking-widest text-xs uppercase mb-1 animate-pulse">
                ⚡ {choiceConfig.title} ⚡
              </div>
              <p className="text-[10px] text-cyber-text-dim mb-2 text-center max-w-md">{choiceConfig.instructions}</p>

              <div className="flex gap-2 flex-wrap justify-center my-1 overflow-y-auto max-h-[200px] p-2">
                {battleSession.actionOptions.map((optCard) => {
                  const fullCard = convertToFullCard(optCard);
                  const isSelected = selectedCards.includes(optCard.id);
                  const selectIdx = selectedCards.indexOf(optCard.id);
                  return (
                    <div
                      key={optCard.id}
                      onClick={() => handleSelectCard(optCard.id)}
                      className={`relative cursor-pointer transition-all duration-150 transform hover:scale-105 active:scale-95 ${
                        isSelected ? 'ring-2 ring-neon-magenta scale-105 opacity-100 z-10' : 'opacity-80 hover:opacity-100'
                      }`}
                    >
                      <CardDisplay card={fullCard} disabled={false} size="sm" />
                      {isSelected && (
                        <div className="absolute top-1 right-1 bg-neon-magenta text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-lg border border-white/20">
                          {selectIdx + 1}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3 mt-1">
                <button
                  onClick={handleConfirmChoice}
                  disabled={!isSelectionValid}
                  className="px-6 py-2 border-2 border-neon-magenta text-neon-magenta font-bold uppercase tracking-widest rounded bg-purple-950/20 hover:bg-purple-950/40 text-[10px] shadow-[0_0_10px_rgba(255,0,255,0.2)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {t('confirmChoice')}
                </button>
                {choiceConfig.isOptional && (
                  <button
                    onClick={handleSkipChoice}
                    className="px-6 py-2 border border-cyber-border text-cyber-text-dim hover:text-white hover:border-white uppercase tracking-wider rounded bg-cyber-surface/10 hover:bg-cyber-surface/30 text-[10px] cursor-pointer"
                  >
                    {t('skipChoice')}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Main Interactive Draw Button */}
          <div className="w-full max-w-xs flex flex-col items-center gap-2">
            {!isReplayFinished ? (
              <button
                disabled={isLiveMode && (isVisualizing || battleSession.requiredAction !== 'DRAW' || (battleSession.turnOwner === opponent && !opponentIsNPC))}
                onClick={() => {
                  playSE('click');
                  if (isLiveMode) {
                    onStep();
                  } else {
                    setCurrentLogIndex((prev) => Math.min(prev + 1, battleLog.length - 1));
                  }
                }}
                className={`w-full py-2 px-4 rounded-lg border-2 font-mono font-bold text-xs uppercase tracking-widest cursor-pointer transition-all duration-150 transform active:scale-95 shadow-md flex items-center justify-center gap-2 ${
                  isMyDrawTurn
                    ? 'border-neon-cyan text-neon-cyan bg-cyan-950/20 hover:bg-cyan-950/40 text-glow-cyan shadow-[0_0_15px_rgba(0,240,255,0.2)] animate-pulse'
                    : isOpponentDrawTurn
                    ? 'border-neon-magenta text-neon-magenta bg-purple-950/20 hover:bg-purple-950/40 text-glow-magenta shadow-[0_0_15px_rgba(255,0,255,0.2)]'
                    : 'border-cyber-border text-cyber-text bg-cyber-surface/30 hover:bg-cyber-surface/50 font-medium disabled:opacity-40 disabled:cursor-not-allowed'
                }`}
              >
                <Play size={14} className={isMyDrawTurn ? 'animate-bounce' : ''} />
                {isMyDrawTurn ? (
                  <span>
                    {!flagHolder
                      ? '自分の山札からめくる'
                      : flagHolder === playerName
                      ? '防衛中 — 次の挑戦を待つ'
                      : '挑戦！自分の山札からめくる'}
                  </span>
                ) : isOpponentDrawTurn ? (
                  <span>
                    {!flagHolder
                      ? `${opponent} の山札からめくる`
                      : flagHolder === opponent
                      ? `${opponent} 防衛中 — 次をめくる`
                      : `${opponent} 挑戦中 — 相手の山札からめくる`}
                  </span>
                ) : (
                  <span>{t('nextStep')}</span>
                )}
              </button>
            ) : (
              <button
                onClick={onComplete}
                className="w-full py-2 px-4 rounded-lg border-2 border-neon-green text-neon-green bg-green-950/20 hover:bg-green-950/40 text-glow-green font-bold text-xs uppercase tracking-widest cursor-pointer transition-all duration-150 transform active:scale-95 shadow-[0_0_15px_rgba(0,255,102,0.25)] animate-pulse animate-neon-pulse"
              >
                {t('continueToStandings')}
              </button>
            )}
          </div>
        </div>

      </div>

      {/* 3. Replay / Speed / Auto Controllers */}
      <div className="relative z-10 max-w-3xl mx-auto w-full border border-cyber-border/30 rounded-lg p-2 bg-cyber-darker/90 backdrop-blur-md mb-2 flex flex-col sm:flex-row items-center justify-between gap-2 font-mono shrink-0">
        
        {/* Play/Pause controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAutoPlay(!isAutoPlay)}
            disabled={isReplayFinished || (isLiveMode && battleSession.requiredAction !== 'DRAW')}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider cursor-pointer border transition-all ${
              isReplayFinished || (isLiveMode && battleSession.requiredAction !== 'DRAW')
                ? 'border-cyber-border/35 text-cyber-text-dim cursor-not-allowed opacity-50'
                : isAutoPlay
                ? 'border-neon-magenta text-neon-magenta hover:bg-neon-magenta/10 shadow-[0_0_8px_rgba(255,0,255,0.1)] animate-pulse'
                : 'border-neon-green text-neon-green hover:bg-neon-green/10 shadow-[0_0_8px_rgba(0,255,0,0.1)]'
            }`}
          >
            {isAutoPlay ? <Pause size={12} /> : <Play size={12} />}
            {isAutoPlay ? t('pauseLabel') : t('autoLabel')}
          </button>

          {!isLiveMode && (
            <>
              <button
                onClick={() => {
                  playSE('click');
                  setCurrentLogIndex((prev) => Math.min(prev + 1, battleLog.length - 1));
                  setIsAutoPlay(false);
                }}
                disabled={isReplayFinished}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider cursor-pointer border border-neon-cyan text-neon-cyan hover:bg-neon-cyan/10 transition-all"
              >
                <Play size={12} />
                {t('nextStepBtnTitle')}
              </button>

              <button
                onClick={() => {
                  playSE('shuffle');
                  setCurrentLogIndex(0);
                  setIsAutoPlay(false);
                  lastPlayedIndexRef.current = -1;
                }}
                className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded text-[10px] border border-cyber-border/50 text-cyber-text-dim hover:text-white hover:border-cyber-border transition-all cursor-pointer"
              >
                <RotateCcw size={12} />
                {t('resetBtnTitle')}
              </button>
            </>
          )}
        </div>

        {/* Playback Speed selector */}
        <div className="flex items-center gap-1.5 text-[10px]">
          <span className="text-cyber-text-dim">{t('speedLabel')}:</span>
          {speedOptions.map((speedOpt) => (
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
              {t('continueBtn')}
            </button>
          ) : !isLiveMode ? (
            <button
              onClick={() => {
                playSE('click');
                setCurrentLogIndex(battleLog.length - 1);
                setIsAutoPlay(false);
              }}
              className="px-4 py-2 rounded border border-cyber-border/40 text-cyber-text-dim text-[10px] uppercase tracking-wider hover:text-white hover:border-cyber-border transition-all cursor-pointer"
            >
              {t('skipSim')}
            </button>
          ) : null}
        </div>
      </div>

      {/* 4. Bottom Event Log feed */}
      <div className="relative z-10 max-w-4xl mx-auto w-full border border-cyber-border/30 rounded-lg p-2 bg-cyber-surface/50 max-h-24 overflow-y-auto font-mono text-[10px] shadow-inner shrink-0">
        <div className="flex items-center gap-2 mb-2 border-b border-cyber-border/20 pb-1">
          <Activity size={12} className="text-neon-green" />
          <span className="text-[9px] text-neon-green uppercase tracking-widest font-bold">
            {t('combatLogHeader')}
          </span>
          <span className="text-[9px] text-cyber-text-dim ml-auto">
            {t('eventsCount', { count: displayedLog.length })}
          </span>
        </div>
        
        <div className="flex flex-col gap-1">
          {displayedLog.map((log, i) => {
            const displayLogAction = translateBattleDetail(log.details || log.action);
            const displayLogEffect = log.effectTriggered ? translateBattleDetail(log.effectTriggered) : '';
            const isPlayer = log.player === playerName;
            const isSystem = !log.player || log.player === 'SYSTEM';

            return (
              <div
                key={i}
                className={`flex items-start gap-2 py-1 px-1.5 rounded transition-all duration-300 ${
                  i === displayedLog.length - 1 ? 'bg-cyber-surface/40 border border-cyber-border/10 animate-slide-in' : ''
                }`}
              >
                <div className={`mt-0.5 min-w-[14px] ${isSystem ? 'text-neon-green' : isPlayer ? 'text-neon-cyan' : 'text-neon-magenta'}`}>
                  {isSystem ? <Shield size={10} /> : <User size={10} />}
                </div>
                <div className="flex-1">
                  <span className={`font-bold ${isSystem ? 'text-neon-green' : isPlayer ? 'text-neon-cyan' : 'text-neon-magenta'}`}>
                    {isSystem ? '[SYS]' : `[${log.player}]`}
                  </span>{' '}
                  <span className={i === displayedLog.length - 1 ? 'text-cyber-text font-semibold' : 'text-cyber-text-dim/70'}>
                    {displayLogAction}
                  </span>
                  {log.effectTriggered && log.effectTriggered !== 'None' && log.effectTriggered !== '' && (
                    <span className="text-neon-green ml-1.5 inline-flex items-center gap-1 font-bold animate-pulse">
                      ⚡ {displayLogEffect}
                    </span>
                  )}
                </div>
                <span className="text-[9px] text-cyber-text-dim/40 whitespace-nowrap">
                  {t('stepShort', { step: log.step })}
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
