export type RankTier = 'gold' | 'silver' | 'bronze' | 'none';

export function rankTier(rank: number): RankTier {
  if (rank === 1) return 'gold';
  if (rank === 2) return 'silver';
  if (rank === 3) return 'bronze';
  return 'none';
}

export interface RankVisual {
  rowClass: string;
  textClass: string;
  icon: 'trophy' | 'medal' | null;
  labelKey: string;
}

export function getRankVisual(rank: number): RankVisual {
  switch (rankTier(rank)) {
    case 'gold':
      return {
        rowClass: 'bg-amber-900/10 border-l-2 border-l-neon-amber',
        textClass: 'text-neon-amber text-glow-amber',
        icon: 'trophy',
        labelKey: 'rankGold',
      };
    case 'silver':
      return {
        rowClass: 'bg-gray-900/10 border-l-2 border-l-gray-400/50',
        textClass: 'text-gray-300',
        icon: 'medal',
        labelKey: 'rankSilver',
      };
    case 'bronze':
      return {
        rowClass: 'bg-amber-900/5 border-l-2 border-l-amber-700/50',
        textClass: 'text-amber-600',
        icon: 'medal',
        labelKey: 'rankBronze',
      };
    default:
      return {
        rowClass: '',
        textClass: 'text-cyber-text-dim',
        icon: null,
        labelKey: '',
      };
  }
}
