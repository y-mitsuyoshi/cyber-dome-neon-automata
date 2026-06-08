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

	// All human players are ready! Run all matchups for the round
	resolveRound(gs)

	WritePlayerGameState(w, gs, req.PlayerName)
}

// HandleBattleStep advances the battle by drawing a card.
// POST /api/battle/step
func HandleBattleStep(w http.ResponseWriter, r *http.Request) {
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

	gs, ok := getGame(req.GameID)
	if !ok {
		writeError(w, http.StatusNotFound, "Game not found")
		return
	}

	gs.Mu.Lock()
	defer gs.Mu.Unlock()

	if gs.Phase != "battle" {
		writeError(w, http.StatusBadRequest, "Not in battle phase")
		return
	}

	session, hasSession := gs.BattleSessions[req.PlayerName]
	if !hasSession || session == nil {
		writeError(w, http.StatusBadRequest, "Battle session not found")
		return
	}

	if session.IsFinished {
		writeError(w, http.StatusBadRequest, "Battle is already finished")
		return
	}

	if session.RequiredAction != "DRAW" {
		writeError(w, http.StatusBadRequest, "An action choice is required: " + session.RequiredAction)
		return
	}

	// Identify NPC status
	var isP1NPC, isP2NPC bool
	for _, p := range gs.Players {
		if p.Name == session.Player1Name {
			isP1NPC = p.IsNPC
		} else if p.Name == session.Player2Name {
			isP2NPC = p.IsNPC
		}
	}

	// Step the battle
	engine.StepBattle(session, isP1NPC, isP2NPC)

	// If battle has finished, finalize it
	if session.IsFinished {
		finalizeBattleSession(gs, session)
	} else {
		// Symmetrical WS Broadcast to start render updates
		if gs.LobbyCode != "" {
			lobby.GlobalHub.SendToPlayer(gs.LobbyCode, session.Player1Name, map[string]interface{}{"type": "battle_step_advanced"})
			lobby.GlobalHub.SendToPlayer(gs.LobbyCode, session.Player2Name, map[string]interface{}{"type": "battle_step_advanced"})
		}
	}

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
		GameID     string   `json:"gameId"`
		PlayerName string   `json:"playerName"`
		ActionType string   `json:"actionType"`
		CardIDs    []string `json:"cardIds"`
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
		writeError(w, http.StatusBadRequest, "Cannot play action during phase: "+gs.Phase)
		return
	}

	session, hasSession := gs.BattleSessions[req.PlayerName]
	if !hasSession || session == nil {
		writeError(w, http.StatusBadRequest, "Active interactive match session not found")
		return
	}

	if session.IsFinished {
		writeError(w, http.StatusBadRequest, "Battle is already finished")
		return
	}

	// Verify the action is from the expected pending player
	if req.PlayerName != session.PendingActionPlayer {
		writeError(w, http.StatusBadRequest, "Not your turn to make a choice")
		return
	}

	action := &models.BattleAction{
		PlayerName: req.PlayerName,
		ActionType: req.ActionType,
		CardIDs:    req.CardIDs,
	}

	// Identify NPC status
	var isP1NPC, isP2NPC bool
	for _, p := range gs.Players {
		if p.Name == session.Player1Name {
			isP1NPC = p.IsNPC
		} else if p.Name == session.Player2Name {
			isP2NPC = p.IsNPC
		}
	}

	// Submit choice to interactive engine
	engine.SubmitChoice(session, action, isP1NPC, isP2NPC)

	// Symmetrical WS Broadcast to start render updates
	if gs.LobbyCode != "" {
		lobby.GlobalHub.SendToPlayer(gs.LobbyCode, session.Player1Name, map[string]interface{}{"type": "battle_step_advanced"})
		lobby.GlobalHub.SendToPlayer(gs.LobbyCode, session.Player2Name, map[string]interface{}{"type": "battle_step_advanced"})
	}

	// If session is finished after submitting choice, finalize it
	if session.IsFinished {
		finalizeBattleSession(gs, session)
	}

	WritePlayerGameState(w, gs, req.PlayerName)
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

// finalizeBattleSession records winner/loser, applies points, logs result, and purges session.
func finalizeBattleSession(gs *models.GameState, session *models.BattleSession) {
	winnerName := session.Winner
	loserName := session.Loser

	fansGained := 2
	if session.Step < 3 {
		fansGained = 1
	}

	// Scan the logs for additional battle-triggered fan/star buffs
	// (like Hero, Clown, Pyrotechnist etc.)
	bonus := calculateBonusFans(session.Log, winnerName)
	fansGained += bonus

	// Check if winning card has Hero effect (+2 Fans)
	var winningCard *models.Card
	if len(session.ActiveCards) > 0 {
		winningCard = &session.ActiveCards[0]
	}
	if winningCard != nil && winningCard.EffectType == "hero" {
		fansGained += 2
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
		Reason:     fmt.Sprintf("%s was defeated by %s.", loserName, winnerName),
		FansGained: fansGained,
		Log:        session.Log,
	}

	gs.LastResults[session.Player1Name] = &battleRes
	gs.BattleLogs[session.Player1Name] = session.Log

	gs.LastResults[session.Player2Name] = &battleRes
	gs.BattleLogs[session.Player2Name] = session.Log

	// Delete sessions for both players
	delete(gs.BattleSessions, session.Player1Name)
	delete(gs.BattleSessions, session.Player2Name)

	// Broadcast matchup complete via WS
	if gs.LobbyCode != "" {
		lobby.GlobalHub.SendToPlayer(gs.LobbyCode, session.Player1Name, map[string]interface{}{"type": "battle_complete"})
		lobby.GlobalHub.SendToPlayer(gs.LobbyCode, session.Player2Name, map[string]interface{}{"type": "battle_complete"})
	}

	// Symmetrical: Evaluate round resolution advancement
	checkAndAdvanceResults(gs)
}

func calculateBonusFans(log []models.BattleLogEntry, player string) int {
	bonus := 0
	for _, entry := range log {
		if entry.Player == player {
			if strings.Contains(entry.EffectTriggered, "ファン+3") {
				bonus += 3
			} else if strings.Contains(entry.EffectTriggered, "ファン+2") {
				bonus += 2
			} else if strings.Contains(entry.EffectTriggered, "ファン+1") {
				bonus += 1
			}
		}
	}
	return bonus
}
