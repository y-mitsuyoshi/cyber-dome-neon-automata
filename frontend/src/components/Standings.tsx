import { Trophy, Star, ChevronRight, User } from 'lucide-react';
import type { Standing } from '../types/game';

interface StandingsProps {
  standings: Standing[];
  round: number;
  maxRounds: number;
  battleResult: string;
  onNext: () => void;
  loading: boolean;
}

function Standings({ standings, round, maxRounds, battleResult, onNext, loading }: StandingsProps) {
  const sorted = [...standings].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.fans - a.fans;
  });

  const isFinalRound = round >= maxRounds;

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
            className={`text-center mb-6 animate-slide-in rounded-lg border p-4 ${
              battleResult.toLowerCase().includes('win')
                ? 'border-neon-green/40 bg-green-900/10'
                : battleResult.toLowerCase().includes('loss') || battleResult.toLowerCase().includes('lose')
                ? 'border-neon-red/40 bg-red-900/10'
                : 'border-neon-amber/40 bg-amber-900/10'
            }`}
          >
            <span
              className={`text-xl font-bold tracking-wider ${
                battleResult.toLowerCase().includes('win')
                  ? 'text-neon-green text-glow-green'
                  : battleResult.toLowerCase().includes('loss') || battleResult.toLowerCase().includes('lose')
                  ? 'text-neon-red text-glow-red'
                  : 'text-neon-amber text-glow-amber'
              }`}
            >
              {battleResult}
            </span>
          </div>
        )}

        {/* Title */}
        <div className="text-center mb-6 animate-slide-in">
          <h2
            className="text-3xl font-black tracking-[0.2em] uppercase text-neon-cyan text-glow-cyan"
            style={{ fontFamily: 'system-ui, sans-serif' }}
          >
            <Trophy size={28} className="inline mr-3 -mt-1" />
            Standings
          </h2>
          <p className="text-xs text-cyber-text-dim tracking-wider mt-2">
            Round {round} of {maxRounds}
          </p>
        </div>

        {/* Standings table */}
        <div className="border border-cyber-border/40 rounded-lg overflow-hidden bg-cyber-surface/30 animate-slide-in">
          {/* Header */}
          <div className="grid grid-cols-[50px_1fr_80px_80px] gap-2 px-4 py-3 bg-cyber-darker/50 border-b border-cyber-border/30">
            <span className="text-[10px] uppercase tracking-widest text-cyber-text-dim font-bold">Rank</span>
            <span className="text-[10px] uppercase tracking-widest text-cyber-text-dim font-bold">Combatant</span>
            <span className="text-[10px] uppercase tracking-widest text-cyber-text-dim font-bold text-center">Wins</span>
            <span className="text-[10px] uppercase tracking-widest text-cyber-text-dim font-bold text-center">Fans</span>
          </div>

          {/* Rows */}
          {sorted.map((player, i) => (
            <div
              key={player.name}
              className={`
                grid grid-cols-[50px_1fr_80px_80px] gap-2 px-4 py-3 border-b border-cyber-border/10
                transition-all duration-300 animate-slide-in
                ${player.isPlayer
                  ? 'bg-cyan-900/10 border-l-2 border-l-neon-cyan'
                  : 'hover:bg-cyber-surface/30'
                }
              `}
              style={{
                animationDelay: `${i * 0.1}s`,
                ...(player.isPlayer ? { boxShadow: 'inset 0 0 30px rgba(0,240,255,0.05)' } : {}),
              }}
            >
              {/* Rank */}
              <div className="flex items-center">
                {i === 0 ? (
                  <span className="text-lg font-black text-neon-amber text-glow-amber">
                    <Trophy size={18} />
                  </span>
                ) : (
                  <span className={`text-lg font-bold ${player.isPlayer ? 'text-neon-cyan' : 'text-cyber-text-dim'}`}>
                    {i + 1}
                  </span>
                )}
              </div>

              {/* Name */}
              <div className="flex items-center gap-2">
                {player.isPlayer && <User size={14} className="text-neon-cyan" />}
                <span className={`font-bold text-sm ${
                  player.isPlayer ? 'text-neon-cyan text-glow-cyan' : 'text-cyber-text'
                }`}>
                  {player.name}
                </span>
                {player.isPlayer && (
                  <span className="text-[9px] text-neon-cyan/60 uppercase tracking-wider border border-neon-cyan/20 px-1.5 rounded">
                    You
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
          ))}
        </div>

        {/* Next button */}
        <div className="text-center mt-8 animate-slide-in" style={{ animationDelay: '0.5s' }}>
          <button
            onClick={onNext}
            disabled={loading}
            className={`
              inline-flex items-center gap-2 px-8 py-3 rounded border-2 font-bold text-sm uppercase tracking-wider
              transition-all duration-300 cursor-pointer hover:scale-105
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
                Final Results
              </>
            ) : (
              <>
                Next Round
                <ChevronRight size={18} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Standings;
