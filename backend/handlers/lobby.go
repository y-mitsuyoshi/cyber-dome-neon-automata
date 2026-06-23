package handlers

import (
	"net/http"

	"backend/engine"
)

// LobbyHandler handles HTTP requests for lobby operations.
func LobbyHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"lobby ready"}`))

	case http.MethodPost:
		// Fill lobby with NPCs from available strategies
		for _, strategy := range engine.NPCStrategies {
			npc := engine.CreateNPC("npc-"+strategy.Name, strategy.Name)
			_ = npc
		}
		w.WriteHeader(http.StatusCreated)
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"lobby created"}`))

	default:
		writeError(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}
