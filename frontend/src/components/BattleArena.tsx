import { useState, useMemo, useEffect, useRef } from 'react';
import { Flag, User, Cpu, Play, Pause, RotateCcw, Layers, Shield, Activity } from 'lucide-react';
import type { BattleLogEntry, BattleSession, Card, BattleLogCard } from '../types/game';
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

  // Helper to parse live slots
  const mapLiveMemSlots = (slots: { count: number; cardName: string }[]): string[][] => {
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

  const myMemSlots = useMemo(() => {
    if (isLiveMode) {
      return mapLiveMemSlots(isPlayer1 ? battleSession.player1Mem : battleSession.player2Mem);
    }
    const currentEntry = hasLog ? battleLog[Math.min(currentLogIndex, battleLog.length - 1)] : null;
    if (!currentEntry) return [];
    return parseMemSlots(currentEntry.playerMemSlots);
  }, [isLiveMode, battleSession, currentLogIndex, battleLog, isPlayer1, hasLog]);

  const opponentMemSlots = useMemo(() => {
    if (isLiveMode) {
      return mapLiveMemSlots(isPlayer1 ? battleSession.player2Mem : battleSession.player1Mem);
    }
    const currentEntry = hasLog ? battleLog[Math.min(currentLogIndex, battleLog.length - 1)] : null;
    if (!currentEntry) return [];
    return parseMemSlots(currentEntry.cpuMemSlots);
  }, [isLiveMode, battleSession, currentLogIndex, battleLog, isPlayer1, hasLog]);

  const mySlotCards = useMemo(() => {
    if (!isLiveMode || !battleSession) return undefined;
    const mem = isPlayer1 ? battleSession.player1Mem : battleSession.player2Mem;
    return mem.map(slot => slot.cards);
  }, [isLiveMode, battleSession, isPlayer1]);

  const opponentSlotCards = useMemo(() => {
    if (!isLiveMode || !battleSession) return undefined;
    const mem = isPlayer1 ? battleSession.player2Mem : battleSession.player1Mem;
    return mem.map(slot => slot.cards);
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

  return (
    <div className="min-h-screen bg-cyber-dark relative overflow-hidden flex flex-col justify-between p-4 select-none">
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
      <div className="relative z-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-[240px_1fr_240px] gap-6 items-center my-4 flex-1">
        
        {/* Left Col: Local Player State */}
        <div className="font-mono flex flex-col gap-3 self-start order-2 lg:order-1">
          <MemorySlots
            slots={myMemSlots}
            cards={mySlotCards}
            label={t('yourMemory')}
            side="left"
            onCardClick={showChoiceUI ? (card) => handleSelectCard(card.id) : undefined}
          />
          <div className="border border-cyber-border/30 rounded p-2.5 bg-cyber-surface/30 flex justify-between items-center">
            <div>
              <div className="text-[9px] text-cyber-text-dim uppercase tracking-wider">{t('deckLabel') || 'DECK MODULES'}</div>
              <div className="text-sm font-bold text-neon-cyan">{myDeckCount} {t('units') || 'Units'}</div>
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
        <div className="flex flex-col items-center justify-between min-h-[460px] border border-cyber-border/20 rounded-xl bg-cyber-surface/10 backdrop-blur-sm p-6 relative order-1 lg:order-2 overflow-hidden">
          
          {/* Symmetrical Flash Overlays */}
          {flashState === 'cyan' && (
            <div className="absolute inset-0 bg-neon-cyan/20 border border-neon-cyan shadow-[inset_0_0_40px_rgba(0,240,255,0.3)] rounded-xl pointer-events-none z-30 animate-fade-in" style={{ animationDuration: '100ms' }} />
          )}
          {flashState === 'magenta' && (
            <div className="absolute inset-0 bg-neon-magenta/20 border border-neon-magenta shadow-[inset_0_0_40px_rgba(255,0,255,0.3)] rounded-xl pointer-events-none z-30 animate-fade-in" style={{ animationDuration: '100ms' }} />
          )}

          {/* Interactive Choice Overlay Panel */}
          {showChoiceUI && choiceConfig && (
            <div className="absolute inset-0 z-40 bg-cyber-darker/95 backdrop-blur-md flex flex-col items-center justify-center p-6 border-2 border-neon-magenta/40 rounded-xl animate-fade-in">
              <div className="text-neon-magenta text-glow-magenta font-black tracking-widest text-xs uppercase mb-1 animate-pulse">
                ⚡ {choiceConfig.title} ⚡
              </div>
              <p className="text-[10px] text-cyber-text-dim uppercase tracking-wider mb-4 text-center max-w-sm">
                {choiceConfig.instructions}
              </p>

              {/* Action Options Grid */}
              <div className="flex gap-4 flex-wrap justify-center my-3 overflow-y-auto max-h-[220px] p-2">
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

              {/* Controls */}
              <div className="flex gap-4 mt-2">
                <button
                  onClick={handleConfirmChoice}
                  disabled={!isSelectionValid}
                  className="px-6 py-2 border-2 border-neon-magenta text-neon-magenta font-bold uppercase tracking-widest rounded bg-purple-950/20 hover:bg-purple-950/40 text-[10px] shadow-[0_0_10px_rgba(255,0,255,0.2)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {t('confirmChoice') || 'CONFIRM / 確定'}
                </button>
                {choiceConfig.isOptional && (
                  <button
                    onClick={handleSkipChoice}
                    className="px-6 py-2 border border-cyber-border text-cyber-text-dim hover:text-white hover:border-white uppercase tracking-wider rounded bg-cyber-surface/10 hover:bg-cyber-surface/30 text-[10px] cursor-pointer"
                  >
                    {t('skipChoice') || 'SKIP / スキップ'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Top Step Counter */}
          <div className="text-[10px] text-cyber-text-dim uppercase tracking-widest font-mono z-10">
            {t('battleStep')} / 進捗: {isLiveMode ? activeLog.length : currentLogIndex + 1} {isLiveMode ? '' : `/ ${battleLog.length}`}
          </div>

          {/* Active Turn Indicator Banner */}
          <div className="my-3 w-full max-w-md text-center z-10">
            {isReplayFinished ? (
              <div className="text-neon-green text-glow-green text-xs font-bold font-mono tracking-widest uppercase border border-neon-green/30 bg-green-950/15 py-1.5 rounded animate-pulse">
                SYS_STATUS: CLASH RESOLVED / バトル決着
              </div>
            ) : isMyDrawTurn ? (
              <div className="text-neon-cyan text-glow-cyan text-xs font-bold font-mono tracking-widest uppercase border border-neon-cyan/30 bg-cyan-950/15 py-1.5 rounded animate-pulse">
                &gt;&gt; PLAYER DRAW TURN / あなたのめくり番 &lt;&lt;
              </div>
            ) : isOpponentDrawTurn ? (
              <div className="text-neon-magenta text-glow-magenta text-xs font-bold font-mono tracking-widest uppercase border border-neon-magenta/30 bg-purple-950/15 py-1.5 rounded animate-pulse">
                &gt;&gt; OPPONENT DRAW TURN / 相手のめくり番 &lt;&lt;
              </div>
            ) : showChoiceUI ? (
              <div className="text-neon-magenta text-glow-magenta text-xs font-bold font-mono tracking-widest uppercase border border-neon-magenta/40 bg-purple-950/30 py-1.5 rounded animate-pulse">
                ⚡ AWAITING YOUR CARD CHOICE / 効果選択待機中 ⚡
              </div>
            ) : isLiveMode && battleSession.requiredAction !== 'DRAW' && battleSession.pendingActionPlayer !== playerName ? (
              <div className="text-neon-magenta text-glow-magenta text-xs font-bold font-mono tracking-widest uppercase border border-neon-magenta/20 bg-purple-950/10 py-1.5 rounded animate-pulse">
                AWAITING OPPONENT DECISION / 相手の効果選択中...
              </div>
            ) : (
              <div className="text-cyber-text-dim text-xs font-bold font-mono tracking-widest uppercase border border-cyber-border/20 bg-cyber-surface/10 py-1.5 rounded">
                STANDBY PROTOCOL / 分析同調中
              </div>
            )}
          </div>

          {/* Core Arena Display */}
          <div className="flex-1 w-full flex flex-col justify-center gap-4 my-2 z-10">
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
                <Flag size={12} className={flagHolderName === playerName ? 'animate-pulse text-neon-cyan animate-neon-pulse' : flagHolderName === opponent ? 'text-neon-magenta animate-pulse' : ''} />
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
                  <div key={currentFlagCard.id + '_' + currentFlagCard.power} className="transform scale-90 transition-all animate-card-reveal shadow-[0_0_20px_rgba(0,240,255,0.25)]">
                    <CardDisplay card={currentFlagCard} disabled />
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
              <div className="text-[9px] font-mono text-cyber-text-dim/60 uppercase tracking-widest mb-2 flex items-center gap-2">
                <span>ACTIVE CHALLENGE AUGMENTATIONS / 挑戦者めくりカード</span>
                {challengerPower > 0 && (
                  <span className="text-neon-green font-black px-1.5 border border-neon-green/35 rounded bg-green-950/10">
                    計 {challengerPower} POW
                  </span>
                )}
              </div>

              {/* Stacked drawn challenger cards */}
              <div className="flex items-center justify-center gap-2 flex-wrap min-h-[140px] w-full px-2">
                {currentClashCards.length > 0 ? (
                  currentClashCards.map((cCard, idx) => {
                    const isLatest = idx === currentClashCards.length - 1;
                    return (
                      <div
                        key={cCard.id + '_' + idx}
                        className={`transform scale-75 -mx-4 first:ml-0 last:mr-0 transition-all duration-300 ${
                          isLatest
                            ? 'animate-card-reveal z-10 shadow-[0_0_15px_rgba(0,240,255,0.3)] scale-80'
                            : 'opacity-70 scale-75'
                        }`}
                      >
                        <CardDisplay card={cCard} disabled />
                      </div>
                    );
                  })
                ) : (
                  <div className="text-[10px] text-cyber-text-dim/40 border border-dashed border-cyber-border/30 rounded p-6 font-mono text-center w-full">
                    AWAITING DECK DRAW INTRUSION / ドローされるのを待っています
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Resolution status details */}
          <div className="w-full text-center mt-2 px-4 py-2 border border-cyber-border/10 rounded bg-cyber-dark/40 min-h-[50px] flex items-center justify-center z-10">
            <p className="text-[10px] font-mono text-cyber-text leading-relaxed">
              {activeLog.length > 0
                ? translateBattleDetail(activeLog[activeLog.length - 1].details)
                : t('initializingArenaLink') || 'INITIALIZING INTERACTIVE ARENA LINK...'}
              {activeLog.length > 0 && activeLog[activeLog.length - 1].effectTriggered && activeLog[activeLog.length - 1].effectTriggered !== 'None' && activeLog[activeLog.length - 1].effectTriggered !== '' && (
                <span className="text-neon-green block font-bold mt-1 text-[9px] animate-pulse">
                  ⚡ {translateBattleDetail(activeLog[activeLog.length - 1].effectTriggered)}
                </span>
              )}
            </p>
          </div>

          {/* Main Interactive Draw Button */}
          <div className="w-full mt-4 z-10 flex flex-col items-center gap-2">
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
                  isMyDrawTurn
                    ? 'border-neon-cyan text-neon-cyan bg-cyan-950/20 hover:bg-cyan-950/40 text-glow-cyan shadow-[0_0_15px_rgba(0,240,255,0.2)] animate-pulse'
                    : isOpponentDrawTurn
                    ? 'border-neon-magenta text-neon-magenta bg-purple-950/20 hover:bg-purple-950/40 text-glow-magenta shadow-[0_0_15px_rgba(255,0,255,0.2)]'
                    : 'border-cyber-border text-cyber-text bg-cyber-surface/30 hover:bg-cyber-surface/50 font-medium disabled:opacity-40 disabled:cursor-not-allowed'
                }`}
              >
                <Play size={14} className={isMyDrawTurn ? 'animate-bounce' : (isOpponentDrawTurn ? '' : '')} />
                {isMyDrawTurn ? (
                  <span>{t('drawNextCard') || 'DRAW CARD / カードをめくる'}</span>
                ) : isOpponentDrawTurn ? (
                  <span>{t('opponentDrawNext') || 'DRAW OPPONENT / 相手のカードをめくる'}</span>
                ) : (
                  <span>{t('nextStep') || 'NEXT STEP / 進む'}</span>
                )}
              </button>
            ) : (
              <button
                onClick={onComplete}
                className="w-full max-w-xs py-2.5 px-5 rounded border-2 border-neon-green text-neon-green bg-green-950/20 hover:bg-green-950/40 text-glow-green font-bold text-xs uppercase tracking-widest cursor-pointer transition-all duration-150 transform active:scale-95 shadow-[0_0_15px_rgba(0,255,102,0.25)] animate-pulse animate-neon-pulse"
              >
                <span>{t('continueToStandings') || 'VIEW STANDINGS / リザルト確認 →'}</span>
              </button>
            )}
          </div>

        </div>

        {/* Right Col: Opponent State */}
        <div className="font-mono flex flex-col gap-3 self-start order-3">
          <MemorySlots
            slots={opponentMemSlots}
            cards={opponentSlotCards}
            label={t('npcMemoryLabel', { opponent })}
            side="right"
          />
          <div className="border border-cyber-border/30 rounded p-2.5 bg-cyber-surface/30 text-right flex justify-between items-center">
            <Layers size={18} className="text-neon-magenta/50" />
            <div>
              <div className="text-[9px] text-cyber-text-dim uppercase tracking-wider">{t('deckLabel') || 'DECK MODULES'}</div>
              <div className="text-sm font-bold text-neon-magenta">{opponentDeckCount} {t('units') || 'Units'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Replay / Speed / Auto Controllers */}
      <div className="relative z-10 max-w-3xl mx-auto w-full border border-cyber-border/30 rounded-lg p-3 bg-cyber-darker/90 backdrop-blur-md mb-3 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
        
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
            {isAutoPlay ? 'PAUSE / 一時停止' : 'AUTO / オート'}
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
              >
                <RotateCcw size={12} />
                {t('resetBtnTitle') || 'RESTART / 最初から'}
              </button>
            </>
          )}
        </div>

        {/* Playback Speed selector */}
        <div className="flex items-center gap-1.5 text-[10px]">
          <span className="text-cyber-text-dim">SPEED / 速度:</span>
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
              {t('continueBtn') || 'STANDINGS / リザルト確認 →'}
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
              {t('skipSim') || 'SKIP / 結末へスキップ'}
            </button>
          ) : null}
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
            {activeLog.length} events
          </span>
        </div>
        
        <div className="flex flex-col gap-1">
          {activeLog.map((log, i) => {
            const displayLogAction = translateBattleDetail(log.details || log.action);
            const displayLogEffect = log.effectTriggered ? translateBattleDetail(log.effectTriggered) : '';
            const isPlayer = log.player === playerName;
            const isSystem = !log.player || log.player === 'SYSTEM';

            return (
              <div
                key={i}
                className={`flex items-start gap-2 py-1 px-1.5 rounded transition-all duration-300 ${
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
