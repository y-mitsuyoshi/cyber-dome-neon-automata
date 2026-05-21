package handlers

import (
	"backend/engine"
	"encoding/json"
	"math/rand"
	"net/http"
)

// HandleBattle runs the battle simulation for the current round.
// POST /api/tournament/battle
func HandleBattle(w http.ResponseWriter, r *http.Request) {
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

	if gs.Phase != "shop" && gs.Phase != "battle" {
		writeError(w, http.StatusBadRequest, "Cannot battle in phase: "+gs.Phase)
		return
	}

	if len(gs.Player.Deck) == 0 {
		writeError(w, http.StatusBadRequest, "Player has no cards in deck")
		return
	}

	// Select opponent: round-robin based on current round
	opponentIndex := (gs.CurrentRound - 1) % len(gs.NPCs)

	gs.Phase = "battle"

	// Prepare decks — clone and shuffle
	playerDeck := gs.Player.CloneDeck()
	gs.Player.ShuffleDeck()
	rand.Shuffle(len(playerDeck), func(i, j int) {
		playerDeck[i], playerDeck[j] = playerDeck[j], playerDeck[i]
	})

	cpuDeck := gs.NPCs[opponentIndex].CloneDeck()
	rand.Shuffle(len(cpuDeck), func(i, j int) {
		cpuDeck[i], cpuDeck[j] = cpuDeck[j], cpuDeck[i]
	})

	// Run the battle
	result := engine.RunBattle(playerDeck, cpuDeck)

	// Update standings based on result
	if result.Winner == "player" {
		gs.Player.Wins++
		gs.Player.Fans += result.FansGained
	} else {
		gs.NPCs[opponentIndex].Wins++
		gs.NPCs[opponentIndex].Fans += result.FansGained
	}

	// Run NPC vs NPC battles for the remaining NPCs
	npcResults := engine.RunNPCBattles(gs.NPCs, opponentIndex)
	_ = npcResults

	gs.BattleLog = result.Log
	gs.LastResult = &result
	gs.Phase = "results"
	WriteFullGameState(w, gs)
}

