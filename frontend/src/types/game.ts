export interface Card {
  id: string;
  name: string;
  attribute: string; // Castle, City, Space, Movie, Shipwreck, Ghost, Fairground, None
  archetype?: string;
  power: number;
  rarity: string; // Common, Uncommon, Rare, Epic
  effect: string;
  effectType: string;
  cost: number;
  deck?: string; // A, B, C, Starter
  quantity?: number;
}

export interface BattleLogCard {
  id?: string;
  name: string;
  power: number;
  basePower?: number;
  attribute: string;
  effectType?: string;
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
  actionType: string; // e.g. "CHOOSE_CARD", "REORDER", "BANISH"
  cardIds?: string[];
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
  player1Deck: Card[];
  player2Deck: Card[];
  player1Mem: MemorySlot[];
  player2Mem: MemorySlot[];
  player1Discard: Card[];
  player2Discard: Card[];
  flagHolder: string;
  flagPower: number;
  step: number;
  isFinished: boolean;
  winner: string;
  loser: string;
  log: BattleLogEntry[];
  turnOwner: string;
  requiredAction: string; // "DRAW", "CHOOSE_REPORTER", "CHOOSE_BUTLER", etc.
  pendingActionPlayer: string; // Player name we are waiting for
  actionOptions: Card[];
  activeCards: Card[];
  challengerPower: number;
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
  npcs: any[];
  battleLog: BattleLogEntry[];
  lastResult: any;
  opponent: string;
  battleResult: string;
  battleSession: BattleSession | null;
  deckAPool: Card[];
  deckBPool: Card[];
  deckCPool: Card[];
}
