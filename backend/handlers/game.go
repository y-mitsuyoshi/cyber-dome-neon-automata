package handlers

import (
	"backend/engine"
	"backend/lobby"
	"backend/models"
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"sort"
	"sync"
)

// GameStore is the in-memory store for all active games.
var GameStore = struct {
	sync.RWMutex
	Games map[string]*models.GameState
}{
	Games: make(map[string]*models.GameState),
}

// generateID creates a simple random game ID.
func generateID() string {
	const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, 12)
	for i := range b {
		b[i] = chars[rand.Intn(len(chars))]
	}
	return string(b)
}

// writeJSON writes a JSON response.
func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// writeError writes a JSON error response.
func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

// buildStandings computes sorted standings from the current game state for a specific player view.
func buildStandings(gs *models.GameState, activePlayer string) []models.StandingsEntry {
	entries := make([]models.StandingsEntry, 0, len(gs.Players))
	for _, p := range gs.Players {
		entries = append(entries, models.StandingsEntry{
			Name:     p.Name,
			Wins:     p.Wins,
			Fans:     p.Fans,
			IsPlayer: p.Name == activePlayer,
		})
	}
	sort.Slice(entries, func(i, j int) bool {
		if entries[i].Wins != entries[j].Wins {
			return entries[i].Wins > entries[j].Wins
		}
		return entries[i].Fans > entries[j].Fans
	})
	return entries
}

// getGame retrieves a game state by ID.
func getGame(gameID string) (*models.GameState, bool) {
	GameStore.RLock()
	defer GameStore.RUnlock()
	gs, ok := GameStore.Games[gameID]
	return gs, ok
}

// WritePlayerGameState returns the sliced game state tailored to a specific player's view.
func WritePlayerGameState(w http.ResponseWriter, gs *models.GameState, playerName string) {
	gs.Standings = buildStandings(gs, playerName)

	// Find the player
	var player models.Player
	found := false
	for _, p := range gs.Players {
		if p.Name == playerName {
			player = p
			found = true
			break
		}
	}

	if !found {
		writeError(w, http.StatusNotFound, "Player not found in game state")
		return
	}

	// Extract shop
	var shop models.ShopState
	if s, ok := gs.Shops[playerName]; ok && s != nil {
		shop = *s
	} else {
		shop = models.ShopState{Cards: []models.Card{}, Credits: player.Credits}
	}

	// Determine opponent name
	opponentName := ""
	playerIdx := -1
	for idx, p := range gs.Players {
		if p.Name == playerName {
			playerIdx = idx
			break
		}
	}

	if playerIdx != -1 && len(gs.Matchups) > 0 {
		for _, pair := range gs.Matchups {
			if pair[0] == playerIdx {
				if pair[1] == -1 {
					opponentName = "BYE"
				} else {
					opponentName = gs.Players[pair[1]].Name
				}
				break
			} else if pair[1] == playerIdx {
				if pair[0] == -1 {
					opponentName = "BYE"
				} else {
					opponentName = gs.Players[pair[0]].Name
				}
				break
			}
		}
	}

	// Determine battle log and result
	var lastResult *models.BattleResult = nil
	if res, ok := gs.LastResults[playerName]; ok {
		lastResult = res
	}
	var battleLog []models.BattleLogEntry = nil
	if l, ok := gs.BattleLogs[playerName]; ok {
		battleLog = l
	}

	// Format battleResult text
	battleResultText := ""
	if lastResult != nil {
		if lastResult.Winner == "BYE" {
			battleResultText = "BYE: Automatic win! (+1 Fan)"
		} else {
			isWinner := lastResult.Winner == playerName
			if isWinner {
				battleResultText = "VICTORY: Decrypted " + opponentName + "'s defense grid. (+" + fmt.Sprintf("%d", lastResult.FansGained) + " Fans)"
			} else {
				battleResultText = "DEFEAT: Synaptic link hijacked by " + opponentName + ". (No fans gained)"
			}
		}
	} else if opponentName == "BYE" && gs.Phase == "results" {
		battleResultText = "BYE: Automatic win! (+1 Fan)"
	}

	// Build summarized list of other players
	npcs := make([]map[string]interface{}, 0, len(gs.Players)-1)
	for _, p := range gs.Players {
		if p.Name != playerName {
			npcs = append(npcs, map[string]interface{}{
				"name":       p.Name,
				"strategy":   p.AIStrategy,
				"deckSize":   len(p.Deck),
				"wins":       p.Wins,
				"fans":       p.Fans,
				"isNpc":      p.IsNPC,
				"ready":      gs.ReadyPlayers[p.Name],
			})
		}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"gameId":       gs.GameID,
		"currentRound": gs.CurrentRound,
		"maxRounds":    gs.MaxRounds,
		"phase":        gs.Phase,
		"player": map[string]interface{}{
			"name":     player.Name,
			"credits":  player.Credits,
			"deck":     player.Deck,
			"deckSize": len(player.Deck),
			"wins":     player.Wins,
			"fans":     player.Fans,
		},
		"shop":         shop,
		"standings":    gs.Standings,
		"npcs":         npcs,
		"battleLog":    battleLog,
		"lastResult":   lastResult,
		"opponent":     opponentName,
		"battleResult": battleResultText,
	})
}

// BroadcastGameStateBroadcast broadcasts a phase transition update via WS.
func BroadcastGameStateBroadcast(lobbyCode string, phase string, round int) {
	if lobbyCode == "" {
		return
	}
	lobby.GlobalHub.Broadcast(lobbyCode, map[string]interface{}{
		"type": "state_update",
		"data": map[string]interface{}{
			"phase":        phase,
			"currentRound": round,
		},
	})
}

// HandleNewGame handles starting a solo offline game (backward compatible).
// POST /api/game/new
func HandleNewGame(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "POST required")
		return
	}

	gameID := generateID()

	// Create single player
	pool := engine.AllCards()
	startDeck := make([]models.Card, 6)
	for i := 0; i < 6; i++ {
		startDeck[i] = pool[rand.Intn(len(pool))].Clone()
	}

	player := models.Player{
		Name:    "PLAYER_ONE",
		Credits: 10,
		Deck:    startDeck,
		Wins:    0,
		Fans:    0,
		IsNPC:   false,
	}

	// Create 7 NPCs to fill the tournament to 8 (solo mode)
	players := make([]models.Player, 8)
	players[0] = player

	for i := 1; i <= 7; i++ {
		name := engine.NPCNames[(i-1)%len(engine.NPCNames)]
		strat := engine.NPCStrategies[(i-1)%len(engine.NPCStrategies)]
		players[i] = engine.CreateNPC(name, strat)
	}

	shops := make(map[string]*models.ShopState)
	for _, p := range players {
		shop := engine.GenerateShop(10)
		shops[p.Name] = &shop
	}

	matchups := engine.GetMatchups(1, len(players))

	gs := &models.GameState{
		GameID:       gameID,
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

	GameStore.Lock()
	GameStore.Games[gameID] = gs
	GameStore.Unlock()

	WritePlayerGameState(w, gs, "PLAYER_ONE")
}

// HandleGameState returns the current player-centric game state.
// GET /api/game/state?gameId=XXX&playerName=YYY
func HandleGameState(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "GET required")
		return
	}

	gameID := r.URL.Query().Get("gameId")
	playerName := r.URL.Query().Get("playerName")
	if gameID == "" {
		writeError(w, http.StatusBadRequest, "gameId required")
		return
	}

	if playerName == "" {
		playerName = "PLAYER_ONE" // fallback for solo mode
	}

	gs, ok := getGame(gameID)
	if !ok {
		writeError(w, http.StatusNotFound, "Game not found")
		return
	}

	gs.Mu.Lock()
	defer gs.Mu.Unlock()

	WritePlayerGameState(w, gs, playerName)
}

// HandleNextRound advances to the next round once all human players are ready.
// POST /api/tournament/next-round
func HandleNextRound(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "POST required")
		return
	}

	var req struct {
		GameID     string `json:"gameId"`
		PlayerName string `json:"playerName"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.PlayerName == "" {
		req.PlayerName = "PLAYER_ONE"
	}

	gs, ok := getGame(req.GameID)
	if !ok {
		writeError(w, http.StatusNotFound, "Game not found")
		return
	}

	gs.Mu.Lock()
	defer gs.Mu.Unlock()

	if gs.Phase != "results" {
		writeError(w, http.StatusBadRequest, "Cannot advance round — current phase is "+gs.Phase)
		return
	}

	// Mark current human player as ready
	gs.ReadyPlayers[req.PlayerName] = true

	// Count humans and ready humans
	humanCount := 0
	readyCount := 0
	for _, p := range gs.Players {
		if !p.IsNPC {
			humanCount++
			if gs.ReadyPlayers[p.Name] {
				readyCount++
			}
		}
	}

	// If all humans are ready, advance the round
	if readyCount >= humanCount {
		if gs.CurrentRound >= gs.MaxRounds {
			// Tournament is over
			gs.CurrentRound++ // Let round exceed maxRounds to trigger GameOver screen
			gs.Phase = "results"
		} else {
			gs.CurrentRound++
			gs.Phase = "shop"

			// Reset ready players and results maps for the new round
			gs.ReadyPlayers = make(map[string]bool)
			gs.BattleLogs = make(map[string][]models.BattleLogEntry)
			gs.LastResults = make(map[string]*models.BattleResult)

			// Process shop phase start for everyone
			for i := range gs.Players {
				p := &gs.Players[i]
				p.Credits += 10 // Gain 10 shop credits

				if p.IsNPC {
					// Simulate symmetrical shop AI for NPCs!
					engine.NPCShopPhase(p)
				} else {
					// Generate fresh shop for human players
					shop := engine.GenerateShop(p.Credits)
					gs.Shops[p.Name] = &shop
				}
			}

			// Generate matchups for the new round
			gs.Matchups = engine.GetMatchups(gs.CurrentRound, len(gs.Players))
		}

		// Broadcast new round state update to all players
		go BroadcastGameStateBroadcast(gs.LobbyCode, gs.Phase, gs.CurrentRound)
	}
	WritePlayerGameState(w, gs, req.PlayerName)
}
