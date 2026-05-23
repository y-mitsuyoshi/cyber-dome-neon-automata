import { useEffect, useRef, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const getWsUrl = (code: string, name: string) => {
  const base = API_URL.replace(/^http/, 'ws');
  return `${base}/api/ws?code=${code}&name=${encodeURIComponent(name)}`;
};

export interface LobbyPlayer {
  name: string;
  isNpc: boolean;
}

export interface LobbyState {
  code: string;
  players: LobbyPlayer[];
  host: string;
  status: 'waiting' | 'playing' | 'finished';
}

export interface ChatMessage {
  from: string;
  text: string;
}

export const useWebSocket = (code: string | null, name: string | null) => {
  const [connected, setConnected] = useState(false);
  const [lobbyState, setLobbyState] = useState<LobbyState | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [gameId, setGameId] = useState<string | null>(null);
  const [phaseTrigger, setPhaseTrigger] = useState<{ phase: string; round: number } | null>(null);
  const [kicked, setKicked] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);

  const connect = () => {
    if (!code || !name) return;

    if (wsRef.current) {
      wsRef.current.close();
    }

    const wsUrl = getWsUrl(code, name);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      attemptRef.current = 0;
    };

    ws.onmessage = (event) => {
      // Handle potential batch messages split by newline
      const lines = event.data.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          
          switch (msg.type) {
            case 'lobby_state':
              setLobbyState(msg.data);
              break;
            case 'chat':
              setChatMessages((prev) => [...prev, msg.data]);
              break;
            case 'game_starting':
              setGameId(msg.data.gameId);
              break;
            case 'state_update':
              setPhaseTrigger(msg.data);
              break;
            case 'player_kicked':
              setKicked(true);
              break;
            default:
              // Safe ignored message type
              break;
          }
        } catch (err) {
          // Silent JSON parsing error handling
        }
      }
    };

    ws.onclose = () => {
      setConnected(false);
      
      // Auto reconnect with backoff
      if (code && name && attemptRef.current < 5) {
        const delay = Math.min(1000 * Math.pow(2, attemptRef.current), 10000);
        attemptRef.current += 1;
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      }
    };

    ws.onerror = () => {
      // Safe websocket connection error tracking
    };
  };

  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [code, name]);

  const sendChatMessage = (text: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'chat', text }));
    }
  };

  return {
    connected,
    lobbyState,
    chatMessages,
    gameId,
    phaseTrigger,
    kicked,
    sendChatMessage,
    resetTrigger: () => setPhaseTrigger(null),
    resetGameId: () => setGameId(null),
    resetKicked: () => setKicked(false),
  };
};
