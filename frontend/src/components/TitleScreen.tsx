import { useState } from 'react';
import { Zap, Terminal, Plus, ArrowRight, BookOpen } from 'lucide-react';
import { useTranslation } from '../context/TranslationContext';
import { useAudio } from '../context/AudioContext';
import ManualModal from './ManualModal';

interface TitleScreenProps {
  onStartSolo: (name: string) => void;
  onCreateLobby: (name: string) => void;
  onJoinLobby: (code: string, name: string, spectator: boolean) => void;
  loading: boolean;
}

function TitleScreen({ onStartSolo, onCreateLobby, onJoinLobby, loading }: TitleScreenProps) {
  const { playSE } = useAudio();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [spectate, setSpectate] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [hoveredSolo, setHoveredSolo] = useState(false);
  const [hoveredCreate, setHoveredCreate] = useState(false);
  const [hoveredJoin, setHoveredJoin] = useState(false);
  const [hoveredManual, setHoveredManual] = useState(false);

  const { t } = useTranslation();

  const getActiveName = () => name.trim() || 'PLAYER_ONE';

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    playSE('click');
    onJoinLobby(code.toUpperCase().trim(), getActiveName(), spectate);
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
            onChange={(e) => setName(e.target.value.substring(0, 16))}
            placeholder={t('combatantPlaceholder')}
            className="w-full bg-cyber-darker border border-cyber-border/60 rounded px-3 py-2 text-xs text-neon-cyan text-glow-cyan font-mono focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan/20 transition-all uppercase placeholder-cyber-border/50"
          />
        </div>

        {/* Actions panel */}
        <div className="flex flex-col gap-4 max-w-sm mx-auto">
          {/* Jack In Solo */}
          <button
            onClick={() => { playSE('click'); onStartSolo(getActiveName()); }}
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

          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px bg-cyber-border/10" />
            <span className="text-[9px] font-mono text-cyber-border uppercase tracking-widest">
              {t('multiplayerMatrix')}
            </span>
            <div className="flex-1 h-px bg-cyber-border/10" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Create Arena */}
            <button
              onClick={() => { playSE('click'); onCreateLobby(getActiveName()); }}
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
              mt-2 py-3 rounded border border-cyber-border/60
              text-cyber-border hover:text-neon-cyan font-bold text-[10px] tracking-[0.2em] uppercase
              transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer
              ${hoveredManual ? 'bg-neon-cyan/10 border-neon-cyan/50' : 'bg-transparent'}
            `}
          >
            <BookOpen size={14} />
            {t('viewManual')}
          </button>
        </div>

        {/* Version info */}
        <div className="mt-12 text-[10px] text-cyber-border tracking-widest font-mono">
          v1.1.0 // {t('multiplayerActive')}
        </div>
      </div>

      {/* JOIN ARENA CODE MODAL */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 bg-cyber-dark/80 backdrop-blur-sm flex items-center justify-center p-4">
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
              className="w-full bg-cyber-dark border border-neon-cyan/30 rounded px-3 py-2 text-center text-xl font-bold tracking-[0.3em] text-neon-cyan text-glow-cyan focus:outline-none focus:border-neon-cyan font-mono uppercase mb-3"
              autoFocus
            />

            {/* Spectator toggle */}
            <label className="flex items-center gap-2 mb-4 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={spectate}
                onChange={(e) => { playSE('click'); setSpectate(e.target.checked); }}
                className="sr-only"
              />
              <span className={`relative inline-block w-9 h-5 rounded-full border transition-all ${spectate ? 'bg-neon-magenta/30 border-neon-magenta' : 'bg-cyber-dark border-cyber-border/40'}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${spectate ? 'left-4 bg-neon-magenta shadow-[0_0_8px_rgba(255,0,255,0.6)]' : 'left-0.5 bg-cyber-text-dim'}`} />
              </span>
              <span className={`text-[10px] font-mono uppercase tracking-wider ${spectate ? 'text-neon-magenta text-glow-magenta' : 'text-cyber-text-dim'}`}>
                {t('spectateMode') || 'SPECTATE / 観戦モード'}
              </span>
            </label>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  playSE('click');
                  setShowJoinModal(false);
                  setCode('');
                }}
                className="px-4 py-2 border border-cyber-border text-cyber-text-dim rounded text-xs uppercase hover:bg-cyber-surface/10 cursor-pointer"
              >
                {t('cancelBtn')}
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-neon-cyan text-cyber-dark font-bold rounded text-xs uppercase hover:bg-neon-cyan/80 cursor-pointer flex items-center gap-1.5"
              >
                {t('connectBtn')} <ArrowRight size={12} />
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
