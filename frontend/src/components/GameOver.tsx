import { useEffect, useRef } from 'react';
import { Trophy, Star, Zap, RotateCcw, User } from 'lucide-react';
import type { Standing } from '../types/game';
import { useTranslation } from '../context/TranslationContext';
import { useAudio } from '../context/AudioContext';

interface GameOverProps {
  standings: Standing[];
  onRestart: () => void;
}

function GameOver({ standings, onRestart }: GameOverProps) {
  const { playSE } = useAudio();
  const playedEndRef = useRef(false);
  const sorted = [...standings].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.fans - a.fans;
  });

  const { t } = useTranslation();

  const winner = sorted[0];
  const playerStanding = sorted.find(s => s.isPlayer);
  const playerRank = sorted.findIndex(s => s.isPlayer) + 1;
  const isPlayerWinner = playerRank === 1;

  // Play fanfare or defeat on mount (once)
  useEffect(() => {
    if (playedEndRef.current) return;
    playedEndRef.current = true;
    if (isPlayerWinner) playSE('fanfare');
    else playSE('defeat');
  }, [isPlayerWinner, playSE]);

  return (
    <div className="min-h-screen bg-cyber-dark relative overflow-hidden flex items-center justify-center">
      {/* Dramatic background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isPlayerWinner
            ? 'radial-gradient(ellipse at 50% 30%, rgba(255,191,0,0.1) 0%, transparent 50%), radial-gradient(ellipse at 50% 60%, rgba(0,255,102,0.05) 0%, transparent 50%)'
            : 'radial-gradient(ellipse at 50% 40%, rgba(255,0,255,0.06) 0%, transparent 60%)',
        }}
      />
      <div className="absolute inset-0 cyber-grid pointer-events-none" />

      <div className="relative z-10 w-full max-w-2xl px-4 text-center">
        {/* Pre-title */}
        <div className="animate-fade-in mb-4">
          <span className="text-[10px] uppercase tracking-[0.5em] text-cyber-text-dim font-mono">
            {t('tournamentCompleteLabel')}
          </span>
        </div>

        {/* Winner announcement */}
        <div className="mb-8 animate-slide-in font-mono">
          {isPlayerWinner ? (
            <>
              <div className="mb-4">
                <Trophy size={64} className="text-neon-amber mx-auto animate-neon-pulse" style={{ color: '#ffbf00' }} />
              </div>
              <h1
                className="text-5xl font-black tracking-wider text-neon-amber text-glow-amber mb-3"
              >
                {t('victoryHeader')}
              </h1>
              <p className="text-lg text-neon-green text-glow-green">
                {t('championDesc')}
              </p>
            </>
          ) : (
            <>
              <div className="mb-4">
                <Zap size={48} className="text-neon-magenta mx-auto" />
              </div>
              <h1
                className="text-4xl font-black tracking-wider text-neon-magenta text-glow-magenta mb-3"
              >
                {t('tournamentOverHeader')}
              </h1>
              <p className="text-md text-cyber-text">
                {t('winnerClaimsThrone', { name: winner?.name || '' })}
              </p>
              <p className="text-sm text-cyber-text-dim mt-2">
                {t('playerFinalRank', {
                  rank: playerRank,
                  wins: playerStanding?.wins ?? 0,
                  fans: playerStanding?.fans ?? 0
                })}
              </p>
            </>
          )}
        </div>

        {/* Final standings */}
        <div className="border border-cyber-border/40 rounded-lg overflow-hidden bg-cyber-surface/30 mb-8 animate-slide-in font-mono" style={{ animationDelay: '0.3s' }}>
          <div className="px-4 py-3 bg-cyber-darker/50 border-b border-cyber-border/30">
            <span className="text-[10px] uppercase tracking-widest text-neon-amber font-bold">
              {t('finalRankingsHeader')}
            </span>
          </div>

          {sorted.map((player, i) => (
            <div
              key={player.name}
              className={`
                grid grid-cols-[40px_1fr_60px_60px] gap-2 px-4 py-3 border-b border-cyber-border/10
                animate-slide-in
                ${player.isPlayer
                  ? i === 0
                    ? 'bg-amber-900/10 border-l-2 border-l-neon-amber'
                    : 'bg-cyan-900/10 border-l-2 border-l-neon-cyan'
                  : i === 0
                  ? 'bg-amber-900/5'
                  : ''
                }
              `}
              style={{ animationDelay: `${0.4 + i * 0.1}s` }}
            >
              <div className="flex items-center">
                {i === 0 ? (
                  <Trophy size={18} className="text-neon-amber" />
                ) : i === 1 ? (
                  <span className="text-lg font-bold text-gray-400">2</span>
                ) : i === 2 ? (
                  <span className="text-lg font-bold text-amber-700">3</span>
                ) : (
                  <span className="text-lg font-bold text-cyber-text-dim">{i + 1}</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {player.isPlayer && <User size={14} className="text-neon-cyan" />}
                <span className={`font-bold text-sm ${
                  player.isPlayer ? 'text-neon-cyan text-glow-cyan' :
                  i === 0 ? 'text-neon-amber' : 'text-cyber-text'
                }`}>
                  {player.name}
                </span>
                {player.isPlayer && (
                  <span className="text-[9px] text-neon-cyan/60 uppercase tracking-wider border border-neon-cyan/20 px-1.5 rounded font-bold">
                    {t('youBadge')}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-center">
                <span className="text-sm font-bold text-cyber-text">
                  {t('playerWins', { wins: player.wins })}
                </span>
              </div>

              <div className="flex items-center justify-center gap-1">
                <Star size={10} className="text-neon-amber" />
                <span className="text-sm text-cyber-text-dim">{player.fans}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Restart button */}
        <button
          onClick={onRestart}
          onMouseEnter={() => playSE('hover')}
          className="inline-flex items-center gap-2 px-10 py-4 rounded border-2 border-neon-cyan text-neon-cyan font-bold text-lg uppercase tracking-wider
            hover:bg-cyan-900/20 hover:scale-105 transition-all duration-300 cursor-pointer animate-slide-in font-mono"
          style={{
            animationDelay: '0.8s',
            boxShadow: '0 0 20px rgba(0,240,255,0.2), 0 0 40px rgba(0,240,255,0.1)',
          }}
        >
          <RotateCcw size={20} />
          {t('newGameBtn')}
        </button>
      </div>
    </div>
  );
}

export default GameOver;
