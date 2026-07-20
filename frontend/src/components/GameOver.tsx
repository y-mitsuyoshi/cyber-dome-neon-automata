import { useEffect, useRef } from 'react';
import { Trophy, Star, RotateCcw, User } from 'lucide-react';
import type { Standing } from '../types/game';
import { useTranslation } from '../context/TranslationContext';
import { useAudio } from '../context/AudioContext';
import { getRankVisual } from '../utils/rankStyle';
import Podium from './Podium';
import PlayerResultSummary from './PlayerResultSummary';

interface GameOverProps {
  standings: Standing[];
  onRestart: () => void;
}

// ── CelebrationParticles (Task 5) ──────────────────────────────────
const CONFETTI_COLORS = ['cyan', 'magenta', 'amber', 'green'] as const;

function CelebrationParticles() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {Array.from({ length: 24 }).map((_, i) => {
        const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
        const colorMap: Record<string, string> = {
          cyan: 'rgba(0,240,255,0.8)',
          magenta: 'rgba(255,0,255,0.8)',
          amber: 'rgba(255,191,0,0.8)',
          green: 'rgba(0,255,102,0.8)',
        };
        return (
          <span
            key={i}
            className="absolute block"
            style={{
              left: `${(i / 24) * 100 + 2}%`,
              top: 0,
              width: '6px',
              height: '6px',
              borderRadius: i % 2 === 0 ? '50%' : '1px',
              backgroundColor: colorMap[color],
              animation: `confettiFall ${4 + (i % 4)}s linear ${i * 0.15}s infinite`,
            }}
          />
        );
      })}
    </div>
  );
}

// ── Main GameOver component ────────────────────────────────────────
function GameOver({ standings, onRestart }: GameOverProps) {
  const { playSE } = useAudio();
  const playedEndRef = useRef(false);

  const { t } = useTranslation();

  const winner = standings[0];
  const playerStanding = standings.find(s => s.isPlayer);
  const playerRank = standings.findIndex(s => s.isPlayer) + 1;
  const isPlayerWinner = playerRank === 1;
  const isPodium = playerRank >= 1 && playerRank <= 3;

  // SE 3-way branching (Task 3)
  useEffect(() => {
    if (playedEndRef.current) return;
    playedEndRef.current = true;
    if (playerRank === 1) playSE('fanfare');
    else if (playerRank === 2 || playerRank === 3) playSE('victory');
    else playSE('defeat');
  }, [playerRank, playSE]);

  return (
    <div className="min-h-screen bg-cyber-dark relative overflow-hidden flex items-center justify-center">
      {/* Celebration particles (Task 5) */}
      {isPodium && <CelebrationParticles />}

      {/* Dramatic background — expanded to podium rank (Task 3) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isPodium
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

        {/* ── Champion announcement (Task 3) ── */}
        <div className="mb-6 animate-slide-in font-mono">
          <Trophy size={64} className="text-neon-amber mx-auto animate-neon-pulse mb-4" style={{ color: '#ffbf00' }} />
          <h1 className="text-4xl font-black tracking-wider text-neon-amber text-glow-amber">
            {t('championAnnounce', { name: winner?.name || '' })}
          </h1>

          {/* If player is the champion, show additional victory text */}
          {isPlayerWinner && (
            <p className="text-lg text-neon-green text-glow-green mt-3">
              {t('championDesc')}
            </p>
          )}

          {/* If player is not the champion, show their rank summary */}
          {!isPlayerWinner && playerStanding && (
            <p className="text-sm text-cyber-text-dim mt-3">
              {t('playerFinalRank', {
                rank: playerRank,
                wins: playerStanding.wins,
                fans: playerStanding.fans,
              })}
            </p>
          )}
        </div>

        {/* ── Podium (Task 4) ── */}
        <Podium top={standings.slice(0, 3)} playerName={playerStanding?.name} />

        {/* ── Player Result Summary (Task 4) ── */}
        {playerStanding && (
          <PlayerResultSummary
            rank={playerRank}
            wins={playerStanding.wins}
            fans={playerStanding.fans}
            isPodium={isPodium}
          />
        )}

        {/* ── Final Standings Table with rankStyle (Task 2) ── */}
        <div className="border border-cyber-border/40 rounded-lg overflow-hidden bg-cyber-surface/30 mb-8 animate-slide-in font-mono" style={{ animationDelay: '0.3s' }}>
          <div className="px-4 py-3 bg-cyber-darker/50 border-b border-cyber-border/30">
            <span className="text-[10px] uppercase tracking-widest text-neon-amber font-bold">
              {t('finalRankingsHeader')}
            </span>
          </div>

          {standings.map((player, i) => {
            const rank = i + 1;
            const visual = getRankVisual(rank);
            return (
              <div
                key={player.name}
                className={`
                  grid grid-cols-[40px_1fr_60px_60px] gap-2 px-4 py-3 border-b border-cyber-border/10
                  animate-slide-in
                  ${visual.rowClass}
                  ${player.isPlayer ? 'bg-cyan-900/10 border-l-2 border-l-neon-cyan' : ''}
                `}
                style={{ animationDelay: `${0.4 + i * 0.1}s` }}
              >
                <div className="flex items-center">
                  {visual.icon === 'trophy' ? (
                    <Trophy size={18} className={visual.textClass} />
                  ) : visual.icon === 'medal' ? (
                    <span className={`text-lg font-bold ${visual.textClass}`}>{rank}</span>
                  ) : (
                    <span className="text-lg font-bold text-cyber-text-dim">{rank}</span>
                  )}
                </div>

                <div className="flex items-center gap-2 min-w-0">
                  {player.isPlayer && <User size={14} className="text-neon-cyan shrink-0" />}
                  <span className={`font-bold text-sm truncate ${
                    player.isPlayer ? 'text-neon-cyan text-glow-cyan' :
                    visual.icon ? visual.textClass : 'text-cyber-text'
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
            );
          })}
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
