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

func TestCountAttributeInMemory(t *testing.T) {
	mem := []models.MemorySlot{
		{
			CardName: "Orbit Card",
			Cards: []models.Card{
				{Attribute: "Orbit"},
				{Attribute: "Orbit"},
			},
			Count: 2,
		},
		{
			CardName: "Sector Card",
			Cards: []models.Card{
				{Attribute: "Sector"},
			},
			Count: 1,
		},
	}

	count := countAttributeInMemory(mem, "Orbit")
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
	p1Deck := []models.Card{
		{ID: "starter_1", Name: "スカウト", Attribute: "None", Power: 1},
		{ID: "starter_2", Name: "スカウト", Attribute: "None", Power: 2},
	}
	p2Deck := []models.Card{
		{ID: "starter_3", Name: "スカウト", Attribute: "None", Power: 2},
		{ID: "starter_4", Name: "スカウト", Attribute: "None", Power: 3},
	}

	session := InitializeBattleSession("test_session", "P1", "P2", p1Deck, p2Deck)

	// Ensure RequiredAction is DRAW at start
	if session.RequiredAction != "DRAW" {
		t.Errorf("Expected RequiredAction to be DRAW, got %s", session.RequiredAction)
	}

	// Override turn owner to make it deterministic
	session.TurnOwner = "P1"
	session.PendingActionPlayer = "P1"

	// 1. Draw card for P1
	StepBattle(session, false, false)

	// Check P1 has flag
	if session.FlagHolder != "P1" {
		t.Errorf("Expected P1 to hold flag, got %s", session.FlagHolder)
	}
	if len(session.ActiveCards) != 1 {
		t.Errorf("Expected 1 active card, got %d", len(session.ActiveCards))
	}
	if session.TurnOwner != "P2" {
		t.Errorf("Expected TurnOwner to switch to P2, got %s", session.TurnOwner)
	}
}
