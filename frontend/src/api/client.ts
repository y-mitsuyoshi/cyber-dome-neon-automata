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
  opponent?: string;
  battleResult?: string;
}

function mapGameState(raw: RawGameState): GameState {
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
    battleResult: raw.battleResult || '',
    opponent: raw.opponent || '',
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

// SOLO / OFFLINE ENTRYPOINT
export async function createNewGame(): Promise<GameState> {
  const raw = await apiFetch<RawGameState>('/api/game/new', { method: 'POST' });
  return mapGameState(raw);
}

// MULTIPLAYER COMPATIBLE ENDPOINTS
export async function getGameState(gameId: string, playerName: string): Promise<GameState> {
  const raw = await apiFetch<RawGameState>(`/api/game/state?gameId=${gameId}&playerName=${encodeURIComponent(playerName)}`);
  return mapGameState(raw);
}

export async function getShop(gameId: string, playerName: string): Promise<{ cards: Card[]; credits: number }> {
  return apiFetch<{ cards: Card[]; credits: number }>(`/api/shop?gameId=${gameId}&playerName=${encodeURIComponent(playerName)}`);
}

export async function buyCard(gameId: string, cardIndex: number, playerName: string): Promise<GameState> {
  const raw = await apiFetch<RawGameState>('/api/shop/buy', {
    method: 'POST',
    body: JSON.stringify({ gameId, cardIndex, playerName }),
  });
  return mapGameState(raw);
}

export async function rerollShop(gameId: string, playerName: string): Promise<GameState> {
  const raw = await apiFetch<RawGameState>('/api/shop/reroll', {
    method: 'POST',
    body: JSON.stringify({ gameId, playerName }),
  });
  return mapGameState(raw);
}

export async function deleteCard(gameId: string, cardIndex: number, playerName: string): Promise<GameState> {
  const raw = await apiFetch<RawGameState>('/api/shop/delete', {
    method: 'POST',
    body: JSON.stringify({ gameId, cardIndex, playerName }),
  });
  return mapGameState(raw);
}

export async function startBattle(gameId: string, playerName: string): Promise<GameState> {
  const raw = await apiFetch<RawGameState>('/api/tournament/battle', {
    method: 'POST',
    body: JSON.stringify({ gameId, playerName }),
  });
  return mapGameState(raw);
}

export async function nextRound(gameId: string, playerName: string): Promise<GameState> {
  const raw = await apiFetch<RawGameState>('/api/tournament/next-round', {
    method: 'POST',
    body: JSON.stringify({ gameId, playerName }),
  });
  return mapGameState(raw);
}

// LOBBY REST OPERATIONS
export interface RawLobbyState {
  code: string;
  players: { name: string; isNpc: boolean }[];
  host: string;
}

export async function createLobby(playerName: string): Promise<{ code: string; host: string }> {
  return apiFetch<{ code: string; host: string }>('/api/lobby/create', {
    method: 'POST',
    body: JSON.stringify({ playerName }),
  });
}

export async function joinLobby(code: string, playerName: string): Promise<RawLobbyState> {
  return apiFetch<RawLobbyState>('/api/lobby/join', {
    method: 'POST',
    body: JSON.stringify({ code, playerName }),
  });
}

export async function addNPC(code: string): Promise<void> {
  return apiFetch<void>('/api/lobby/add-npc', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export async function removeNPC(code: string, npcName: string): Promise<void> {
  return apiFetch<void>('/api/lobby/remove-npc', {
    method: 'POST',
    body: JSON.stringify({ code, npcName }),
  });
}

export async function startGame(code: string): Promise<{ gameId: string }> {
  return apiFetch<{ gameId: string }>('/api/lobby/start', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}
