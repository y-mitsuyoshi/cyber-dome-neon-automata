import { useState } from 'react';
import { Zap, Terminal } from 'lucide-react';

interface TitleScreenProps {
  onStart: () => void;
  loading: boolean;
}

function TitleScreen({ onStart, loading }: TitleScreenProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden cyber-grid">
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
      <div className="relative z-10 text-center animate-fade-in">
        {/* Pre-title */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <Terminal size={14} className="text-neon-cyan" />
          <span className="text-[10px] uppercase tracking-[0.5em] text-neon-cyan/60 font-bold">
            /// System Online ///
          </span>
          <Terminal size={14} className="text-neon-cyan" />
        </div>

        {/* Main title - CYBER-DOME */}
        <h1
          className="text-6xl sm:text-8xl md:text-9xl font-black tracking-wider mb-2 text-neon-cyan animate-flicker text-glow-cyan select-none"
          style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            WebkitTextStroke: '1px rgba(0,240,255,0.3)',
          }}
        >
          <span className="inline-block hover:animate-glitch">CYBER</span>
          <span className="text-neon-magenta text-glow-magenta">-</span>
          <span className="inline-block hover:animate-glitch">DOME</span>
        </h1>

        {/* Subtitle */}
        <h2
          className="text-2xl sm:text-3xl md:text-4xl font-light tracking-[0.3em] text-neon-magenta text-glow-magenta mb-2"
          style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
        >
          Neon Automata
        </h2>

        {/* Decorative line */}
        <div className="flex items-center justify-center gap-3 my-6">
          <div className="w-24 h-px bg-gradient-to-r from-transparent to-neon-cyan/50" />
          <Zap size={16} className="text-neon-amber" />
          <div className="w-24 h-px bg-gradient-to-l from-transparent to-neon-cyan/50" />
        </div>

        {/* Tagline */}
        <p className="text-xs sm:text-sm text-cyber-text-dim tracking-wider mb-12 max-w-md mx-auto">
          Enter the arena. Build your deck. Dominate the grid.
        </p>

        {/* JACK IN Button */}
        <button
          onClick={onStart}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          disabled={loading}
          className={`
            relative group px-12 py-4 rounded border-2 border-neon-cyan
            text-neon-cyan font-bold text-lg tracking-[0.3em] uppercase
            transition-all duration-300
            ${loading ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
            ${hovered ? 'bg-neon-cyan/10 scale-105' : 'bg-transparent'}
          `}
          style={{
            boxShadow: hovered
              ? '0 0 20px rgba(0,240,255,0.4), 0 0 40px rgba(0,240,255,0.2), inset 0 0 20px rgba(0,240,255,0.1)'
              : '0 0 10px rgba(0,240,255,0.2), 0 0 20px rgba(0,240,255,0.1)',
          }}
        >
          {/* Button scanline */}
          <div className="absolute inset-0 rounded overflow-hidden pointer-events-none">
            <div
              className="absolute w-full h-px bg-neon-cyan/20"
              style={{ animation: 'scanline 3s linear infinite' }}
            />
          </div>

          {loading ? (
            <span className="flex items-center gap-3 justify-center">
              <span className="animate-spin">⟳</span>
              Initializing...
            </span>
          ) : (
            <>
              <Zap size={18} className="inline mr-2 -mt-0.5" />
              Jack In
            </>
          )}
        </button>

        {/* Version info */}
        <div className="mt-8 text-[10px] text-cyber-border tracking-widest">
          v1.0.0 // NEURAL-LINK ACTIVE
        </div>
      </div>

      {/* Bottom decorative bar */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-cyan/20 to-transparent" />
    </div>
  );
}

export default TitleScreen;
