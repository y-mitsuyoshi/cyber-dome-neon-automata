import { useState, useEffect, useCallback } from 'react';
import { Shield, Eye, Trophy, Star, Users, Sword, Zap, User } from 'lucide-react';
import { useTranslation } from '../context/TranslationContext';
import { useAudio } from '../context/AudioContext';
import type { SpectatorGameState, SpectatorBattleSession } from '../types/game';
import { getSpectatorGameState } from '../api/client';

interface SpectatorScreenProps {
  gameId: string;
  onExit: () => void;
}

function SpectatorScreen({ gameId, onExit }: SpectatorScreenProps) {
  const { t } = useTranslation();
  const { playSE } = useAudio();
  const [state, setState] = useState<SpectatorGameState | null>(null);
  const [selectedSession, setSelectedSession] = useState<SpectatorBattleSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchState = useCallback(async () => {
    try {
      const s = await getSpectatorGameState(gameId);
      setState(s);
      setError(null);
    } catch {
      setError(t('spectateError'));
    }
  }, [gameId, t]);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 3000);
    return () => clearInterval(interval);
  }, [fetchState]);

  if (error) {
    return (
      <div className="min-h-screen bg-cyber-dark flex items-center justify-center">
        <div className="text-center font-mono p-8 border border-neon-red/40 rounded-lg bg-red-950/10">
          <Shield size={32} className="text-neon-red mx-auto mb-4" />
          <p className="text-sm font-bold text-neon-red uppercase tracking-wider">{error}</p>
          <button
            onClick={onExit}
            className="mt-6 px-6 py-2 border border-neon-cyan/40 text-neon-cyan rounded text-xs uppercase tracking-wider hover:bg-neon-cyan/10 cursor-pointer"
          >
            {t('acknowledgeBtn')}
          </button>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="min-h-screen bg-cyber-dark flex items-center justify-center">
        <div className="text-center font-mono">
          <span className="inline-block w-8 h-8 rounded-full border-4 border-neon-cyan border-t-transparent animate-spin mb-4" />
          <p className="text-sm font-bold uppercase tracking-widest text-neon-cyan animate-pulse">
            {t('loadingSpectator')}
          </p>
        </div>
      </div>
    );
  }

  const sorted = [...state.standings].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.fans - a.fans;
  });

  const roundLabel = state.currentRound >= state.maxRounds
    ? t('finalsLabel')
    : `Round ${state.currentRound}/${state.maxRounds - 1}`;

  return (
    <div className="min-h-screen bg-cyber-dark cyber-grid relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 20%, rgba(255,0,255,0.06) 0%, transparent 60%)' }} />

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 font-mono">
          <div className="flex items-center gap-3">
            <Eye size={20} className="text-neon-magenta animate-pulse" />
            <h1 className="text-xl font-black tracking-[0.2em] uppercase text-neon-magenta text-glow-magenta">
              {t('spectatingSector')}
            </h1>
            <span className="text-[10px] text-cyber-text-dim border border-cyber-border/30 px-2 py-0.5 rounded">
              {roundLabel}
            </span>
          </div>
          <button
            onClick={() => { playSE('click'); onExit(); }}
            className="text-[10px] uppercase tracking-wider border border-cyber-border/40 text-cyber-text-dim px-3 py-1.5 rounded hover:border-neon-cyan hover:text-neon-cyan transition-colors cursor-pointer"
          >
            {t('cancelBtn')}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Standings column */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-2">
              <Trophy size={14} className="text-neon-amber" />
              <h2 className="text-[10px] uppercase tracking-widest text-cyber-text-dim font-bold font-mono">{t('standingsHeader')}</h2>
            </div>
            <div className="border border-cyber-border/30 rounded-lg overflow-hidden bg-cyber-surface/20 font-mono">
              <div className="grid grid-cols-[30px_1fr_40px_40px] gap-1 px-2 py-2 bg-cyber-darker/50 border-b border-cyber-border/20 text-[9px] text-cyber-text-dim font-bold uppercase tracking-wider">
                <span>#</span>
                <span className="truncate">{t('combatantHeader')}</span>
                <span className="text-center">{t('winsHeader')}</span>
                <span className="text-center">{t('fansHeader')}</span>
              </div>
              {sorted.map((p, i) => (
                <div
                  key={p.name}
                  className={`grid grid-cols-[30px_1fr_40px_40px] gap-1 px-2 py-2 border-b border-cyber-border/10 text-xs ${
                    p.isPlayer ? 'bg-cyan-900/10 border-l-2 border-l-neon-cyan' : 'hover:bg-cyber-surface/20'
                  }`}
                >
                  <div className="flex items-center">
                    {i === 0 ? <Trophy size={12} className="text-neon-amber" /> : <span className="text-cyber-text-dim">{i + 1}</span>}
                  </div>
                  <div className="flex items-center gap-1 min-w-0">
                    {p.isPlayer && <User size={10} className="text-neon-cyan shrink-0" />}
                    <span className={`truncate ${p.isPlayer ? 'text-neon-cyan font-bold' : 'text-cyber-text'}`}>{p.name}</span>
                  </div>
                  <div className="flex items-center justify-center text-cyber-text">{p.wins}</div>
                  <div className="flex items-center justify-center gap-0.5">
                    <Star size={9} className="text-neon-amber" />
                    <span className="text-cyber-text-dim">{p.fans}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Matchups & Battle Sessions */}
          <div className="lg:col-span-3 space-y-4">
            {/* Phase indicator */}
            <div className="flex items-center gap-3 mb-2 font-mono">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-[10px] font-bold uppercase tracking-wider ${
                state.phase === 'battle'
                  ? 'border-neon-red/40 text-neon-red bg-red-950/20'
                  : state.phase === 'shop'
                  ? 'border-neon-cyan/40 text-neon-cyan bg-cyan-950/20'
                  : 'border-neon-amber/40 text-neon-amber bg-amber-950/20'
              }`}>
                <Zap size={12} />
                {state.phase.toUpperCase()}
              </div>
              <span className="text-[9px] text-cyber-text-dim uppercase tracking-wider">
                ID: {gameId.slice(0, 8)}...
              </span>
            </div>

            {/* Matchups */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users size={14} className="text-neon-cyan" />
                <h2 className="text-[10px] uppercase tracking-widest text-cyber-text-dim font-bold font-mono">{t('matchupsHeader')}</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {state.matchups.map((m, i) => (
                  <div key={i} className="flex items-center gap-2 bg-cyber-darker/40 border border-cyber-border/20 rounded px-3 py-2 font-mono">
                    <span className={`text-xs truncate ${m.p1 === 'BYE' ? 'text-cyber-text-dim/40' : 'text-cyber-text'}`}>{m.p1}</span>
                    <Sword size={10} className="text-neon-magenta shrink-0" />
                    <span className={`text-xs truncate ${m.p2 === 'BYE' ? 'text-cyber-text-dim/40' : 'text-cyber-text'}`}>{m.p2}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Battles */}
            {state.battleSessions.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sword size={14} className="text-neon-red" />
                  <h2 className="text-[10px] uppercase tracking-widest text-cyber-text-dim font-bold font-mono">{t('activeEncounters')}</h2>
                </div>
                <div className="space-y-2">
                  {state.battleSessions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => { playSE('click'); setSelectedSession(selectedSession?.label === s.label ? null : s); }}
                      className={`w-full text-left border rounded-lg p-3 transition-all cursor-pointer font-mono ${
                        selectedSession?.label === s.label
                          ? 'border-neon-magenta bg-neon-magenta/10'
                          : 'border-cyber-border/20 bg-cyber-darker/30 hover:border-neon-cyan/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-bold truncate text-neon-cyan">{s.p1} vs {s.p2}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${
                          s.isFinished ? 'text-cyber-text-dim/40' : 'text-neon-green animate-pulse'
                        }`}>
                          {s.isFinished ? 'DONE' : `Step ${s.step}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-cyber-text-dim">
                        <span>Flag: <span className="text-neon-amber font-bold">{s.flagHolder || '—'}</span></span>
                        <span>POW: <span className="text-white font-bold">{s.flagPower}</span></span>
                      </div>
                      {selectedSession?.label === s.label && s.log.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-cyber-border/20 max-h-[200px] overflow-y-auto space-y-1">
                          {s.log.slice(-10).map((entry, li) => (
                            <div key={li} className="text-[9px] text-cyber-text-dim leading-tight">
                              <span className="text-neon-cyan">[{entry.player}]</span>{' '}
                              {entry.action}{entry.card ? `: ${entry.card.name} (${entry.card.power})` : ''}
                              {entry.effectTriggered && <span className="text-neon-amber"> [{entry.effectTriggered}]</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SpectatorScreen;