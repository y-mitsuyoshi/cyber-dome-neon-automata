package handlers

import (
	"encoding/json"
	"net/http"

	"backend/engine"
)

// GameHandler manages game state and NPC initialization.
func GameHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		game := getGame(r)
		if game == nil {
			writeError(w, "game not found", http.StatusNotFound)
			return
		}
		WritePlayerGameState(w, game.State)

	case http.MethodPost:
		// Create NPCs from available strategies
		for _, strategy := range engine.NPCStrategies {
			npc := engine.CreateNPC("npc-"+strategy.Name, strategy.Name)
			// Process NPC shop phase
			action, idx := engine.NPCShopPhase(npc)
			_ = action
			_ = idx
		}

		// Generate shop offers for the current player
		offers := engine.GenerateShop("player-1", 5)
		_ = offers

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":     "ok",
			"strategies": len(engine.NPCStrategies),
		})

	default:
		writeError(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}
