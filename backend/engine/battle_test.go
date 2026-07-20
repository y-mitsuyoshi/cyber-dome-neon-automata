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
	result := RunBattle(playerDeck, cpuDeck, 1, false, false)

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

	session := InitializeBattleSession("test_session", "P1", "P2", p1Deck, p2Deck, 1, false, false)

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
	// After the flag is claimed, ActiveCards must be reset so the next
	// challenger's reveal stack starts fresh (the defending card is tracked
	// on session.FlagCard instead).
	if len(session.ActiveCards) != 0 {
		t.Errorf("Expected 0 active cards after flag claim, got %d", len(session.ActiveCards))
	}
	if session.FlagCard == nil {
		t.Errorf("Expected FlagCard to be set after flag claim")
	}
	if session.TurnOwner != "P2" {
		t.Errorf("Expected TurnOwner to switch to P2, got %s", session.TurnOwner)
	}
}

// TestInteractiveBattleFlagNotStolenIncorrectly exercises the bug where the
// previous defender's flag card lingered in ActiveCards after the turn swap.
// As a result the new challenger's accumulated power was inflated by the
// leftover defender card, causing the flag to be stolen even when the
// challenger's own cards were strictly weaker than the flag power.
func TestInteractiveBattleFlagNotStolenIncorrectly(t *testing.T) {
	// P1 will draw first and claim the flag with a power 5 card.
	// P2 then draws a power 4 card. 4 is NOT greater than 5, so the flag
	// must stay with P1.
	p1Deck := []models.Card{
		{ID: "p1_a", Name: "A", Attribute: "None", Power: 5},
	}
	p2Deck := []models.Card{
		{ID: "p2_b", Name: "B", Attribute: "None", Power: 4},
	}

	session := InitializeBattleSession("test_session", "P1", "P2", p1Deck, p2Deck, 1, false, false)
	session.TurnOwner = "P1"
	session.PendingActionPlayer = "P1"

	StepBattle(session, false, false) // P1 claims the flag (Power 5)
	if session.FlagHolder != "P1" {
		t.Fatalf("Expected P1 to hold flag after first draw, got %s", session.FlagHolder)
	}
	if session.FlagPower != 5 {
		t.Fatalf("Expected FlagPower 5, got %d", session.FlagPower)
	}

	session.TurnOwner = "P2"
	session.PendingActionPlayer = "P2"
	StepBattle(session, false, false) // P2 draws power 4

	if session.FlagHolder != "P1" {
		t.Errorf("Flag must remain with P1 (5 vs 4), got holder %s and power %d",
			session.FlagHolder, session.FlagPower)
	}
	if session.ChallengerPower != 4 {
		t.Errorf("ChallengerPower must equal P2's card power (4), got %d", session.ChallengerPower)
	}
	// ActiveCards must contain only the challenger's stack, not the leftover defender card.
	if len(session.ActiveCards) != 1 || session.ActiveCards[0].ID != "p2_b" {
		t.Errorf("ActiveCards must contain only P2's card, got %+v", session.ActiveCards)
	}
}

// TestInteractiveBattleMemoryNotDuplicated ensures the defender's old flag
// card is benched into the defender's memory only — not into the challenger's
// memory too (the latter used to happen because the leftover winning card in
// ActiveCards[0] was treated as a challenger non-winning card when stolen).
func TestInteractiveBattleMemoryNotDuplicated(t *testing.T) {
	// P1 claims flag with a power 1 card. P2 then draws a power 3 card and
	// steals the flag. The previous defender's card (power 1) should only go
	// to P1's bench, never to P2's bench.
	p1Deck := []models.Card{
		{ID: "p1_x", Name: "P1Card", Attribute: "None", Power: 1},
	}
	p2Deck := []models.Card{
		{ID: "p2_y", Name: "P2Card", Attribute: "None", Power: 3},
	}

	session := InitializeBattleSession("test_session", "P1", "P2", p1Deck, p2Deck, 1, false, false)
	session.TurnOwner = "P1"
	session.PendingActionPlayer = "P1"

	StepBattle(session, false, false) // P1 claims flag

	session.TurnOwner = "P2"
	session.PendingActionPlayer = "P2"
	StepBattle(session, false, false) // P2 steals flag

	if session.FlagHolder != "P2" {
		t.Fatalf("Expected P2 to hold flag now, got %s", session.FlagHolder)
	}

	p1Names := memSlotNames(session.Player1Mem)
	p2Names := memSlotNames(session.Player2Mem)

	// P1's old flag card must be on P1's bench.
	if len(p1Names) != 1 || !containsName(p1Names[0], "P1Card") {
		t.Errorf("P1 memory should contain its old flag card, got %v", p1Names)
	}
	// P2's bench must be empty (P2's winning card became the new flag, not benched).
	if len(p2Names) != 0 {
		t.Errorf("P2 memory must not contain P1's card, got %v", p2Names)
	}
}

func containsName(slotName string, cardName string) bool {
	return slotName == cardName ||
		len(slotName) >= len(cardName) && (slotName[:len(cardName)] == cardName)
}

func TestInteractiveBattleFlagStolenOnEqualPower(t *testing.T) {
	// P1 claims flag with power 3.
	// P2 draws card with power 3. Since P2 has equal power, they should steal the flag.
	p1Deck := []models.Card{
		{ID: "p1_x", Name: "P1Card", Attribute: "None", Power: 3},
	}
	p2Deck := []models.Card{
		{ID: "p2_y", Name: "P2Card", Attribute: "None", Power: 3},
	}

	session := InitializeBattleSession("test_session", "P1", "P2", p1Deck, p2Deck, 1, false, false)
	session.TurnOwner = "P1"
	session.PendingActionPlayer = "P1"

	StepBattle(session, false, false) // P1 claims flag
	if session.FlagHolder != "P1" {
		t.Fatalf("Expected P1 to hold flag, got %s", session.FlagHolder)
	}

	session.TurnOwner = "P2"
	session.PendingActionPlayer = "P2"
	StepBattle(session, false, false) // P2 steals flag because power is equal (3 >= 3)

	if session.FlagHolder != "P2" {
		t.Fatalf("Expected P2 to hold flag on equal power, got %s", session.FlagHolder)
	}
	if session.FlagPower != 3 {
		t.Fatalf("Expected FlagPower to be 3, got %d", session.FlagPower)
	}
}

func TestRefactoredDiscrepancies(t *testing.T) {
	// Test 1: Simulation extra fans returns & Clown Win Effect in simulation
	{
		playerDeck := []models.Card{
			{ID: "p_1", Name: "DataClown", Attribute: "Matrix", Power: 10, EffectType: "clown"},
		}
		cpuDeck := []models.Card{
			{ID: "c_1", Name: "Scout", Attribute: "None", Power: 1},
		}
		// DataClown wins flag, should trigger Clown win effect +2 fans.
		// Player won. Winner is player. Base fans gained is 2 since cpu deck ran out of cards,
		// plus 2 fans from clown win effect = 4 fans gained.
		// Force CPU to start by setting round=2 and cpuWonPrev=true, playerWonPrev=false
		res := RunBattle(playerDeck, cpuDeck, 2, false, true)
		if res.Winner != "player" {
			t.Errorf("Expected player to win, got %s", res.Winner)
		}
		if res.FansGained != 4 {
			t.Errorf("Expected FansGained to be 4 (2 base + 2 clown), got %d", res.FansGained)
		}
	}

	// Test 2: Navigator and Fortune Teller deck reordering in simulation
	{
		// Player has Navigator, CPU has strong card.
		// Player starts and claims flag with Navigator (Power 1).
		// CPU draws Scout (Power 2), defeats Navigator, causing Navigator to bench.
		// Symmetrical reordering triggers on Player's deck.
		// Player deck has CardA (Power 1) on top, CardB (Power 3) next.
		// Navigator AI choice should reorder: CardB (higher power) to top, CardA to bottom.
		playerDeck := []models.Card{
			{ID: "p_nav", Name: "Navigator", Attribute: "Matrix", Power: 1, EffectType: "navigator"},
			{ID: "p_a", Name: "CardA", Attribute: "None", Power: 1},
			{ID: "p_b", Name: "CardB", Attribute: "None", Power: 3},
		}
		cpuDeck := []models.Card{
			{ID: "c_a", Name: "Scout", Attribute: "None", Power: 2},
			{ID: "c_b", Name: "Scout", Attribute: "None", Power: 2},
		}

		// Run battle simulation
		res := RunBattle(playerDeck, cpuDeck, 2, true, false)
		foundNavLog := false
		for _, entry := range res.Log {
			if entry.Action == "effect" && entry.EffectTriggered == "navigator" {
				foundNavLog = true
			}
		}
		if !foundNavLog {
			t.Errorf("Expected navigator effect to be applied and logged in simulation")
		}
	}

	// Test 3: Movie Star retrieval of up to 2 HoloMedia cards descending by power
	{
		// Movie Star is played, memory has multiple HoloMedia cards.
		bs := newBattleState(nil, nil)
		addToMemory(&bs.PlayerMem, models.Card{ID: "hm_1", Name: "HM1", Attribute: "HoloMedia", Power: 1})
		addToMemory(&bs.PlayerMem, models.Card{ID: "hm_2", Name: "HM2", Attribute: "HoloMedia", Power: 2})
		addToMemory(&bs.PlayerMem, models.Card{ID: "hm_3", Name: "HM3", Attribute: "HoloMedia", Power: 3})

		movieStar := models.Card{ID: "ms", Name: "MovieStar", Attribute: "None", Power: 1, EffectType: "moviestar"}
		power := 1
		bs.applyOnRevealEffects(&movieStar, "player", &power)

		// Should return hm_2 (Power 2) then hm_1 (Power 1) to top of deck
		if len(bs.PlayerDeck) != 2 {
			t.Errorf("Expected 2 cards returned to deck, got %d", len(bs.PlayerDeck))
		} else {
			if bs.PlayerDeck[0].ID != "hm_2" || bs.PlayerDeck[1].ID != "hm_1" {
				t.Errorf("Expected hm_2 on top, hm_1 next. Got: top=%s, next=%s", bs.PlayerDeck[0].ID, bs.PlayerDeck[1].ID)
			}
		}
	}

	// Test 4: NPC Butler AI choice banishing up to 2 lowest-power cards
	{
		p1Deck := []models.Card{{ID: "p1_1", Name: "Card1", Attribute: "None", Power: 1}}
		p2Deck := []models.Card{{ID: "p2_1", Name: "Card1", Attribute: "None", Power: 1}}
		session := InitializeBattleSession("test_session", "P1", "P2", p1Deck, p2Deck, 1, false, false)

		addToMemory(&session.Player1Mem, models.Card{ID: "m_1", Name: "M1", Attribute: "None", Power: 5})
		addToMemory(&session.Player1Mem, models.Card{ID: "m_2", Name: "M2", Attribute: "None", Power: 1})
		addToMemory(&session.Player1Mem, models.Card{ID: "m_3", Name: "M3", Attribute: "None", Power: 3})

		options := getUniqueCardsInMem(session.Player1Mem)
		resolveNPCChoice(session, "P1", "CHOOSE_BUTLER", options)

		if len(session.Player1Mem) != 1 || session.Player1Mem[0].CardName != "M1" {
			t.Errorf("Expected only M1 to remain in memory, got: %+v", session.Player1Mem)
		}
		discardNames := []string{}
		for _, c := range session.Player1Discard {
			discardNames = append(discardNames, c.Name)
		}
		if len(discardNames) != 2 {
			t.Errorf("Expected 2 cards in discard, got %d", len(discardNames))
		}
	}
}
