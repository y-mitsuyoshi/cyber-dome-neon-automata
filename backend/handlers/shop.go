package handlers

import (
	"backend/engine"
	"encoding/json"
	"net/http"
)

// HandleGetShop returns current shop offerings for a specific player.
// GET /api/shop?gameId=XXX&playerName=YYY
func HandleGetShop(w http.ResponseWriter, r *http.Request) {
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
		playerName = "PLAYER_ONE"
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

	// Find the player to verify they exist
	var playerIndex = -1
	for idx, p := range gs.Players {
		if p.Name == playerName {
			playerIndex = idx
			break
		}
	}

	if playerIndex == -1 {
		writeError(w, http.StatusNotFound, "Player not found")
		return
	}

	shop, exists := gs.Shops[playerName]
	if !exists || shop == nil {
		writeError(w, http.StatusInternalServerError, "Shop not initialized for player")
		return
	}

	shop.Credits = gs.Players[playerIndex].Credits

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"cards":   shop.Cards,
		"credits": shop.Credits,
	})
}

// HandleBuyCard processes buying a card from a player's personal shop.
// POST /api/shop/buy
func HandleBuyCard(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "POST required")
		return
	}

	var req struct {
		GameID     string `json:"gameId"`
		PlayerName string `json:"playerName"`
		CardIndex  int    `json:"cardIndex"`
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

	if gs.Phase != "shop" {
		writeError(w, http.StatusBadRequest, "Not in shop phase")
		return
	}

	// Find player index
	playerIdx := -1
	for idx, p := range gs.Players {
		if p.Name == req.PlayerName {
			playerIdx = idx
			break
		}
	}

	if playerIdx == -1 {
		writeError(w, http.StatusNotFound, "Player not found")
		return
	}

	p := &gs.Players[playerIdx]
	shop, ok := gs.Shops[req.PlayerName]
	if !ok || shop == nil {
		writeError(w, http.StatusInternalServerError, "Shop state missing")
		return
	}

	credits, _, errMsg := engine.BuyCard(shop, &p.Deck, p.Credits, req.CardIndex)
	if errMsg != "" {
		writeError(w, http.StatusBadRequest, errMsg)
		return
	}

	p.Credits = credits
	shop.Credits = credits

	WritePlayerGameState(w, gs, req.PlayerName)
}

// HandleRerollShop regenerates the shop for 1 credit.
// POST /api/shop/reroll
func HandleRerollShop(w http.ResponseWriter, r *http.Request) {
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

	if gs.Phase != "shop" {
		writeError(w, http.StatusBadRequest, "Not in shop phase")
		return
	}

	playerIdx := -1
	for idx, p := range gs.Players {
		if p.Name == req.PlayerName {
			playerIdx = idx
			break
		}
	}

	if playerIdx == -1 {
		writeError(w, http.StatusNotFound, "Player not found")
		return
	}

	p := &gs.Players[playerIdx]
	shop, ok := gs.Shops[req.PlayerName]
	if !ok || shop == nil {
		writeError(w, http.StatusInternalServerError, "Shop state missing")
		return
	}

	credits, errMsg := engine.RerollShop(shop, p.Credits)
	if errMsg != "" {
		writeError(w, http.StatusBadRequest, errMsg)
		return
	}

	p.Credits = credits
	shop.Credits = credits

	WritePlayerGameState(w, gs, req.PlayerName)
}

// HandleDeleteCard removes a card from the player's deck. Costs 2 credits.
// POST /api/shop/delete
func HandleDeleteCard(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "POST required")
		return
	}

	var req struct {
		GameID     string `json:"gameId"`
		PlayerName string `json:"playerName"`
		CardIndex  int    `json:"cardIndex"`
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

	if gs.Phase != "shop" {
		writeError(w, http.StatusBadRequest, "Not in shop phase")
		return
	}

	playerIdx := -1
	for idx, p := range gs.Players {
		if p.Name == req.PlayerName {
			playerIdx = idx
			break
		}
	}

	if playerIdx == -1 {
		writeError(w, http.StatusNotFound, "Player not found")
		return
	}

	p := &gs.Players[playerIdx]

	credits, _, errMsg := engine.DeleteCard(&p.Deck, p.Credits, req.CardIndex)
	if errMsg != "" {
		writeError(w, http.StatusBadRequest, errMsg)
		return
	}

	p.Credits = credits
	if shop, ok := gs.Shops[req.PlayerName]; ok && shop != nil {
		shop.Credits = credits
	}

	WritePlayerGameState(w, gs, req.PlayerName)
}
