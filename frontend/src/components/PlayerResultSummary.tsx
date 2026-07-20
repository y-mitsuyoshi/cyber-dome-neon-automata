import { Trophy, Star, Zap } from 'lucide-react';
import { useCountUp } from '../hooks/useCountUp';
import { useTranslation } from '../context/TranslationContext';

interface PlayerResultSummaryProps {
  rank: number;
  wins: number;
  fans: number;
  isPodium: boolean;
}

function PlayerResultSummary({ rank, wins, fans, isPodium }: PlayerResultSummaryProps) {
  const { t } = useTranslation();
  const displayRank = useCountUp(rank, 800);
  const displayWins = useCountUp(wins, 600);
  const displayFans = useCountUp(fans, 1000);

  return (
    <div className="mb-8 animate-slide-in font-mono" style={{ animationDelay: '0.6s' }}>
      <div className="text-[10px] uppercase tracking-[0.4em] text-cyber-text-dim mb-3">
        {t('yourResultSummary')}
      </div>
      <div className="flex items-center justify-center gap-6">
        <div className="flex flex-col items-center gap-1">
          <Trophy size={16} className={isPodium ? 'text-neon-amber' : 'text-cyber-text-dim'} />
          <span className="text-2xl font-black text-cyber-text animate-count-up">
            #{displayRank}
          </span>
          <span className="text-[9px] text-cyber-text-dim uppercase tracking-wider">{t('rankHeader')}</span>
        </div>

        <div className="w-px h-10 bg-cyber-border/30" />

        <div className="flex flex-col items-center gap-1">
          <Zap size={16} className="text-neon-green" />
          <span className="text-2xl font-black text-cyber-text animate-count-up">
            {displayWins}
          </span>
          <span className="text-[9px] text-cyber-text-dim uppercase tracking-wider">{t('winsHeader')}</span>
        </div>

        <div className="w-px h-10 bg-cyber-border/30" />

        <div className="flex flex-col items-center gap-1">
          <Star size={16} className="text-neon-amber" />
          <span className="text-2xl font-black text-cyber-text animate-count-up">
            {displayFans}
          </span>
          <span className="text-[9px] text-cyber-text-dim uppercase tracking-wider">{t('fansHeader')}</span>
        </div>
      </div>
    </div>
  );
}

export default PlayerResultSummary;
