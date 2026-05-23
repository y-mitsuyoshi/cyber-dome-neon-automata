import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, SkipForward, FastForward, Rewind, Flag, Zap, User, Cpu } from 'lucide-react';
import type { BattleLogEntry } from '../types/game';
import MemorySlots from './MemorySlots';
import { useTranslation } from '../context/TranslationContext';

interface BattleArenaProps {
  battleLog: BattleLogEntry[];
  opponent: string;
  onComplete: () => void;
}

function BattleArena({ battleLog, opponent, onComplete }: BattleArenaProps) {
  const [currentStep, setCurrentStep] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1500);
  const [showEffect, setShowEffect] = useState(false);
  const [cardKey, setCardKey] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { t, translateCardName, translateBattleDetail } = useTranslation();

  const entry = currentStep >= 0 && currentStep < battleLog.length ? battleLog[currentStep] : null;
  const isFinished = currentStep >= battleLog.length - 1;

  const advanceStep = useCallback(() => {
    setCurrentStep(prev => {
      const next = prev + 1;
      if (next >= battleLog.length) {
        setIsPlaying(false);
        return prev;
      }
      setCardKey(k => k + 1);
      // Show effect flash
      const nextEntry = battleLog[next];
      if (nextEntry && nextEntry.effectTriggered && nextEntry.effectTriggered !== 'None' && nextEntry.effectTriggered !== '') {
        setShowEffect(true);
        setTimeout(() => setShowEffect(false), 1500);
      }
      return next;
    });
  }, [battleLog]);

  useEffect(() => {
    if (isPlaying && !isFinished) {
      intervalRef.current = setTimeout(() => {
        advanceStep();
      }, speed);
    }
    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current);
    };
  }, [isPlaying, isFinished, currentStep, speed, advanceStep]);

  const togglePlay = () => {
    if (isFinished) {
      setCurrentStep(-1);
      setIsPlaying(true);
      setTimeout(advanceStep, 300);
    } else {
      setIsPlaying(!isPlaying);
      if (!isPlaying && currentStep < 0) {
        advanceStep();
      }
    }
  };

  const stepForward = () => {
    setIsPlaying(false);
    advanceStep();
  };

  const reset = () => {
    setIsPlaying(false);
    setCurrentStep(-1);
    setShowEffect(false);
  };

  const getAttributeColor = (attr: string) => {
    switch (attr) {
      case 'Virus': return 'text-red-400';
      case 'AI': return 'text-blue-400';
      case 'Hardware': return 'text-amber-400';
      case 'Netrunner': return 'text-green-400';
      default: return 'text-cyber-text';
    }
  };

  const getAttributeGlow = (attr: string) => {
    switch (attr) {
      case 'Virus': return '#ff0040';
      case 'AI': return '#4488ff';
      case 'Hardware': return '#ffbf00';
      case 'Netrunner': return '#00ff66';
      default: return '#00f0ff';
    }
  };

  // Translated card details if card exists in current step
  const stepCard = entry?.card;
  const displayCardName = stepCard ? translateCardName(stepCard.name) : '';
  const displayCardAttr = stepCard ? t(stepCard.attribute) : '';
  const displayAction = entry ? translateBattleDetail(entry.action) : '';
  const displayEffectTriggered = entry?.effectTriggered ? translateBattleDetail(entry.effectTriggered) : '';

  return (
    <div className="min-h-screen bg-cyber-dark relative overflow-hidden">
      {/* Arena background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 30%, rgba(255,0,255,0.04) 0%, transparent 60%), radial-gradient(ellipse at 50% 70%, rgba(0,240,255,0.04) 0%, transparent 60%)',
        }}
      />

      {/* Grid overlay */}
      <div className="absolute inset-0 cyber-grid pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-4">
        {/* Arena header */}
        <div className="text-center mb-4 animate-slide-in">
          <h2
            className="text-2xl font-black tracking-[0.3em] uppercase text-neon-magenta text-glow-magenta font-mono"
          >
            {t('battleArenaHeader')}
          </h2>
          <div className="flex items-center justify-center gap-6 mt-2 font-mono">
            <div className="flex items-center gap-2">
              <User size={14} className="text-neon-cyan" />
              <span className="text-sm text-neon-cyan font-bold">{t('youSelf')}</span>
            </div>
            <span className="text-neon-red text-lg font-black">VS</span>
            <div className="flex items-center gap-2">
              <Cpu size={14} className="text-neon-magenta" />
              <span className="text-sm text-neon-magenta font-bold">{opponent || 'CPU'}</span>
            </div>
          </div>
        </div>

        {/* Main battle area */}
        <div className="grid grid-cols-[200px_1fr_200px] gap-4 mb-4">
          {/* Player memory slots */}
          <div className="animate-slide-in-left font-mono">
            <MemorySlots
              slots={entry?.playerMemSlots || []}
              label={t('yourMemory')}
              side="left"
            />
            <div className="mt-3 border border-cyber-border/30 rounded px-3 py-2 bg-cyber-surface/30">
              <div className="text-[10px] text-cyber-text-dim uppercase tracking-wider">{t('deckRemaining')}</div>
              <div className="text-lg font-bold text-neon-cyan">{entry?.playerDeckCount ?? '?'}</div>
            </div>
          </div>

          {/* Center stage */}
          <div className="flex flex-col items-center justify-center min-h-[350px] font-mono">
            {/* Step indicator */}
            <div className="mb-3 text-[10px] text-cyber-text-dim uppercase tracking-widest font-mono">
              {t('stepLabel')} {entry ? entry.step : '-'} / {battleLog.length}
            </div>

            {/* Flag indicator */}
            {entry && (
              <div
                className={`flex items-center gap-2 mb-4 px-4 py-2 rounded border transition-all duration-500 ${
                  entry.flagHolder === 'Player'
                    ? 'border-neon-cyan/50 bg-cyan-900/20 text-neon-cyan'
                    : entry.flagHolder === 'CPU' || entry.flagHolder === opponent
                    ? 'border-neon-magenta/50 bg-purple-900/20 text-neon-magenta'
                    : 'border-cyber-border bg-cyber-surface/30 text-cyber-text-dim'
                }`}
                style={{
                  boxShadow:
                    entry.flagHolder === 'Player'
                      ? '0 0 15px rgba(0,240,255,0.2)'
                      : entry.flagHolder === 'CPU' || entry.flagHolder === opponent
                      ? '0 0 15px rgba(255,0,255,0.2)'
                      : 'none',
                }}
              >
                <Flag size={16} className={entry.flagHolder === 'Player' ? 'text-neon-cyan' : 'text-neon-magenta'} />
                <span className="text-xs font-bold uppercase tracking-wider">
                  {t('accessLabel')}{
                    entry.flagHolder === 'Player' 
                      ? t('playerSelf') 
                      : entry.flagHolder === 'CPU' 
                      ? 'CPU' 
                      : entry.flagHolder || t('noneLabel')
                  }
                </span>
              </div>
            )}

            {/* Card reveal area */}
            {entry && stepCard ? (
              <div key={cardKey} className="animate-card-reveal">
                <div
                  className={`relative rounded-xl border-2 p-6 w-56 text-center
                    ${entry.player === 'Player' ? 'border-neon-cyan/60' : 'border-neon-magenta/60'}
                  `}
                  style={{
                    background: 'linear-gradient(135deg, rgba(13,17,23,0.95), rgba(26,26,46,0.95))',
                    boxShadow: `0 0 30px ${entry.player === 'Player' ? 'rgba(0,240,255,0.2)' : 'rgba(255,0,255,0.2)'}`,
                  }}
                >
                  {/* Player indicator */}
                  <div className={`text-[10px] uppercase tracking-widest mb-2 font-bold ${
                    entry.player === 'Player' ? 'text-neon-cyan' : 'text-neon-magenta'
                  }`}>
                    {entry.player === 'Player' 
                      ? t('yourPlay') 
                      : t('enemyPlay')}
                  </div>

                  {/* Card name */}
                  <h3 className="text-lg font-bold text-white mb-2">{displayCardName}</h3>

                  {/* Attribute badge */}
                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${getAttributeColor(stepCard.attribute)} bg-cyber-darker/50 border border-current/20 mb-3`}>
                    {displayCardAttr}
                  </div>

                  {/* Power */}
                  <div
                    className={`text-4xl font-black ${getAttributeColor(stepCard.attribute)} mb-2`}
                    style={{ textShadow: `0 0 15px ${getAttributeGlow(stepCard.attribute)}` }}
                  >
                    {stepCard.power}
                  </div>

                  <div className="text-[10px] text-cyber-text-dim uppercase tracking-wider">{t('powerLabel')}</div>
                </div>
              </div>
            ) : entry ? (
              <div key={cardKey} className="animate-card-reveal font-mono">
                <div className="rounded-xl border-2 border-cyber-border/40 p-6 w-56 text-center bg-cyber-surface/30">
                  <div className={`text-[10px] uppercase tracking-widest mb-3 font-bold ${
                    entry.player === 'Player' ? 'text-neon-cyan' : 'text-neon-magenta'
                  }`}>
                    {entry.player === 'Player' ? t('playerSelf') : entry.player}
                  </div>
                  <p className="text-sm text-cyber-text-dim">{displayAction}</p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-cyber-border/30 p-12 w-56 text-center font-mono">
                <Zap size={32} className="text-cyber-border mx-auto mb-3" />
                <p className="text-xs text-cyber-text-dim uppercase tracking-wider">
                  {t('awaitingCombatData')}
                </p>
              </div>
            )}

            {/* Action text */}
            {entry && (
              <div className="mt-4 text-center animate-fade-in font-mono" key={`action-${cardKey}`}>
                <p className="text-sm text-cyber-text">{displayAction}</p>
                <div className="flex items-center justify-center gap-4 mt-2">
                  <span className="text-[10px] text-cyber-text-dim">
                    {t('cumulativePower')} <span className="text-neon-cyan font-bold">{entry.currentPower}</span>
                  </span>
                </div>
              </div>
            )}

            {/* Effect triggered */}
            {showEffect && entry && displayEffectTriggered && displayEffectTriggered !== 'None' && displayEffectTriggered !== '' && (
              <div className="mt-3 animate-effect-flash" key={`effect-${cardKey}`}>
                <div
                  className="px-6 py-3 rounded-lg border border-neon-green/50 bg-green-900/20 text-center font-mono"
                  style={{ boxShadow: '0 0 25px rgba(0,255,102,0.3)' }}
                >
                  <Zap size={14} className="text-neon-green inline mr-2" />
                  <span className="text-sm font-bold text-neon-green text-glow-green font-mono">
                    {displayEffectTriggered}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* CPU memory slots */}
          <div className="animate-slide-in-right font-mono">
            <MemorySlots
              slots={entry?.cpuMemSlots || []}
              label={t('npcMemoryLabel', { opponent: opponent || 'CPU' })}
              side="right"
            />
            <div className="mt-3 border border-cyber-border/30 rounded px-3 py-2 bg-cyber-surface/30 text-right">
              <div className="text-[10px] text-cyber-text-dim uppercase tracking-wider">{t('deckRemaining')}</div>
              <div className="text-lg font-bold text-neon-magenta">{entry?.cpuDeckCount ?? '?'}</div>
            </div>
          </div>
        </div>

        {/* Timeline bar */}
        <div className="mb-4 font-mono">
          <div className="w-full h-1.5 bg-cyber-darker rounded-full overflow-hidden border border-cyber-border/30">
            <div
              className="h-full bg-gradient-to-r from-neon-cyan to-neon-magenta rounded-full transition-all duration-300"
              style={{
                width: `${battleLog.length > 0 ? ((currentStep + 1) / battleLog.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 font-mono">
          <button
            onClick={reset}
            className="p-2 rounded border border-cyber-border hover:border-neon-cyan/50 text-cyber-text-dim hover:text-neon-cyan transition-all cursor-pointer"
            title={t('resetBtnTitle')}
          >
            <Rewind size={18} />
          </button>

          <button
            onClick={togglePlay}
            className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
              isPlaying
                ? 'border-neon-amber text-neon-amber hover:bg-amber-900/20'
                : 'border-neon-green text-neon-green hover:bg-green-900/20'
            }`}
            style={{
              boxShadow: isPlaying
                ? '0 0 15px rgba(255,191,0,0.2)'
                : '0 0 15px rgba(0,255,102,0.2)',
            }}
          >
            {isPlaying ? <Pause size={22} /> : <Play size={22} />}
          </button>

          <button
            onClick={stepForward}
            disabled={isFinished}
            className={`p-2 rounded border transition-all cursor-pointer ${
              isFinished
                ? 'border-cyber-border text-cyber-border cursor-not-allowed'
                : 'border-cyber-border hover:border-neon-cyan/50 text-cyber-text-dim hover:text-neon-cyan'
            }`}
            title={t('nextStepBtnTitle')}
          >
            <SkipForward size={18} />
          </button>

          {/* Speed control */}
          <div className="flex items-center gap-2 ml-4 border-l border-cyber-border pl-4">
            <FastForward size={14} className="text-cyber-text-dim" />
            <select
              value={speed}
              onChange={e => setSpeed(Number(e.target.value))}
              className="bg-cyber-surface border border-cyber-border rounded px-2 py-1 text-xs text-cyber-text cursor-pointer focus:border-neon-cyan/50 outline-none font-mono"
            >
              <option value={2500}>0.5x</option>
              <option value={1500}>1x</option>
              <option value={800}>2x</option>
              <option value={400}>4x</option>
            </select>
          </div>

          {/* Done button */}
          {isFinished && (
            <button
              onClick={onComplete}
              className="ml-4 px-6 py-2 rounded border-2 border-neon-green text-neon-green font-bold text-sm uppercase tracking-wider
                hover:bg-neon-green/10 transition-all cursor-pointer animate-slide-in font-mono"
              style={{ boxShadow: '0 0 15px rgba(0,255,102,0.2)' }}
            >
              {t('continueBtn')}
            </button>
          )}
        </div>

        {/* Battle log text feed */}
        {currentStep >= 0 && (
          <div className="mt-6 max-w-2xl mx-auto border border-cyber-border/30 rounded-lg p-3 bg-cyber-surface/30 max-h-40 overflow-y-auto font-mono">
            <div className="text-[10px] text-cyber-text-dim uppercase tracking-widest mb-2 font-bold">
              {t('combatLogHeader')}
            </div>
            {battleLog.slice(0, currentStep + 1).reverse().map((log, i) => {
              const displayLogAction = translateBattleDetail(log.action);
              const displayLogEffect = log.effectTriggered ? translateBattleDetail(log.effectTriggered) : '';

              return (
                <div
                  key={i}
                  className={`text-[11px] py-1 border-b border-cyber-border/10 last:border-0 ${
                    i === 0 ? 'text-cyber-text' : 'text-cyber-text-dim/60'
                  }`}
                >
                  <span className={`font-bold ${log.player === 'Player' ? 'text-neon-cyan' : 'text-neon-magenta'}`}>
                    [{log.player === 'Player' ? t('playerSelf') : log.player}]
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
      </div>
    </div>
  );
}

export default BattleArena;
