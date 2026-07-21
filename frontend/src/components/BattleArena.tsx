import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Flag, User, Cpu, Play, Pause, RotateCcw, Layers, Shield, Activity, Zap } from 'lucide-react';
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
  battleLog: BattleLogEntry[];
  currentLogIndex: number;
  hasLog: boolean;
}

// isFlagMarker reports whether a log entry marks the point at which the flag
// transferred to a new holder. Both "flag_change" (final transfer) and
// "flag_change_pending" (transfer pending an effect choice) qualify — in both
// cases the new flag holder is already decided and `entry.card`/`entry.flagHolder`
// reflect the new defender.
function isFlagMarker(action: string): boolean {
  return action === 'flag_change' || action === 'flag_change_pending';
}

function buildPlayerStack(args: BuildPlayerStackArgs): PlayerStack {
  const { player, playerName, opponent, battleLog, currentLogIndex, hasLog } = args;
  const myName = player === 'me' ? playerName : opponent;

  const empty: PlayerStack = { flagCard: null, challengerCards: [], isDefending: false };
  if (!hasLog || currentLogIndex < 0 || battleLog.length === 0) return empty;

  const logList = battleLog;
  let defenderName = '';
  let flagCard: Card | null = null;
  let flagChangeIdx = -1;

  for (let i = currentLogIndex; i >= 0; i--) {
    const entry = logList[i];
    if (entry && isFlagMarker(entry.action)) {
      defenderName = entry.flagHolder;
      flagCard = entry.card ? convertToFullCard(entry.card) : null;
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
    // (i.e. from the flagChangeIdx backwards until the previous flag marker or start)
    const defenderCards: Card[] = [];
    let startIdx = 0;
    for (let i = flagChangeIdx - 1; i >= 0; i--) {
      if (logList[i] && isFlagMarker(logList[i].action)) {
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
    if (isFlagMarker(entry.action)) break;
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
  // The challenger power (opponent-of-flag-holder). Used to derive the
  // "needed to capture" badge on the defending flag card and the "will
  // take" pulse on the challenger stack. Reflects the visualized log step
  // (NOT the live backend total) so the UI stays numerically in sync with
  // the visible cards.
  challengerPower: number;
  ownerLabel: string;
}

function StackCardThumb({ card, isFlag, neededPower }: { card: Card; isFlag: boolean; neededPower?: number }) {
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
      className="relative transition-all duration-200 preserve-3d w-28 h-40"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Card Front Face */}
      <div className="absolute inset-0 backface-hidden z-10">
        <CardDisplay card={card} disabled size="sm" />
        {isFlag && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex items-center gap-0.5 text-[8px] font-mono font-bold text-neon-amber bg-cyber-darker border border-neon-amber/50 px-1 py-0.5 rounded-full shadow-[0_0_8px_rgba(255,191,0,0.4)] whitespace-nowrap z-20">
            <Flag size={8} /> FLAG
          </div>
        )}
        {neededPower !== undefined && neededPower > 0 && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center justify-center text-[9px] font-mono font-bold text-neon-red bg-cyber-darker border border-neon-red/50 px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(255,0,64,0.6)] whitespace-nowrap z-20 animate-pulse">
            +{neededPower} power needed to capture
          </div>
        )}
      </div>

      {/* Card Back Face (visible during 3D flip rotation) */}
      <div className="absolute inset-0 backface-hidden rotate-y-180 bg-cyber-darker border-2 border-cyber-border rounded-lg flex flex-col items-center justify-center p-2 shadow-lg relative overflow-hidden select-none">
        <div className="absolute inset-0 cyber-grid opacity-35 pointer-events-none" />
        <div className="w-full h-full border border-dashed border-neon-cyan/20 rounded flex flex-col items-center justify-center gap-2">
          <div className="w-8 h-8 rounded-full border border-neon-cyan/40 flex items-center justify-center text-neon-cyan text-glow-cyan animate-pulse">
            💿
          </div>
          <span className="text-[8px] uppercase tracking-widest text-cyber-text-dim text-center">NEON AUTO</span>
        </div>
      </div>

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
          <CardDisplay card={card} disabled={false} />
        </div>,
        document.body
      )}
    </div>
  );
}

function PlayerStackView({ stack, side, isMyDrawTurn, flagPower, challengerPower, ownerLabel }: PlayerStackViewProps) {
  const { t } = useTranslation();
  const accent = side === 'me' ? 'neon-cyan' : 'neon-magenta';
  const borderClass = side === 'me' ? 'border-neon-cyan/30' : 'border-neon-magenta/30';
  const textClass = side === 'me' ? 'text-neon-cyan/40' : 'text-neon-magenta/40';

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

  // One-by-one reveal: each new card appears 400ms after the previous.
  // When a challenger takes the flag, the winning card carries over to the
  // defender side; in that case we must NOT re-animate the card (otherwise the
  // user sees the winning card "flip" again). We detect this by checking that
  // the last card of the new stack has the same ID as the previously-visible
  // last card.
  const [visibleCount, setVisibleCount] = useState(0);
  const prevCardsLen = useRef(0);
  const wasDefending = useRef(isDefending);
  const prevLastCardId = useRef<string | null>(null);
  const revealTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  // Keep a ref to the latest `cards` array so the effect can read the
  // current last-card ID without re-running whenever the array reference
  // changes (which would cancel pending reveal timers).
  const cardsRef = useRef(cards);
  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  useEffect(() => {
    const currentCards = cardsRef.current;
    const roleChanged = wasDefending.current !== isDefending;
    const cardsReset = currentCards.length < prevCardsLen.current;
    const newLastId = currentCards.length > 0 ? currentCards[currentCards.length - 1].id : null;
    const carriesWinningCard =
      roleChanged &&
      prevLastCardId.current !== null &&
      newLastId !== null &&
      prevLastCardId.current === newLastId;

    if (carriesWinningCard) {
      // Role transition with the same winning card on top — keep it visible
      // without re-flipping. Snap visibleCount to the new (defender) length.
      revealTimers.current.forEach(clearTimeout);
      revealTimers.current = [];
      setVisibleCount(currentCards.length);
      prevCardsLen.current = currentCards.length;
      wasDefending.current = isDefending;
      prevLastCardId.current = newLastId;
      return;
    }

    if (roleChanged || cardsReset) {
      revealTimers.current.forEach(clearTimeout);
      revealTimers.current = [];
      prevCardsLen.current = 0;
      setVisibleCount(0);
    }
    wasDefending.current = isDefending;

    const oldLen = prevCardsLen.current;
    const newLen = currentCards.length;
    if (newLen > oldLen) {
      for (let i = oldLen; i < newLen; i++) {
        const delay = (i - oldLen) * 400;
        const t = setTimeout(() => setVisibleCount(i + 1), delay);
        revealTimers.current.push(t);
      }
    } else if (newLen < oldLen) {
      // Stack shrunk (e.g. opponent cleared); snap to current count.
      setVisibleCount(newLen);
    }
    prevCardsLen.current = newLen;
    prevLastCardId.current = newLastId;
    return () => {
      revealTimers.current.forEach(clearTimeout);
      revealTimers.current = [];
    };
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

  // Power displays must follow the visible cards, not the session-level
  // totals — otherwise the user sees the full challenger power before the
  // cards have finished flipping in (numerical mismatch with the visuals).
  const visibleChallengerPower = useMemo(
    () => visibleCards.reduce((sum, c) => sum + (c.power || 0), 0),
    [visibleCards]
  );
  const allCardsVisible = visibleCount >= cards.length;

  if (!hasAny && visibleCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className={`text-[10px] uppercase tracking-widest font-mono border border-dashed ${borderClass} rounded-lg px-4 py-2 ${textClass}`}>
          {side === 'opp' ? t('awaitingOpponentCard', { name: ownerLabel }) : t('drawYourCard')}
        </div>
      </div>
    );
  }

  // For the defender: "POW" is the flag power. For the challenger: "POW"
  // is the (visible) cumulative attacker power. The "needed" badge on the
  // defender's flag card uses the (full) challenger power passed in, while
  // the challenger "will take" pulse requires all of its cards to be
  // visible AND the total challenger power to exceed flag power.
  const cumulative = isDefending ? flagPower : visibleChallengerPower;
  const needed = Math.max(0, flagPower - challengerPower + 1);
  const willTake = !isDefending && allCardsVisible && challengerPower > flagPower;
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
            <span>{t('defendingLabel', { name: ownerLabel })}</span>
            {flagCardName && (
              <span className="text-neon-amber font-black border border-neon-amber/30 px-1.5 rounded bg-amber-950/20">
                🃏 {flagCardName}
              </span>
            )}
            <span className="text-white font-black border border-white/20 px-1.5 rounded bg-cyber-darker">POW {flagPower}</span>
          </>
        ) : (
          <>
            <span>{t('challengingLabel', { name: ownerLabel })}</span>
            <span className="text-white font-black border border-white/20 px-1.5 rounded bg-cyber-darker">{t('totalPowLabel', { pow: cumulative })}</span>
            {!willTake && flagPower > 0 && (
              <span className="text-neon-amber border border-neon-amber/40 px-1.5 rounded bg-amber-950/20">{t('needMorePow', { needed })}</span>
            )}
            {willTake && (
              <span className="text-neon-green border border-neon-green/40 px-1.5 rounded bg-green-950/20 animate-pulse">🏴 {t('flagStolen')}</span>
            )}
          </>
        )}
      </div>

      {/* Fanned stack */}
      <div className="relative perspective-arena" style={{ width: stackWidth, height: 140 }}>
        {n === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`text-[10px] uppercase tracking-widest font-mono border border-dashed ${borderClass} rounded-lg px-4 py-2 ${textClass}`}>
              {isMyDrawTurn ? t('drawPlaceholder') : t('waitingPlaceholder')}
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
                className={`absolute top-0 ${cardClass} preserve-3d transition-all duration-200 hover:-translate-y-3 hover:scale-105 hover:!z-[99] hover:filter hover:brightness-110 cursor-pointer`}
                style={{ left: idx * OVERLAP, zIndex: idx, opacity: isLatest ? 1 : 0.85 }}
              >
                <StackCardThumb card={cCard} isFlag={!!isFlag} neededPower={isFlag ? needed : undefined} />
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
  const playSERef = useRef(playSE);
  const translateBattleDetailRef = useRef(translateBattleDetail);

  useEffect(() => {
    playSERef.current = playSE;
    translateBattleDetailRef.current = translateBattleDetail;
  }, [playSE, translateBattleDetail]);

  const [showDeckModal, setShowDeckModal] = useState(false);

  // Replay playback states (for non-live historical log viewer fallback)
  const [currentLogIndex, setCurrentLogIndex] = useState<number>(0);
  const [liveLogIndex, setLiveLogIndex] = useState<number>(0);
  const [isAutoPlay, setIsAutoPlay] = useState<boolean>(false);
  const [playSpeed, setPlaySpeed] = useState<number>(1200); // ms per step (slowed down from 1000ms for readability)
  const [flashState, setFlashState] = useState<'cyan' | 'magenta' | null>(null);
  const [effectAlert, setEffectAlert] = useState<string | null>(null);
  const effectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Interactive selection state
  const [selectedCards, setSelectedCards] = useState<string[]>([]);

  const latestLogEndRef = useRef<HTMLDivElement | null>(null);

  const isLiveMode = battleSession !== null;
  const hasLog = isLiveMode ? (battleSession.log.length > 0) : (battleLog && battleLog.length > 0);
  const activeLog = useMemo(() => {
    return isLiveMode ? (battleSession?.log || []) : battleLog;
  }, [isLiveMode, battleSession?.log, battleLog]);
  const activeStepIndex = isLiveMode ? liveLogIndex : currentLogIndex;

  // Track the actual log length we have visualized
  const lastLogLengthRef = useRef(-1);

  // Synchronize liveLogIndex step-by-step. On first mount we jump to the end
  // of the existing log (so joining mid-battle doesn't replay history). After
  // that, each new batch of log entries is visualized one entry at a time
  // with a delay — liveLogIndex is NOT advanced here; the visualization
  // effect below handles that.
  useEffect(() => {
    if (isLiveMode && battleSession) {
      const actualLen = battleSession.log.length;
      if (lastLogLengthRef.current === -1) {
        // First mount: jump to the end of the existing log.
        setLiveLogIndex(Math.max(0, actualLen - 1));
        lastLogLengthRef.current = actualLen;
      } else if (actualLen > lastLogLengthRef.current) {
        // New log entries arrived — don't advance liveLogIndex here;
        // let the visualization effect catch up step-by-step.
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

    if (effectTimeoutRef.current) {
      clearTimeout(effectTimeoutRef.current);
      effectTimeoutRef.current = null;
    }
    setEffectAlert(null);

    const entry = activeLog[targetIdx];
    if (!entry) return;

    if (entry.effectTriggered && entry.effectTriggered !== 'None' && entry.effectTriggered !== '') {
      const translated = translateBattleDetailRef.current(entry.effectTriggered);
      setEffectAlert(translated);
      effectTimeoutRef.current = setTimeout(() => {
        setEffectAlert(null);
        effectTimeoutRef.current = null;
      }, 1800);
    }

    if (entry.action === 'reveal') {
      playSERef.current('clash');
    } else if (entry.action === 'flag_change') {
      playSERef.current('roll');

      if (entry.flagHolder === playerName) {
        setFlashState('cyan');
      } else if (entry.flagHolder === opponent) {
        setFlashState('magenta');
      }
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
      }
      flashTimeoutRef.current = setTimeout(() => {
        setFlashState(null);
        flashTimeoutRef.current = null;
      }, 500);
    } else if (entry.action === 'memory_overflow' || entry.action === 'deck_empty') {
      playSERef.current('discard');
    }

    if (targetIdx === activeLog.length - 1 && (isLiveMode ? battleSession.isFinished : currentLogIndex === battleLog.length - 1)) {
      const winner = entry.flagHolder;
      if (winner === playerName) {
        playSERef.current('victory');
      } else if (winner === opponent) {
        playSERef.current('defeat');
      }
    }

    return () => {
      if (effectTimeoutRef.current) {
        clearTimeout(effectTimeoutRef.current);
      }
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
      }
      setFlashState(null);
      lastPlayedIndexRef.current = -1;
    };
  }, [activeStepIndex, activeLog, playerName, opponent, hasLog, isLiveMode, battleSession?.isFinished, battleLog.length, currentLogIndex]);

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

  // Build memory slots for live mode that preserve card images while staying
  // synchronized with the visualized log step. We start from the full live
  // session memory (which has Card objects with images) and filter it down
  // to only the slots that exist in the historical string snapshot at the
  // current visualization step. This avoids the image→text→image flicker
  // that occurred when switching between parseMemSlots (text only) and
  // mapLiveMemSlots (with images).
  const buildLiveMemSlots = useCallback(
    (liveSlots: MemorySlot[] | undefined, historicalStrings: string[] | undefined | null): MemorySlot[] => {
      const live = mapLiveMemSlots(liveSlots);
      if (!historicalStrings || historicalStrings.length === 0) {
        return live;
      }
      // Parse the historical snapshot into a map of cardName -> count
      const histMap = new Map<string, number>();
      for (const slotStr of historicalStrings) {
        const match = slotStr.match(/^(.+)\(x(\d+)\)$/);
        if (match) {
          histMap.set(match[1], parseInt(match[2], 10));
        } else {
          histMap.set(slotStr, 1);
        }
      }
      // Filter live slots to only those present in the historical snapshot,
      // and clamp the count to the historical value.
      const result: MemorySlot[] = [];
      for (const slot of live) {
        const histCount = histMap.get(slot.cardName);
        if (histCount !== undefined && histCount > 0) {
          if (histCount < slot.count) {
            // Show only the first N cards to match the historical count
            result.push({
              cardName: slot.cardName,
              cards: slot.cards.slice(0, histCount),
              count: histCount,
            });
          } else {
            result.push(slot);
          }
          histMap.delete(slot.cardName);
        }
      }
      // Any remaining entries in histMap are cards that were in the historical
      // snapshot but are NOT in the current live memory (e.g. they were
      // banished by an effect later). Show them as text-only fallback.
      for (const [name, count] of histMap) {
        result.push({ cardName: name, cards: [], count });
      }
      return result;
    },
    []
  );

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
      const liveSlots = isPlayer1 ? battleSession.player1Mem : battleSession.player2Mem;
      // Always derive memory from the log snapshot at the current
      // visualization step so the displayed memory is consistent with the
      // visualized log step — even after visualization catches up.
      const currentEntry = battleSession.log[Math.min(activeStepIndex, battleSession.log.length - 1)];
      if (currentEntry) {
        const histStrings = isPlayer1 ? currentEntry.playerMemSlots : currentEntry.cpuMemSlots;
        return buildLiveMemSlots(liveSlots, histStrings);
      }
      return mapLiveMemSlots(liveSlots);
    }
    const currentEntry = hasLog ? battleLog[Math.min(activeStepIndex, battleLog.length - 1)] : null;
    if (!currentEntry) return [];
    return parseMemSlots(isPlayer1 ? currentEntry.playerMemSlots : currentEntry.cpuMemSlots);
  }, [isLiveMode, battleSession, activeStepIndex, battleLog, isPlayer1, hasLog, buildLiveMemSlots]);

  const opponentMemSlots = useMemo(() => {
    if (isLiveMode) {
      const liveSlots = isPlayer1 ? battleSession.player2Mem : battleSession.player1Mem;
      const currentEntry = battleSession.log[Math.min(activeStepIndex, battleSession.log.length - 1)];
      if (currentEntry) {
        const histStrings = isPlayer1 ? currentEntry.cpuMemSlots : currentEntry.playerMemSlots;
        return buildLiveMemSlots(liveSlots, histStrings);
      }
      return mapLiveMemSlots(liveSlots);
    }
    const currentEntry = hasLog ? battleLog[Math.min(activeStepIndex, battleLog.length - 1)] : null;
    if (!currentEntry) return [];
    return parseMemSlots(isPlayer1 ? currentEntry.cpuMemSlots : currentEntry.playerMemSlots);
  }, [isLiveMode, battleSession, activeStepIndex, battleLog, isPlayer1, hasLog, buildLiveMemSlots]);

  const myDeckCount = useMemo(() => {
    if (isLiveMode && isVisualizing && battleSession) {
      const currentEntry = battleSession.log[Math.min(activeStepIndex, battleSession.log.length - 1)];
      if (currentEntry) {
        return isPlayer1 ? currentEntry.playerDeckCount : currentEntry.cpuDeckCount;
      }
    }
    if (isLiveMode) {
      return isPlayer1 ? battleSession.player1Deck.length : battleSession.player2Deck.length;
    }
    const currentEntry = hasLog ? battleLog[Math.min(activeStepIndex, battleLog.length - 1)] : null;
    if (!currentEntry) return 0;
    return isPlayer1 ? currentEntry.playerDeckCount : currentEntry.cpuDeckCount;
  }, [isLiveMode, isVisualizing, battleSession, activeStepIndex, battleLog, hasLog, isPlayer1]);

  const opponentDeckCount = useMemo(() => {
    if (isLiveMode && isVisualizing && battleSession) {
      const currentEntry = battleSession.log[Math.min(activeStepIndex, battleSession.log.length - 1)];
      if (currentEntry) {
        return isPlayer1 ? currentEntry.cpuDeckCount : currentEntry.playerDeckCount;
      }
    }
    if (isLiveMode) {
      return isPlayer1 ? battleSession.player2Deck.length : battleSession.player1Deck.length;
    }
    const currentEntry = hasLog ? battleLog[Math.min(activeStepIndex, battleLog.length - 1)] : null;
    if (!currentEntry) return 0;
    return isPlayer1 ? currentEntry.cpuDeckCount : currentEntry.playerDeckCount;
  }, [isLiveMode, isVisualizing, battleSession, activeStepIndex, battleLog, isPlayer1, hasLog]);

  // Card Visuals: each player has their own stack of revealed cards.
  const buildMyStack = useMemo(() => buildPlayerStack({
    player: 'me', playerName, opponent,
    battleLog: activeLog, currentLogIndex: activeStepIndex, hasLog,
  }), [playerName, opponent, activeLog, activeStepIndex, hasLog]);

  const buildOppStack = useMemo(() => buildPlayerStack({
    player: 'opp', playerName, opponent,
    battleLog: activeLog, currentLogIndex: activeStepIndex, hasLog,
  }), [playerName, opponent, activeLog, activeStepIndex, hasLog]);

  const myStack = buildMyStack;
  const oppStack = buildOppStack;

  const activeChallengerPower = useMemo(() => {
    const currentEntry = hasLog && activeLog && activeLog[activeStepIndex];
    if (!currentEntry) return 0;
    // The challenger is whoever is NOT the current flag holder. Sum the
    // reconstructed challenger cards from the log so the displayed power is
    // in sync with the visualized log step (not the live backend total).
    const currentFlagHolder = currentEntry.flagHolder;
    if (currentFlagHolder === opponent) {
      return myStack.challengerCards.reduce((sum, card) => sum + (card.power || 0), 0);
    } else if (currentFlagHolder === playerName) {
      return oppStack.challengerCards.reduce((sum, card) => sum + (card.power || 0), 0);
    }
    // No flag holder yet — the player whose turn it is has revealed cards
    // that count as challenger power against flag power 0.
    return myStack.challengerCards.reduce((s, c) => s + (c.power || 0), 0) +
      oppStack.challengerCards.reduce((s, c) => s + (c.power || 0), 0);
  }, [hasLog, activeLog, activeStepIndex, opponent, playerName, myStack.challengerCards, oppStack.challengerCards]);

  // Draw turns status. During live visualization, derive the next-draw
  // indicator from the log being stepped through (consistent with the
  // visualized stack), not from the live session's TurnOwner/RequiredAction
  // (which reflect the final backend state, ahead of the animation).
  const isMyDrawTurn = useMemo(() => {
    if (isLiveMode && isVisualizing) {
      const nextEntry = (hasLog && activeStepIndex + 1 < activeLog.length) ? activeLog[activeStepIndex + 1] : null;
      return nextEntry ? nextEntry.player === playerName && nextEntry.action === 'reveal' : false;
    }
    if (isLiveMode) {
      return battleSession.turnOwner === playerName && battleSession.requiredAction === 'DRAW' && !battleSession.isFinished;
    }
    const nextEntry = (hasLog && currentLogIndex + 1 < battleLog.length) ? battleLog[currentLogIndex + 1] : null;
    return nextEntry ? nextEntry.player === playerName && nextEntry.action === 'reveal' : false;
  }, [isLiveMode, isVisualizing, battleSession, activeStepIndex, activeLog, hasLog, currentLogIndex, battleLog, playerName]);

  const isOpponentDrawTurn = useMemo(() => {
    if (isLiveMode && isVisualizing) {
      const nextEntry = (hasLog && activeStepIndex + 1 < activeLog.length) ? activeLog[activeStepIndex + 1] : null;
      return nextEntry ? nextEntry.player === opponent && nextEntry.action === 'reveal' : false;
    }
    if (isLiveMode) {
      return battleSession.turnOwner !== playerName && battleSession.requiredAction === 'DRAW' && !battleSession.isFinished;
    }
    const nextEntry = (hasLog && currentLogIndex + 1 < battleLog.length) ? battleLog[currentLogIndex + 1] : null;
    return nextEntry ? nextEntry.player === opponent && nextEntry.action === 'reveal' : false;
  }, [isLiveMode, isVisualizing, battleSession, activeStepIndex, activeLog, hasLog, currentLogIndex, battleLog, opponent, playerName]);

  const displayedLog = useMemo(() => {
    if (isLiveMode) return activeLog;
    return activeLog.slice(0, activeStepIndex + 1);
  }, [isLiveMode, activeLog, activeStepIndex]);

  const liveStatusMessage = useMemo(() => {
    if (!hasLog || activeLog.length === 0) return { text: t('initializingArenaLink'), color: 'text-cyber-text-dim' };
    const targetIdx = activeStepIndex;
    const entry = activeLog[targetIdx];
    if (!entry) return { text: t('initializingArenaLink'), color: 'text-cyber-text-dim' };

    const actionPlayer = entry.player;
    const isPlayer = actionPlayer === playerName;
    const pName = isPlayer ? t('statusYouLabel') : actionPlayer;
    const color = isPlayer ? 'text-neon-cyan text-glow-cyan' : 'text-neon-magenta text-glow-magenta';

    switch (entry.action) {
      case 'reveal':
        if (entry.card) {
          return {
            text: t('statusDrewCard', { name: pName, card: entry.card.name, power: entry.card.power }),
            color,
            card: entry.card,
          };
        }
        return { text: t('statusDrewCardGeneric', { name: pName }), color };
      case 'flag_change': {
        const winnerName = entry.flagHolder === playerName ? t('statusYouLabel') : entry.flagHolder;
        const winnerColor = entry.flagHolder === playerName ? 'text-neon-cyan text-glow-cyan' : 'text-neon-magenta text-glow-magenta';
        return {
          text: t('statusFlagTaken', { name: winnerName, power: entry.currentPower }),
          color: winnerColor + ' font-black scale-105',
        };
      }
      case 'memory_overflow':
        return {
          text: t('statusMemoryOverflow', { name: pName }),
          color: 'text-neon-red animate-pulse',
        };
      case 'deck_empty':
        return {
          text: t('statusDeckEmpty', { name: pName }),
          color: 'text-neon-red animate-pulse',
        };
      default:
        return {
          text: translateBattleDetail(entry.details || entry.action),
          color: 'text-cyber-text',
        };
    }
  }, [activeLog, activeStepIndex, hasLog, playerName, t, translateBattleDetail]);

  const isReplayFinished = isLiveMode ? battleSession.isFinished : (currentLogIndex >= battleLog.length - 1);
  // Flag power must be derived from the visualized log step, not the live
  // session total. The `currentPower` of a "reveal" entry is the challenger
  // power at that moment, NOT the flag power — so we walk backwards from
  // activeStepIndex to find the most recent flag marker and use its
  // `currentPower` (which is the flag power at that flag_change).
  const flagPowerValue = useMemo(() => {
    if (!hasLog || activeLog.length === 0) return 0;
    for (let i = activeStepIndex; i >= 0; i--) {
      const e = activeLog[i];
      if (!e) continue;
      if (isFlagMarker(e.action)) {
        return e.currentPower || 0;
      }
    }
    return 0;
  }, [hasLog, activeLog, activeStepIndex]);
  const challengerPower = activeChallengerPower;

  // Active Choice Config
  const showChoiceUI = isLiveMode && battleSession.requiredAction !== 'DRAW' && battleSession.pendingActionPlayer === playerName && !battleSession.isFinished;

  const choiceConfig = useMemo(() => {
    if (!showChoiceUI) return null;
    const action = battleSession.requiredAction;
    switch (action) {
      case 'CHOOSE_REPORTER':
        return {
          title: t('choiceTitleReporter'),
          instructions: t('choiceInstrReporter'),
          maxSelect: 1,
          minSelect: 1,
          isOptional: false,
        };
      case 'CHOOSE_JUGGLER':
      case 'CHOOSE_BUMPER_CAR':
        return {
          title: t('choiceTitleJuggler'),
          instructions: t('choiceInstrJuggler'),
          maxSelect: battleSession.actionOptions.length,
          minSelect: battleSession.actionOptions.length,
          isOptional: false,
        };
      case 'CHOOSE_SAILOR':
      case 'CHOOSE_PROPHET':
        return {
          title: t('choiceTitleSailor'),
          instructions: t('choiceInstrSailor'),
          maxSelect: 1,
          minSelect: 1,
          isOptional: false,
        };
      case 'CHOOSE_BUTLER':
      case 'CHOOSE_PUMPKIN':
        return {
          title: t('choiceTitleButler'),
          instructions: t('choiceInstrButler'),
          maxSelect: 2,
          minSelect: 0,
          isOptional: true,
        };
      case 'CHOOSE_MAGICIAN':
        return {
          title: t('choiceTitleMagician'),
          instructions: t('choiceInstrMagician'),
          maxSelect: 1,
          minSelect: 0,
          isOptional: true,
        };
      case 'CHOOSE_VAMPIRE':
        return {
          title: t('choiceTitleVampire'),
          instructions: t('choiceInstrVampire'),
          maxSelect: 1,
          minSelect: 0,
          isOptional: true,
        };
      case 'CHOOSE_MOVIESTAR':
        return {
          title: t('choiceTitleMoviestar'),
          instructions: t('choiceInstrMoviestar'),
          maxSelect: 2,
          minSelect: 0,
          isOptional: true,
        };
      case 'CHOOSE_SIREN':
        return {
          title: t('choiceTitleSiren'),
          instructions: t('choiceInstrSiren'),
          maxSelect: 1,
          minSelect: 0,
          isOptional: true,
        };
      default:
        return {
          title: t('choiceTitleGeneric'),
          instructions: t('choiceInstrGeneric'),
          maxSelect: 1,
          minSelect: 0,
          isOptional: true,
        };
    }
  }, [showChoiceUI, battleSession, t]);

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
      {/* Fullscreen impact flash overlays */}
      {flashState === 'cyan' && (
        <div className="fixed inset-0 animate-impact-flash-cyan pointer-events-none z-50" />
      )}
      {flashState === 'magenta' && (
        <div className="fixed inset-0 animate-impact-flash-magenta pointer-events-none z-50" />
      )}

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

          {/* Effect Alert sliding banner overlay */}
          {effectAlert && (
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-40 pointer-events-none flex items-center justify-center animate-slide-banner">
              <div className="w-full bg-black/85 border-y-2 border-neon-amber shadow-[0_0_25px_rgba(255,191,0,0.6)] py-3 px-6 flex items-center justify-center gap-3">
                <Zap className="text-neon-amber animate-pulse shrink-0" size={20} />
                <span className="text-sm md:text-base font-mono font-black text-neon-amber tracking-wider text-glow-amber text-center">
                  ⚡ {effectAlert} ⚡
                </span>
                <Zap className="text-neon-amber animate-pulse shrink-0" size={20} />
              </div>
            </div>
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
            {/* Top: Opponent Attack Power */}
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

            {/* Bottom: Player Attack Power */}
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
              <div className="text-neon-green text-glow-green text-[11px] font-bold font-mono tracking-widest uppercase border border-neon-green/30 bg-green-950/15 py-1.5 rounded animate-pulse">
                <span className="text-lg">🏁 {t('battleFinished')}</span>
                {(() => {
                  const lastEntry = activeLog.length > 0 ? activeLog[activeLog.length - 1] : null;
                  if (!lastEntry) return null;
                  const isWinner = lastEntry.flagHolder === playerName;
                  const isOppWinner = lastEntry.flagHolder === opponent;
                  if (!isWinner && !isOppWinner) return null;
                  const won = isWinner;
                  return (
                    <div className="mt-1">
                      <span className={`font-black ${won ? 'text-neon-green text-glow-green' : 'text-neon-red text-glow-red'}`}>
                        {won ? t('battleVictory') : t('battleDefeat')}
                      </span>
                      <span className="text-cyber-text-dim ml-2 text-[9px] font-normal">
                        {lastEntry.action === 'memory_overflow' && t('reasonMemoryOverflow')}
                        {lastEntry.action === 'deck_empty' && t('reasonDeckEmpty')}
                        {lastEntry.action !== 'memory_overflow' && lastEntry.action !== 'deck_empty' && t('reasonBattleComplete')}
                      </span>
                    </div>
                  );
                })()}
              </div>
            ) : isMyDrawTurn ? (
              <div className="text-neon-cyan text-glow-cyan text-[11px] font-bold font-mono tracking-widest uppercase border border-neon-cyan/30 bg-cyan-950/15 py-1.5 px-3 rounded animate-pulse">
                {!flagHolder ? (
                  <>&gt;&gt; {t('bannerDrawOwn')} &lt;&lt;</>
                ) : flagHolder === playerName ? (
                  <>&gt;&gt; {t('bannerDefend')} &lt;&lt;</>
                ) : (
                  <>&gt;&gt; {t('bannerChallenge')} &lt;&lt;</>
                )}
              </div>
            ) : isOpponentDrawTurn ? (
              <div className="text-neon-magenta text-glow-magenta text-[11px] font-bold font-mono tracking-widest uppercase border border-neon-magenta/30 bg-purple-950/15 py-1.5 px-3 rounded animate-pulse">
                {!flagHolder ? (
                  <>&gt;&gt; {t('bannerOppDraw', { opponent })} &lt;&lt;</>
                ) : flagHolder === opponent ? (
                  <>&gt;&gt; {t('bannerOppDefend', { opponent })} &lt;&lt;</>
                ) : (
                  <>&gt;&gt; {t('bannerOppChallenge', { opponent })} &lt;&lt;</>
                )}
              </div>
            ) : showChoiceUI ? (
              <div className="text-neon-magenta text-glow-magenta text-[11px] font-bold font-mono tracking-widest uppercase border border-neon-magenta/40 bg-purple-950/30 py-1 rounded animate-pulse">
                {t('effectChoicePending')}
              </div>
            ) : isLiveMode && battleSession.requiredAction !== 'DRAW' && battleSession.pendingActionPlayer !== playerName ? (
              <div className="text-neon-magenta text-glow-magenta text-[11px] font-bold font-mono tracking-widest uppercase border border-neon-magenta/20 bg-purple-950/10 py-1 rounded animate-pulse">
                {t('opponentEffectChoosing', { name: opponent })}
              </div>
            ) : (
              <div className="text-cyber-text-dim text-xs font-bold font-mono tracking-widest uppercase border border-cyber-border/20 bg-cyber-surface/10 py-1.5 rounded">
                {t('battleStep')} / {t('progressLabel')} {isLiveMode ? activeLog.length : currentLogIndex + 1}{isLiveMode ? '' : ` / ${battleLog.length}`}
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
                      ? t('drawBtnDrawOwn')
                      : flagHolder === playerName
                      ? t('drawBtnDefendWait')
                      : t('drawBtnChallenge')}
                  </span>
                ) : isOpponentDrawTurn ? (
                  <span>
                    {!flagHolder
                      ? t('drawBtnOppDraw', { name: opponent })
                      : flagHolder === opponent
                      ? t('drawBtnOppDefend', { name: opponent })
                      : t('drawBtnOppChallenge', { name: opponent })}
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
