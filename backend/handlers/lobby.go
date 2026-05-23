package handlers

import (
	"backend/engine"
	"backend/lobby"
	"backend/models"
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
)

// Helper to write JSON in lobby
func lobbyWriteJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func lobbyWriteError(w http.ResponseWriter, status int, msg string) {
	lobbyWriteJSON(w, status, map[string]string{"error": msg})
}

// HandleCreateLobby creates a new lobby.
// POST /api/lobby/create
func HandleCreateLobby(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		lobbyWriteError(w, http.StatusMethodNotAllowed, "POST required")
		return
	}

	var req struct {
		PlayerName string `json:"playerName"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.PlayerName == "" {
		lobbyWriteError(w, http.StatusBadRequest, "PlayerName required")
		return
	}

	lob := lobby.GlobalLobbyManager.CreateLobby(req.PlayerName)
	lobbyWriteJSON(w, http.StatusOK, map[string]string{
		"code": lob.Code,
		"host": lob.Host,
	})
}

// HandleJoinLobby joins an existing lobby.
// POST /api/lobby/join
func HandleJoinLobby(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		lobbyWriteError(w, http.StatusMethodNotAllowed, "POST required")
		return
	}

	var req struct {
		Code       string `json:"code"`
		PlayerName string `json:"playerName"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Code == "" || req.PlayerName == "" {
		lobbyWriteError(w, http.StatusBadRequest, "Code and PlayerName required")
		return
	}

	lob, err := lobby.GlobalLobbyManager.JoinLobby(req.Code, req.PlayerName)
	if err != nil {
		lobbyWriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	lobbyWriteJSON(w, http.StatusOK, map[string]interface{}{
		"code":    lob.Code,
		"players": lob.Players,
		"host":    lob.Host,
	})
}

// HandleAddNPC adds an NPC to the lobby.
// POST /api/lobby/add-npc
func HandleAddNPC(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		lobbyWriteError(w, http.StatusMethodNotAllowed, "POST required")
		return
	}

	var req struct {
		Code string `json:"code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Code == "" {
		lobbyWriteError(w, http.StatusBadRequest, "Code required")
		return
	}

	lob := lobby.GlobalLobbyManager.GetLobby(req.Code)
	if lob == nil {
		lobbyWriteError(w, http.StatusNotFound, "Lobby not found")
		return
	}

	// Pick a random NPC name that isn't taken
	npcName := ""
	for _, name := range engine.NPCNames {
		taken := false
		for _, p := range lob.Players {
			if p.Name == name {
				taken = true
				break
			}
		}
		if !taken {
			npcName = name
			break
		}
	}

	// Fallback if all 10 are taken (should not happen since max size is 8)
	if npcName == "" {
		npcName = fmt.Sprintf("NPC_%d", rand.Intn(1000))
	}

	_, err := lobby.GlobalLobbyManager.AddNPC(req.Code, npcName)
	if err != nil {
		lobbyWriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Broadcast update
	lobby.GlobalHub.BroadcastLobbyState(req.Code)
	lobbyWriteJSON(w, http.StatusOK, map[string]bool{"success": true})
}

// HandleRemoveNPC removes an NPC from the lobby.
// POST /api/lobby/remove-npc
func HandleRemoveNPC(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		lobbyWriteError(w, http.StatusMethodNotAllowed, "POST required")
		return
	}

	var req struct {
		Code    string `json:"code"`
		NPCName string `json:"npcName"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Code == "" || req.NPCName == "" {
		lobbyWriteError(w, http.StatusBadRequest, "Code and NPCName required")
		return
	}

	_, err := lobby.GlobalLobbyManager.RemoveNPC(req.Code, req.NPCName)
	if err != nil {
		lobbyWriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Broadcast update
	lobby.GlobalHub.BroadcastLobbyState(req.Code)
	lobbyWriteJSON(w, http.StatusOK, map[string]bool{"success": true})
}

// HandleStartGame converts lobby to GameState and starts the tournament.
// POST /api/lobby/start
func HandleStartGame(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		lobbyWriteError(w, http.StatusMethodNotAllowed, "POST required")
		return
	}

	var req struct {
		Code string `json:"code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Code == "" {
		lobbyWriteError(w, http.StatusBadRequest, "Code required")
		return
	}

	lob := lobby.GlobalLobbyManager.GetLobby(req.Code)
	if lob == nil {
		lobbyWriteError(w, http.StatusNotFound, "Lobby not found")
		return
	}

	if len(lob.Players) < 3 {
		lobbyWriteError(w, http.StatusBadRequest, "Minimum 3 combatants required to start tournament")
		return
	}

	lob.Status = "playing"
	gameID := generateID()
	lob.GameID = gameID

	// Create symmetric Player objects for the tournament
	pool := engine.AllCards()
	players := make([]models.Player, len(lob.Players))
	shops := make(map[string]*models.ShopState)

	for i, lp := range lob.Players {
		var p models.Player
		if lp.IsNPC {
			// Choose a strategy: Aggro, Combo, or Control
			strat := engine.NPCStrategies[rand.Intn(len(engine.NPCStrategies))]
			p = engine.CreateNPC(lp.Name, strat)
		} else {
			// Symmetrical starting deck: 6 random cards
			startDeck := make([]models.Card, 6)
			for d := 0; d < 6; d++ {
				startDeck[d] = pool[rand.Intn(len(pool))].Clone()
			}
			p = models.Player{
				Name:    lp.Name,
				Credits: 10,
				Deck:    startDeck,
				Wins:    0,
				Fans:    0,
				IsNPC:   false,
			}
		}
		players[i] = p
		
		// Generate initial shop for each player
		shop := engine.GenerateShop(10)
		shops[lp.Name] = &shop
	}

	// Generate initial pairings for Round 1
	matchups := engine.GetMatchups(1, len(players))

	gs := &models.GameState{
		GameID:       gameID,
		LobbyCode:    lob.Code,
		CurrentRound: 1,
		MaxRounds:    7,
		Phase:        "shop",
		Players:      players,
		Shops:        shops,
		ReadyPlayers: make(map[string]bool),
		Matchups:     matchups,
		BattleLogs:   make(map[string][]models.BattleLogEntry),
		LastResults:  make(map[string]*models.BattleResult),
	}

	// Save to global game store
	GameStore.Lock()
	GameStore.Games[gameID] = gs
	GameStore.Unlock()

	// Broadcast starting event to all clients via WS
	lobby.GlobalHub.Broadcast(lob.Code, map[string]interface{}{
		"type": "game_starting",
		"data": map[string]string{
			"gameId": gameID,
		},
	})

	lobbyWriteJSON(w, http.StatusOK, map[string]string{
		"gameId": gameID,
	})
}
