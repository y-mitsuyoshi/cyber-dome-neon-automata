package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
)

// HandleBattle runs the battle simulation for the current round once all human players click battle.
// POST /api/tournament/battle
func HandleBattle(w http.ResponseWriter, r *http.Request) {
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

	if gs.Phase != "shop" && gs.Phase != "battle" {
		writeError(w, http.StatusBadRequest, "Cannot battle in phase: "+gs.Phase)
		return
	}

	// Mark caller as ready for battle
	gs.ReadyPlayers[req.PlayerName] = true

	// Check if all human players are ready
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

	// If not all human players are ready, keep them in standby
	if readyCount < humanCount {
		gs.Mu.Unlock()
		WritePlayerGameState(w, gs, req.PlayerName)
		gs.Mu.Lock()
		return
	}

	// Symmetrical: all human players are ready! Run all matchups for the round
	resolveRound(gs)

	WritePlayerGameState(w, gs, req.PlayerName)
}

// Simple string replacement helper
func replaceStrings(s, old, new string) string {
	return strings.ReplaceAll(s, old, new)
}
