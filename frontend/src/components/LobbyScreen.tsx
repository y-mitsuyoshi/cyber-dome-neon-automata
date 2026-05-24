import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Users, User, ShieldAlert, Cpu, Send, Clipboard, Check } from 'lucide-react';
import { useTranslation } from '../context/TranslationContext';
import { useAudio } from '../context/AudioContext';
import type { LobbyState, ChatMessage } from '../hooks/useWebSocket';

interface LobbyScreenProps {
  lobbyState: LobbyState | null;
  playerName: string;
  chatMessages: ChatMessage[];
  connected: boolean;
  onSendChat: (text: string) => void;
  onAddNPC: () => void;
  onRemoveNPC: (npcName: string) => void;
  onStartGame: () => void;
  loading: boolean;
}

function LobbyScreen({
  lobbyState,
  playerName,
  chatMessages,
  connected,
  onSendChat,
  onAddNPC,
  onRemoveNPC,
  onStartGame,
  loading,
}: LobbyScreenProps) {
  const { playSE } = useAudio();
  const [chatInput, setChatInput] = useState('');
  const [copied, setCopied] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const { t } = useTranslation();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (chatMessages.length > 0) {
      playSE('hover');
    }
  }, [chatMessages]);

  if (!lobbyState) {
    return (
      <div className="min-h-screen bg-cyber-dark flex items-center justify-center">
        <div className="text-center">
          <span className="inline-block w-8 h-8 rounded-full border-4 border-neon-cyan border-t-transparent animate-spin mb-4" />
          <p className="text-sm font-bold uppercase tracking-widest text-neon-cyan animate-pulse font-mono">
            {t('establishingLink')}
          </p>
        </div>
      </div>
    );
  }

  const handleCopyCode = () => {
    playSE('click');
    navigator.clipboard.writeText(lobbyState.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    playSE('click');
    onSendChat(chatInput);
    setChatInput('');
  };

  const isHost = lobbyState.host === playerName;
  const totalPlayers = lobbyState.players.length;
  const canStart = totalPlayers >= 3 && totalPlayers <= 8;

  return (
    <div className="min-h-screen bg-cyber-dark cyber-grid relative overflow-hidden flex items-center justify-center p-4">
      {/* Visual Glitch Background overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
          backgroundSize: '100% 4px, 6px 100%',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 30%, rgba(0,240,255,0.08) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-6 bg-cyber-surface/20 border border-cyber-border/40 p-6 rounded-lg backdrop-blur-md shadow-2xl animate-fade-in">
        
        {/* TOP BAR / ROOM CODE DISPLAY */}
        <div className="col-span-12 flex flex-col sm:flex-row items-center justify-between border-b border-cyber-border/20 pb-4 mb-2">
          <div>
            <h2 className="text-2xl font-black tracking-[0.15em] text-neon-cyan text-glow-cyan flex items-center gap-2">
              <Users size={24} className="animate-pulse" />
              {t('arenaLobby')}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-neon-green animate-pulse' : 'bg-neon-red'}`} />
              <span className="text-[10px] uppercase tracking-widest text-cyber-text-dim font-mono">
                {connected 
                  ? t('syncLinkEstablished')
                  : t('syncOffline')}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 mt-4 sm:mt-0 font-mono">
            <span className="text-xs uppercase tracking-widest text-cyber-text-dim">
              {t('lobbyKey')}
            </span>
            <button
              onClick={handleCopyCode}
              onMouseEnter={() => playSE('hover')}
              className="flex items-center gap-2 bg-cyber-darker/80 border border-neon-cyan/40 px-4 py-2 rounded font-mono text-xl font-bold tracking-widest text-neon-cyan text-glow-cyan hover:bg-neon-cyan/15 hover:border-neon-cyan transition-all duration-300 relative group cursor-pointer"
            >
              {lobbyState.code}
              {copied ? <Check size={16} className="text-neon-green" /> : <Clipboard size={16} />}
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-cyber-darker text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border border-cyber-border opacity-0 group-hover:opacity-100 transition-opacity">
                {copied ? t('copied') : t('copyKey')}
              </span>
            </button>
          </div>
        </div>

        {/* LEFT COLUMN: ROSTER LIST */}
        <div className="col-span-12 md:col-span-7 flex flex-col">
          <div className="flex items-center justify-between mb-3 font-mono">
            <h3 className="text-xs uppercase tracking-widest text-cyber-text-dim font-bold flex items-center gap-1.5">
              <Terminal size={14} className="text-neon-cyan" />
              {t('combatantRoster', { count: totalPlayers })}
            </h3>
            <span className="text-[10px] text-neon-cyan/80 uppercase tracking-widest border border-neon-cyan/20 px-2 py-0.5 rounded">
              {t('min3Required')}
            </span>
          </div>

          <div className="flex-1 min-h-[300px] max-h-[300px] overflow-y-auto border border-cyber-border/20 rounded-md bg-cyber-darker/50 p-3 space-y-2">
            {lobbyState.players.map((p) => {
              const isMe = p.name === playerName;
              const isPlayerHost = p.name === lobbyState.host;

              return (
                <div
                  key={p.name}
                  className={`flex items-center justify-between p-2.5 rounded border transition-all duration-300 ${
                    isMe
                      ? 'border-neon-cyan/40 bg-neon-cyan/5'
                      : p.isNpc
                      ? 'border-neon-amber/20 bg-neon-amber/5'
                      : 'border-cyber-border/10 bg-cyber-surface/10 hover:bg-cyber-surface/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {p.isNpc ? (
                      <Cpu size={16} className="text-neon-amber animate-pulse" />
                    ) : (
                      <User size={16} className="text-neon-green" />
                    )}
                    
                    <span className={`font-bold text-sm ${
                      isMe ? 'text-neon-cyan text-glow-cyan' : p.isNpc ? 'text-neon-amber' : 'text-cyber-text'
                    }`}>
                      {p.name}
                    </span>

                    {isMe && (
                      <span className="text-[9px] font-mono uppercase tracking-wider bg-neon-cyan/25 border border-neon-cyan/40 px-1.5 py-0.1 rounded text-neon-cyan">
                        {t('youBadge')}
                      </span>
                    )}

                    {isPlayerHost && (
                      <span className="text-[9px] font-mono uppercase tracking-wider bg-neon-amber/25 border border-neon-amber/40 px-1.5 py-0.1 rounded text-neon-amber">
                        {t('hostBadge')}
                      </span>
                    )}
                  </div>

                  {/* Remove NPC option for Host */}
                  {isHost && p.isNpc && (
                    <button
                      onClick={() => { playSE('discard'); onRemoveNPC(p.name); }}
                      onMouseEnter={() => playSE('hover')}
                      className="text-[9px] font-bold uppercase tracking-wider border border-red-500/40 text-neon-red px-2 py-0.5 rounded hover:bg-red-500/10 transition-colors cursor-pointer font-mono"
                    >
                      {t('purgeBtn')}
                    </button>
                  )}
                </div>
              );
            })}

            {/* Empty slots placeholders */}
            {Array.from({ length: 8 - totalPlayers }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="border border-dashed border-cyber-border/20 p-2.5 rounded flex items-center justify-center text-xs text-cyber-text-dim/40 font-mono tracking-widest"
              >
                {t('emptySlot')}
              </div>
            ))}
          </div>

          {/* Add NPC Panel for Host */}
          {isHost && totalPlayers < 8 && (
            <button
              onClick={() => { playSE('click'); onAddNPC(); }}
              onMouseEnter={() => playSE('hover')}
              className="mt-3 w-full border border-neon-amber/40 text-neon-amber py-2 rounded text-xs font-bold uppercase tracking-wider hover:bg-neon-amber/15 hover:border-neon-amber transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-neon-amber/5 font-mono"
            >
              <Cpu size={14} className="animate-pulse" />
              {t('deployNpcBtn')}
            </button>
          )}
        </div>

        {/* RIGHT COLUMN: CHAT TERMINAL */}
        <div className="col-span-12 md:col-span-5 flex flex-col">
          <h3 className="text-xs uppercase tracking-widest text-cyber-text-dim font-bold mb-3 flex items-center gap-1.5 font-mono">
            <Terminal size={14} className="text-neon-cyan" />
            {t('commsChannel')}
          </h3>

          <div className="flex-1 min-h-[220px] max-h-[220px] overflow-y-auto border border-cyber-border/20 rounded-md bg-cyber-darker/60 p-3 mb-3 font-mono text-xs space-y-1.5 flex flex-col">
            {chatMessages.length === 0 ? (
              <div className="text-cyber-text-dim/30 italic my-auto text-center">
                {t('commsInitialized')}
              </div>
            ) : (
              chatMessages.map((m, i) => (
                <div key={i} className="leading-5">
                  <span className="text-neon-cyan font-bold">[{m.from}]:</span>{' '}
                  <span className="text-cyber-text break-all">{m.text}</span>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSendChat} className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={t('chatPlaceholder')}
              className="flex-1 bg-cyber-darker border border-cyber-border/40 rounded px-3 py-2 text-xs font-mono text-cyber-text focus:outline-none focus:border-neon-cyan transition-colors"
            />
            <button
              type="submit"
              onMouseEnter={() => playSE('hover')}
              className="bg-neon-cyan text-cyber-dark p-2 rounded hover:bg-neon-cyan/80 transition-colors flex items-center justify-center cursor-pointer"
            >
              <Send size={14} />
            </button>
          </form>
        </div>

        {/* BOTTOM ACTION PANEL */}
        <div className="col-span-12 border-t border-cyber-border/20 pt-6 mt-2 flex flex-col items-center justify-center">
          {isHost ? (
            <div className="text-center w-full max-w-md font-mono">
              <button
                onClick={() => { playSE('click'); onStartGame(); }}
                onMouseEnter={() => { if (canStart && !loading) playSE('hover'); }}
                disabled={!canStart || loading}
                className={`
                  w-full py-4 rounded border-2 font-black tracking-[0.2em] text-sm uppercase transition-all duration-300 cursor-pointer hover:scale-[1.02]
                  ${
                    canStart
                      ? 'border-neon-green text-neon-green hover:bg-neon-green/10 text-glow-green shadow-[0_0_25px_rgba(57,255,20,0.25)]'
                      : 'border-cyber-border/40 text-cyber-text-dim/40 cursor-not-allowed'
                  }
                `}
              >
                {loading ? (
                  <span className="animate-spin inline-block">⟳</span>
                ) : (
                  t('startTournament')
                )}
              </button>
              
              {!canStart && (
                <p className="text-[10px] font-mono text-neon-amber uppercase tracking-widest mt-2 animate-pulse">
                  <ShieldAlert size={10} className="inline mr-1 -mt-0.5" />
                  {t('gridLockError')}
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-2 flex items-center gap-3 bg-neon-cyan/5 border border-neon-cyan/20 px-6 rounded-md animate-pulse font-mono">
              <span className="inline-block w-2 h-2 rounded-full bg-neon-cyan animate-ping" />
              <span className="text-xs font-mono uppercase tracking-[0.2em] text-neon-cyan text-glow-cyan">
                {t('awaitingHostSignal')}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LobbyScreen;
