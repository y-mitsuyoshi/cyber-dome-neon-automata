package handlers

import (
	"net/http"

	"backend/brainclient"
	"backend/lobby"
)

// HandleShop returns an HTTP handler for shop-related requests.
// It accepts a brainclient.DecisionClient to optionally integrate with the external Brain Server.
func HandleShop(hub *lobby.Hub, decisionClient brainclient.DecisionClient) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Implementation for shop handling (e.g., reroll, buy, etc.)
		// This function should use the provided decisionClient for NPC decisions
		// and fall back to template AI if it's nil.
		w.WriteHeader(http.StatusNotImplemented)
	}
}
