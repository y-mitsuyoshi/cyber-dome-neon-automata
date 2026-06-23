package handlers

import (
	"encoding/json"
	"net/http"

	"backend/engine"
)

// writeError writes an error response.
func writeError(w http.ResponseWriter, message string, code int) {
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}

// getGame retrieves the game from the request context.
// This is a placeholder that should be replaced with actual session retrieval.
func getGame(r *http.Request) *engine.Game {
	return nil
}

// WritePlayerGameState writes the player's game state as JSON.
func WritePlayerGameState(w http.ResponseWriter, state interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(state)
}

// resolveRound resolves the current round.
func resolveRound(game *engine.Game) {
	// TODO: implement round resolution
}

// BattleHandler handles battle actions.
func BattleHandler(w http.ResponseWriter, r *http.Request) {
	game := getGame(r)
	if game == nil {
		writeError(w, "game not found", http.StatusNotFound)
		return
	}
	// TODO: process battle action
	WritePlayerGameState(w, game.State)
}
