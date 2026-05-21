package handlers

import (
	"backend/engine"
	"encoding/json"
	"net/http"
)

// HandleGetShop returns current shop offerings.
// GET /api/shop?gameId=XXX
func HandleGetShop(w http.ResponseWriter, r *http.Request) {
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

	if gs.Phase != "shop" {
		writeError(w, http.StatusBadRequest, "Not in shop phase")
		return
	}

	gs.Shop.Credits = gs.Player.Credits

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"cards":   gs.Shop.Cards,
		"credits": gs.Player.Credits,
	})
}

// HandleBuyCard processes buying a card from the shop.
// POST /api/shop/buy
func HandleBuyCard(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "POST required")
		return
	}

	var req struct {
		GameID    string `json:"gameId"`
		CardIndex int    `json:"cardIndex"`
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

	if gs.Phase != "shop" {
		writeError(w, http.StatusBadRequest, "Not in shop phase")
		return
	}

	credits, card, errMsg := engine.BuyCard(&gs.Shop, &gs.Player.Deck, gs.Player.Credits, req.CardIndex)
	if errMsg != "" {
		writeError(w, http.StatusBadRequest, errMsg)
		return
	}
	_ = card

	gs.Player.Credits = credits
	gs.Shop.Credits = credits

	WriteFullGameState(w, gs)
}

// HandleRerollShop regenerates the shop for 1 credit.
// POST /api/shop/reroll
func HandleRerollShop(w http.ResponseWriter, r *http.Request) {
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

	if gs.Phase != "shop" {
		writeError(w, http.StatusBadRequest, "Not in shop phase")
		return
	}

	credits, errMsg := engine.RerollShop(&gs.Shop, gs.Player.Credits)
	if errMsg != "" {
		writeError(w, http.StatusBadRequest, errMsg)
		return
	}

	gs.Player.Credits = credits
	gs.Shop.Credits = credits

	WriteFullGameState(w, gs)
}

// HandleDeleteCard removes a card from the player's deck. Costs 2 credits.
// POST /api/shop/delete
func HandleDeleteCard(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "POST required")
		return
	}

	var req struct {
		GameID    string `json:"gameId"`
		CardIndex int    `json:"cardIndex"`
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

	if gs.Phase != "shop" {
		writeError(w, http.StatusBadRequest, "Not in shop phase")
		return
	}

	credits, deleted, errMsg := engine.DeleteCard(&gs.Player.Deck, gs.Player.Credits, req.CardIndex)
	if errMsg != "" {
		writeError(w, http.StatusBadRequest, errMsg)
		return
	}
	_ = deleted // unused in generic full state response

	gs.Player.Credits = credits
	gs.Shop.Credits = credits

	WriteFullGameState(w, gs)
}

