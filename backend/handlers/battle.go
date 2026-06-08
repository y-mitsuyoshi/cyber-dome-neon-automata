package handlers

import (
	"backend/engine"
	"backend/lobby"
	"backend/models"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
)

// HandleBattle runs the battle phase initialization once all human players are ready.
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
		WritePlayerGameState(w, gs, req.PlayerName)
		return
	}

	// Symmetrical: all human players are ready! Run all matchups for the round
	resolveRound(gs)

	WritePlayerGameState(w, gs, req.PlayerName)
}

// HandleBattleAction handles interactive card playing and discarding decisions per step.
// POST /api/battle/action
func HandleBattleAction(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "POST required")
		return
	}

	var req struct {
		GameID     string `json:"gameId"`
		PlayerName string `json:"playerName"`
		ActionType string `json:"actionType"` // "PLAY" or "DISCARD"
		CardID     string `json:"cardId"`
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

	if gs.Phase != "battle" {
		writeError(w, http.StatusBadRequest, "Cannot play card during phase: "+gs.Phase)
		return
	}

	session, hasSession := gs.BattleSessions[req.PlayerName]
	if !hasSession || session == nil {
		writeError(w, http.StatusBadRequest, "Active interactive match session not found")
		return
	}

	if session.PendingActions[req.PlayerName] != nil {
		writeError(w, http.StatusBadRequest, "Action already committed for this step")
		return
	}

	// 1. Register the player's action
	action := &models.BattleAction{
		PlayerName: req.PlayerName,
		ActionType: req.ActionType,
		CardID:     req.CardID,
	}
	session.PendingActions[req.PlayerName] = action

	// 2. Identify the opponent
	opponentName := session.Player2Name
	if req.PlayerName == session.Player2Name {
		opponentName = session.Player1Name
	}

	// 3. Symmetrical: Check if opponent is an NPC bot. If so, immediately calculate and commit their move.
	var npcPlayer *models.Player
	for i := range gs.Players {
		if gs.Players[i].Name == opponentName && gs.Players[i].IsNPC {
			npcPlayer = &gs.Players[i]
			break
		}
	}

	if npcPlayer != nil {
		var npcHand []models.Card
		var npcMem []models.MemorySlot
		var playerMem []models.MemorySlot
		isChallenger := false

		if opponentName == session.Player1Name {
			npcHand = session.Player1Hand
			npcMem = session.Player1Mem
			playerMem = session.Player2Mem
			isChallenger = session.FlagHolder == session.Player2Name
		} else {
			npcHand = session.Player2Hand
			npcMem = session.Player2Mem
			playerMem = session.Player1Mem
			isChallenger = session.FlagHolder == session.Player1Name
		}

		npcAction := engine.EvaluateBestMove(npcHand, npcPlayer.AIStrategy, npcMem, playerMem, session.FlagPower, isChallenger)
		npcAction.PlayerName = opponentName
		session.PendingActions[opponentName] = &npcAction
	}

	// 4. If both decisions are committed, resolve the step
	p1Action := session.PendingActions[session.Player1Name]
	p2Action := session.PendingActions[session.Player2Name]

	if p1Action != nil && p2Action != nil {
		engine.StepBattle(session)

		// Synchronize Player hand data inside GameState so they represent the final state
		for i := range gs.Players {
			if gs.Players[i].Name == session.Player1Name {
				gs.Players[i].Hand = session.Player1Hand
				gs.Players[i].Deck = session.Player1Deck
			} else if gs.Players[i].Name == session.Player2Name {
				gs.Players[i].Hand = session.Player2Hand
				gs.Players[i].Deck = session.Player2Deck
			}
		}

		// Symmetrical: Handle battle termination
		if session.IsFinished {
			winnerName := session.Winner
			loserName := session.Loser
			fansGained := 2
			if session.Step < 3 {
				fansGained = 1 // Penalty for extremely swift matrix bypass
			}

			// Apply standings increases
			for i := range gs.Players {
				if gs.Players[i].Name == winnerName {
					gs.Players[i].Wins++
					gs.Players[i].Fans += fansGained
				}
			}

			battleRes := models.BattleResult{
				Winner:     winnerName,
				Loser:      loserName,
				Reason:     fmt.Sprintf("%s was bypassed or suffered fatal synaptic overflow.", loserName),
				FansGained: fansGained,
				Log:        session.Log,
			}

			gs.LastResults[session.Player1Name] = &battleRes
			gs.BattleLogs[session.Player1Name] = session.Log

			gs.LastResults[session.Player2Name] = &battleRes
			gs.BattleLogs[session.Player2Name] = session.Log

			// Purge the session from active sessions map
			delete(gs.BattleSessions, session.Player1Name)
			delete(gs.BattleSessions, session.Player2Name)

			// Broadcast matchup complete via WS
			if gs.LobbyCode != "" {
				lobby.GlobalHub.SendToPlayer(gs.LobbyCode, session.Player1Name, map[string]interface{}{"type": "battle_complete"})
				lobby.GlobalHub.SendToPlayer(gs.LobbyCode, session.Player2Name, map[string]interface{}{"type": "battle_complete"})
			}

			// Symmetrical: Evaluate round resolution advancement
			checkAndAdvanceResults(gs)
		} else {
			// Step advanced! Symmetrical WS Broadcast to both players to start render loops
			if gs.LobbyCode != "" {
				lobby.GlobalHub.SendToPlayer(gs.LobbyCode, session.Player1Name, map[string]interface{}{"type": "battle_step_advanced"})
				lobby.GlobalHub.SendToPlayer(gs.LobbyCode, session.Player2Name, map[string]interface{}{"type": "battle_step_advanced"})
			}
		}
	} else {
		// Only one player committed. Notify the opponent human player to show wait state
		if gs.LobbyCode != "" {
			lobby.GlobalHub.SendToPlayer(gs.LobbyCode, opponentName, map[string]interface{}{
				"type": "opponent_action_committed",
				"data": map[string]string{
					"playerName": req.PlayerName,
				},
			})
		}
	}

	WritePlayerGameState(w, gs, req.PlayerName)
}

// Simple string replacement helper
func replaceStrings(s, old, new string) string {
	return strings.ReplaceAll(s, old, new)
}

// HandleBattleComplete marks a player as ready to proceed from battle view to results screen.
// POST /api/battle/complete
func HandleBattleComplete(w http.ResponseWriter, r *http.Request) {
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

	if gs.Phase != "battle" {
		writeError(w, http.StatusBadRequest, "Cannot complete battle in phase: "+gs.Phase)
		return
	}

	// Mark caller as ready for results phase
	gs.ReadyPlayers[req.PlayerName] = true

	// Check if all human players are ready to proceed to results
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

	if readyCount >= humanCount {
		// All humans are ready, transition to results phase
		gs.Phase = "results"
		gs.ReadyPlayers = make(map[string]bool)
		gs.BattleSessions = make(map[string]*models.BattleSession) // Clear sessions
		
		go BroadcastGameStateBroadcast(gs.LobbyCode, gs.Phase, gs.CurrentRound)
	}

	WritePlayerGameState(w, gs, req.PlayerName)
}
