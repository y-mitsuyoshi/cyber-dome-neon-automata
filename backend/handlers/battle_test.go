package handlers

import (
	"backend/models"
	"testing"
)

func TestCalculateBonusFans(t *testing.T) {
	tests := []struct {
		name     string
		log      []models.BattleLogEntry
		player   string
		expected int
	}{
		{
			name: "single player pyrotechnist",
			log: []models.BattleLogEntry{
				{Player: "P1", EffectTriggered: "バッファオーバーフロー：ベンチが満杯なため、ファン+3を獲得！"},
			},
			player:   "P1",
			expected: 3,
		},
		{
			name: "multiple effects for winner",
			log: []models.BattleLogEntry{
				{Player: "P1", EffectTriggered: "バッファオーバーフロー：ベンチが満杯なため、ファン+3を獲得！"},
				{Player: "P1", EffectTriggered: "ヒーローの効果でファン+2を獲得！"},
				{Player: "P2", EffectTriggered: "クラウンの効果でファン+2を獲得！"},
			},
			player:   "P1",
			expected: 5,
		},
		{
			name: "no relevant logs",
			log: []models.BattleLogEntry{
				{Player: "P1", EffectTriggered: "none"},
			},
			player:   "P1",
			expected: 0,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := calculateBonusFans(tc.log, tc.player)
			if got != tc.expected {
				t.Errorf("expected %d, got %d", tc.expected, got)
			}
		})
	}
}

func TestFinalizeBattleSessionNoDoubleCounting(t *testing.T) {
	gs := &models.GameState{
		Players: []models.Player{
			{Name: "P1", Wins: 0, Fans: 0},
			{Name: "P2", Wins: 0, Fans: 0},
		},
		LastResults: make(map[string]*models.BattleResult),
		BattleLogs:  make(map[string][]models.BattleLogEntry),
	}

	session := &models.BattleSession{
		SessionID:   "test_s1",
		Player1Name: "P1",
		Player2Name: "P2",
		Winner:      "P1",
		Loser:       "P2",
		Step:        5,
		Log: []models.BattleLogEntry{
			{Player: "P1", EffectTriggered: "ヒーローの効果でファン+2を獲得！"},
		},
		FlagCard: &models.Card{
			EffectType: "hero",
		},
	}

	// This should award:
	// Base fans: 2 (since step >= 3)
	// Log bonus: 2 (from calculateBonusFans via "ヒーローの効果でファン+2を獲得！")
	// If double counting bug was still present, it would award another 2 (from FlagCard.EffectType == "hero") totaling 6.
	// Now it should only award 4 fans.
	finalizeBattleSession(gs, session)

	if gs.Players[0].Wins != 1 {
		t.Errorf("expected P1 to have 1 win, got %d", gs.Players[0].Wins)
	}

	expectedFans := 4
	if gs.Players[0].Fans != expectedFans {
		t.Errorf("expected P1 to have %d fans, got %d (double counting might still occur)", expectedFans, gs.Players[0].Fans)
	}
}
