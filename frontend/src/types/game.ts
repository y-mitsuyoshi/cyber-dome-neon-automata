// Battle state received from the server via WebSocket
export interface BattleState {
  players: PlayerState[];
  currentTurn: string;
  phase: 'shop' | 'battle' | 'result';
  round: number;
}

// State for a single player in the battle
export interface PlayerState {
  id: string;
  name: string;
  hand: CardState[];
  field: CardState[];
  memory: MemorySlotState[];
  deckCount: number;
  credits: number;
  wins: number;
  fans: number;
}

// State for a single card (used in hand, field, etc.)
export interface CardState {
  id: string;
  cardDefId: string;
  name?: string;
  power?: number;
  isActive?: boolean;
}

// A memory slot that can stack multiple copies of the same card
export interface MemorySlotState {
  baseCardId: string;
  count: number;
}
