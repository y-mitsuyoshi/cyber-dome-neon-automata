import { Trophy, Medal, User } from 'lucide-react';
import type { Standing } from '../types/game';
import { useTranslation } from '../context/TranslationContext';
import { getRankVisual } from '../utils/rankStyle';

interface PodiumProps {
  top: Standing[];
  playerName?: string;
}

function Podium({ top, playerName }: PodiumProps) {
  const { t } = useTranslation();

  if (top.length < 3) return null;

  // Display order: [2nd, 1st, 3rd]
  const items = [
    { standing: top[1], rank: 2 },
    { standing: top[0], rank: 1 },
    { standing: top[2], rank: 3 },
  ];

  return (
    <div className="flex items-end justify-center gap-3 mb-8 animate-slide-in font-mono" style={{ animationDelay: '0.15s' }}>
      {items.map(({ standing, rank }) => {
        const visual = getRankVisual(rank);
        const heightClass = rank === 1 ? 'h-24' : rank === 2 ? 'h-16' : 'h-12';
        const isYou = standing.name === playerName;

        return (
          <div key={standing.name} className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1 min-w-0">
              {isYou && <User size={10} className="text-neon-cyan shrink-0" />}
              <span className={`text-[10px] font-bold truncate max-w-[80px] ${
                isYou ? 'text-neon-cyan' : visual.textClass
              }`}>
                {standing.name}
              </span>
              {isYou && (
                <span className="text-[7px] text-neon-cyan/60 uppercase tracking-wider border border-neon-cyan/20 px-0.5 rounded">
                  {t('youBadge')}
                </span>
              )}
            </div>

            <div
              className={`${heightClass} w-20 rounded-t-lg flex flex-col items-center justify-center gap-1 border ${visual.rowClass} ${visual.textClass}`}
              style={{
                animation: 'podiumRise 0.6s ease-out forwards',
                animationDelay: rank === 3 ? '0.1s' : rank === 2 ? '0.3s' : '0.5s',
                transformOrigin: 'bottom',
              }}
            >
              {visual.icon === 'trophy' ? (
                <Trophy size={20} />
              ) : (
                <Medal size={16} />
              )}
              <span className="text-[9px] font-bold">{standing.wins}W</span>
            </div>

            <span className="text-[8px] text-cyber-text-dim uppercase tracking-wider">
              {t(visual.labelKey)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default Podium;
