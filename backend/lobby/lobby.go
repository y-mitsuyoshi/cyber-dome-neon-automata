package lobby

import (
	"errors"
	"math/rand"
	"sync"
	"time"
)

// LobbyPlayer represents a player inside a lobby.
type LobbyPlayer struct {
	Name         string `json:"name"`
	IsNPC        bool   `json:"isNpc"`
	IsSpectator  bool   `json:"isSpectator"`
}

// IsCombatant reports whether this lobby member actually participates in the
// tournament (true for human players and NPCs, false for spectators).
func (p LobbyPlayer) IsCombatant() bool { return !p.IsSpectator }

// Lobby represents a game room.
type Lobby struct {
	Code      string                 `json:"code"`
	Players   []LobbyPlayer          `json:"players"`
	Host      string                 `json:"host"`
	GameID    string                 `json:"gameId,omitempty"`
	Status    string                 `json:"status"` // "waiting", "playing", "finished"
	CreatedAt time.Time              `json:"createdAt"`
	Clients   map[string]interface{} `json:"-"` // Maps player names to client connections (Client pointer, initialized in hub)
}

// LobbyManager handles all active lobbies in memory.
type LobbyManager struct {
	sync.RWMutex
	Lobbies map[string]*Lobby
}

// GlobalLobbyManager is the singleton instance.
var GlobalLobbyManager = &LobbyManager{
	Lobbies: make(map[string]*Lobby),
}

// GenerateCode generates a unique 6-character room code.
func (lm *LobbyManager) GenerateCode() string {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	for {
		b := make([]byte, 6)
		for i := range b {
			b[i] = chars[rand.Intn(len(chars))]
		}
		code := string(b)
		if _, exists := lm.Lobbies[code]; !exists {
			return code
		}
	}
}

// CreateLobby initializes a new lobby.
func (lm *LobbyManager) CreateLobby(hostName string) *Lobby {
	lm.Lock()
	defer lm.Unlock()

	code := lm.GenerateCode()
	lobby := &Lobby{
		Code: code,
		Players: []LobbyPlayer{
			{Name: hostName, IsNPC: false},
		},
		Host:      hostName,
		Status:    "waiting",
		CreatedAt: time.Now(),
		Clients:   make(map[string]interface{}),
	}
	lm.Lobbies[code] = lobby
	return lobby
}

// JoinLobby joins an existing lobby.
func (lm *LobbyManager) JoinLobby(code string, playerName string) (*Lobby, error) {
	return lm.JoinLobbyAsSpectator(code, playerName, false)
}

// JoinLobbyAsSpectator joins an existing lobby, optionally as a spectator.
// Spectators do not count toward the 8-player cap and are excluded from matchups.
func (lm *LobbyManager) JoinLobbyAsSpectator(code string, playerName string, spectator bool) (*Lobby, error) {
	lm.Lock()
	defer lm.Unlock()

	lobby, exists := lm.Lobbies[code]
	if !exists {
		return nil, errors.New("lobby not found")
	}

	if lobby.Status != "waiting" {
		return nil, errors.New("game has already started")
	}

	// Check for duplicate player names
	for _, p := range lobby.Players {
		if p.Name == playerName {
			return nil, errors.New("name already taken in this lobby")
		}
	}

	if spectator {
		// Spectators don't count toward the 8-combatant cap.
		lobby.Players = append(lobby.Players, LobbyPlayer{Name: playerName, IsNPC: false, IsSpectator: true})
		return lobby, nil
	}

	// Non-spectator: enforce the combatant cap.
	combatantCount := 0
	for _, p := range lobby.Players {
		if !p.IsSpectator {
			combatantCount++
		}
	}
	if combatantCount >= 8 {
		return nil, errors.New("lobby is full (max 8 combatants)")
	}

	lobby.Players = append(lobby.Players, LobbyPlayer{Name: playerName, IsNPC: false, IsSpectator: false})
	return lobby, nil
}

// LeaveLobby handles player departure.
func (lm *LobbyManager) LeaveLobby(code string, playerName string) (*Lobby, error) {
	lm.Lock()
	defer lm.Unlock()

	lobby, exists := lm.Lobbies[code]
	if !exists {
		return nil, errors.New("lobby not found")
	}

	// If game is in progress, do not remove combatant roster entries on WS
	// disconnect, just remove the client connection reference. Spectators,
	// however, can leave freely since they aren't part of the tournament.
	if lobby.Status == "playing" {
		delete(lobby.Clients, playerName)
		// Remove spectators even mid-game
		for i, p := range lobby.Players {
			if p.Name == playerName && p.IsSpectator {
				lobby.Players = append(lobby.Players[:i], lobby.Players[i+1:]...)
				break
			}
		}
		return lobby, nil
	}

	// Find and remove the player
	index := -1
	for i, p := range lobby.Players {
		if p.Name == playerName {
			index = i
			break
		}
	}

	if index != -1 {
		lobby.Players = append(lobby.Players[:index], lobby.Players[index+1:]...)
		delete(lobby.Clients, playerName)
	}

	// If empty, clean up the lobby
	if len(lobby.Players) == 0 {
		delete(lm.Lobbies, code)
		return nil, nil
	}

	// If the host left, assign a new host
	if lobby.Host == playerName {
		// Find first remaining human
		newHost := ""
		for _, p := range lobby.Players {
			if !p.IsNPC {
				newHost = p.Name
				break
			}
		}
		lobby.Host = newHost
	}

	return lobby, nil
}

// AddNPC adds an NPC to the lobby.
func (lm *LobbyManager) AddNPC(code string, npcName string) (*Lobby, error) {
	lm.Lock()
	defer lm.Unlock()

	lobby, exists := lm.Lobbies[code]
	if !exists {
		return nil, errors.New("lobby not found")
	}

	if lobby.Status != "waiting" {
		return nil, errors.New("game already started")
	}

	combatantCount := 0
	for _, p := range lobby.Players {
		if !p.IsSpectator {
			combatantCount++
		}
	}
	if combatantCount >= 8 {
		return nil, errors.New("lobby is full")
	}

	// Ensure unique NPC name
	for _, p := range lobby.Players {
		if p.Name == npcName {
			return nil, errors.New("npc name duplicate")
		}
	}

	lobby.Players = append(lobby.Players, LobbyPlayer{Name: npcName, IsNPC: true})
	return lobby, nil
}

// RemoveNPC removes an NPC from the lobby.
func (lm *LobbyManager) RemoveNPC(code string, npcName string) (*Lobby, error) {
	lm.Lock()
	defer lm.Unlock()

	lobby, exists := lm.Lobbies[code]
	if !exists {
		return nil, errors.New("lobby not found")
	}

	if lobby.Status != "waiting" {
		return nil, errors.New("game already started")
	}

	index := -1
	for i, p := range lobby.Players {
		if p.Name == npcName && p.IsNPC {
			index = i
			break
		}
	}

	if index == -1 {
		return nil, errors.New("npc not found in lobby")
	}

	lobby.Players = append(lobby.Players[:index], lobby.Players[index+1:]...)
	return lobby, nil
}

// GetLobby retrieves a lobby by code.
func (lm *LobbyManager) GetLobby(code string) *Lobby {
	lm.RLock()
	defer lm.RUnlock()
	return lm.Lobbies[code]
}

// StartLobbyGC starts a background sweeper to clean up lobbies created more than 2 hours ago to prevent memory bloat.
func StartLobbyGC(lm *LobbyManager) {
	ticker := time.NewTicker(30 * time.Minute)
	go func() {
		for range ticker.C {
			lm.Lock()
			now := time.Now()
			for code, lobby := range lm.Lobbies {
				if now.Sub(lobby.CreatedAt) > 2*time.Hour {
					delete(lm.Lobbies, code)
				}
			}
			lm.Unlock()
		}
	}()
}
