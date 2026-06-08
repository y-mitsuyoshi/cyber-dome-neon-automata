package handlers

import (
	"backend/engine"
	"backend/lobby"
	"backend/models"
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"sort"
	"strings"
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

// buildStandings computes sorted standings from the current game state for a specific player view.
func buildStandings(gs *models.GameState, activePlayer string) []models.StandingsEntry {
	entries := make([]models.StandingsEntry, 0, len(gs.Players))
	for _, p := range gs.Players {
		entries = append(entries, models.StandingsEntry{
			Name:     p.Name,
			Wins:     p.Wins,
			Fans:     p.GetTotalFans(),
			IsPlayer: p.Name == activePlayer,
		})
	}

	var finalWinner, finalLoser string
	if gs.CurrentRound > gs.MaxRounds {
		for _, res := range gs.LastResults {
			if res != nil && res.Winner != "" && res.Winner != "BYE" {
				finalWinner = res.Winner
				finalLoser = res.Loser
				break
			}
		}
	}

	sort.Slice(entries, func(i, j int) bool {
		if finalWinner != "" {
			if entries[i].Name == finalWinner {
				return true
			}
			if entries[j].Name == finalWinner {
				return false
			}
			if entries[i].Name == finalLoser {
				if entries[j].Name == finalWinner {
					return false
				}
				return true
			}
			if entries[j].Name == finalLoser {
				if entries[i].Name == finalWinner {
					return true
				}
				return false
			}
		}
		if entries[i].Wins != entries[j].Wins {
			return entries[i].Wins > entries[j].Wins
		}
		return entries[i].Fans > entries[j].Fans
	})
	return entries
}

// getGame retrieves a game state by ID.
func getGame(gameID string) (*models.GameState, bool) {
	GameStore.RLock()
	defer GameStore.RUnlock()
	gs, ok := GameStore.Games[gameID]
	return gs, ok
}

// WritePlayerGameState returns the sliced game state tailored to a specific player's view.
func WritePlayerGameState(w http.ResponseWriter, gs *models.GameState, playerName string) {
	standings := buildStandings(gs, playerName)

	// Find the player
	var player models.Player
	found := false
	for _, p := range gs.Players {
		if p.Name == playerName {
			player = p
			found = true
			break
		}
	}

	if !found {
		writeError(w, http.StatusNotFound, "Player not found in game state")
		return
	}

	// Extract shop
	var shop models.ShopState
	if s, ok := gs.Shops[playerName]; ok && s != nil {
		shop = *s
	} else {
		shop = models.ShopState{Cards: []models.Card{}, Credits: player.Credits}
	}

	// Determine opponent name
	opponentName := ""
	playerIdx := -1
	for idx, p := range gs.Players {
		if p.Name == playerName {
			playerIdx = idx
			break
		}
	}

	if playerIdx != -1 && len(gs.Matchups) > 0 {
		for _, pair := range gs.Matchups {
			if pair[0] == playerIdx {
				if pair[1] == -1 {
					opponentName = "BYE"
				} else {
					opponentName = gs.Players[pair[1]].Name
				}
				break
			} else if pair[1] == playerIdx {
				if pair[0] == -1 {
					opponentName = "BYE"
				} else {
					opponentName = gs.Players[pair[0]].Name
				}
				break
			}
		}
	}

	// Determine battle log and result
	var lastResult *models.BattleResult = nil
	if res, ok := gs.LastResults[playerName]; ok {
		lastResult = res
	}
	var battleLog []models.BattleLogEntry = nil
	if l, ok := gs.BattleLogs[playerName]; ok {
		battleLog = l
	}

	// Format battleResult text
	battleResultText := ""
	if lastResult != nil {
		if lastResult.Winner == "BYE" {
			battleResultText = "BYE: Automatic win! (+1 Fan)"
		} else {
			isWinner := lastResult.Winner == playerName
			if isWinner {
				battleResultText = "VICTORY: Decrypted " + opponentName + "'s defense grid. (+" + fmt.Sprintf("%d", lastResult.FansGained) + " Fans)"
			} else {
				battleResultText = "DEFEAT: Synaptic link hijacked by " + opponentName + ". (No fans gained)"
			}
		}
	} else if opponentName == "BYE" && gs.Phase == "results" {
		battleResultText = "BYE: Automatic win! (+1 Fan)"
	}

	// Build summarized list of other players
	npcs := make([]map[string]interface{}, 0, len(gs.Players)-1)
	for _, p := range gs.Players {
		if p.Name != playerName {
			npcs = append(npcs, map[string]interface{}{
				"name":       p.Name,
				"strategy":   p.AIStrategy,
				"deckSize":   len(p.Deck),
				"wins":       p.Wins,
				"fans":       p.Fans,
				"isNpc":      p.IsNPC,
				"ready":      gs.ReadyPlayers[p.Name],
			})
		}
	}

	var battleSession *models.BattleSession = nil
	if session, ok := gs.BattleSessions[playerName]; ok {
		battleSession = session
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"gameId":       gs.GameID,
		"currentRound": gs.CurrentRound,
		"maxRounds":    gs.MaxRounds,
		"phase":        gs.Phase,
		"player": map[string]interface{}{
			"name":     player.Name,
			"credits":  player.Credits,
			"deck":     player.Deck,
			"hand":     player.Hand,
			"deckSize": len(player.Deck),
			"wins":     player.Wins,
			"fans":     player.GetTotalFans(),
		},
		"shop":          shop,
		"standings":     standings,
		"npcs":          npcs,
		"battleLog":     battleLog,
		"lastResult":    lastResult,
		"opponent":      opponentName,
		"battleResult":  battleResultText,
		"battleSession": battleSession,
	})
}

// BroadcastGameStateBroadcast broadcasts a phase transition update via WS.
func BroadcastGameStateBroadcast(lobbyCode string, phase string, round int) {
	if lobbyCode == "" {
		return
	}
	lobby.GlobalHub.Broadcast(lobbyCode, map[string]interface{}{
		"type": "state_update",
		"data": map[string]interface{}{
			"phase":        phase,
			"currentRound": round,
		},
	})
}

// HandleNewGame handles starting a solo offline game (backward compatible).
// POST /api/game/new
func HandleNewGame(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "POST required")
		return
	}

	var req struct {
		PlayerName string `json:"playerName"`
	}
	// Decode request body if present
	if r.Body != nil {
		_ = json.NewDecoder(r.Body).Decode(&req)
	}

	playerName := req.PlayerName
	if playerName == "" {
		playerName = "PLAYER_ONE"
	}

	gameID := generateID()

	// Create single player
	startDeck := engine.StarterDeck()

	player := models.Player{
		Name:    playerName,
		Credits: 10,
		Deck:    startDeck,
		Wins:    0,
		Fans:    0,
		IsNPC:   false,
	}

	// Create 7 NPCs to fill the tournament to 8 (solo mode)
	players := make([]models.Player, 8)
	players[0] = player

	for i := 1; i <= 7; i++ {
		name := engine.NPCNames[(i-1)%len(engine.NPCNames)]
		strat := engine.NPCStrategies[(i-1)%len(engine.NPCStrategies)]
		players[i] = engine.CreateNPC(name, strat)
	}

	matchups := engine.GetMatchups(1, len(players))

	deckA, deckB, deckC := engine.GenerateDeckPools()

	gs := &models.GameState{
		GameID:         gameID,
		HostName:       playerName,
		CurrentRound:   1,
		MaxRounds:      8,
		Phase:          "shop",
		Players:        players,
		Shops:          make(map[string]*models.ShopState),
		ReadyPlayers:   make(map[string]bool),
		Matchups:       matchups,
		BattleLogs:     make(map[string][]models.BattleLogEntry),
		LastResults:    make(map[string]*models.BattleResult),
		BattleSessions: make(map[string]*models.BattleSession),
		DeckAPool:      deckA,
		DeckBPool:      deckB,
		DeckCPool:      deckC,
	}

	// Generate initial shops and run NPC shops
	for i := range gs.Players {
		p := &gs.Players[i]
		if p.IsNPC {
			engine.NPCShopPhase(gs, p, 1)
		} else {
			shop := engine.GenerateShop(gs, 1)
			gs.Shops[p.Name] = &shop
		}
	}

	GameStore.Lock()
	GameStore.Games[gameID] = gs
	GameStore.Unlock()

	WritePlayerGameState(w, gs, playerName)
}

// HandleGameState returns the current player-centric game state.
// GET /api/game/state?gameId=XXX&playerName=YYY
func HandleGameState(w http.ResponseWriter, r *http.Request) {
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
		playerName = "PLAYER_ONE" // fallback for solo mode
	}

	gs, ok := getGame(gameID)
	if !ok {
		writeError(w, http.StatusNotFound, "Game not found")
		return
	}

	gs.Mu.Lock()
	defer gs.Mu.Unlock()

	WritePlayerGameState(w, gs, playerName)
}

// HandleNextRound advances to the next round once all human players are ready.
// POST /api/tournament/next-round
func HandleNextRound(w http.ResponseWriter, r *http.Request) {
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

	if gs.Phase != "results" {
		writeError(w, http.StatusBadRequest, "Cannot advance round — current phase is "+gs.Phase)
		return
	}

	// Mark current human player as ready
	gs.ReadyPlayers[req.PlayerName] = true

	// Count humans and ready humans
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

	// If all humans are ready, advance the round
	if readyCount >= humanCount {
		advanceRound(gs)
	}
	WritePlayerGameState(w, gs, req.PlayerName)
}

// HandleKickPlayer converts an unresponsive human player in an active game into an NPC, letting the game continue.
// POST /api/game/kick
func HandleKickPlayer(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "POST required")
		return
	}

	var req struct {
		GameID     string `json:"gameId"`
		HostName   string `json:"hostName"`
		TargetName string `json:"targetName"`
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

	// Verify hostName is indeed the host of the GameState
	if gs.HostName != req.HostName {
		writeError(w, http.StatusForbidden, "Only the host can execute kick commands")
		return
	}

	// Find the target player
	targetIdx := -1
	for idx, p := range gs.Players {
		if p.Name == req.TargetName {
			targetIdx = idx
			break
		}
	}

	if targetIdx == -1 {
		writeError(w, http.StatusNotFound, "Target player not found in game")
		return
	}

	targetPlayer := &gs.Players[targetIdx]
	if targetPlayer.IsNPC {
		writeError(w, http.StatusBadRequest, "Target is already an NPC bot")
		return
	}

	// Notify the kicked player via WebSocket before converting them
	if gs.LobbyCode != "" {
		lobby.GlobalHub.SendToPlayer(gs.LobbyCode, req.TargetName, map[string]interface{}{
			"type": "player_kicked",
			"data": map[string]string{
				"reason": "Kicked by host",
			},
		})
	}

	// Convert them to an NPC
	targetPlayer.IsNPC = true
	// Choose a strategy randomly
	targetPlayer.AIStrategy = engine.NPCStrategies[rand.Intn(len(engine.NPCStrategies))]
	
	// Mark them as ready in current round standby so they don't block
	gs.ReadyPlayers[req.TargetName] = true

	// Check if this conversion triggers the battle resolution or next round transition!
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

	if gs.Phase == "shop" {
		// If everyone is now ready, run battles
		if readyCount >= humanCount {
			resolveRound(gs)
		}
	} else if gs.Phase == "results" {
		// If everyone is now ready, advance round
		if readyCount >= humanCount {
			advanceRound(gs)
		}
	}

	WritePlayerGameState(w, gs, req.HostName)
}

// resolveRound starts the battle phase and simulates all matchups instantly.
func resolveRound(gs *models.GameState) {
	gs.Phase = "battle"
	gs.ReadyPlayers = make(map[string]bool)

	for _, pair := range gs.Matchups {
		p1Idx := pair[0]
		p2Idx := pair[1]

		// 1. Handle Bye Match (No active match, instant victory)
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

		// 2. Handle Actual Match
		p1 := &gs.Players[p1Idx]
		p2 := &gs.Players[p2Idx]

		if p1.IsNPC && p2.IsNPC {
			// Symmetrical simulation of NPC vs NPC using interactive battle engine
			session := engine.InitializeBattleSession(
				fmt.Sprintf("%s_vs_%s_r%d", p1.Name, p2.Name, gs.CurrentRound),
				p1.Name,
				p2.Name,
				p1.Deck,
				p2.Deck,
			)

			// Run StepBattle to completion (both are NPCs)
			for !session.IsFinished {
				engine.StepBattle(session, true, true)
			}

			// Finalize the result
			fansGained := 2
			if session.Step < 3 {
				fansGained = 1
			}

			// Check for Hero effect bonus (+2 Fans) if hero was winning card
			// We can scan the log details or simply check the winning card's effect
			// Let's check if the winning card has c_hero effect
			// Since we want to award Hero bonus:
			var winningCard *models.Card
			if len(session.ActiveCards) > 0 {
				winningCard = &session.ActiveCards[0]
			}
			if winningCard != nil && winningCard.EffectType == "hero" {
				fansGained += 2
			}

			winnerName := session.Winner
			for i := range gs.Players {
				if gs.Players[i].Name == winnerName {
					gs.Players[i].Wins++
					gs.Players[i].Fans += fansGained
				}
			}

			battleRes := models.BattleResult{
				Winner:     session.Winner,
				Loser:      session.Loser,
				Reason:     fmt.Sprintf("%s was defeated by %s.", session.Loser, session.Winner),
				FansGained: fansGained,
				Log:        session.Log,
			}

			gs.LastResults[p1.Name] = &battleRes
			gs.BattleLogs[p1.Name] = session.Log
			gs.LastResults[p2.Name] = &battleRes
			gs.BattleLogs[p2.Name] = session.Log
		} else {
			// Human is involved! Create an interactive battle session
			session := engine.InitializeBattleSession(
				fmt.Sprintf("%s_vs_%s_r%d", p1.Name, p2.Name, gs.CurrentRound),
				p1.Name,
				p2.Name,
				p1.Deck,
				p2.Deck,
			)
			gs.BattleSessions[p1.Name] = session
			gs.BattleSessions[p2.Name] = session
		}
	}

	// Broadcast transition event to all connected clients
	go BroadcastGameStateBroadcast(gs.LobbyCode, gs.Phase, gs.CurrentRound)
}

// adaptBattleResult replaces generic "player" and "cpu" strings with actual names
func adaptBattleResult(res *models.BattleResult, p1Name, p2Name string) {
	if res.Winner == "player" {
		res.Winner = p1Name
	} else if res.Winner == "cpu" {
		res.Winner = p2Name
	}

	if res.Loser == "player" {
		res.Loser = p1Name
	} else if res.Loser == "cpu" {
		res.Loser = p2Name
	}

	for i := range res.Log {
		entry := &res.Log[i]
		if entry.Player == "player" {
			entry.Player = p1Name
		} else if entry.Player == "cpu" {
			entry.Player = p2Name
		}

		if entry.FlagHolder == "player" {
			entry.FlagHolder = p1Name
		} else if entry.FlagHolder == "cpu" {
			entry.FlagHolder = p2Name
		}

		entry.Details = strings.ReplaceAll(entry.Details, "player", p1Name)
		entry.Details = strings.ReplaceAll(entry.Details, "cpu", p2Name)
		entry.Details = strings.ReplaceAll(entry.Details, "Player", p1Name)
		entry.Details = strings.ReplaceAll(entry.Details, "CPU", p2Name)

		entry.EffectTriggered = strings.ReplaceAll(entry.EffectTriggered, "player", p1Name)
		entry.EffectTriggered = strings.ReplaceAll(entry.EffectTriggered, "cpu", p2Name)
		entry.EffectTriggered = strings.ReplaceAll(entry.EffectTriggered, "Player", p1Name)
		entry.EffectTriggered = strings.ReplaceAll(entry.EffectTriggered, "CPU", p2Name)
	}
}

// checkAndAdvanceResults checks if all active battles have finished and advances the phase to results.
func checkAndAdvanceResults(gs *models.GameState) {
	if gs.Phase != "battle" {
		return
	}
	activeBattlesLeft := false
	for _, session := range gs.BattleSessions {
		if !session.IsFinished {
			activeBattlesLeft = true
			break
		}
	}

	if !activeBattlesLeft {
		gs.Phase = "results"
		gs.ReadyPlayers = make(map[string]bool)
		gs.BattleSessions = make(map[string]*models.BattleSession) // Clear sessions
		go BroadcastGameStateBroadcast(gs.LobbyCode, gs.Phase, gs.CurrentRound)
	}
}

// advanceRound increments the tournament round and transitions the phase to shop.
func advanceRound(gs *models.GameState) {
	if gs.CurrentRound >= gs.MaxRounds {
		gs.CurrentRound++ // Let round exceed maxRounds to trigger GameOver screen
		gs.Phase = "results"
	} else {
		gs.CurrentRound++

		// Reset ready players and results maps for the new round
		gs.ReadyPlayers = make(map[string]bool)
		gs.BattleLogs = make(map[string][]models.BattleLogEntry)
		gs.LastResults = make(map[string]*models.BattleResult)

		if gs.CurrentRound == gs.MaxRounds {
			// Finals! Pair up the top 2 players based on standings
			standings := buildStandings(gs, "")
			if len(standings) >= 2 {
				top1Name := standings[0].Name
				top2Name := standings[1].Name
				
				top1Idx := -1
				top2Idx := -1
				for idx, p := range gs.Players {
					if p.Name == top1Name {
						top1Idx = idx
					} else if p.Name == top2Name {
						top2Idx = idx
					}
				}
				gs.Matchups = [][2]int{ {top1Idx, top2Idx} }
			}
			// Start battle phase immediately for the finals
			resolveRound(gs)
		} else {
			gs.Phase = "shop"

			// Process shop phase start for everyone
			for i := range gs.Players {
				p := &gs.Players[i]
				p.Credits += 10 // Gain 10 shop credits

				if p.IsNPC {
					// Simulate symmetrical shop AI for NPCs!
					engine.NPCShopPhase(gs, p, gs.CurrentRound)
				} else {
					// Generate fresh shop for human players
					shop := engine.GenerateShop(gs, gs.CurrentRound)
					gs.Shops[p.Name] = &shop
				}
			}

			// Generate matchups for the new round
			gs.Matchups = engine.GetMatchups(gs.CurrentRound, len(gs.Players))
		}
	}

	// Broadcast new round state update to all players
	go BroadcastGameStateBroadcast(gs.LobbyCode, gs.Phase, gs.CurrentRound)
}
