import { useState } from 'react';
import { Zap, Terminal, Plus, ArrowRight } from 'lucide-react';
import { useTranslation } from '../context/TranslationContext';

interface TitleScreenProps {
  onStartSolo: () => void;
  onCreateLobby: (name: string) => void;
  onJoinLobby: (code: string, name: string) => void;
  loading: boolean;
}

function TitleScreen({ onStartSolo, onCreateLobby, onJoinLobby, loading }: TitleScreenProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [hoveredSolo, setHoveredSolo] = useState(false);
  const [hoveredCreate, setHoveredCreate] = useState(false);
  const [hoveredJoin, setHoveredJoin] = useState(false);

  const { locale } = useTranslation();

  const getActiveName = () => name.trim() || 'PLAYER_ONE';

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    onJoinLobby(code.toUpperCase().trim(), getActiveName());
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
            {locale === 'ja' ? '/// システムオンライン ///' : '/// System Online ///'}
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
            {locale === 'ja' ? '電脳' : 'CYBER'}
          </span>
          <span className="text-neon-magenta text-glow-magenta">-</span>
          <span className="inline-block hover:animate-glitch">
            {locale === 'ja' ? 'ドーム' : 'DOME'}
          </span>
        </h1>

        {/* Subtitle */}
        <h2
          className="text-xl sm:text-2xl md:text-3xl font-light tracking-[0.3em] text-neon-magenta text-glow-magenta mb-4"
          style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
        >
          {locale === 'ja' ? 'ネオン・オートマタ' : 'Neon Automata'}
        </h2>

        {/* Name input card */}
        <div className="bg-cyber-surface/10 border border-cyber-border/40 p-4 rounded-md backdrop-blur-sm mb-6 max-w-sm mx-auto text-left relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-2 h-full bg-neon-cyan/40" />
          <label className="block text-[9px] font-mono uppercase tracking-[0.25em] text-neon-cyan text-glow-cyan mb-1.5 font-bold">
            {locale === 'ja' ? 'コバタントID注入 (表示名)' : 'Inject Combatant ID (Display Name)'}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.substring(0, 16))}
            placeholder={locale === 'ja' ? 'プレイヤー名' : 'COMBATANT_ONE'}
            className="w-full bg-cyber-darker border border-cyber-border/60 rounded px-3 py-2 text-xs text-neon-cyan text-glow-cyan font-mono focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan/20 transition-all uppercase placeholder-cyber-border/50"
          />
        </div>

        {/* Actions panel */}
        <div className="flex flex-col gap-4 max-w-sm mx-auto">
          {/* Jack In Solo */}
          <button
            onClick={onStartSolo}
            onMouseEnter={() => setHoveredSolo(true)}
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
            {locale === 'ja' ? 'ジャックイン (ソロモード)' : 'Jack In (Solo Mode)'}
          </button>

          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px bg-cyber-border/10" />
            <span className="text-[9px] font-mono text-cyber-border uppercase tracking-widest">
              {locale === 'ja' ? 'マルチプレイヤーマトリクス' : 'Multiplayer Matrix'}
            </span>
            <div className="flex-1 h-px bg-cyber-border/10" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Create Arena */}
            <button
              onClick={() => onCreateLobby(getActiveName())}
              onMouseEnter={() => setHoveredCreate(true)}
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
              {locale === 'ja' ? 'アリーナ生成' : 'Create Arena'}
            </button>

            {/* Join Arena */}
            <button
              onClick={() => setShowJoinModal(true)}
              onMouseEnter={() => setHoveredJoin(true)}
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
              {locale === 'ja' ? 'アリーナ参戦' : 'Join Arena'}
            </button>
          </div>
        </div>

        {/* Version info */}
        <div className="mt-12 text-[10px] text-cyber-border tracking-widest font-mono">
          v1.1.0 // {locale === 'ja' ? 'マルチプレイヤー接続有効化' : 'MULTIPLAYER GRID LAYER ACTIVE'}
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
              {locale === 'ja' ? 'アリーナキーに接続' : 'Connect to Arena Key'}
            </h3>

            <label className="block text-[8px] font-mono uppercase tracking-widest text-cyber-text-dim mb-1">
              {locale === 'ja' ? '6桁のアリーナコードを入力してください' : 'Enter 6-Character Arena Code'}
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().substring(0, 6))}
              placeholder="CYB-X9"
              className="w-full bg-cyber-dark border border-neon-cyan/30 rounded px-3 py-2 text-center text-xl font-bold tracking-[0.3em] text-neon-cyan text-glow-cyan focus:outline-none focus:border-neon-cyan font-mono uppercase mb-4"
              autoFocus
            />

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowJoinModal(false);
                  setCode('');
                }}
                className="px-4 py-2 border border-cyber-border text-cyber-text-dim rounded text-xs uppercase hover:bg-cyber-surface/10 cursor-pointer"
              >
                {locale === 'ja' ? 'キャンセル' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-neon-cyan text-cyber-dark font-bold rounded text-xs uppercase hover:bg-neon-cyan/80 cursor-pointer flex items-center gap-1.5"
              >
                {locale === 'ja' ? '接続確立' : 'Connect'} <ArrowRight size={12} />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default TitleScreen;
