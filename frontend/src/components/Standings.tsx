import { useEffect, useRef, useState } from 'react';
import { Trophy, Star, ChevronRight, User, Award, Home } from 'lucide-react';
import type { Standing, BattleResult } from '../types/game';
import { useTranslation } from '../context/TranslationContext';
import { useAudio } from '../context/AudioContext';
import { getRankVisual } from '../utils/rankStyle';
import { getPreviousRanks, saveRanks } from '../utils/rankHistory';

interface StandingsProps {
  standings: Standing[];
  round: number;
  maxRounds: number;
  battleResult: string;
  onNext: () => void;
  onReturnToTop?: () => void;
  loading: boolean;
  gameId: string;
  playerName: string;
  lastResult: BattleResult | null;
}

function Standings({ standings, round, maxRounds, battleResult, onNext, onReturnToTop, loading, gameId, playerName, lastResult }: StandingsProps) {
  const { playSE } = useAudio();
  const playedResultRef = useRef(false);

  const { t, translateBattleResult } = useTranslation();
  const isFinalRound = round >= maxRounds;

  const roundLabel = round === maxRounds
    ? t('finalsLabel')
    : t('roundOf', { round: round, maxRounds: maxRounds - 1 });

  // Localize Go backend match results banner
  const displayResult = translateBattleResult(battleResult);

  // Victory/defeat from BattleResult (not battleResult string matching)
  const isVictory = lastResult != null && lastResult.winner === playerName;
  const isDefeat = lastResult != null && lastResult.loser === playerName;

  // Rank change tracking
  const [rankChanges, setRankChanges] = useState<Map<string, number> | null>(null);
  useEffect(() => {
    const prev = getPreviousRanks(gameId);
    if (prev) {
      const changes = new Map<string, number>();
      standings.forEach((s, i) => {
        const currentRank = i + 1;
        const prevRank = prev.get(s.name);
        if (prevRank !== undefined) {
          changes.set(s.name, prevRank - currentRank); // positive = improved
        } else {
          changes.set(s.name, 0);
        }
      });
      setRankChanges(changes);
    }
    saveRanks(gameId, standings);
  }, [gameId, standings]);

  // Play result SE on mount (once)
  useEffect(() => {
    if (playedResultRef.current) return;
    playedResultRef.current = true;
    if (isVictory) playSE('victory');
    else if (isDefeat) playSE('defeat');
  }, [isVictory, isDefeat, playSE]);

  // Badge conditions
  const isFinalistRound = round === maxRounds - 1;
  const isChampionRound = round === maxRounds && lastResult && lastResult.loser !== 'BYE';

  return (
    <div className="min-h-screen bg-cyber-dark cyber-grid relative overflow-hidden flex items-center justify-center">
      {/* Background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 30%, rgba(0,240,255,0.05) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 w-full max-w-2xl px-4">
        {/* Battle result banner */}
        {battleResult && (
          <div
            className={`text-center mb-6 animate-slide-in rounded-lg border p-4 font-mono ${
              isVictory
                ? 'border-neon-green/40 bg-green-900/10'
                : isDefeat
                ? 'border-neon-red/40 bg-red-900/10'
                : 'border-neon-amber/40 bg-amber-900/10'
            }`}
          >
            <span
              className={`text-xl font-bold tracking-wider ${
                isVictory
                  ? 'text-neon-green text-glow-green'
                  : isDefeat
                  ? 'text-neon-red text-glow-red'
                  : 'text-neon-amber text-glow-amber'
              }`}
            >
              {displayResult}
            </span>
          </div>
        )}

        {/* Title */}
        <div className="text-center mb-6 animate-slide-in font-mono">
          <h2
            className="text-3xl font-black tracking-[0.2em] uppercase text-neon-cyan text-glow-cyan"
          >
            <Trophy size={28} className="inline mr-3 -mt-1" />
            {t('standingsHeader')}
          </h2>
          <p className="text-xs text-cyber-text-dim tracking-wider mt-2">
            {roundLabel}
          </p>
        </div>

        {/* Standings table */}
        <div className="border border-cyber-border/40 rounded-lg overflow-hidden bg-cyber-surface/30 animate-slide-in font-mono">
          {/* Header */}
          <div className="grid grid-cols-[50px_1fr_80px_80px] gap-2 px-4 py-3 bg-cyber-darker/50 border-b border-cyber-border/30">
            <span className="text-[10px] uppercase tracking-widest text-cyber-text-dim font-bold">
              {t('rankHeader')}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-cyber-text-dim font-bold min-w-0">
              {t('combatantHeader')}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-cyber-text-dim font-bold text-center">
              {t('winsHeader')}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-cyber-text-dim font-bold text-center">
              {t('fansHeader')}
            </span>
          </div>

          {/* Rows */}
          {standings.map((player, i) => {
            const rank = i + 1;
            const visual = getRankVisual(rank);
            const change = rankChanges?.get(player.name) ?? 0;
            const isFinalist = isFinalistRound && rank <= 2;
            const isChampion = isChampionRound && lastResult?.winner === player.name;

            return (
              <div
                key={player.name}
                className={`
                  grid grid-cols-[50px_1fr_80px_80px] gap-2 px-4 py-3 border-b border-cyber-border/10
                  transition-all duration-300 animate-slide-in
                  ${visual.rowClass}
                  ${player.isPlayer ? 'bg-cyan-900/10 border-l-2 border-l-neon-cyan' : ''}
                `}
                style={{
                  animationDelay: `${i * 0.1}s`,
                  ...(player.isPlayer ? { boxShadow: 'inset 0 0 30px rgba(0,240,255,0.05)' } : {}),
                }}
              >
                {/* Rank */}
                <div className="flex items-center">
                  {visual.icon === 'trophy' ? (
                    <Trophy size={18} className={visual.textClass} />
                  ) : visual.icon === 'medal' ? (
                    <span className={`text-lg font-bold ${visual.textClass}`}>{rank}</span>
                  ) : (
                    <span className={`text-lg font-bold ${player.isPlayer ? 'text-neon-cyan' : 'text-cyber-text-dim'}`}>
                      {rank}
                    </span>
                  )}
                </div>

                {/* Name */}
                <div className="flex items-center gap-2 min-w-0">
                  {player.isPlayer && <User size={14} className="text-neon-cyan shrink-0" />}
                  <span className={`font-bold text-sm truncate ${
                    player.isPlayer ? 'text-neon-cyan text-glow-cyan' :
                    visual.icon ? visual.textClass : 'text-cyber-text'
                  }`}>
                    {player.name}
                  </span>
                  {player.isPlayer && (
                    <span className="text-[9px] text-neon-cyan/60 uppercase tracking-wider border border-neon-cyan/20 px-1.5 rounded">
                      {t('youBadge')}
                    </span>
                  )}
                  {/* Rank change indicator */}
                  {rankChanges && (
                    <span className="text-[10px] font-bold" aria-label={change > 0 ? t('rankUp') : change < 0 ? t('rankDown') : t('rankSame')}>
                      {change > 0 && <span className="text-neon-green">{t('rankUp')}</span>}
                      {change < 0 && <span className="text-neon-red">{t('rankDown')}</span>}
                      {change === 0 && <span className="text-cyber-text-dim">{t('rankSame')}</span>}
                    </span>
                  )}
                  {/* Finalist badge */}
                  {isFinalist && (
                    <span className="text-[8px] text-neon-amber font-bold uppercase tracking-wider border border-neon-amber/40 px-1.5 rounded bg-amber-950/20 animate-pulse">
                      <Award size={8} className="inline mr-0.5 -mt-0.5" />
                      {t('finalistBadge')}
                    </span>
                  )}
                  {/* Champion badge */}
                  {isChampion && (
                    <span className="text-[8px] text-neon-amber font-bold uppercase tracking-wider border border-neon-amber/50 px-1.5 rounded bg-amber-950/20" style={{ boxShadow: '0 0 8px rgba(255,191,0,0.3)' }}>
                      <Trophy size={8} className="inline mr-0.5 -mt-0.5" />
                      {t('championBadge')}
                    </span>
                  )}
                </div>

                {/* Wins */}
                <div className="flex items-center justify-center">
                  <span className={`text-lg font-bold ${player.isPlayer ? 'text-neon-cyan' : 'text-cyber-text'}`}>
                    {player.wins}
                  </span>
                </div>

                {/* Fans */}
                <div className="flex items-center justify-center gap-1">
                  <Star size={12} className="text-neon-amber" />
                  <span className={`text-sm font-bold ${player.isPlayer ? 'text-neon-amber' : 'text-cyber-text-dim'}`}>
                    {player.fans}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8 animate-slide-in" style={{ animationDelay: '0.5s' }}>
          <button
            onClick={onNext}
            onMouseEnter={() => { if (!loading) playSE('hover'); }}
            disabled={loading}
            className={`
              inline-flex items-center gap-2 px-8 py-3 rounded border-2 font-bold text-sm uppercase tracking-wider
              transition-all duration-300 cursor-pointer hover:scale-105 font-mono
              ${isFinalRound
                ? 'border-neon-amber text-neon-amber hover:bg-amber-900/20'
                : 'border-neon-cyan text-neon-cyan hover:bg-cyan-900/20'
              }
            `}
            style={{
              boxShadow: isFinalRound
                ? '0 0 20px rgba(255,191,0,0.2)'
                : '0 0 15px rgba(0,240,255,0.2)',
            }}
          >
            {loading ? (
              <span className="animate-spin">⟳</span>
            ) : isFinalRound ? (
              <>
                <Trophy size={18} />
                {t('finalResultsBtn')}
              </>
            ) : (
              <>
                {t('nextRoundBtn')}
                <ChevronRight size={18} />
              </>
            )}
          </button>

          {onReturnToTop && (
            <button
              onClick={() => { playSE('click'); onReturnToTop(); }}
              onMouseEnter={() => { if (!loading) playSE('hover'); }}
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-3 rounded border border-cyber-border/40 text-cyber-text-dim hover:text-neon-cyan hover:border-neon-cyan/40 font-bold text-sm uppercase tracking-wider transition-all duration-300 cursor-pointer hover:scale-105 font-mono"
            >
              <Home size={16} />
              {t('returnToTop')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Standings;
