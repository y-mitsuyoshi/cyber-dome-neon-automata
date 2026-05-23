package handlers

import (
	"backend/engine"
	"backend/models"
	"encoding/json"
	"math/rand"
	"net/http"
	"strings"
	"time"
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
	gs.Phase = "battle"

	source := rand.NewSource(time.Now().UnixNano())
	rng := rand.New(source)

	for _, pair := range gs.Matchups {
		p1Idx := pair[0]
		p2Idx := pair[1]

		// 1. Handle Bye Match
		if p1Idx == -1 || p2Idx == -1 {
			activeIdx := p1Idx
			if activeIdx == -1 {
				activeIdx = p2Idx
			}

			p := &gs.Players[activeIdx]
			p.Wins++
			p.Fans++

			res := models.BattleResult{
				Winner:     p.Name,
				Loser:      "BYE",
				Reason:     "No opponent matched this round (Bye)",
				FansGained: 1,
				Log: []models.BattleLogEntry{
					{
						Step:            1,
						Action:          "bye",
						Player:          p.Name,
						CurrentPower:    0,
						EffectTriggered: "none",
						Details:         p.Name + " received a bye in this round.",
					},
				},
			}

			gs.LastResults[p.Name] = &res
			gs.BattleLogs[p.Name] = res.Log
			continue
		}

		// 2. Handle Human/NPC vs Human/NPC Match
		p1 := &gs.Players[p1Idx]
		p2 := &gs.Players[p2Idx]

		// Ensure decks are not empty
		if len(p1.Deck) == 0 {
			p1.Deck = append(p1.Deck, engine.AllCards()[0].Clone())
		}
		if len(p2.Deck) == 0 {
			p2.Deck = append(p2.Deck, engine.AllCards()[0].Clone())
		}

		// Prepare cloned and shuffled decks
		deck1 := p1.CloneDeck()
		rng.Shuffle(len(deck1), func(i, j int) { deck1[i], deck1[j] = deck1[j], deck1[i] })

		deck2 := p2.CloneDeck()
		rng.Shuffle(len(deck2), func(i, j int) { deck2[i], deck2[j] = deck2[j], deck2[i] })

		// Run simulation
		result := engine.RunBattle(deck1, deck2)

		winnerName := p1.Name
		loserName := p2.Name

		if result.Winner == "player" { // deck1 won
			p1.Wins++
			p1.Fans += result.FansGained
		} else { // deck2 won
			p2.Wins++
			p2.Fans += result.FansGained
			winnerName = p2.Name
			loserName = p1.Name
		}

		// Build mapped logs replacing generic "player" / "cpu" with real names
		mappedLog := make([]models.BattleLogEntry, len(result.Log))
		for j, entry := range result.Log {
			mEntry := entry
			if entry.Player == "player" {
				mEntry.Player = p1.Name
			} else if entry.Player == "cpu" {
				mEntry.Player = p2.Name
			}

			if entry.FlagHolder == "player" {
				mEntry.FlagHolder = p1.Name
			} else if entry.FlagHolder == "cpu" {
				mEntry.FlagHolder = p2.Name
			}

			// Map names in details
			if entry.Details != "" {
				mEntry.Details = replaceStrings(entry.Details, "player", p1.Name)
				mEntry.Details = replaceStrings(mEntry.Details, "PLAYER", p1.Name)
				mEntry.Details = replaceStrings(mEntry.Details, "cpu", p2.Name)
				mEntry.Details = replaceStrings(mEntry.Details, "CPU", p2.Name)
			}
			mappedLog[j] = mEntry
		}

		battleRes := models.BattleResult{
			Winner:     winnerName,
			Loser:      loserName,
			Reason:     result.Reason,
			FansGained: result.FansGained,
			Log:        mappedLog,
		}

		// Save results for both combatants
		gs.LastResults[p1.Name] = &battleRes
		gs.BattleLogs[p1.Name] = mappedLog

		gs.LastResults[p2.Name] = &battleRes
		gs.BattleLogs[p2.Name] = mappedLog
	}

	// Advance phase to results and reset ready players for the standings screen
	gs.Phase = "results"
	gs.ReadyPlayers = make(map[string]bool)

	// Broadcast transition event to all connected clients
	go BroadcastGameStateBroadcast(gs)

	WritePlayerGameState(w, gs, req.PlayerName)
}

// Simple string replacement helper
func replaceStrings(s, old, new string) string {
	return strings.ReplaceAll(s, old, new)
}
