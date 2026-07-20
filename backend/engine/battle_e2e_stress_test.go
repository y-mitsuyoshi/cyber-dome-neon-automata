package engine_test

import (
	"encoding/json"
	"net/http"
	"testing"
)

// TestE2E_Adversarial_DuplicateComplete validates the robustness of manual transition to results
// when a player sends duplicate complete requests.
func TestE2E_Adversarial_DuplicateComplete(t *testing.T) {
	server := setupTestServer(t)
	defer server.Close()

	// Create a lobby with maxPlayers: 3
	resp := postJSON(t, server.URL+"/api/lobby/create", map[string]interface{}{
		"playerName": "HostA",
		"maxPlayers": 3,
	})
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("Failed to create lobby: %v", resp.Status)
	}
	var lobRes struct{ Code string }
	if err := json.NewDecoder(resp.Body).Decode(&lobRes); err != nil {
		t.Fatalf("Failed to decode lobby response: %v", err)
	}

	// Join ClientB
	respJoin := postJSON(t, server.URL+"/api/lobby/join", map[string]interface{}{
		"code":       lobRes.Code,
		"playerName": "ClientB",
	})
	if respJoin.StatusCode != http.StatusOK {
		t.Fatalf("Failed to join lobby: %v", respJoin.Status)
	}

	// Add an NPC to satisfy the 3-combatant minimum requirement to start a game
	respAdd := postJSON(t, server.URL+"/api/lobby/add-npc", map[string]interface{}{
		"code": lobRes.Code,
	})
	if respAdd.StatusCode != http.StatusOK {
		t.Fatalf("Failed to add NPC: %v", respAdd.Status)
	}

	// Start game and get GameID
	respStart := postJSON(t, server.URL+"/api/lobby/start", map[string]interface{}{
		"code": lobRes.Code,
	})
	if respStart.StatusCode != http.StatusOK {
		t.Fatalf("Failed to start game: %v", respStart.Status)
	}
	var startRes struct{ GameID string }
	if err := json.NewDecoder(respStart.Body).Decode(&startRes); err != nil {
		t.Fatalf("Failed to decode start response: %v", err)
	}

	// Transition players to battle
	postJSON(t, server.URL+"/api/tournament/battle", map[string]interface{}{
		"gameId":     startRes.GameID,
		"playerName": "HostA",
	})
	postJSON(t, server.URL+"/api/tournament/battle", map[string]interface{}{
		"gameId":     startRes.GameID,
		"playerName": "ClientB",
	})

	// Assert phase is now "battle"
	respGS, _ := http.Get(server.URL + "/api/game/state?gameId=" + startRes.GameID + "&playerName=HostA")
	var gsRes struct{ Phase string }
	json.NewDecoder(respGS.Body).Decode(&gsRes)
	if gsRes.Phase != "battle" {
		t.Fatalf("Expected phase to be 'battle', got '%s'", gsRes.Phase)
	}

	// 1. HostA sends first complete request - should succeed (200)
	respComplete1 := postJSON(t, server.URL+"/api/battle/complete", map[string]interface{}{
		"gameId":     startRes.GameID,
		"playerName": "HostA",
	})
	if respComplete1.StatusCode != http.StatusOK {
		t.Errorf("First complete request from HostA failed with status: %d", respComplete1.StatusCode)
	}

	// Phase should still be "battle"
	respGS, _ = http.Get(server.URL + "/api/game/state?gameId=" + startRes.GameID + "&playerName=HostA")
	json.NewDecoder(respGS.Body).Decode(&gsRes)
	if gsRes.Phase != "battle" {
		t.Errorf("Expected phase to remain 'battle' after first complete request, got '%s'", gsRes.Phase)
	}

	// 2. HostA sends duplicate complete request - should also succeed (200) because it's idempotent before transition
	respComplete2 := postJSON(t, server.URL+"/api/battle/complete", map[string]interface{}{
		"gameId":     startRes.GameID,
		"playerName": "HostA",
	})
	if respComplete2.StatusCode != http.StatusOK {
		t.Errorf("Duplicate complete request from HostA failed with status: %d", respComplete2.StatusCode)
	}

	// Phase should still be "battle"
	respGS, _ = http.Get(server.URL + "/api/game/state?gameId=" + startRes.GameID + "&playerName=HostA")
	json.NewDecoder(respGS.Body).Decode(&gsRes)
	if gsRes.Phase != "battle" {
		t.Errorf("Expected phase to remain 'battle' after duplicate complete request, got '%s'", gsRes.Phase)
	}

	// 3. ClientB sends complete request - should succeed and transition game to "results"
	respComplete3 := postJSON(t, server.URL+"/api/battle/complete", map[string]interface{}{
		"gameId":     startRes.GameID,
		"playerName": "ClientB",
	})
	if respComplete3.StatusCode != http.StatusOK {
		t.Errorf("Complete request from ClientB failed with status: %d", respComplete3.StatusCode)
	}

	// Phase should now be "results"
	respGS, _ = http.Get(server.URL + "/api/game/state?gameId=" + startRes.GameID + "&playerName=HostA")
	json.NewDecoder(respGS.Body).Decode(&gsRes)
	if gsRes.Phase != "results" {
		t.Errorf("Expected phase to transition to 'results', got '%s'", gsRes.Phase)
	}

	// 4. HostA sends complete request after transition - should fail (400 Bad Request)
	respComplete4 := postJSON(t, server.URL+"/api/battle/complete", map[string]interface{}{
		"gameId":     startRes.GameID,
		"playerName": "HostA",
	})
	if respComplete4.StatusCode == http.StatusOK {
		t.Errorf("Expected complete request after transition to fail, got status 200")
	}
}

// TestE2E_Adversarial_PhaseValidation verifies that completion requests
// sent when the game is not in the "battle" phase are rejected.
func TestE2E_Adversarial_PhaseValidation(t *testing.T) {
	server := setupTestServer(t)
	defer server.Close()

	// Create a lobby with maxPlayers: 3
	resp := postJSON(t, server.URL+"/api/lobby/create", map[string]interface{}{
		"playerName": "HostA",
		"maxPlayers": 3,
	})
	var lobRes struct{ Code string }
	json.NewDecoder(resp.Body).Decode(&lobRes)

	respJoin := postJSON(t, server.URL+"/api/lobby/join", map[string]interface{}{
		"code":       lobRes.Code,
		"playerName": "ClientB",
	})
	if respJoin.StatusCode != http.StatusOK {
		t.Fatalf("Failed to join lobby: %v", respJoin.Status)
	}

	respAdd := postJSON(t, server.URL+"/api/lobby/add-npc", map[string]interface{}{
		"code": lobRes.Code,
	})
	if respAdd.StatusCode != http.StatusOK {
		t.Fatalf("Failed to add NPC: %v", respAdd.Status)
	}

	// At this stage game has not started, but let's see: we don't have a GameID yet
	// Let's start the game first to generate the GameID and enter the "shop" phase.
	respStart := postJSON(t, server.URL+"/api/lobby/start", map[string]interface{}{
		"code": lobRes.Code,
	})
	if respStart.StatusCode != http.StatusOK {
		t.Fatalf("Failed to start game: %v", respStart.Status)
	}
	var startRes struct{ GameID string }
	json.NewDecoder(respStart.Body).Decode(&startRes)

	// Phase is "shop" now. Try to send complete request.
	respGS, _ := http.Get(server.URL + "/api/game/state?gameId=" + startRes.GameID + "&playerName=HostA")
	var gsRes struct{ Phase string }
	json.NewDecoder(respGS.Body).Decode(&gsRes)
	if gsRes.Phase != "shop" {
		t.Fatalf("Expected phase to be 'shop', got '%s'", gsRes.Phase)
	}

	// Send complete request in "shop" phase. It should fail (400 Bad Request).
	respCompleteShop := postJSON(t, server.URL+"/api/battle/complete", map[string]interface{}{
		"gameId":     startRes.GameID,
		"playerName": "HostA",
	})
	if respCompleteShop.StatusCode == http.StatusOK {
		t.Errorf("Expected complete request in 'shop' phase to fail, got status 200")
	}
}

// TestE2E_Adversarial_NPCAndHumanCombinations verifies multiplayer combinations
// with NPCs and humans to confirm that only human players' completions are required to transition the lobby phase.
func TestE2E_Adversarial_NPCAndHumanCombinations(t *testing.T) {
	server := setupTestServer(t)
	defer server.Close()

	// Scenario A: 1 Human, 2 NPCs.
	// Only 1 human completion is required to transition.
	resp := postJSON(t, server.URL+"/api/lobby/create", map[string]interface{}{
		"playerName": "HostA",
		"maxPlayers": 3,
	})
	var lobRes struct{ Code string }
	json.NewDecoder(resp.Body).Decode(&lobRes)

	// Add 2 NPCs
	postJSON(t, server.URL+"/api/lobby/add-npc", map[string]interface{}{
		"code": lobRes.Code,
	})
	postJSON(t, server.URL+"/api/lobby/add-npc", map[string]interface{}{
		"code": lobRes.Code,
	})

	// Start game
	respStart := postJSON(t, server.URL+"/api/lobby/start", map[string]interface{}{
		"code": lobRes.Code,
	})
	var startRes struct{ GameID string }
	json.NewDecoder(respStart.Body).Decode(&startRes)

	// Transition human to battle
	postJSON(t, server.URL+"/api/tournament/battle", map[string]interface{}{
		"gameId":     startRes.GameID,
		"playerName": "HostA",
	})

	// Verify phase transitions to "battle"
	respGS, _ := http.Get(server.URL + "/api/game/state?gameId=" + startRes.GameID + "&playerName=HostA")
	var gsRes struct{ Phase string }
	json.NewDecoder(respGS.Body).Decode(&gsRes)
	if gsRes.Phase != "battle" {
		t.Fatalf("Scenario A: Expected phase to be 'battle', got '%s'", gsRes.Phase)
	}

	// HostA sends complete request - should transition game immediately to "results" since there are no other humans
	respComplete := postJSON(t, server.URL+"/api/battle/complete", map[string]interface{}{
		"gameId":     startRes.GameID,
		"playerName": "HostA",
	})
	if respComplete.StatusCode != http.StatusOK {
		t.Errorf("Scenario A: Complete request failed: %d", respComplete.StatusCode)
	}

	respGS, _ = http.Get(server.URL + "/api/game/state?gameId=" + startRes.GameID + "&playerName=HostA")
	json.NewDecoder(respGS.Body).Decode(&gsRes)
	if gsRes.Phase != "results" {
		t.Errorf("Scenario A: Expected phase to transition to 'results' after single human complete, got '%s'", gsRes.Phase)
	}
}
