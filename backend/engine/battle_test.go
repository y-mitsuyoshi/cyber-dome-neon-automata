package engine

import (
	"backend/models"
	"fmt"
	"testing"
)

func TestUniqueSlotCount(t *testing.T) {
	mem := []models.MemorySlot{
		{
			CardName: "Test1",
			Cards: []models.Card{
				{EffectType: "none"},
			},
			Count: 1,
		},
		{
			CardName: "Test2",
			Cards: []models.Card{
				{EffectType: "reduce_memory_count"},
			},
			Count: 1,
		},
	}
	
	// Should be 2 slots - 1 reduction = 1
	count := uniqueSlotCount(mem)
	if count != 1 {
		t.Errorf("Expected 1, got %d", count)
	}
}

func TestBenchPowerBonus(t *testing.T) {
	mem := []models.MemorySlot{
		{
			CardName: "Test1",
			Cards: []models.Card{
				{EffectType: "bench_power_plus_1"},
				{EffectType: "bench_power_plus_1"},
			},
			Count: 2,
		},
		{
			CardName: "Test2",
			Cards: []models.Card{
				{EffectType: "none"},
			},
			Count: 1,
		},
	}
	
	// Should be 2 bonus power
	bonus := benchPowerBonus(mem)
	if bonus != 2 {
		t.Errorf("Expected 2, got %d", bonus)
	}
}

func TestCountAIInMemory(t *testing.T) {
	mem := []models.MemorySlot{
		{
			CardName: "AI Card",
			Cards: []models.Card{
				{Attribute: "AI"},
				{Attribute: "AI"},
			},
			Count: 2,
		},
		{
			CardName: "Virus Card",
			Cards: []models.Card{
				{Attribute: "Virus"},
			},
			Count: 1,
		},
	}
	
	count := countAIInMemory(mem)
	if count != 2 {
		t.Errorf("Expected 2, got %d", count)
	}
}

func TestRunBattle(t *testing.T) {
	playerDeck := []models.Card{
		{Name: "Card1", Power: 10, Attribute: "Hardware"},
		{Name: "Card2", Power: 5, Attribute: "AI"},
	}
	cpuDeck := []models.Card{
		{Name: "Card3", Power: 2, Attribute: "Virus"},
		{Name: "Card4", Power: 2, Attribute: "Virus"},
	}
	
	// Player card is much stronger (10 vs 2,2). Player should win.
	result := RunBattle(playerDeck, cpuDeck)
	
	if result.Winner != "player" {
		t.Errorf("Expected player to win, got %s", result.Winner)
	}
}

func TestGetMatchupsEven(t *testing.T) {
	// 4 players (even count) should result in 3 rounds of matchmaking
	numPlayers := 4
	
	// Verify single round-robin uniqueness:
	// Every player must play every other player exactly once across all 3 rounds.
	played := make(map[string]int)
	for r := 1; r <= 3; r++ {
		matchups := GetMatchups(r, numPlayers)
		for _, pair := range matchups {
			p1, p2 := pair[0], pair[1]
			if p1 == p2 {
				t.Errorf("Round %d: Player cannot play themselves: %d vs %d", r, p1, p2)
			}
			key := fmt.Sprintf("%d-%d", p1, p2)
			if p1 > p2 {
				key = fmt.Sprintf("%d-%d", p2, p1)
			}
			played[key]++
		}
	}

	// For 4 players, there are (4 * 3) / 2 = 6 unique match pairings
	if len(played) != 6 {
		t.Errorf("Expected 6 unique pairings, got %d: %v", len(played), played)
	}
	for pair, count := range played {
		if count != 1 {
			t.Errorf("Pairing %s was played %d times instead of exactly once", pair, count)
		}
	}
}

func TestGetMatchupsOdd(t *testing.T) {
	// 3 players (odd count) should introduce a dummy player -1 for BYE, resulting in 3 rounds
	numPlayers := 3
	
	// Across 3 rounds, each player must receive exactly one BYE (index -1)
	byes := make(map[int]int)
	played := make(map[string]int)

	for r := 1; r <= 3; r++ {
		matchups := GetMatchups(r, numPlayers)
		if len(matchups) != 2 { // 4 / 2 = 2 matches including BYE
			t.Fatalf("Round %d: expected 2 pairings (with bye), got %d", r, len(matchups))
		}

		for _, pair := range matchups {
			p1, p2 := pair[0], pair[1]
			if p1 == -1 {
				byes[p2]++
			} else if p2 == -1 {
				byes[p1]++
			} else {
				key := fmt.Sprintf("%d-%d", p1, p2)
				if p1 > p2 {
					key = fmt.Sprintf("%d-%d", p2, p1)
				}
				played[key]++
			}
		}
	}

	// Verify every player received exactly 1 BYE
	for p := 0; p < numPlayers; p++ {
		if byes[p] != 1 {
			t.Errorf("Expected player %d to get exactly 1 bye, got %d", p, byes[p])
		}
	}

	// Verify all real pairings played exactly once
	// For 3 players, unique real matchups = (3 * 2) / 2 = 3 unique pairings
	if len(played) != 3 {
		t.Errorf("Expected 3 unique real pairings, got %d", len(played))
	}
	for pair, count := range played {
		if count != 1 {
			t.Errorf("Real pairing %s played %d times", pair, count)
		}
	}
}

func TestInteractiveBattle(t *testing.T) {
	p1Deck := StarterDeck()
	p2Deck := StarterDeck()

	session := InitializeBattleSession("test_session", "P1", "P2", p1Deck, p2Deck)

	if len(session.Player1Hand) != 10 {
		t.Errorf("Expected 10 starting cards in P1 hand, got %d", len(session.Player1Hand))
	}
	if len(session.Player2Hand) != 10 {
		t.Errorf("Expected 10 starting cards in P2 hand, got %d", len(session.Player2Hand))
	}

	// 1. Commit actions: P1 plays Glitch Worm Jr. (starter_virus_1), P2 plays Linear Regressor (starter_ai_1)
	session.PendingActions["P1"] = &models.BattleAction{
		PlayerName: "P1",
		ActionType: "PLAY",
		CardID:     "starter_virus_1",
	}
	session.PendingActions["P2"] = &models.BattleAction{
		PlayerName: "P2",
		ActionType: "PLAY",
		CardID:     "starter_ai_1",
	}

	StepBattle(session)

	// Since both are Power 3, Tie breaker applies and P1 wins flag (as default)
	if session.FlagHolder != "P1" {
		t.Errorf("Expected P1 to hold flag, got %s", session.FlagHolder)
	}
	if len(session.Player1Hand) != 9 {
		t.Errorf("Expected 9 cards in P1 hand, got %d", len(session.Player1Hand))
	}
	if len(session.Player1Mem) != 1 {
		t.Errorf("Expected 1 slot in P1 memory, got %d", len(session.Player1Mem))
	}
	if session.Step != 1 {
		t.Errorf("Expected Step to be 1, got %d", session.Step)
	}
}

func TestNPCBestMove(t *testing.T) {
	hand := []models.Card{
		{ID: "starter_virus_1", Name: "Glitch Worm Jr.", Attribute: "Virus", Power: 3},
		{ID: "starter_ai_3", Name: "Logic Node", Attribute: "AI", Power: 5},
	}
	
	// Combo strategy NPC should prefer AI card (Logic Node, Power 5) over Virus
	action := EvaluateBestMove(hand, "Combo", []models.MemorySlot{}, []models.MemorySlot{}, 0, false)
	if action.ActionType != "PLAY" || action.CardID != "starter_ai_3" {
		t.Errorf("Expected playing starter_ai_3, got %s:%s", action.ActionType, action.CardID)
	}
}
