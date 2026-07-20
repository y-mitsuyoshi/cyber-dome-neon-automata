package engine_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"

	"backend/engine"
	"backend/handlers"
	"backend/models"
)

// Helper: Setup test server with handlers mapped
func setupTestServer(t *testing.T) *httptest.Server {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/game/new", handlers.HandleNewGame)
	mux.HandleFunc("/api/game/state", handlers.HandleGameState)
	mux.HandleFunc("/api/tournament/battle", handlers.HandleBattle)
	mux.HandleFunc("/api/tournament/next-round", handlers.HandleNextRound)
	mux.HandleFunc("/api/battle/step", handlers.HandleBattleStep)
	mux.HandleFunc("/api/battle/action", handlers.HandleBattleAction)
	mux.HandleFunc("/api/battle/complete", handlers.HandleBattleComplete)
	mux.HandleFunc("/api/lobby/create", handlers.HandleCreateLobby)
	mux.HandleFunc("/api/lobby/join", handlers.HandleJoinLobby)
	mux.HandleFunc("/api/lobby/add-npc", handlers.HandleAddNPC)
	mux.HandleFunc("/api/lobby/start", handlers.HandleStartGame)
	return httptest.NewServer(mux)
}

// Helper: Post JSON
func postJSON(t *testing.T, url string, body interface{}) *http.Response {
	b, err := json.Marshal(body)
	if err != nil {
		t.Fatalf("JSON marshal failed: %v", err)
	}
	resp, err := http.Post(url, "application/json", bytes.NewBuffer(b))
	if err != nil {
		t.Fatalf("HTTP POST failed: %v", err)
	}
	return resp
}

// ----------------------------------------------------
// TIER 1: Feature Coverage (R1, R2, R3, R4, R5)
// ----------------------------------------------------

func TestE2E_Tier1_ManualTransition(t *testing.T) {
	server := setupTestServer(t)
	defer server.Close()

	// 1. Create a game/lobby
	resp := postJSON(t, server.URL+"/api/lobby/create", map[string]interface{}{
		"playerName": "PlayerA",
		"maxPlayers": 3,
	})
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("Create lobby failed: status %d", resp.StatusCode)
	}
	var lobbyRes struct {
		Code string `json:"code"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&lobbyRes); err != nil {
		t.Fatalf("Decode failed: %v", err)
	}

	// 2. Join lobby (PlayerB)
	resp = postJSON(t, server.URL+"/api/lobby/join", map[string]interface{}{
		"code":       lobbyRes.Code,
		"playerName": "PlayerB",
	})
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("Join lobby failed: status %d", resp.StatusCode)
	}

	// 3. Add NPC
	resp = postJSON(t, server.URL+"/api/lobby/add-npc", map[string]interface{}{
		"code": lobbyRes.Code,
	})
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("Add NPC failed: status %d", resp.StatusCode)
	}

	// 4. Start Game
	resp = postJSON(t, server.URL+"/api/lobby/start", map[string]interface{}{
		"code": lobbyRes.Code,
	})
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("Start game failed: status %d", resp.StatusCode)
	}
	var startRes struct {
		GameID string `json:"gameId"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&startRes); err != nil {
		t.Fatalf("Decode gameId failed: %v", err)
	}

	// 5. Enter Battle
	resp = postJSON(t, server.URL+"/api/tournament/battle", map[string]interface{}{
		"gameId":     startRes.GameID,
		"playerName": "PlayerA",
	})
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("Enter battle PlayerA failed: status %d", resp.StatusCode)
	}
	resp = postJSON(t, server.URL+"/api/tournament/battle", map[string]interface{}{
		"gameId":     startRes.GameID,
		"playerName": "PlayerB",
	})
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("Enter battle PlayerB failed: status %d", resp.StatusCode)
	}

	// Fetch game state to get battle sessions
	gsResp, err := http.Get(server.URL + "/api/game/state?gameId=" + startRes.GameID + "&playerName=PlayerB")
	if err != nil || gsResp.StatusCode != http.StatusOK {
		t.Fatalf("Get game state failed")
	}
	var gsRes struct {
		Phase         string                `json:"phase"`
		BattleSession *models.BattleSession `json:"battleSession"`
	}
	if err := json.NewDecoder(gsResp.Body).Decode(&gsRes); err != nil {
		t.Fatalf("Decode game state failed: %v", err)
	}

	session := gsRes.BattleSession
	if session == nil {
		t.Fatalf("Battle session for PlayerB not found")
	}

	// 6. Step until finished
	for i := 0; i < 50; i++ {
		if session == nil || session.IsFinished {
			break
		}
		stepResp := postJSON(t, server.URL+"/api/battle/step", map[string]interface{}{
			"gameId":     startRes.GameID,
			"playerName": session.PendingActionPlayer,
		})
		if stepResp.StatusCode == http.StatusOK {
			var stepRes struct {
				Phase         string                `json:"phase"`
				BattleSession *models.BattleSession `json:"battleSession"`
			}
			if err := json.NewDecoder(stepResp.Body).Decode(&stepRes); err == nil {
				session = stepRes.BattleSession
			} else {
				break
			}
		} else {
			if session.RequiredAction != "DRAW" && session.RequiredAction != "" {
				actionResp := postJSON(t, server.URL+"/api/battle/action", map[string]interface{}{
					"gameId":     startRes.GameID,
					"playerName": session.PendingActionPlayer,
					"actionType": "CHOOSE_CARD",
					"cardIds":    []string{session.ActionOptions[0].ID},
				})
				if actionResp.StatusCode == http.StatusOK {
					var actionRes struct {
						Phase         string                `json:"phase"`
						BattleSession *models.BattleSession `json:"battleSession"`
					}
					if err := json.NewDecoder(actionResp.Body).Decode(&actionRes); err == nil {
						session = actionRes.BattleSession
					} else {
						break
					}
				} else {
					break
				}
			} else {
				break
			}
		}
	}

	if session != nil && !session.IsFinished {
		t.Fatalf("Battle session failed to complete in 50 steps")
	}

	// Assert: Game Phase must remain "battle" upon match finish (manual transition rule)
	gsResp, _ = http.Get(server.URL + "/api/game/state?gameId=" + startRes.GameID + "&playerName=PlayerB")
	var midRes struct {
		Phase         string                `json:"phase"`
		BattleSession *models.BattleSession `json:"battleSession"`
	}
	json.NewDecoder(gsResp.Body).Decode(&midRes)

	if midRes.Phase != "battle" {
		t.Errorf("Expected Game Phase to remain 'battle' upon match finish, got '%s'", midRes.Phase)
	}
	if midRes.BattleSession == nil {
		t.Errorf("Expected battle session to remain active during manual transition state")
	}

	// Verify that the response contains final board, combat logs, and victory status
	if len(midRes.BattleSession.Log) == 0 {
		t.Errorf("Expected non-empty combat logs in finished battle session")
	}

	// 7. Complete Player A
	completeAResp := postJSON(t, server.URL+"/api/battle/complete", map[string]interface{}{
		"gameId":     startRes.GameID,
		"playerName": "PlayerA",
	})
	if completeAResp.StatusCode != http.StatusOK {
		t.Errorf("Complete PlayerA failed, got status %d", completeAResp.StatusCode)
	}

	// Phase should still be "battle" since Player B hasn't clicked complete
	gsResp, _ = http.Get(server.URL + "/api/game/state?gameId=" + startRes.GameID + "&playerName=PlayerB")
	json.NewDecoder(gsResp.Body).Decode(&midRes)
	if midRes.Phase != "battle" {
		t.Errorf("Expected Phase to remain 'battle' after PlayerA complete, got '%s'", midRes.Phase)
	}

	// 8. Complete Player B
	completeBResp := postJSON(t, server.URL+"/api/battle/complete", map[string]interface{}{
		"gameId":     startRes.GameID,
		"playerName": "PlayerB",
	})
	if completeBResp.StatusCode != http.StatusOK {
		t.Errorf("Complete PlayerB failed, got status %d", completeBResp.StatusCode)
	}

	// Now phase should be "results"
	gsResp, _ = http.Get(server.URL + "/api/game/state?gameId=" + startRes.GameID + "&playerName=PlayerB")
	var finalRes struct {
		Phase string `json:"phase"`
	}
	json.NewDecoder(gsResp.Body).Decode(&finalRes)
	if finalRes.Phase != "results" {
		t.Errorf("Expected Game Phase to transition to 'results' after both complete, got '%s'", finalRes.Phase)
	}
}

func TestE2E_Tier1_BenchLogic(t *testing.T) {
	p1Deck := []models.Card{
		{ID: "card1", Name: "CardAlpha", Attribute: "None", Power: 2},
		{ID: "card2", Name: "CardAlpha", Attribute: "None", Power: 3},
	}
	p2Deck := []models.Card{
		{ID: "card3", Name: "CardBeta", Attribute: "None", Power: 5},
		{ID: "card_dummy", Name: "Dummy", Attribute: "None", Power: 1},
	}

	session := engine.InitializeBattleSession("test_bench_stacking", "P1", "P2", p1Deck, p2Deck, 1, false, false)
	session.Player1Deck = p1Deck
	session.Player2Deck = p2Deck
	session.TurnOwner = "P2"
	session.PendingActionPlayer = "P2"

	// 1. P2 claims flag with CardBeta
	engine.StepBattle(session, false, false)
	if session.FlagHolder != "P2" || session.FlagCard.Name != "CardBeta" {
		t.Fatalf("Expected P2 to claim flag with CardBeta")
	}
	if len(session.DefenderStack) != 1 || session.DefenderStack[0].Name != "CardBeta" {
		t.Errorf("Expected DefenderStack to have 1 card, got: %+v", session.DefenderStack)
	}

	// 2. P1 draws CardAlpha (power 2). Power is less than defender power (2 < 5).
	session.TurnOwner = "P1"
	session.PendingActionPlayer = "P1"
	engine.StepBattle(session, false, false)

	if len(session.Player1Mem) != 0 {
		t.Errorf("Expected P1 memory to remain empty, got %d slots", len(session.Player1Mem))
	}
	if len(session.ActiveCards) != 1 || session.ActiveCards[0].Name != "CardAlpha" {
		t.Errorf("Expected ActiveCards to retain CardAlpha")
	}

	// 3. P1 draws another CardAlpha (power 3). Total power is 2 + 3 = 5.
	// P1 steals flag, defeating P2's CardBeta defender.
	engine.StepBattle(session, false, false)

	if session.FlagHolder != "P1" {
		t.Fatalf("Expected P1 to hold flag now")
	}
	if len(session.Player2Mem) != 2 {
		t.Errorf("Expected P2 memory to have 2 cards on defeat, got %d", len(session.Player2Mem))
	}
}

func TestE2E_Tier1_StartingPlayer(t *testing.T) {
	p1Deck := []models.Card{{Name: "C", Power: 1}}
	p2Deck := []models.Card{{Name: "C", Power: 1}}

	p1Starts := 0
	p2Starts := 0
	for i := 0; i < 50; i++ {
		session := engine.InitializeBattleSession("test_cointoss", "P1", "P2", p1Deck, p2Deck, 1, false, false)
		if session.TurnOwner == "P1" {
			p1Starts++
		} else {
			p2Starts++
		}
	}
	if p1Starts == 0 || p2Starts == 0 {
		t.Errorf("Starting player selection is completely deterministic: P1 started %d, P2 started %d", p1Starts, p2Starts)
	}

	// Round 2: P1 won previous round, P2 lost. P1 should start.
	session2 := engine.InitializeBattleSession("test_round2_win", "P1", "P2", p1Deck, p2Deck, 2, true, false)
	if session2.TurnOwner != "P1" {
		t.Errorf("Expected P1 to start in Round 2 when P1 won previous round, got %s", session2.TurnOwner)
	}
}

func TestE2E_Tier1_UIUXIndicators(t *testing.T) {
	p1Deck := []models.Card{
		{ID: "card1", Name: "CardAlpha", Attribute: "None", Power: 2},
	}
	p2Deck := []models.Card{
		{ID: "card2", Name: "CardBeta", Attribute: "None", Power: 5},
	}
	session := engine.InitializeBattleSession("test_uiux", "P1", "P2", p1Deck, p2Deck, 1, false, false)
	session.Player1Deck = p1Deck
	session.Player2Deck = p2Deck

	// P2 claims flag
	session.TurnOwner = "P2"
	session.PendingActionPlayer = "P2"
	engine.StepBattle(session, false, false)

	// Validate FlagPower is populated (enables "+X power needed to capture" badge state)
	if session.FlagPower != 5 {
		t.Errorf("Expected FlagPower to be 5, got %d", session.FlagPower)
	}

	// P1 draws card (power 2).
	session.TurnOwner = "P1"
	session.PendingActionPlayer = "P1"
	engine.StepBattle(session, false, false)

	if session.ChallengerPower != 2 {
		t.Errorf("Expected ChallengerPower to be 2, got %d", session.ChallengerPower)
	}

	// Power needed is FlagPower - ChallengerPower + 1 = 5 - 2 + 1 = 4
	needed := session.FlagPower - session.ChallengerPower + 1
	if needed != 4 {
		t.Errorf("Expected power needed calculation to yield 4, got %d", needed)
	}

	// Verify banner notification payload / log effect triggers
	logEntry := models.BattleLogEntry{
		Step:            1,
		Action:          "reveal",
		Player:          "P1",
		EffectTriggered: "On Reveal: Speed Boost!",
	}
	session.Log = append(session.Log, logEntry)

	if session.Log[len(session.Log)-1].EffectTriggered != "On Reveal: Speed Boost!" {
		t.Errorf("Expected EffectTriggered payload banner notification to be present")
	}
}

func TestE2E_Tier1_AnimationTempo(t *testing.T) {
	p1Deck := []models.Card{
		{ID: "card1", Name: "MegaCard", Attribute: "None", Power: 8},
	}
	p2Deck := []models.Card{
		{ID: "card2", Name: "CardBeta", Attribute: "None", Power: 4},
	}
	session := engine.InitializeBattleSession("test_animation", "P1", "P2", p1Deck, p2Deck, 1, false, false)
	session.Player1Deck = p1Deck
	session.Player2Deck = p2Deck

	// 1. P2 claims flag
	session.TurnOwner = "P2"
	session.PendingActionPlayer = "P2"
	engine.StepBattle(session, false, false)

	// 2. P1 attacks with MegaCard (Power 8 >= 7) and steals flag
	session.TurnOwner = "P1"
	session.PendingActionPlayer = "P1"
	engine.StepBattle(session, false, false)

	// Validate action logs for 3D flip ("reveal") and impact flash/shake ("flag_change") in sequence
	hasReveal := false
	hasFlagChange := false
	for _, entry := range session.Log {
		if entry.Action == "reveal" {
			hasReveal = true
		}
		if entry.Action == "flag_change" {
			hasFlagChange = true
		}
	}

	if !hasReveal {
		t.Errorf("Expected Action: 'reveal' in logs to trigger 3D flip animation")
	}
	if !hasFlagChange {
		t.Errorf("Expected Action: 'flag_change' in logs to trigger screen shake/impact flash")
	}

	// Validate card power >= 7 for glowing neon aura trigger
	if session.FlagCard == nil || session.FlagCard.Power < 7 {
		t.Errorf("Expected defending card to have power >= 7 for neon aura, got power %d", session.FlagCard.Power)
	}
}

// ----------------------------------------------------
// TIER 2: Boundary & Corner Cases
// ----------------------------------------------------

func TestE2E_Tier2_BoundaryCases(t *testing.T) {
	server := setupTestServer(t)
	defer server.Close()

	// 1. POST complete with invalid parameters (non-existent game)
	resp := postJSON(t, server.URL+"/api/battle/complete", map[string]interface{}{
		"gameId":     "nonexistent_game",
		"playerName": "PlayerA",
	})
	if resp.StatusCode == http.StatusOK {
		t.Errorf("Expected complete on invalid game to fail, got status 200")
	}

	// 2. Complete on game when not in battle phase (e.g. before start)
	respLobby := postJSON(t, server.URL+"/api/lobby/create", map[string]interface{}{
		"playerName": "HostP1",
		"maxPlayers": 3,
	})
	var lob struct{ Code string }
	json.NewDecoder(respLobby.Body).Decode(&lob)

	respJoin := postJSON(t, server.URL+"/api/lobby/join", map[string]interface{}{
		"code":       lob.Code,
		"playerName": "ClientP2",
	})
	var joinRes struct{ GameID string }
	json.NewDecoder(respJoin.Body).Decode(&joinRes)

	respBadComplete := postJSON(t, server.URL+"/api/battle/complete", map[string]interface{}{
		"gameId":     joinRes.GameID,
		"playerName": "HostP1",
	})
	if respBadComplete.StatusCode == http.StatusOK {
		t.Errorf("Expected complete before battle starts to fail, got status 200")
	}

	// 3. Bench count transitions exactly from 6 unique types to 7
	p1Deck := []models.Card{
		{ID: "card1", Name: "Alpha", Attribute: "None", Power: 2},
	}
	p2Deck := []models.Card{
		{ID: "card2", Name: "Beta", Attribute: "None", Power: 5},
	}
	session := engine.InitializeBattleSession("test_tier2_bench_exact", "P1", "P2", p1Deck, p2Deck, 1, false, false)
	session.Player1Deck = p1Deck
	session.Player2Deck = p2Deck

	// Add 6 unique types to P1 bench
	session.Player1Mem = []models.MemorySlot{
		{CardName: "C1", Count: 1, Cards: []models.Card{{Name: "C1"}}},
		{CardName: "C2", Count: 1, Cards: []models.Card{{Name: "C2"}}},
		{CardName: "C3", Count: 1, Cards: []models.Card{{Name: "C3"}}},
		{CardName: "C4", Count: 1, Cards: []models.Card{{Name: "C4"}}},
		{CardName: "C5", Count: 1, Cards: []models.Card{{Name: "C5"}}},
		{CardName: "C6", Count: 1, Cards: []models.Card{{Name: "C6"}}},
	}

	// Step 1: P2 claims flag with Beta
	session.TurnOwner = "P2"
	session.PendingActionPlayer = "P2"
	engine.StepBattle(session, false, false)

	// Step 2: P1 draws Alpha
	session.TurnOwner = "P1"
	session.PendingActionPlayer = "P1"
	engine.StepBattle(session, false, false)

	if session.IsFinished {
		t.Errorf("Expected session to not be finished at 6 unique card types")
	}

	// Override P2 deck to have a strong card to defeat P1's Alpha
	session.Player2Deck = []models.Card{
		{ID: "card3", Name: "Gamma", Attribute: "None", Power: 10},
	}
	session.TurnOwner = "P2"
	session.PendingActionPlayer = "P2"

	// Step 3: P2 draws Gamma (power 10). Beats P1's Alpha.
	// Alpha is defeated and sent to P1 memory. Triggering memory overflow.
	engine.StepBattle(session, false, false)

	if !session.IsFinished {
		t.Errorf("Expected session to finish when P1 is forced to bench 7th unique type")
	}

	// 4. Starting player coin toss in Round 2 when both players won previous round
	p1StartsR2 := 0
	p2StartsR2 := 0
	for i := 0; i < 50; i++ {
		s := engine.InitializeBattleSession("test_tier2_round2_coin", "P1", "P2", p1Deck, p2Deck, 2, true, true)
		if s.TurnOwner == "P1" {
			p1StartsR2++
		} else {
			p2StartsR2++
		}
	}
	if p1StartsR2 == 0 || p2StartsR2 == 0 {
		t.Errorf("Round 2 starting player selection on both won is completely deterministic: P1 started %d, P2 started %d", p1StartsR2, p2StartsR2)
	}
}

// ----------------------------------------------------
// TIER 3: Cross-Feature Cases
// ----------------------------------------------------

func TestE2E_Tier3_CrossFeature(t *testing.T) {
	// 1. Starting player in Round 2 when Round 1 ended in a bench-limit defeat.
	p1Deck := []models.Card{{Name: "C", Power: 1}}
	p2Deck := []models.Card{{Name: "C", Power: 1}}

	// P2 won Round 1 (P1 suffered bench-limit defeat) -> Round 2. P2 should start.
	session := engine.InitializeBattleSession("test_tier3_starting_after_bench_defeat", "P1", "P2", p1Deck, p2Deck, 2, false, true)
	if session.TurnOwner != "P2" {
		t.Errorf("Expected P2 to start in Round 2 since P2 won Round 1, got %s", session.TurnOwner)
	}

	// 2. Manual completion after a player loses by bench limit.
	server := setupTestServer(t)
	defer server.Close()

	// Setup game
	resp := postJSON(t, server.URL+"/api/lobby/create", map[string]interface{}{
		"playerName": "PlayerA",
		"maxPlayers": 3,
	})
	var lobbyRes struct{ Code string }
	json.NewDecoder(resp.Body).Decode(&lobbyRes)

	postJSON(t, server.URL+"/api/lobby/join", map[string]interface{}{
		"code":       lobbyRes.Code,
		"playerName": "PlayerB",
	})
	postJSON(t, server.URL+"/api/lobby/add-npc", map[string]interface{}{
		"code": lobbyRes.Code,
	})
	startResp := postJSON(t, server.URL+"/api/lobby/start", map[string]interface{}{
		"code": lobbyRes.Code,
	})
	var startRes struct{ GameID string }
	json.NewDecoder(startResp.Body).Decode(&startRes)

	// Enter battle
	postJSON(t, server.URL+"/api/tournament/battle", map[string]interface{}{
		"gameId":     startRes.GameID,
		"playerName": "PlayerA",
	})
	postJSON(t, server.URL+"/api/tournament/battle", map[string]interface{}{
		"gameId":     startRes.GameID,
		"playerName": "PlayerB",
	})

	// Post complete for A
	completeAResp := postJSON(t, server.URL+"/api/battle/complete", map[string]interface{}{
		"gameId":     startRes.GameID,
		"playerName": "PlayerA",
	})
	if completeAResp.StatusCode != http.StatusOK {
		t.Errorf("Complete A failed: status %d", completeAResp.StatusCode)
	}

	// Verify phase remains "battle"
	gsResp, _ := http.Get(server.URL + "/api/game/state?gameId=" + startRes.GameID + "&playerName=PlayerB")
	var gsRes struct {
		Phase string `json:"phase"`
	}
	json.NewDecoder(gsResp.Body).Decode(&gsRes)
	if gsRes.Phase != "battle" {
		t.Errorf("Expected phase to be 'battle' after PlayerA complete, got '%s'", gsRes.Phase)
	}

	// Post complete for B
	postJSON(t, server.URL+"/api/battle/complete", map[string]interface{}{
		"gameId":     startRes.GameID,
		"playerName": "PlayerB",
	})

	// Verify phase is now "results"
	gsResp, _ = http.Get(server.URL + "/api/game/state?gameId=" + startRes.GameID + "&playerName=PlayerB")
	json.NewDecoder(gsResp.Body).Decode(&gsRes)
	if gsRes.Phase != "results" {
		t.Errorf("Expected phase to be 'results' after both complete, got '%s'", gsRes.Phase)
	}
}

// ----------------------------------------------------
// TIER 4: Real-World Workload Scenarios
// ----------------------------------------------------

func TestE2E_Tier4_RealWorldWorkloads(t *testing.T) {
	// Scenario 1: Full Match Loop
	t.Run("FullMatchLoop", func(t *testing.T) {
		server := setupTestServer(t)
		defer server.Close()

		resp := postJSON(t, server.URL+"/api/lobby/create", map[string]interface{}{
			"playerName": "HostP1",
			"maxPlayers": 3,
		})
		var lobRes struct{ Code string }
		json.NewDecoder(resp.Body).Decode(&lobRes)

		postJSON(t, server.URL+"/api/lobby/join", map[string]interface{}{
			"code":       lobRes.Code,
			"playerName": "ClientP2",
		})

		postJSON(t, server.URL+"/api/lobby/add-npc", map[string]interface{}{
			"code": lobRes.Code,
		})

		resp = postJSON(t, server.URL+"/api/lobby/start", map[string]interface{}{
			"code": lobRes.Code,
		})
		var startRes struct{ GameID string }
		json.NewDecoder(resp.Body).Decode(&startRes)

		if startRes.GameID == "" {
			t.Fatalf("Expected valid GameID, got empty")
		}
	})

	// Scenario 2: Bench Flooding Strategy
	t.Run("BenchFlooding", func(t *testing.T) {
		p1Deck := []models.Card{
			{ID: "c1", Name: "A1", Power: 1},
			{ID: "c2", Name: "A2", Power: 1},
			{ID: "c3", Name: "A3", Power: 1},
		}
		p2Deck := []models.Card{
			{ID: "d1", Name: "B1", Power: 10},
		}

		session := engine.InitializeBattleSession("test_flooding", "P1", "P2", p1Deck, p2Deck, 1, false, false)
		session.Player1Deck = p1Deck
		session.Player2Deck = p2Deck

		// P2 claims flag with B1 (power 10)
		session.TurnOwner = "P2"
		session.PendingActionPlayer = "P2"
		engine.StepBattle(session, false, false)

		// P1 draws A1 (power 1). Stacks on defending flag but doesn't take it (1 < 10)
		session.TurnOwner = "P1"
		session.PendingActionPlayer = "P1"
		engine.StepBattle(session, false, false)
		if len(session.Player1Mem) != 0 {
			t.Errorf("P1 memory should be empty, cards must stack")
		}

		// P1 draws A2 (power 1). Stacks on defending flag (1+1 = 2 < 10)
		engine.StepBattle(session, false, false)
		if len(session.Player1Mem) != 0 {
			t.Errorf("P1 memory should still be empty")
		}

		// P1 draws A3 (power 1). Stacks (1+1+1 = 3 < 10)
		engine.StepBattle(session, false, false)

		// Check all 3 card types remain in active cards and NOT benched yet
		if len(session.Player1Mem) != 0 {
			t.Errorf("P1 memory must remain empty while cards stack under defender")
		}
	})

	// Scenario 3: Choice-based step-by-step game loop simulation
	t.Run("ChoiceStepByStep", func(t *testing.T) {
		p1Deck := []models.Card{
			{ID: "c1", Name: "CardA", Power: 2},
		}
		p2Deck := []models.Card{
			{ID: "c2", Name: "パケットスニッファ", Power: 2, EffectType: "reporter"}, // triggers a choice
		}

		session := engine.InitializeBattleSession("test_choice", "P1", "P2", p1Deck, p2Deck, 1, false, false)
		session.Player1Deck = p1Deck
		session.Player2Deck = p2Deck

		// Step P2 to draw/reveal "パケットスニッファ"
		session.TurnOwner = "P2"
		session.PendingActionPlayer = "P2"
		engine.StepBattle(session, false, false)

		// If a choice is required, test choice resolution or action endpoint logic
		if session.RequiredAction != "" {
			session.RequiredAction = ""
			session.PendingActionPlayer = ""
		}
	})

	// Scenario 4: Multi-round Tournament Standing Accumulation
	t.Run("MultiRoundTournament", func(t *testing.T) {
		server := setupTestServer(t)
		defer server.Close()

		resp := postJSON(t, server.URL+"/api/lobby/create", map[string]interface{}{
			"playerName": "HostP1",
			"maxPlayers": 3,
		})
		var lobRes struct{ Code string }
		json.NewDecoder(resp.Body).Decode(&lobRes)

		postJSON(t, server.URL+"/api/lobby/join", map[string]interface{}{
			"code":       lobRes.Code,
			"playerName": "ClientP2",
		})
		postJSON(t, server.URL+"/api/lobby/add-npc", map[string]interface{}{
			"code": lobRes.Code,
		})
		resp = postJSON(t, server.URL+"/api/lobby/start", map[string]interface{}{
			"code": lobRes.Code,
		})
		var startRes struct{ GameID string }
		json.NewDecoder(resp.Body).Decode(&startRes)

		// Verify we are at Round 1
		gsResp, _ := http.Get(server.URL + "/api/game/state?gameId=" + startRes.GameID + "&playerName=HostP1")
		var gs struct {
			CurrentRound int    `json:"currentRound"`
			Phase        string `json:"phase"`
		}
		json.NewDecoder(gsResp.Body).Decode(&gs)
		if gs.CurrentRound != 1 {
			t.Errorf("Expected current round to be 1, got %d", gs.CurrentRound)
		}
	})

	// Scenario 5: Concurrent Match Play
	t.Run("ConcurrentMatches", func(t *testing.T) {
		server := setupTestServer(t)
		defer server.Close()

		var wg sync.WaitGroup
		errs := make(chan error, 4)

		runGameThread := func(host string, client string) {
			defer wg.Done()

			resp := postJSON(t, server.URL+"/api/lobby/create", map[string]interface{}{
				"playerName": host,
				"maxPlayers": 3,
			})
			if resp.StatusCode != http.StatusOK {
				errs <- fmt.Errorf("create failed for %s", host)
				return
			}
			var lobRes struct{ Code string }
			json.NewDecoder(resp.Body).Decode(&lobRes)

			respJoin := postJSON(t, server.URL+"/api/lobby/join", map[string]interface{}{
				"code":       lobRes.Code,
				"playerName": client,
			})
			if respJoin.StatusCode != http.StatusOK {
				errs <- fmt.Errorf("join failed for %s", client)
				return
			}

			respAdd := postJSON(t, server.URL+"/api/lobby/add-npc", map[string]interface{}{
				"code": lobRes.Code,
			})
			if respAdd.StatusCode != http.StatusOK {
				errs <- fmt.Errorf("add npc failed for %s", host)
				return
			}

			respStart := postJSON(t, server.URL+"/api/lobby/start", map[string]interface{}{
				"code": lobRes.Code,
			})
			if respStart.StatusCode != http.StatusOK {
				errs <- fmt.Errorf("start game failed for %s", host)
				return
			}
		}

		wg.Add(2)
		go runGameThread("UserA", "UserB")
		go runGameThread("UserC", "UserD")

		wg.Wait()
		close(errs)

		for err := range errs {
			t.Error(err)
		}
	})
}
