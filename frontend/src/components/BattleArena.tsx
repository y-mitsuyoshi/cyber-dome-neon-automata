import { useState, useMemo, useEffect, useRef } from 'react';
import { Flag, User, Cpu, Play, Pause, RotateCcw, Layers, Shield, Activity, Zap } from 'lucide-react';
import type { BattleLogEntry, BattleSession, Card, BattleLogCard, LiveMemorySlot } from '../types/game';
import MemorySlots from './MemorySlots';
import DiscardPile from './DiscardPile';
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
  const [isAutoPlay, setIsAutoPlay] = useState<boolean>(false);
  const [playSpeed, setPlaySpeed] = useState<number>(1000); // ms per step
  const [flashState, setFlashState] = useState<'cyan' | 'magenta' | null>(null);

  // Interactive selection state
  const [selectedCards, setSelectedCards] = useState<string[]>([]);

  const latestLogEndRef = useRef<HTMLDivElement | null>(null);

  const isLiveMode = battleSession !== null;
  const hasLog = isLiveMode ? (battleSession.log.length > 0) : (battleLog && battleLog.length > 0);

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
  }, [currentLogIndex, battleSession?.log.length]);

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
  const activeLog = isLiveMode ? battleSession.log : battleLog;

  useEffect(() => {
    if (!hasLog || activeLog.length === 0) return;
    const targetIdx = isLiveMode ? activeLog.length - 1 : currentLogIndex;
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
  }, [currentLogIndex, activeLog, playerName, opponent, playSE, hasLog, isLiveMode, battleSession?.isFinished, battleLog.length]);

  // Helper to parse live slots into full card-name arrays (used for fallback display)
  const mapLiveMemSlots = (slots: LiveMemorySlot[] | { count: number; cardName: string }[]): string[][] => {
    if (!slots) return [];
    return slots.map(slot => Array(slot.count).fill(slot.cardName));
  };

  // Helper to parse historical string slots
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

  // Dual Board bindings (Dynamic depending on live vs historical mode)
  const isPlayer1 = useMemo(() => {
    if (!isLiveMode || !battleSession) return true;
    const p1 = (battleSession.player1Name || '').trim().toLowerCase();
    const cur = (playerName || '').trim().toLowerCase();
    return p1 === cur;
  }, [isLiveMode, battleSession, playerName]);

  // Live memory slots carry the full Card payload; historical mode only has names.
  const myLiveMemSlots: LiveMemorySlot[] | undefined = useMemo(() => {
    if (!isLiveMode || !battleSession) return undefined;
    return isPlayer1 ? battleSession.player1Mem : battleSession.player2Mem;
  }, [isLiveMode, battleSession, isPlayer1]);

  const opponentLiveMemSlots: LiveMemorySlot[] | undefined = useMemo(() => {
    if (!isLiveMode || !battleSession) return undefined;
    return isPlayer1 ? battleSession.player2Mem : battleSession.player1Mem;
  }, [isLiveMode, battleSession, isPlayer1]);

  // String-based slots for historical replay mode
  const myMemSlots = useMemo(() => {
    if (isLiveMode) return mapLiveMemSlots(isPlayer1 ? battleSession.player1Mem : battleSession.player2Mem);
    const currentEntry = hasLog ? battleLog[Math.min(currentLogIndex, battleLog.length - 1)] : null;
    if (!currentEntry) return [];
    return parseMemSlots(currentEntry.playerMemSlots);
  }, [isLiveMode, battleSession, currentLogIndex, battleLog, isPlayer1, hasLog]);

  const opponentMemSlots = useMemo(() => {
    if (isLiveMode) return mapLiveMemSlots(isPlayer1 ? battleSession.player2Mem : battleSession.player1Mem);
    const currentEntry = hasLog ? battleLog[Math.min(currentLogIndex, battleLog.length - 1)] : null;
    if (!currentEntry) return [];
    return parseMemSlots(currentEntry.cpuMemSlots);
  }, [isLiveMode, battleSession, currentLogIndex, battleLog, isPlayer1, hasLog]);

  // Discard (banish) piles — live mode only carries full card data.
  const myDiscard: Card[] = useMemo(() => {
    if (!isLiveMode || !battleSession) return [];
    return isPlayer1 ? battleSession.player1Discard : battleSession.player2Discard;
  }, [isLiveMode, battleSession, isPlayer1]);

  const opponentDiscard: Card[] = useMemo(() => {
    if (!isLiveMode || !battleSession) return [];
    return isPlayer1 ? battleSession.player2Discard : battleSession.player1Discard;
  }, [isLiveMode, battleSession, isPlayer1]);

  const myDeckCount = useMemo(() => {
    if (isLiveMode) {
      return isPlayer1 ? battleSession.player1Deck.length : battleSession.player2Deck.length;
    }
    const currentEntry = hasLog ? battleLog[Math.min(currentLogIndex, battleLog.length - 1)] : null;
    if (!currentEntry) return 0;
    const p1Name = battleLog.length > 0 ? battleLog[0].player : '';
    const isP1 = p1Name.trim().toLowerCase() === playerName.trim().toLowerCase();
    return isP1 ? currentEntry.playerDeckCount : currentEntry.cpuDeckCount;
  }, [isLiveMode, battleSession, currentLogIndex, battleLog, hasLog, playerName, isPlayer1]);

  const opponentDeckCount = useMemo(() => {
    if (isLiveMode) {
      return isPlayer1 ? battleSession.player2Deck.length : battleSession.player1Deck.length;
    }
    const currentEntry = hasLog ? battleLog[Math.min(currentLogIndex, battleLog.length - 1)] : null;
    if (!currentEntry) return 0;
    const p1Name = battleLog.length > 0 ? battleLog[0].player : '';
    const isP1 = p1Name.trim().toLowerCase() === playerName.trim().toLowerCase();
    return isP1 ? currentEntry.cpuDeckCount : currentEntry.playerDeckCount;
  }, [isLiveMode, battleSession, currentLogIndex, battleLog, isPlayer1, hasLog, playerName]);

  // Card Visuals (Defender flag card & Challenger clash cards)
  const currentFlagCard = useMemo(() => {
    if (isLiveMode) {
      return battleSession.flagHolder ? convertToFullCard(battleSession.activeCards[0]) : null;
    }
    // Playback logic
    if (!hasLog || currentLogIndex < 0) return null;
    let foundCard: BattleLogCard | Card | null = null;
    for (let i = currentLogIndex; i >= 0; i--) {
      const entry = battleLog[i];
      if (entry && entry.action === 'flag_change' && entry.card) {
        foundCard = entry.card;
        break;
      }
    }
    return foundCard ? convertToFullCard(foundCard) : null;
  }, [isLiveMode, battleSession, currentLogIndex, battleLog, hasLog]);

  const currentClashCards = useMemo(() => {
    if (isLiveMode) {
      const list = battleSession.flagHolder ? battleSession.activeCards.slice(1) : battleSession.activeCards;
      return list.map(c => convertToFullCard(c));
    }
    // Playback logic
    if (!hasLog || currentLogIndex < 0) return [];
    const cards: Card[] = [];
    for (let i = currentLogIndex; i >= 0; i--) {
      const entry = battleLog[i];
      if (!entry) continue;
      if (entry.action === 'flag_change') break;
      if (entry.action === 'reveal' && entry.player !== entry.flagHolder && entry.card) {
        cards.unshift(convertToFullCard(entry.card));
      }
    }
    return cards;
  }, [isLiveMode, battleSession, currentLogIndex, battleLog, hasLog]);

  // Draw turns status
  const isMyDrawTurn = useMemo(() => {
    if (isLiveMode) {
      return battleSession.turnOwner === playerName && battleSession.requiredAction === 'DRAW' && !battleSession.isFinished;
    }
    const currentEntry = hasLog ? battleLog[currentLogIndex] : null;
    return currentEntry ? currentEntry.player === playerName && currentEntry.action === 'reveal' : false;
  }, [isLiveMode, battleSession, currentLogIndex, battleLog, playerName, hasLog]);

  const isOpponentDrawTurn = useMemo(() => {
    if (isLiveMode) {
      return battleSession.turnOwner !== playerName && battleSession.requiredAction === 'DRAW' && !battleSession.isFinished;
    }
    const currentEntry = hasLog ? battleLog[currentLogIndex] : null;
    return currentEntry ? currentEntry.player === opponent && currentEntry.action === 'reveal' : false;
  }, [isLiveMode, battleSession, currentLogIndex, battleLog, opponent, hasLog, playerName]);

  const isReplayFinished = isLiveMode ? battleSession.isFinished : (currentLogIndex >= battleLog.length - 1);
  const flagHolderName = isLiveMode ? battleSession.flagHolder : (hasLog ? activeLog[currentLogIndex].flagHolder : 'None');
  const flagPowerValue = isLiveMode ? battleSession.flagPower : (hasLog ? activeLog[currentLogIndex].currentPower : 0);
  const challengerPower = isLiveMode ? battleSession.challengerPower : 0;

  // Latest log entry — used to surface the most recent played card & effect to the player.
  const latestEntry = useMemo(() => {
    if (!hasLog || activeLog.length === 0) return null;
    return activeLog[activeLog.length - 1];
  }, [hasLog, activeLog]);

  // Determine who played the latest card and whether it was "me" or the opponent.
  const latestPlayerIsMe = (latestEntry?.player || '') === playerName;
  const latestPlayerIsOpponent = !!latestEntry?.player && latestEntry.player === opponent;
  const latestHasEffect = !!(latestEntry?.effectTriggered && latestEntry.effectTriggered !== 'None' && latestEntry.effectTriggered !== '');
  const latestEffectText = latestHasEffect ? translateBattleDetail(latestEntry!.effectTriggered) : '';

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

  // Who is the current flag holder in human-readable form for the board layout.
  const flagIsMine = flagHolderName === playerName;
  const flagIsOpponent = flagHolderName === opponent;

  // Challenger stack ownership — whose cards are stacked in the challenger zone.
  const challengerOwnerIsMe = currentClashCards.length > 0 && latestPlayerIsMe;
  const challengerOwnerIsOpponent = currentClashCards.length > 0 && latestPlayerIsOpponent;

  // How many challenger cards are still needed to surpass the defender's power.
  // Show this as an explicit "still need X power" hint.
  const remainingPowerNeeded = useMemo(() => {
    if (!currentFlagCard || currentClashCards.length === 0) return null;
    return Math.max(0, flagPowerValue - challengerPower + 1);
  }, [currentFlagCard, currentClashCards, flagPowerValue, challengerPower]);

  const speedOptions = [
    { label: '0.5x', value: 1600 },
    { label: '1.0x', value: 1000 },
    { label: '2.0x', value: 500 },
    { label: '4.0x', value: 200 },
  ];

  // Helper: determines if the challenger stack has just surged past the defender
  // — drives the "CLASH!" impact animation.
  const [clashImpact, setClashImpact] = useState(false);
  useEffect(() => {
    if (challengerPower > 0 && flagPowerValue > 0 && challengerPower >= flagPowerValue && currentClashCards.length > 0) {
      setClashImpact(true);
      const t = setTimeout(() => setClashImpact(false), 700);
      return () => clearTimeout(t);
    }
  }, [challengerPower, flagPowerValue, currentClashCards.length]);

  return (
    <div className="min-h-screen bg-cyber-dark relative overflow-hidden flex flex-col p-3 select-none">
      {/* Background gradients */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 8%, rgba(255,0,255,0.06) 0%, transparent 55%), radial-gradient(ellipse at 50% 92%, rgba(0,240,255,0.06) 0%, transparent 55%)',
        }}
      />
      <div className="absolute inset-0 cyber-grid pointer-events-none" />

      {/* Full-board flash overlay for flag capture events */}
      {flashState && (
        <div
          className={`absolute inset-0 pointer-events-none z-50 animate-fade-in ${flashState === 'cyan' ? 'bg-neon-cyan/10' : 'bg-neon-magenta/10'}`}
          style={{ animationDuration: '120ms' }}
        />
      )}

      {/* ================= 1. HEADER ================= */}
      <div className="relative z-10 max-w-7xl mx-auto w-full text-center">
        <h2 className="text-lg font-black tracking-[0.3em] uppercase text-neon-magenta text-glow-magenta font-mono animate-slide-in">
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

      {/* ================= 2. BOARD — VERTICAL SPLIT ================= */}
      {/* Top half = Opponent, Bottom half = Player. Center divider = Flag/Clash arena. */}
      <div className="relative z-10 max-w-6xl mx-auto w-full flex-1 flex flex-col gap-2 my-2 min-h-[640px]">

        {/* ===== OPPONENT ZONE (TOP) ===== */}
        <div className={`relative border rounded-xl p-3 transition-all ${
          flagIsOpponent ? 'border-neon-magenta/60 shadow-[0_0_20px_rgba(255,0,255,0.15)] bg-neon-magenta/5' :
          challengerOwnerIsOpponent ? 'border-neon-magenta/40 bg-neon-magenta/5' :
          'border-cyber-border/30 bg-cyber-surface/20'
        }`}>
          <div className="flex items-center gap-2 mb-2 font-mono">
            <Cpu size={14} className="text-neon-magenta" />
            <span className="text-neon-magenta font-bold text-xs uppercase tracking-widest">{opponent}</span>
            {flagIsOpponent && (
              <span className="ml-auto flex items-center gap-1 text-[10px] text-neon-magenta font-bold bg-neon-magenta/15 border border-neon-magenta/40 px-2 py-0.5 rounded">
                <Flag size={10} className="animate-pulse" /> FLAG HOLDER / 支配中
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_1fr] gap-3 items-start">
            {/* Opponent bench (memory) */}
            <div className="order-2 md:order-1">
              <MemorySlots
                liveSlots={opponentLiveMemSlots}
                slots={opponentMemSlots}
                label={t('npcMemoryLabel', { opponent })}
                side="left"
                accent="magenta"
              />
            </div>

            {/* Opponent mini-stats */}
            <div className="order-1 md:order-2 flex md:flex-col gap-2 justify-center">
              <div className="border border-neon-magenta/30 rounded p-2 bg-cyber-surface/30 text-center flex-1 md:flex-none">
                <div className="text-[8px] text-cyber-text-dim uppercase tracking-wider">{t('deckLabel') || 'DECK'}</div>
                <div className="text-sm font-bold text-neon-magenta">{opponentDeckCount}</div>
              </div>
              <div className="border border-cyber-border/30 rounded p-2 bg-cyber-surface/30 text-center flex-1 md:flex-none">
                <div className="text-[8px] text-cyber-text-dim uppercase tracking-wider">DISCARD</div>
                <div className="text-sm font-bold text-cyber-text-dim">{opponentDiscard.length}</div>
              </div>
            </div>

            {/* Opponent discard */}
            <div className="order-3">
              <DiscardPile
                cards={opponentDiscard}
                label={t('opponentDiscard', { opponent })}
                side="left"
                accent="magenta"
              />
            </div>
          </div>
        </div>

        {/* ===== CENTER FLAG / CLASH ARENA ===== */}
        <div className="relative border-2 border-cyber-border/40 rounded-xl bg-cyber-darker/60 backdrop-blur-sm p-3 overflow-hidden min-h-[260px]">
          {/* Clash impact overlay */}
          {clashImpact && (
            <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
              <div className="text-neon-red text-glow-red font-black text-3xl tracking-widest animate-clash-impact font-mono">
                CLASH!
              </div>
              <div className="absolute inset-0 border-2 border-neon-red rounded-xl animate-fade-in" style={{ animationDuration: '150ms' }} />
            </div>
          )}

          {/* Step / status line */}
          <div className="flex items-center justify-between mb-2 font-mono text-[10px]">
            <span className="text-cyber-text-dim uppercase tracking-widest">
              {t('battleStep')} / 進捗: {isLiveMode ? activeLog.length : currentLogIndex + 1}{isLiveMode ? '' : ` / ${battleLog.length}`}
            </span>
            {isReplayFinished ? (
              <span className="text-neon-green font-bold uppercase">RESOLVED / 決着</span>
            ) : isMyDrawTurn ? (
              <span className="text-neon-cyan font-bold uppercase animate-pulse">&gt;&gt; あなたのめくり番 &lt;&lt;</span>
            ) : isOpponentDrawTurn ? (
              <span className="text-neon-magenta font-bold uppercase animate-pulse">&gt;&gt; 相手のめくり番 &lt;&lt;</span>
            ) : showChoiceUI ? (
              <span className="text-neon-magenta font-bold uppercase animate-pulse">⚡ 効果選択中 ⚡</span>
            ) : (
              <span className="text-cyber-text-dim uppercase">STANDBY / 同調中</span>
            )}
          </div>

          {/* Defender + Challenger arrangement:
              Defender on the LEFT (or top on mobile), challenger stack on the RIGHT.
              This makes the "stack attacking the flag" relationship visually obvious. */}
          <div className="flex flex-col md:flex-row items-stretch gap-3">

            {/* DEFENDER (FLAG) SIDE */}
            <div className={`flex-1 border rounded-lg p-3 flex flex-col items-center justify-center transition-all ${
              flagIsMine ? 'border-neon-cyan/50 bg-neon-cyan/5 shadow-[0_0_12px_rgba(0,240,255,0.12)]' :
              flagIsOpponent ? 'border-neon-magenta/50 bg-neon-magenta/5 shadow-[0_0_12px_rgba(255,0,255,0.12)]' :
              'border-cyber-border/30 bg-cyber-surface/10'
            }`}>
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded border text-[10px] font-mono font-bold mb-2 ${
                flagIsMine ? 'border-neon-cyan text-neon-cyan bg-cyan-950/20' :
                flagIsOpponent ? 'border-neon-magenta text-neon-magenta bg-purple-950/20' :
                'border-cyber-border text-cyber-text-dim bg-cyber-dark/50'
              }`}>
                <Flag size={11} className={flagIsMine || flagIsOpponent ? 'animate-pulse' : ''} />
                <span className="uppercase">
                  {flagIsMine ? (t('defendingYou') || 'あなたが支配中') :
                   flagIsOpponent ? (t('defendingOpponent') || `${opponent} が支配中`) :
                   (t('flagUnclaimed') || 'フラグなし')}
                </span>
                {flagPowerValue > 0 && <span className="ml-2 font-black border-l border-cyber-border/40 pl-2 text-white">{flagPowerValue} POW</span>}
              </div>

              <div className="flex items-center justify-center min-h-[140px]">
                {currentFlagCard ? (
                  <div key={currentFlagCard.id + '_' + currentFlagCard.power} className="transform scale-90 animate-card-reveal shadow-[0_0_20px_rgba(0,240,255,0.25)]">
                    <CardDisplay card={currentFlagCard} disabled />
                  </div>
                ) : (
                  <div className="text-[10px] text-cyber-text-dim/40 border border-dashed border-cyber-border/30 rounded p-6 font-mono text-center">
                    {t('noDefender') || '支配中のプログラムなし'}
                  </div>
                )}
              </div>
            </div>

            {/* CHALLENGER STACK SIDE */}
            <div className={`flex-1 border rounded-lg p-3 flex flex-col items-center justify-center transition-all relative ${
              challengerOwnerIsMe ? 'border-neon-cyan/50 bg-neon-cyan/5 shadow-[0_0_12px_rgba(0,240,255,0.12)]' :
              challengerOwnerIsOpponent ? 'border-neon-magenta/50 bg-neon-magenta/5 shadow-[0_0_12px_rgba(255,0,255,0.12)]' :
              'border-cyber-border/30 bg-cyber-surface/10'
            }`}>
              <div className="flex items-center gap-2 mb-2 text-[10px] font-mono flex-wrap justify-center">
                <span className="text-cyber-text-dim uppercase tracking-widest">
                  {t('challengerZone') || '挑戦者スタック'}
                </span>
                {challengerPower > 0 && (
                  <span className="text-neon-green font-black px-1.5 border border-neon-green/35 rounded bg-green-950/20">
                    {t('totalPower') || '計'} {challengerPower} POW
                  </span>
                )}
                {challengerOwnerIsMe && (
                  <span className="px-1.5 py-0.5 rounded border text-[9px] font-bold border-neon-cyan/40 text-neon-cyan bg-cyan-950/20">
                    {t('playedByYou') || '▶ あなた'}
                  </span>
                )}
                {challengerOwnerIsOpponent && (
                  <span className="px-1.5 py-0.5 rounded border text-[9px] font-bold border-neon-magenta/40 text-neon-magenta bg-purple-950/20">
                    {t('playedByOpponent', { opponent }) || `▶ ${opponent}`}
                  </span>
                )}
              </div>

              {/* "Still need" hint — surfaces how much more power is required to capture the flag. */}
              {remainingPowerNeeded !== null && remainingPowerNeeded > 0 && (
                <div className="mb-2 text-[10px] font-mono px-2 py-1 rounded border border-neon-amber/50 bg-amber-950/20 text-neon-amber animate-pulse">
                  あと <span className="font-black text-glow-amber">{remainingPowerNeeded}</span> POW で制圧
                </div>
              )}
              {remainingPowerNeeded === 0 && challengerPower > 0 && (
                <div className="mb-2 text-[10px] font-mono px-2 py-1 rounded border border-neon-green/50 bg-green-950/20 text-neon-green animate-pulse font-bold">
                  制圧成功 — 次の解決でフラッグ獲得！
                </div>
              )}

              {/* CHALLENGERS-STYLE FANNED CARD STACK
                  Cards overlap horizontally with a slight vertical stagger and rotation,
                  so each card's top-left corner (name + power) stays visible. The latest
                  card sits on top, fully visible. */}
              <div className="flex items-center justify-center min-h-[160px] w-full relative">
                {currentClashCards.length > 0 ? (
                  <div className="relative flex items-center justify-center" style={{ minHeight: 160, minWidth: Math.max(220, 100 + currentClashCards.length * 38) }}>
                    {currentClashCards.map((cCard, idx) => {
                      const isLatest = idx === currentClashCards.length - 1;
                      // Fan out: each older card shifted left, slight rotation & vertical offset.
                      const xOffset = (idx - (currentClashCards.length - 1)) * 38;
                      const yOffset = isLatest ? 0 : -((currentClashCards.length - 1 - idx) * 6);
                      const rotation = (idx - (currentClashCards.length - 1)) * 4;
                      return (
                        <div
                          key={cCard.id + '_' + idx}
                          className="absolute transition-all duration-300 animate-card-reveal"
                          style={{
                            left: `calc(50% - 96px + ${xOffset}px)`,
                            top: `calc(50% - 80px + ${yOffset}px)`,
                            transform: `scale(${isLatest ? 0.92 : 0.7}) rotate(${rotation}deg)`,
                            transformOrigin: 'bottom right',
                            zIndex: isLatest ? 20 : idx + 1,
                            opacity: isLatest ? 1 : 0.8,
                          }}
                        >
                          {isLatest && (
                            <div className="absolute inset-0 rounded-lg shadow-[0_0_18px_rgba(0,240,255,0.35)] pointer-events-none animate-fade-in" />
                          )}
                          <CardDisplay card={cCard} disabled />
                        </div>
                      );
                    })}
                    {/* Stack count badge */}
                    {currentClashCards.length > 1 && (
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-30 min-w-[20px] h-5 px-2 rounded-full bg-neon-magenta text-[10px] font-black text-white flex items-center justify-center border border-white/20 animate-pulse"
                        style={{ boxShadow: '0 0 10px rgba(255,0,255,0.7)' }}>
                        x{currentClashCards.length}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-[10px] text-cyber-text-dim/40 border border-dashed border-cyber-border/30 rounded p-6 font-mono text-center w-full">
                    {t('awaitingDraw') || 'ドロー待機中'}
                  </div>
                )}
              </div>

              {/* Latest effect banner */}
              {latestHasEffect && (
                <div className={`mt-2 w-full max-w-md mx-auto px-3 py-1.5 rounded border text-[10px] font-mono leading-relaxed animate-fade-in ${
                  latestPlayerIsMe ? 'border-neon-cyan/40 bg-cyan-950/15 text-neon-cyan text-glow-cyan' :
                  'border-neon-magenta/40 bg-purple-950/15 text-neon-magenta text-glow-magenta'
                }`}>
                  <div className="flex items-start gap-2">
                    <Zap size={11} className="mt-0.5 flex-shrink-0 animate-pulse" />
                    <div>
                      <div className="uppercase tracking-widest text-[9px] font-bold mb-0.5 opacity-80">
                        {t('effectTriggered') || '効果発動'}
                      </div>
                      <div className="text-cyber-text font-semibold">{latestEffectText}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action resolution status */}
          <div className="w-full mt-2 px-3 py-1.5 border border-cyber-border/10 rounded bg-cyber-dark/40 text-center">
            <p className="text-[10px] font-mono text-cyber-text leading-relaxed">
              {activeLog.length > 0
                ? translateBattleDetail(activeLog[activeLog.length - 1].details)
                : (t('initializingArenaLink') || 'INITIALIZING ARENA LINK...')}
              {activeLog.length > 0 && activeLog[activeLog.length - 1].effectTriggered && activeLog[activeLog.length - 1].effectTriggered !== 'None' && activeLog[activeLog.length - 1].effectTriggered !== '' && (
                <span className="text-neon-green block font-bold mt-1 text-[9px] animate-pulse">
                  ⚡ {translateBattleDetail(activeLog[activeLog.length - 1].effectTriggered)}
                </span>
              )}
            </p>
          </div>

          {/* Interactive choice overlay */}
          {showChoiceUI && choiceConfig && (
            <div className="absolute inset-0 z-40 bg-cyber-darker/95 backdrop-blur-md flex flex-col items-center justify-center p-4 border-2 border-neon-magenta/40 rounded-xl animate-fade-in">
              <div className="text-neon-magenta text-glow-magenta font-black tracking-widest text-xs uppercase mb-1 animate-pulse">
                ⚡ {choiceConfig.title} ⚡
              </div>
              <p className="text-[10px] text-cyber-text-dim uppercase tracking-wider mb-3 text-center max-w-sm">
                {choiceConfig.instructions}
              </p>
              <div className="flex gap-3 flex-wrap justify-center my-2 overflow-y-auto max-h-[180px] p-2">
                {battleSession.actionOptions.map((optCard) => {
                  const fullCard = convertToFullCard(optCard);
                  const isSelected = selectedCards.includes(optCard.id);
                  const selectIdx = selectedCards.indexOf(optCard.id);
                  return (
                    <div
                      key={optCard.id}
                      onClick={() => handleSelectCard(optCard.id)}
                      className={`relative cursor-pointer transition-all duration-150 transform hover:scale-105 active:scale-95 ${
                        isSelected ? 'ring-2 ring-neon-magenta scale-102 opacity-100 z-10' : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      <CardDisplay card={fullCard} disabled={false} />
                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-neon-magenta text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-lg border border-white/20">
                          {selectIdx + 1}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3 mt-2">
                <button
                  onClick={handleConfirmChoice}
                  disabled={!isSelectionValid}
                  className="px-5 py-1.5 border-2 border-neon-magenta text-neon-magenta font-bold uppercase tracking-widest rounded bg-purple-950/20 hover:bg-purple-950/40 text-[10px] shadow-[0_0_10px_rgba(255,0,255,0.2)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {t('confirmChoice') || 'CONFIRM / 確定'}
                </button>
                {choiceConfig.isOptional && (
                  <button
                    onClick={handleSkipChoice}
                    className="px-5 py-1.5 border border-cyber-border text-cyber-text-dim hover:text-white hover:border-white uppercase tracking-wider rounded bg-cyber-surface/10 hover:bg-cyber-surface/30 text-[10px] cursor-pointer"
                  >
                    {t('skipChoice') || 'SKIP / スキップ'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ===== PLAYER ZONE (BOTTOM) ===== */}
        <div className={`relative border rounded-xl p-3 transition-all ${
          flagIsMine ? 'border-neon-cyan/60 shadow-[0_0_20px_rgba(0,240,255,0.15)] bg-neon-cyan/5' :
          challengerOwnerIsMe ? 'border-neon-cyan/40 bg-neon-cyan/5' :
          'border-cyber-border/30 bg-cyber-surface/20'
        }`}>
          <div className="flex items-center gap-2 mb-2 font-mono">
            <User size={14} className="text-neon-cyan" />
            <span className="text-neon-cyan font-bold text-xs uppercase tracking-widest">{playerName}</span>
            {flagIsMine && (
              <span className="ml-auto flex items-center gap-1 text-[10px] text-neon-cyan font-bold bg-neon-cyan/15 border border-neon-cyan/40 px-2 py-0.5 rounded">
                <Flag size={10} className="animate-pulse" /> FLAG HOLDER / 支配中
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_1fr] gap-3 items-start">
            {/* Player bench (memory) */}
            <div className="order-2 md:order-1">
              <MemorySlots
                liveSlots={myLiveMemSlots}
                slots={myMemSlots}
                label={t('yourMemory')}
                side="left"
                accent="cyan"
              />
            </div>

            {/* Player mini-stats + actions */}
            <div className="order-1 md:order-2 flex md:flex-col gap-2 justify-center">
              <div className="border border-neon-cyan/30 rounded p-2 bg-cyber-surface/30 text-center flex-1 md:flex-none">
                <div className="text-[8px] text-cyber-text-dim uppercase tracking-wider">{t('deckLabel') || 'DECK'}</div>
                <div className="text-sm font-bold text-neon-cyan">{myDeckCount}</div>
              </div>
              <div className="border border-cyber-border/30 rounded p-2 bg-cyber-surface/30 text-center flex-1 md:flex-none">
                <div className="text-[8px] text-cyber-text-dim uppercase tracking-wider">DISCARD</div>
                <div className="text-sm font-bold text-cyber-text-dim">{myDiscard.length}</div>
              </div>
              <button
                onClick={() => setShowDeckModal(true)}
                className="flex items-center justify-center gap-1 border border-neon-cyan/45 hover:border-neon-cyan rounded p-1.5 bg-cyber-surface/30 text-neon-cyan font-bold hover:bg-neon-cyan/10 transition-all text-[9px] cursor-pointer uppercase tracking-wider font-mono"
              >
                <Layers size={12} className="text-neon-cyan" />
                {t('viewDeckBtn')}
              </button>
            </div>

            {/* Player discard */}
            <div className="order-3">
              <DiscardPile
                cards={myDiscard}
                label={t('yourDiscard') || 'YOUR DISCARD / 除外エリア'}
                side="left"
                accent="cyan"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ================= 3. DRAW BUTTON ================= */}
      <div className="relative z-10 max-w-3xl mx-auto w-full flex flex-col items-center gap-2 mb-2">
        {!isReplayFinished ? (
          <button
            disabled={isLiveMode && (battleSession.requiredAction !== 'DRAW' || (battleSession.turnOwner === opponent && !opponentIsNPC))}
            onClick={() => {
              playSE('click');
              if (isLiveMode) {
                onStep();
              } else {
                setCurrentLogIndex((prev) => Math.min(prev + 1, battleLog.length - 1));
              }
            }}
            className={`w-full max-w-xs py-2.5 px-5 rounded border-2 font-mono font-bold text-xs uppercase tracking-widest cursor-pointer transition-all duration-150 transform active:scale-95 shadow-md flex items-center justify-center gap-2 ${
              isMyDrawTurn ? 'border-neon-cyan text-neon-cyan bg-cyan-950/20 hover:bg-cyan-950/40 text-glow-cyan shadow-[0_0_15px_rgba(0,240,255,0.2)] animate-pulse' :
              isOpponentDrawTurn ? 'border-neon-magenta text-neon-magenta bg-purple-950/20 hover:bg-purple-950/40 text-glow-magenta shadow-[0_0_15px_rgba(255,0,255,0.2)]' :
              'border-cyber-border text-cyber-text bg-cyber-surface/30 hover:bg-cyber-surface/50 font-medium disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
          >
            <Play size={14} className={isMyDrawTurn ? 'animate-bounce' : ''} />
            {isMyDrawTurn ? (t('drawNextCard') || 'カードをめくる') :
             isOpponentDrawTurn ? (t('opponentDrawNext') || '相手のカードをめくる') :
             (t('nextStep') || '次へ')}
          </button>
        ) : (
          <button
            onClick={onComplete}
            className="w-full max-w-xs py-2.5 px-5 rounded border-2 border-neon-green text-neon-green bg-green-950/20 hover:bg-green-950/40 text-glow-green font-bold text-xs uppercase tracking-widest cursor-pointer transition-all duration-150 transform active:scale-95 shadow-[0_0_15px_rgba(0,255,102,0.25)] animate-pulse"
          >
            {t('continueToStandings') || 'リザルト確認 →'}
          </button>
        )}
      </div>

      {/* ================= 4. REPLAY / SPEED CONTROLS ================= */}
      <div className="relative z-10 max-w-3xl mx-auto w-full border border-cyber-border/30 rounded-lg p-2.5 bg-cyber-darker/90 backdrop-blur-md mb-2 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAutoPlay(!isAutoPlay)}
            disabled={isReplayFinished || (isLiveMode && battleSession.requiredAction !== 'DRAW')}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider cursor-pointer border transition-all ${
              isReplayFinished || (isLiveMode && battleSession.requiredAction !== 'DRAW')
                ? 'border-cyber-border/35 text-cyber-text-dim cursor-not-allowed opacity-50'
                : isAutoPlay ? 'border-neon-magenta text-neon-magenta hover:bg-neon-magenta/10 shadow-[0_0_8px_rgba(255,0,255,0.1)] animate-pulse' :
                'border-neon-green text-neon-green hover:bg-neon-green/10 shadow-[0_0_8px_rgba(0,255,0,0.1)]'
            }`}
          >
            {isAutoPlay ? <Pause size={12} /> : <Play size={12} />}
            {isAutoPlay ? 'PAUSE / 停止' : 'AUTO / オート'}
          </button>

          {!isLiveMode && (
            <>
              <button
                onClick={() => { playSE('click'); setCurrentLogIndex((prev) => Math.min(prev + 1, battleLog.length - 1)); setIsAutoPlay(false); }}
                disabled={isReplayFinished}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider cursor-pointer border border-neon-cyan text-neon-cyan hover:bg-neon-cyan/10 transition-all"
              >
                <Play size={12} />
                {t('nextStepBtnTitle') || 'DRAW / めくる'}
              </button>
              <button
                onClick={() => { playSE('shuffle'); setCurrentLogIndex(0); setIsAutoPlay(false); lastPlayedIndexRef.current = -1; }}
                className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded text-[10px] border border-cyber-border/50 text-cyber-text-dim hover:text-white hover:border-cyber-border transition-all cursor-pointer"
              >
                <RotateCcw size={12} />
                {t('resetBtnTitle') || 'RESTART / 最初から'}
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[10px]">
          <span className="text-cyber-text-dim">SPEED:</span>
          {speedOptions.map((s) => (
            <button
              key={s.label}
              onClick={() => { playSE('click'); setPlaySpeed(s.value); }}
              className={`px-1.5 py-0.5 border rounded cursor-pointer transition-all ${
                playSpeed === s.value ? 'border-neon-cyan text-neon-cyan bg-neon-cyan/5 font-bold shadow-[0_0_6px_rgba(0,240,255,0.15)]' : 'border-cyber-border/30 text-cyber-text-dim hover:text-white'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div>
          {isReplayFinished ? (
            <button
              onClick={onComplete}
              className="px-5 py-2 rounded border-2 border-neon-green text-neon-green text-glow-green font-bold text-[10px] uppercase tracking-widest hover:bg-neon-green/10 transition-all cursor-pointer shadow-[0_0_12px_rgba(0,255,102,0.2)] animate-pulse"
            >
              {t('continueBtn') || 'STANDINGS →'}
            </button>
          ) : !isLiveMode ? (
            <button
              onClick={() => { playSE('click'); setCurrentLogIndex(battleLog.length - 1); setIsAutoPlay(false); }}
              className="px-4 py-2 rounded border border-cyber-border/40 text-cyber-text-dim text-[10px] uppercase tracking-wider hover:text-white hover:border-cyber-border transition-all cursor-pointer"
            >
              {t('skipSim') || 'SKIP / 結末へ'}
            </button>
          ) : null}
        </div>
      </div>

      {/* ================= 5. EVENT LOG ================= */}
      <div className="relative z-10 max-w-4xl mx-auto w-full border border-cyber-border/30 rounded-lg p-2.5 bg-cyber-surface/50 max-h-28 overflow-y-auto font-mono text-[10px] shadow-inner">
        <div className="flex items-center gap-2 mb-1.5 border-b border-cyber-border/20 pb-1">
          <Activity size={12} className="text-neon-green" />
          <span className="text-[9px] text-neon-green uppercase tracking-widest font-bold">
            {t('combatLogHeader')} / 実況ログ
          </span>
          <span className="text-[9px] text-cyber-text-dim ml-auto">{activeLog.length} events</span>
        </div>
        <div className="flex flex-col gap-0.5">
          {activeLog.map((log, i) => {
            const displayLogAction = translateBattleDetail(log.details || log.action);
            const displayLogEffect = log.effectTriggered ? translateBattleDetail(log.effectTriggered) : '';
            const isPlayer = log.player === playerName;
            const isSystem = !log.player || log.player === 'SYSTEM';
            return (
              <div
                key={i}
                className={`flex items-start gap-2 py-0.5 px-1.5 rounded transition-all duration-300 ${
                  i === activeLog.length - 1 ? 'bg-cyber-surface/40 border border-cyber-border/10 animate-slide-in' : ''
                }`}
              >
                <div className={`mt-0.5 min-w-[14px] ${isSystem ? 'text-neon-green' : isPlayer ? 'text-neon-cyan' : 'text-neon-magenta'}`}>
                  {isSystem ? <Shield size={10} /> : <User size={10} />}
                </div>
                <div className="flex-1">
                  <span className={`font-bold ${isSystem ? 'text-neon-green' : isPlayer ? 'text-neon-cyan' : 'text-neon-magenta'}`}>
                    {isSystem ? '[SYS]' : `[${log.player}]`}
                  </span>{' '}
                  <span className={i === activeLog.length - 1 ? 'text-cyber-text font-semibold' : 'text-cyber-text-dim/70'}>
                    {displayLogAction}
                  </span>
                  {log.effectTriggered && log.effectTriggered !== 'None' && log.effectTriggered !== '' && (
                    <span className="text-neon-green ml-1.5 inline-flex items-center gap-1 font-bold animate-pulse">
                      ⚡ {displayLogEffect}
                    </span>
                  )}
                </div>
                <span className="text-[9px] text-cyber-text-dim/40 whitespace-nowrap">Step {log.step}</span>
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
