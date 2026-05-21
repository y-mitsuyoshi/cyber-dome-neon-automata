package handlers

import (
	"backend/engine"
	"backend/models"
	"encoding/json"
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

// buildStandings computes sorted standings from the current game state.
func buildStandings(gs *models.GameState) []models.StandingsEntry {
	entries := make([]models.StandingsEntry, 0, 8)
	entries = append(entries, models.StandingsEntry{
		Name:     gs.Player.Name,
		Wins:     gs.Player.Wins,
		Fans:     gs.Player.Fans,
		IsPlayer: true,
	})
	for _, npc := range gs.NPCs {
		entries = append(entries, models.StandingsEntry{
			Name:     npc.Name,
			Wins:     npc.Wins,
			Fans:     npc.Fans,
			IsPlayer: false,
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

// getGame retrieves a game state by ID from the request.
func getGame(gameID string) (*models.GameState, bool) {
	GameStore.RLock()
	defer GameStore.RUnlock()
	gs, ok := GameStore.Games[gameID]
	return gs, ok
}

// WriteFullGameState returns the complete game state to the client.
func WriteFullGameState(w http.ResponseWriter, gs *models.GameState) {
	gs.Standings = buildStandings(gs)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"gameId":       gs.GameID,
		"currentRound": gs.CurrentRound,
		"maxRounds":    gs.MaxRounds,
		"phase":        gs.Phase,
		"player": map[string]interface{}{
			"name":     gs.Player.Name,
			"credits":  gs.Player.Credits,
			"deck":     gs.Player.Deck,
			"deckSize": len(gs.Player.Deck),
			"wins":     gs.Player.Wins,
			"fans":     gs.Player.Fans,
		},
		"shop":       gs.Shop,
		"standings":  gs.Standings,
		"npcs":       npcSummaries(gs.NPCs),
		"lastResult": gs.LastResult,
	})
}

// HandleNewGame creates a new tournament game.
// POST /api/game/new
func HandleNewGame(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "POST required")
		return
	}

	gameID := generateID()

	// Create player with starting deck
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

	npcs := engine.CreateNPCs()
	shop := engine.GenerateShop(player.Credits)

	gs := &models.GameState{
		GameID:       gameID,
		CurrentRound: 1,
		MaxRounds:    7,
		Phase:        "shop",
		Player:       player,
		NPCs:         npcs,
		Shop:         shop,
	}

	GameStore.Lock()
	GameStore.Games[gameID] = gs
	GameStore.Unlock()

	WriteFullGameState(w, gs)
}

func npcSummaries(npcs []models.Player) []map[string]interface{} {
	result := make([]map[string]interface{}, len(npcs))
	for i, npc := range npcs {
		result[i] = map[string]interface{}{
			"name":       npc.Name,
			"strategy":   npc.AIStrategy,
			"deckSize":   len(npc.Deck),
			"wins":       npc.Wins,
			"fans":       npc.Fans,
		}
	}
	return result
}

// HandleGameState returns the current game state.
// GET /api/game/state?gameId=XXX
func HandleGameState(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "GET required")
		return
	}

	gameID := r.URL.Query().Get("gameId")
	if gameID == "" {
		writeError(w, http.StatusBadRequest, "gameId required")
		return
	}

	gs, ok := getGame(gameID)
	if !ok {
		writeError(w, http.StatusNotFound, "Game not found")
		return
	}

	gs.Mu.Lock()
	defer gs.Mu.Unlock()

	WriteFullGameState(w, gs)
}

// HandleNextRound advances to the next round.
// POST /api/tournament/next-round
func HandleNextRound(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "POST required")
		return
	}

	var req struct {
		GameID string `json:"gameId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
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

	if gs.CurrentRound >= gs.MaxRounds {
		// Tournament is over
		gs.CurrentRound++ // Let round exceed maxRounds to trigger GameOver screen on frontend
		gs.Phase = "results"
		WriteFullGameState(w, gs)
		return
	}

	gs.CurrentRound++
	gs.Phase = "shop"

	// Give player credits for new round
	gs.Player.Credits += 10

	// NPC shop phase — each NPC gains cards
	for i := range gs.NPCs {
		engine.NPCShopPhase(&gs.NPCs[i])
	}

	gs.Shop = engine.GenerateShop(gs.Player.Credits)
	gs.LastResult = nil

	WriteFullGameState(w, gs)
}

