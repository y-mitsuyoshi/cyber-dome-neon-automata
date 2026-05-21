export interface Card {
  id: string;
  name: string;
  attribute: 'Virus' | 'AI' | 'Hardware' | 'Netrunner';
  archetype: 'Aggro' | 'Combo' | 'Control';
  power: number;
  rarity: 'Common' | 'Rare' | 'Epic';
  effect: string;
  effectType: string;
  cost: number;
}

export interface BattleLogEntry {
  step: number;
  action: string;
  player: string;
  card: { name: string; power: number; attribute: string } | null;
  currentPower: number;
  effectTriggered: string;
  playerMemSlots: string[][];
  cpuMemSlots: string[][];
  playerDeckCount: number;
  cpuDeckCount: number;
  flagHolder: string;
}

export interface ShopState {
  cards: Card[];
  credits: number;
}

export interface GameState {
  gameId: string;
  round: number;
  maxRounds: number;
  phase: 'shop' | 'battle' | 'results';
  credits: number;
  deck: Card[];
  shopCards: Card[];
  standings: Standing[];
  battleLog: BattleLogEntry[];
  battleResult: string;
  opponent: string;
}

export interface Standing {
  name: string;
  wins: number;
  fans: number;
  isPlayer: boolean;
}
