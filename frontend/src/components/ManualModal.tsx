import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { X, BookOpen } from 'lucide-react';
import { useAudio } from '../context/AudioContext';

interface ManualModalProps {
  onClose: () => void;
}

export default function ManualModal({ onClose }: ManualModalProps) {
  const { playSE } = useAudio();
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch('/MANUAL.md')
      .then(res => res.text())
      .then(text => {
        setContent(text);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setContent('Failed to load manual data from archives.');
        setLoading(false);
      });
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-cyber-dark/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-4xl max-h-[85vh] bg-cyber-darker border-2 border-neon-cyan/40 p-6 rounded-lg shadow-[0_0_30px_rgba(0,240,255,0.15)] relative flex flex-col animate-slide-in">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 border-b border-neon-cyan/20 pb-4">
          <div className="flex items-center gap-3">
            <BookOpen className="text-neon-cyan animate-pulse" size={24} />
            <h2 className="text-xl font-black text-neon-cyan uppercase tracking-[0.2em] text-glow-cyan">
              SYSTEM MANUAL
            </h2>
          </div>
          <button
            onClick={() => { playSE('click'); onClose(); }}
            onMouseEnter={() => playSE('hover')}
            className="p-1 text-cyber-border hover:text-neon-cyan hover:bg-neon-cyan/10 rounded transition-all cursor-pointer"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 pr-4 text-cyber-text font-mono text-sm leading-relaxed scrollbar-thin scrollbar-thumb-neon-cyan/40 scrollbar-track-transparent">
          {loading ? (
            <div className="flex justify-center items-center h-full text-neon-cyan animate-pulse tracking-widest uppercase">
              Loading Data Archives...
            </div>
          ) : (
            <ReactMarkdown
              components={{
                h1: ({node, ...props}) => <h1 className="text-3xl font-black text-white tracking-widest mb-6 uppercase" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-xl font-bold text-neon-magenta mt-8 mb-4 border-b border-neon-magenta/30 pb-2 tracking-widest uppercase" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-lg font-bold text-neon-cyan mt-6 mb-3 tracking-wider" {...props} />,
                h4: ({node, ...props}) => <h4 className="text-base font-bold text-white mt-4 mb-2" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc pl-6 my-4 space-y-2 text-cyber-text-dim" {...props} />,
                li: ({node, ...props}) => <li className="marker:text-neon-cyan" {...props} />,
                p: ({node, ...props}) => <p className="mb-4 text-cyber-text leading-loose" {...props} />,
                hr: ({node, ...props}) => <hr className="border-cyber-border/30 my-8" {...props} />,
                strong: ({node, ...props}) => <strong className="text-neon-cyan font-bold" {...props} />,
              }}
            >
              {content}
            </ReactMarkdown>
          )}
        </div>
      </div>
    </div>
  );
}
