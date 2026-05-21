import type { GameState, Card } from '../types/game';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Raw responses from Go backend
interface RawPlayer {
  name: string;
  credits: number;
  deck: Card[];
  wins: number;
  fans: number;
}

interface RawShop {
  cards: Card[];
  credits: number;
}

interface RawBattleResult {
  winner: string;
  loser: string;
  reason: string;
  log: any[];
  fansGained: number;
}

interface RawGameState {
  gameId: string;
  currentRound: number;
  maxRounds: number;
  phase: 'shop' | 'battle' | 'results';
  player: RawPlayer;
  shop: RawShop;
  standings: any[];
  battleLog: any[];
  lastResult?: RawBattleResult;
}

function mapGameState(raw: RawGameState): GameState {
  // Determine opponent name
  let opponent = '';
  let battleResult = '';
  if (raw.lastResult) {
    const isPlayerWinner = raw.lastResult.winner === 'PLAYER_ONE';
    opponent = isPlayerWinner ? raw.lastResult.loser : raw.lastResult.winner;
    battleResult = isPlayerWinner 
      ? `VICTORY: Decrypted ${opponent}'s defense grid. (+${raw.lastResult.fansGained} Fans)`
      : `DEFEAT: Synaptic link hijacked by ${opponent}. (No fans gained)`;
  }

  return {
    gameId: raw.gameId,
    round: raw.currentRound,
    maxRounds: raw.maxRounds || 7,
    phase: raw.phase,
    credits: raw.player ? raw.player.credits : 0,
    deck: raw.player ? raw.player.deck : [],
    shopCards: raw.shop ? raw.shop.cards || [] : [],
    standings: raw.standings || [],
    battleLog: raw.battleLog || (raw.lastResult ? raw.lastResult.log : []) || [],
    battleResult,
    opponent,
  };
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API Error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function createNewGame(): Promise<GameState> {
  const raw = await apiFetch<RawGameState>('/api/game/new', { method: 'POST' });
  return mapGameState(raw);
}

export async function getGameState(gameId: string): Promise<GameState> {
  const raw = await apiFetch<RawGameState>(`/api/game/state?gameId=${gameId}`);
  return mapGameState(raw);
}

export async function getShop(gameId: string): Promise<{ cards: Card[]; credits: number }> {
  return apiFetch<{ cards: Card[]; credits: number }>(`/api/shop?gameId=${gameId}`);
}

export async function buyCard(gameId: string, cardIndex: number): Promise<GameState> {
  const raw = await apiFetch<RawGameState>('/api/shop/buy', {
    method: 'POST',
    body: JSON.stringify({ gameId, cardIndex }),
  });
  return mapGameState(raw);
}

export async function rerollShop(gameId: string): Promise<GameState> {
  const raw = await apiFetch<RawGameState>('/api/shop/reroll', {
    method: 'POST',
    body: JSON.stringify({ gameId }),
  });
  return mapGameState(raw);
}

export async function deleteCard(gameId: string, cardIndex: number): Promise<GameState> {
  const raw = await apiFetch<RawGameState>('/api/shop/delete', {
    method: 'POST',
    body: JSON.stringify({ gameId, cardIndex }),
  });
  return mapGameState(raw);
}

export async function startBattle(gameId: string): Promise<GameState> {
  const raw = await apiFetch<RawGameState>('/api/tournament/battle', {
    method: 'POST',
    body: JSON.stringify({ gameId }),
  });
  return mapGameState(raw);
}

export async function nextRound(gameId: string): Promise<GameState> {
  const raw = await apiFetch<RawGameState>('/api/tournament/next-round', {
    method: 'POST',
    body: JSON.stringify({ gameId }),
  });
  return mapGameState(raw);
}
