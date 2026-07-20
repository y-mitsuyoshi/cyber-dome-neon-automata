package handlers

import (
	"backend/models"
	"strings"
	"testing"
)

func TestNPCvsNPCSymmetricalHeroBuff(t *testing.T) {
	// Create a GameState with 2 NPC players
	gs := &models.GameState{
		CurrentRound: 1,
		MaxRounds:    5,
		Phase:        "shop",
		Players: []models.Player{
			{
				Name:  "NPC_Alpha",
				IsNPC: true,
				Wins:  0,
				Fans:  0,
				Deck: []models.Card{
					{
						ID:         "c_hero",
						Name:       "サイバーヒーロー",
						Attribute:  "HoloMedia",
						Power:      5,
						Rarity:     "Common",
						EffectType: "hero",
						Cost:       7,
						Deck:       "C",
					},
				},
			},
			{
				Name:  "NPC_Beta",
				IsNPC: true,
				Wins:  0,
				Fans:  0,
				Deck: []models.Card{
					{
						ID:         "a_gangster",
						Name:       "グリッドレイダー",
						Attribute:  "HoloMedia",
						Power:      2,
						Rarity:     "Common",
						EffectType: "gangster",
						Cost:       2,
						Deck:       "A",
					},
				},
			},
		},
		Matchups:       [][2]int{{0, 1}},
		LastResults:    make(map[string]*models.BattleResult),
		BattleLogs:     make(map[string][]models.BattleLogEntry),
		BattleSessions: make(map[string]*models.BattleSession),
	}

	resolveRound(gs)

	// Since NPC_Alpha wins the flag with a Hero card, it should trigger the Hero effect (+2 Fans).
	winnerName := ""
	winnerFans := 0
	for _, p := range gs.Players {
		if p.Wins == 1 {
			winnerName = p.Name
			winnerFans = p.Fans
		}
	}

	if winnerName != "NPC_Alpha" {
		t.Fatalf("expected NPC_Alpha to win, got winner: %s", winnerName)
	}

	// Verify the log actually shows the Hero effect was triggered.
	logEntryFound := false
	logs := gs.BattleLogs["NPC_Alpha"]
	for _, entry := range logs {
		if entry.Player == "NPC_Alpha" && strings.Contains(entry.EffectTriggered, "ファン+2") {
			logEntryFound = true
			break
		}
	}

	if !logEntryFound {
		t.Logf("Logs: %+v", logs)
		t.Errorf("expected hero fan buff to be logged in battle log")
	}

	// Symmetrical buff verification:
	// Winner's total fans should equal the FansGained in the BattleResult.
	res, ok := gs.LastResults["NPC_Alpha"]
	if !ok {
		t.Fatalf("expected BattleResult for NPC_Alpha to be recorded")
	}

	if winnerFans != res.FansGained {
		t.Errorf("expected winner's fans (%d) to match battle result FansGained (%d)", winnerFans, res.FansGained)
	}

	// Calculate and verify that the bonus component of FansGained is exactly 2.
	bonus := calculateBonusFans(res.Log, "NPC_Alpha")
	if bonus != 2 {
		t.Errorf("expected scanned log bonus for Hero to be 2, got %d", bonus)
	}
}

func TestNPCvsNPCSymmetricalClownBuff(t *testing.T) {
	// Create a GameState with 2 NPC players
	gs := &models.GameState{
		CurrentRound: 1,
		MaxRounds:    5,
		Phase:        "shop",
		Players: []models.Player{
			{
				Name:  "NPC_Alpha",
				IsNPC: true,
				Wins:  0,
				Fans:  0,
				Deck: []models.Card{
					{
						ID:         "a_clown",
						Name:       "データクラウン",
						Attribute:  "Matrix",
						Power:      5, // Give it high power so it wins
						Rarity:     "Common",
						EffectType: "clown",
						Cost:       2,
						Deck:       "A",
					},
				},
			},
			{
				Name:  "NPC_Beta",
				IsNPC: true,
				Wins:  0,
				Fans:  0,
				Deck: []models.Card{
					{
						ID:         "a_gangster",
						Name:       "グリッドレイダー",
						Attribute:  "HoloMedia",
						Power:      2,
						Rarity:     "Common",
						EffectType: "gangster",
						Cost:       2,
						Deck:       "A",
					},
				},
			},
		},
		Matchups:       [][2]int{{0, 1}},
		LastResults:    make(map[string]*models.BattleResult),
		BattleLogs:     make(map[string][]models.BattleLogEntry),
		BattleSessions: make(map[string]*models.BattleSession),
	}

	resolveRound(gs)

	winnerName := ""
	winnerFans := 0
	for _, p := range gs.Players {
		if p.Wins == 1 {
			winnerName = p.Name
			winnerFans = p.Fans
		}
	}

	if winnerName != "NPC_Alpha" {
		t.Fatalf("expected NPC_Alpha to win, got winner: %s", winnerName)
	}

	// Verify the log actually shows the Clown effect was triggered.
	logEntryFound := false
	logs := gs.BattleLogs["NPC_Alpha"]
	for _, entry := range logs {
		if entry.Player == "NPC_Alpha" && strings.Contains(entry.EffectTriggered, "ファン+2") {
			logEntryFound = true
			break
		}
	}

	if !logEntryFound {
		t.Logf("Logs: %+v", logs)
		t.Errorf("expected clown fan buff to be logged in battle log")
	}

	// Symmetrical buff verification:
	res, ok := gs.LastResults["NPC_Alpha"]
	if !ok {
		t.Fatalf("expected BattleResult for NPC_Alpha to be recorded")
	}

	if winnerFans != res.FansGained {
		t.Errorf("expected winner's fans (%d) to match battle result FansGained (%d)", winnerFans, res.FansGained)
	}

	bonus := calculateBonusFans(res.Log, "NPC_Alpha")
	if bonus != 2 {
		t.Errorf("expected scanned log bonus for Clown to be 2, got %d", bonus)
	}
}
