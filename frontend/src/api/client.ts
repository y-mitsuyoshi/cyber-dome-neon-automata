import type { GameState, Card, BattleSession, Standing, BattleLogEntry, NPC, BattleResult } from '../types/game';

const API_URL = import.meta.env.VITE_API_URL || '';

// Raw responses from Go backend
interface RawPlayer {
  name: string;
  credits: number;
  deck: Card[];
  hand: Card[];
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
  log: unknown[];
  fansGained: number;
}

interface RawGameState {
  gameId: string;
  currentRound: number;
  maxRounds: number;
  phase: 'shop' | 'battle' | 'results';
  player: RawPlayer;
  shop: RawShop;
  standings: unknown[];
  npcs: unknown[];
  battleLog: unknown[];
  lastResult?: RawBattleResult;
  opponent?: string;
  battleResult?: string;
  battleSession?: BattleSession;
  deckAPool?: Card[];
  deckBPool?: Card[];
  deckCPool?: Card[];
}

function mapGameState(raw: RawGameState): GameState {
  return {
    gameId: raw.gameId,
    currentRound: raw.currentRound,
    maxRounds: raw.maxRounds || 7,
    phase: raw.phase,
    player: raw.player ? {
      name: raw.player.name,
      credits: raw.player.credits,
      deck: raw.player.deck || [],
      hand: raw.player.hand || [],
      deckSize: raw.player.deck ? raw.player.deck.length : 0,
      wins: raw.player.wins,
      fans: raw.player.fans,
    } : { name: '', credits: 0, deck: [], hand: [], deckSize: 0, wins: 0, fans: 0 },
    shop: raw.shop ? {
      cards: raw.shop.cards || [],
      credits: raw.shop.credits || 0,
    } : { cards: [], credits: 0 },
    standings: (raw.standings || []) as Standing[],
    npcs: (raw.npcs || []) as NPC[],
    battleLog: (raw.battleLog || (raw.lastResult ? raw.lastResult.log : []) || []) as BattleLogEntry[],
    lastResult: raw.lastResult
      ? ({
          ...raw.lastResult,
          log: (raw.lastResult.log || []) as BattleLogEntry[],
        } as BattleResult)
      : null,
    opponent: raw.opponent || '',
    battleResult: raw.battleResult || '',
    battleSession: raw.battleSession || null,
    deckAPool: raw.deckAPool || [],
    deckBPool: raw.deckBPool || [],
    deckCPool: raw.deckCPool || [],
  };
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    let msg = text;
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed.error === 'string') {
        msg = parsed.error;
      }
    } catch {
      // ignore parse error, use raw text
    }
    throw new Error(msg);
  }
  return res.json();
}

// SOLO / OFFLINE ENTRYPOINT
export async function createNewGame(playerName: string): Promise<GameState> {
  const raw = await apiFetch<RawGameState>('/api/game/new', {
    method: 'POST',
    body: JSON.stringify({ playerName }),
  });
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

export async function stepBattle(gameId: string, playerName: string): Promise<GameState> {
  const raw = await apiFetch<RawGameState>('/api/battle/step', {
    method: 'POST',
    body: JSON.stringify({ gameId, playerName }),
  });
  return mapGameState(raw);
}

export async function submitBattleAction(
  gameId: string,
  playerName: string,
  actionType: string,
  cardIds: string[]
): Promise<GameState> {
  const raw = await apiFetch<RawGameState>('/api/battle/action', {
    method: 'POST',
    body: JSON.stringify({ gameId, playerName, actionType, cardIds }),
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

export async function completeBattle(gameId: string, playerName: string): Promise<GameState> {
  const raw = await apiFetch<RawGameState>('/api/battle/complete', {
    method: 'POST',
    body: JSON.stringify({ gameId, playerName }),
  });
  return mapGameState(raw);
}
