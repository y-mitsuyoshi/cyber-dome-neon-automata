import { useState, useEffect } from 'react';
import { Zap, Terminal, Plus, ArrowRight, BookOpen, Users, Eye } from 'lucide-react';
import { useTranslation } from '../context/TranslationContext';
import { useAudio } from '../context/AudioContext';
import ManualModal from './ManualModal';

interface TitleScreenProps {
  onStartSolo: (name: string, playerCount: number) => void;
  onCreateLobby: (name: string, maxPlayers: number) => void;
  onJoinLobby: (code: string, name: string) => void;
  onSpectateLobby: (code: string, name: string) => void;
  loading: boolean;
}

function TitleScreen({ onStartSolo, onCreateLobby, onJoinLobby, onSpectateLobby, loading }: TitleScreenProps) {
  const { playSE } = useAudio();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [soloPlayerCount, setSoloPlayerCount] = useState(8);
  const [lobbyMaxPlayers, setLobbyMaxPlayers] = useState(8);
  const [showManualModal, setShowManualModal] = useState(false);
  const [spectateMode, setSpectateMode] = useState(false);
  const [hoveredSolo, setHoveredSolo] = useState(false);
  const [hoveredCreate, setHoveredCreate] = useState(false);
  const [hoveredJoin, setHoveredJoin] = useState(false);
  const [hoveredManual, setHoveredManual] = useState(false);

  const { t } = useTranslation();

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showJoinModal) { playSE('click'); setShowJoinModal(false); setCode(''); }
        else if (showManualModal) { playSE('click'); setShowManualModal(false); }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [showJoinModal, showManualModal, playSE]);

  const getActiveName = () => name.trim() || 'PLAYER_ONE';

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    playSE('click');
    const trimmedCode = code.toUpperCase().trim();
    if (spectateMode) {
      onSpectateLobby(trimmedCode, getActiveName());
    } else {
      onJoinLobby(trimmedCode, getActiveName());
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden cyber-grid p-4">
      {/* Animated grid background */}
      <div
        className="absolute inset-0 animate-grid-move pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0, 240, 255, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Radial gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 40%, rgba(0,240,255,0.08) 0%, transparent 60%), radial-gradient(circle at 30% 70%, rgba(255,0,255,0.05) 0%, transparent 50%)',
        }}
      />

      {/* Corner decorations */}
      <div className="absolute top-4 left-4 w-16 h-16 border-l-2 border-t-2 border-neon-cyan/30" />
      <div className="absolute top-4 right-4 w-16 h-16 border-r-2 border-t-2 border-neon-cyan/30" />
      <div className="absolute bottom-4 left-4 w-16 h-16 border-l-2 border-b-2 border-neon-magenta/30" />
      <div className="absolute bottom-4 right-4 w-16 h-16 border-r-2 border-b-2 border-neon-magenta/30" />

      {/* Main content */}
      <div className="relative z-10 text-center animate-fade-in w-full max-w-lg">
        {/* Pre-title */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <Terminal size={14} className="text-neon-cyan animate-pulse" />
          <span className="text-[10px] uppercase tracking-[0.5em] text-neon-cyan/60 font-bold">
            {t('systemOnline')}
          </span>
          <Terminal size={14} className="text-neon-cyan animate-pulse" />
        </div>

        {/* Main title - CYBER-DOME */}
        <h1
          className="text-6xl sm:text-8xl md:text-8xl font-black tracking-wider mb-1 text-neon-cyan animate-flicker text-glow-cyan select-none"
          style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            WebkitTextStroke: '1px rgba(0,240,255,0.3)',
          }}
        >
          <span className="inline-block hover:animate-glitch">
            {t('cyber')}
          </span>
          <span className="text-neon-magenta text-glow-magenta">-</span>
          <span className="inline-block hover:animate-glitch">
            {t('dome')}
          </span>
        </h1>

        {/* Subtitle */}
        <h2
          className="text-xl sm:text-2xl md:text-3xl font-light tracking-[0.3em] text-neon-magenta text-glow-magenta mb-4"
          style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
        >
          {t('neonAutomata')}
        </h2>

        {/* Name input card */}
        <div className="bg-cyber-surface/10 border border-cyber-border/40 p-4 rounded-md backdrop-blur-sm mb-6 max-w-sm mx-auto text-left relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-2 h-full bg-neon-cyan/40" />
          <label className="block text-[9px] font-mono uppercase tracking-[0.25em] text-neon-cyan text-glow-cyan mb-1.5 font-bold">
            {t('injectCombatantId')}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              // Limit to 16 runes (not UTF-16 code units) so Japanese names fit
              const v = e.target.value;
              const trimmed = Array.from(v).slice(0, 16).join('');
              setName(trimmed);
            }}
            placeholder={t('combatantPlaceholder')}
            className="w-full bg-cyber-darker border border-cyber-border/60 rounded px-3 py-2 text-xs text-neon-cyan text-glow-cyan font-mono focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan/20 transition-all placeholder-cyber-border/50"
          />
        </div>

        {/* Actions panel */}
        <div className="flex flex-col gap-4 max-w-sm mx-auto">
          {/* Jack In Solo */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2 text-[9px] font-mono uppercase tracking-widest text-cyber-text-dim">
              <span className="flex items-center gap-1.5"><Users size={11} className="text-neon-cyan/70" />{t('playerCountLabel') || 'Players'}</span>
              <div className="flex items-center gap-1">
                {[3, 4, 5, 6, 7, 8].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => { playSE('click'); setSoloPlayerCount(n); }}
                    onMouseEnter={() => playSE('hover')}
                    className={`w-6 h-6 rounded border text-[10px] font-bold transition-all cursor-pointer ${
                      soloPlayerCount === n
                        ? 'border-neon-cyan text-neon-cyan bg-neon-cyan/15 shadow-[0_0_8px_rgba(0,240,255,0.2)]'
                        : 'border-cyber-border/40 text-cyber-text-dim hover:text-neon-cyan hover:border-neon-cyan/50'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => { playSE('click'); onStartSolo(getActiveName(), soloPlayerCount); }}
              onMouseEnter={() => { setHoveredSolo(true); playSE('hover'); }}
              onMouseLeave={() => setHoveredSolo(false)}
              disabled={loading}
              className={`
                w-full py-3.5 rounded border-2 border-neon-cyan
                text-neon-cyan font-bold text-xs tracking-[0.2em] uppercase
                transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer
                ${loading ? 'opacity-50 cursor-wait' : ''}
                ${hoveredSolo ? 'bg-neon-cyan/15 scale-[1.03]' : 'bg-cyber-darker/60'}
              `}
              style={{
                boxShadow: hoveredSolo
                  ? '0 0 15px rgba(0,240,255,0.3), inset 0 0 10px rgba(0,240,255,0.1)'
                  : '0 0 5px rgba(0,240,255,0.1)',
              }}
            >
              <Zap size={14} className="animate-pulse" />
              {t('jackInSolo')}
            </button>
          </div>

          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px bg-cyber-border/10" />
            <span className="text-[9px] font-mono text-cyber-border uppercase tracking-widest">
              {t('multiplayerMatrix')}
            </span>
            <div className="flex-1 h-px bg-cyber-border/10" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Create Arena */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-end gap-1 text-[8px] font-mono uppercase tracking-widest text-cyber-text-dim">
                <span>{t('maxPlayersLabel') || 'Max'}</span>
                <div className="flex items-center gap-0.5">
                  {[3, 4, 5, 6, 7, 8].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => { playSE('click'); setLobbyMaxPlayers(n); }}
                      onMouseEnter={() => playSE('hover')}
                      className={`w-5 h-5 rounded border text-[9px] font-bold transition-all cursor-pointer ${
                        lobbyMaxPlayers === n
                          ? 'border-neon-magenta text-neon-magenta bg-neon-magenta/15'
                          : 'border-cyber-border/40 text-cyber-text-dim hover:text-neon-magenta'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => { playSE('click'); onCreateLobby(getActiveName(), lobbyMaxPlayers); }}
                onMouseEnter={() => { setHoveredCreate(true); playSE('hover'); }}
                onMouseLeave={() => setHoveredCreate(false)}
                disabled={loading}
                className={`
                  py-3 rounded border border-neon-magenta
                  text-neon-magenta font-bold text-[10px] tracking-[0.2em] uppercase
                  transition-all duration-300 flex items-center justify-center gap-1 cursor-pointer
                  ${loading ? 'opacity-50 cursor-wait' : ''}
                  ${hoveredCreate ? 'bg-neon-magenta/15 scale-[1.03]' : 'bg-cyber-darker/60'}
                `}
                style={{
                  boxShadow: hoveredCreate
                    ? '0 0 12px rgba(255,0,255,0.25)'
                    : 'none',
                }}
              >
                <Plus size={12} />
                {t('createArena')}
              </button>
            </div>

            {/* Join Arena */}
            <button
              onClick={() => { playSE('click'); setShowJoinModal(true); }}
              onMouseEnter={() => { setHoveredJoin(true); playSE('hover'); }}
              onMouseLeave={() => setHoveredJoin(false)}
              disabled={loading}
              className={`
                py-3 rounded border border-neon-cyan
                text-neon-cyan font-bold text-[10px] tracking-[0.2em] uppercase
                transition-all duration-300 flex items-center justify-center gap-1 cursor-pointer
                ${loading ? 'opacity-50 cursor-wait' : ''}
                ${hoveredJoin ? 'bg-neon-cyan/15 scale-[1.03]' : 'bg-cyber-darker/60'}
              `}
              style={{
                boxShadow: hoveredJoin
                  ? '0 0 12px rgba(0,240,255,0.25)'
                  : 'none',
              }}
            >
              <ArrowRight size={12} />
              {t('joinArena')}
            </button>
          </div>

          <button
            onClick={() => { playSE('click'); setShowManualModal(true); }}
            onMouseEnter={() => { setHoveredManual(true); playSE('hover'); }}
            onMouseLeave={() => setHoveredManual(false)}
            className={`
              mt-3 w-full py-3.5 px-4 rounded-lg border-2 border-neon-amber/80
              text-neon-amber font-mono font-bold text-xs tracking-[0.25em] uppercase
              transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer
              shadow-[0_0_12px_rgba(255,191,0,0.15)]
              ${hoveredManual
                ? 'bg-neon-amber/20 border-neon-amber text-glow-amber scale-[1.02] shadow-[0_0_20px_rgba(255,191,0,0.4)]'
                : 'bg-amber-950/20 hover:bg-amber-950/30'
              }
            `}
          >
            <BookOpen size={16} className={`transition-transform duration-300 ${hoveredManual ? 'scale-110 rotate-[-5deg]' : ''}`} />
            <span>{t('viewManual')}</span>
          </button>
        </div>

        {/* Version info */}
        <div className="mt-12 text-[10px] text-cyber-border tracking-widest font-mono">
          v1.1.0 // {t('multiplayerActive')}
        </div>
      </div>

      {/* JOIN ARENA CODE MODAL */}
      {showJoinModal && (
        <div
          className="fixed inset-0 z-50 bg-cyber-dark/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) { playSE('click'); setShowJoinModal(false); setCode(''); setSpectateMode(false); } }}
        >
          <form
            onSubmit={handleJoinSubmit}
            className="w-full max-w-sm bg-cyber-darker border border-neon-cyan/50 p-6 rounded shadow-2xl relative animate-slide-in"
          >
            <div className="absolute top-4 left-4 w-4 h-4 border-l-2 border-t-2 border-neon-cyan" />
            <div className="absolute bottom-4 right-4 w-4 h-4 border-r-2 border-b-2 border-neon-cyan" />

            <h3 className="text-sm uppercase tracking-[0.2em] text-neon-cyan text-glow-cyan font-bold mb-4 flex items-center gap-2">
              <Terminal size={14} />
              {t('connectToArenaKey')}
            </h3>

            <label className="block text-[8px] font-mono uppercase tracking-widest text-cyber-text-dim mb-1">
              {t('enter6CharSectorCode')}
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().substring(0, 6))}
              placeholder="CYB-X9"
              className="w-full bg-cyber-dark border border-neon-cyan/30 rounded px-3 py-2 text-center text-xl font-bold tracking-[0.3em] text-neon-cyan text-glow-cyan focus:outline-none focus:border-neon-cyan font-mono uppercase mb-4"
              autoFocus
            />

            {/* Spectator mode toggle */}
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="spectate-mode"
                checked={spectateMode}
                onChange={(e) => { playSE('click'); setSpectateMode(e.target.checked); }}
                className="w-3.5 h-3.5 accent-neon-magenta cursor-pointer"
              />
              <label htmlFor="spectate-mode" className="text-[10px] font-mono text-neon-magenta uppercase tracking-wider cursor-pointer flex items-center gap-1">
                <Eye size={12} />
                {t('spectatorMode')}
              </label>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  playSE('click');
                  setShowJoinModal(false);
                  setCode('');
                  setSpectateMode(false);
                }}
                className="px-4 py-2 border border-cyber-border text-cyber-text-dim rounded text-xs uppercase hover:bg-cyber-surface/10 cursor-pointer"
              >
                {t('cancelBtn')}
              </button>
              <button
                type="submit"
                className={`px-6 py-2 rounded text-xs uppercase cursor-pointer flex items-center gap-1.5 font-bold ${
                  spectateMode
                    ? 'bg-neon-magenta text-white hover:bg-neon-magenta/80'
                    : 'bg-neon-cyan text-cyber-dark hover:bg-neon-cyan/80'
                }`}
              >
                {spectateMode ? <Eye size={12} /> : <ArrowRight size={12} />}
                {spectateMode ? t('spectateBtn') : t('connectBtn')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MANUAL MODAL */}
      {showManualModal && (
        <ManualModal onClose={() => setShowManualModal(false)} />
      )}
    </div>
  );
}

export default TitleScreen;
