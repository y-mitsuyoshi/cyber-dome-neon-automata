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

export interface BattleLogCard {
  id?: string;
  name: string;
  power: number;
  attribute: 'Virus' | 'AI' | 'Hardware' | 'Netrunner' | string;
}

export interface BattleLogEntry {
  step: number;
  action: string;
  player: string;
  card: BattleLogCard | null;
  p1Card: BattleLogCard | null;
  p2Card: BattleLogCard | null;
  p1Action: string;
  p2Action: string;
  currentPower: number;
  effectTriggered: string;
  playerMemSlots: string[];
  cpuMemSlots: string[];
  playerDeckCount: number;
  cpuDeckCount: number;
  playerHandCount: number;
  cpuHandCount: number;
  flagHolder: string;
  details: string;
}

export interface ShopState {
  cards: Card[];
  credits: number;
}

export interface BattleAction {
  playerName: string;
  actionType: 'PLAY' | 'DISCARD';
  cardId: string;
}

export interface MemorySlot {
  cardName: string;
  cards: Card[];
  count: number;
}

export interface BattleSession {
  sessionId: string;
  player1Name: string;
  player2Name: string;
  player1Hand: Card[];
  player2Hand: Card[];
  player1Mem: MemorySlot[];
  player2Mem: MemorySlot[];
  player1Discard: Card[];
  player2Discard: Card[];
  flagHolder: string;
  flagPower: number;
  step: number;
  pendingActions: Record<string, BattleAction>;
  isFinished: boolean;
  winner: string;
  loser: string;
  log: BattleLogEntry[];
}

export interface Standing {
  name: string;
  wins: number;
  fans: number;
  isPlayer: boolean;
}

export interface GameState {
  gameId: string;
  currentRound: number;
  maxRounds: number;
  phase: 'shop' | 'battle' | 'results';
  player: {
    name: string;
    credits: number;
    deck: Card[];
    hand: Card[];
    deckSize: number;
    wins: number;
    fans: number;
  };
  shop: ShopState;
  standings: Standing[];
  npcs: unknown[];
  battleLog: BattleLogEntry[];
  lastResult: unknown;
  opponent: string;
  battleResult: string;
  battleSession: BattleSession | null;
}
